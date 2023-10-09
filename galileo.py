from segment_anything import SamAutomaticMaskGenerator, sam_model_registry, SamPredictor
import numpy as np
from PIL import Image
import base64
from io import BytesIO
from stability_sdk import client
import stability_sdk.interfaces.gooseai.generation.generation_pb2 as generation
from torchvision.transforms import GaussianBlur
import os
import cv2
from lama import LaMa, BASE_CONFIG

os.environ["STABILITY_HOST"] = "grpc.stability.ai:443"
os.environ["STABILITY_KEY"] = "<API KEY>"


def decode_base64_image(base64_string, output_file):
    """Decode a base64 image string and save it to disk.

    Args:
        base64_string (str): The base64 encoded image string.
        output_file (str): The output file path to save the image.
    """
    # Decode the base64 string
    image_data = base64.b64decode(base64_string)

    # Save the decoded image to disk
    with open(output_file, "wb") as f:
        f.write(image_data)


class Galileo:
    def __init__(self):
        self.segment_cache = {}
        self.generate_cache = {}
        self.sam = sam_model_registry["default"](
            checkpoint="./weights/sam_vit_h_4b8939.pth"
        )
        self.stability_api = client.StabilityInference(
            key=os.environ["STABILITY_KEY"],
            verbose=True,
            engine="stable-diffusion-xl-1024-v1-0",
        )
        self.predictor = None
        self.lama = LaMa("weights/big-lama.pt")

    def erase(self, b64_image: str, b64_mask: str) -> str:
        image = np.asarray(self._decode_image(b64_image))
        mask = np.asarray(self._decode_image(b64_mask).convert("L"))

        # alpha_channel = (
        #     np.ones((image.shape[0], image.shape[1], 1), dtype=image.dtype) * 255
        # )
        # image = np.dstack((image, alpha_channel))
        # print(f"MASK SHAPE BEFORE: {mask.shape}")

        # mask = mask.max(axis=-1)

        print(f"IMAGE SHAPE: {image.shape}")
        print(f"MASK SHAPE: {mask.shape}")

        image = cv2.resize(image, None, fx=1, fy=1, interpolation=cv2.INTER_AREA)
        mask = cv2.resize(mask, None, fx=1, fy=1, interpolation=cv2.INTER_NEAREST)

        decode_base64_image(b64_image, "last_used_image.png")
        decode_base64_image(b64_mask, "last_used_mask_pre_processing.png")
        cv2.imwrite("last_used_mask.png", mask)

        image = cv2.resize(image, None, fx=1, fy=1, interpolation=cv2.INTER_AREA)
        mask = cv2.resize(mask, None, fx=1, fy=1, interpolation=cv2.INTER_NEAREST)

        res = self.lama(image, mask, BASE_CONFIG)

        _, buffer = cv2.imencode(".png", res)
        result = "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")
        return result

    def generate(
        self, b64_image: str, b64_mask: str, prompt: str, style: str | None
    ) -> str:
        if (b64_mask, prompt) in self.generate_cache:
            return self.generate_cache[b64_mask, prompt]

        # Decode base64 encoded images into a PIL Images
        image = self._decode_image(b64_image)
        mask_i = self._decode_image(b64_mask)
        blur = GaussianBlur(11, 5)
        mask = blur(mask_i)

        decode_base64_image(b64_image, "last_used_image.png")
        mask.save("last_used_mask.png")

        # Call API
        answers = self.stability_api.generate(
            prompt=prompt,
            init_image=image,
            mask_image=mask,
            start_schedule=1,
            seed=4242427,
            # guidance_preset=generation.GUIDANCE_PRESET_FAST_BLUE,
            steps=25,
            cfg_scale=9.0,
            width=768,
            height=768,
            sampler=generation.SAMPLER_K_DPM_2_ANCESTRAL,
            style_preset=style,
        )

        for response in answers:
            for artifact in response.artifacts:
                if artifact.type == generation.ARTIFACT_IMAGE:
                    result = "data:image/png;base64," + base64.b64encode(
                        artifact.binary
                    ).decode("utf-8")
                    self.generate_cache[b64_mask, prompt] = result
                    return result

    def segment(self, b64_image: str | None, prompt: str | None) -> str:
        if b64_image in self.segment_cache:
            return self.segment_cache[b64_image]

        # Decode base64 encoded image into a PIL Image
        image = self._decode_image(b64_image)
        # Turn into a numpy ndarray
        image = np.array(image)

        # Create a mask generator
        mask_generator = SamAutomaticMaskGenerator(self.sam)

        # Get masks
        masks = mask_generator.generate(image)
        # Sort masks by area
        masks.sort(key=lambda x: x["area"], reverse=True)

        # Map each pixel on the image to a single integer corresponding
        # to the first mask associated with it.
        combined_masks = self._generate_masks_map(masks, image.shape[0], image.shape[1])

        # encode as a b64 string and return
        byte_array = bytes(combined_masks)
        output = base64.b64encode(byte_array).decode("utf-8")

        self.segment_cache[b64_image] = output

        return output

    def set_image(self, b64_image: str):
        # Decode base64 encoded image into a PIL Image
        image = self._decode_image(b64_image)
        # Turn into a numpy ndarray
        image = np.array(image)

        self.predictor = SamPredictor(self.sam)
        self.predictor.set_image(image)

    def segment_point(self, x: int, y: int) -> list[int]:
        masks, mask_scores, _ = self.predictor.predict(
            point_coords=np.array([[x, y]]), point_labels=np.aray([1])
        )
        best_idx = np.argmax(mask_scores)
        best_mask = masks[best_idx, :, :]

        mask_idxs = [int(idx) for idx in np.flatnonzero(best_mask)]
        return mask_idxs

    def _generate_masks_map(
        self, masks: list[dict[str, any]], height: int, width: int
    ) -> list[int]:
        combined = np.zeros((height, width), dtype=int)

        for i, mask in enumerate(masks, start=1):
            mask = mask["segmentation"]
            # Set all pixels corresponding to this mask to segment number `i`
            combined[mask & (combined == 0)] = i

        return list(combined.reshape((height * width,)))

    def _decode_image(self, b64_image: str) -> Image:
        # Read base64 string as bytes
        image_bytes = base64.b64decode(b64_image)

        # Load bytes into a buffer
        image_buffer = BytesIO(image_bytes)

        # Open raw bytes as an image using PIL
        image = Image.open(image_buffer)

        return image
