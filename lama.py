import torch
import numpy as np
from pydantic import BaseModel
from typing import Optional
from enum import Enum
import cv2
import abc

import PIL
from PIL import Image

MPS_SUPPORT_MODELS = [
    "instruct_pix2pix",
    "sd1.5",
    "anything4",
    "realisticVision1.4",
    "sd2",
    "paint_by_example",
    "controlnet",
]


class SDSampler(str, Enum):
    ddim = "ddim"
    pndm = "pndm"
    k_lms = "k_lms"
    k_euler = "k_euler"
    k_euler_a = "k_euler_a"
    dpm_plus_plus = "dpm++"
    uni_pc = "uni_pc"


class HDStrategy(str, Enum):
    # Use original image size
    ORIGINAL = "Original"
    # Resize the longer side of the image to a specific size
    RESIZE = "Resize"
    # Crop masking area(with a margin controlled by hd_strategy_crop_margin)
    CROP = "Crop"


class LDMSampler(str, Enum):
    ddim = "ddim"
    plms = "plms"


class Config(BaseModel):
    class Config:
        arbitrary_types_allowed = True

    # Configs for ldm model
    ldm_steps: int
    ldm_sampler: str = LDMSampler.plms

    # Configs for zits model
    zits_wireframe: bool = True

    # Configs for High Resolution Strategy(different way to preprocess image)
    hd_strategy: str  # See HDStrategy Enum
    hd_strategy_crop_margin: int
    # If the longer side of the image is larger than this value, use crop strategy
    hd_strategy_crop_trigger_size: int
    hd_strategy_resize_limit: int

    # Configs for Stable Diffusion 1.5
    prompt: str = ""
    negative_prompt: str = ""
    # Crop image to this size before doing sd inpainting
    # The value is always on the original image scale
    use_croper: bool = False
    croper_x: int = None
    croper_y: int = None
    croper_height: int = None
    croper_width: int = None

    # Resize the image before doing sd inpainting.
    # Used by sd models and paint_by_example model
    sd_scale: float = 1.0
    # Blur the edge of mask area.
    sd_mask_blur: int = 0
    # Ignore this value, it's useless for inpainting
    sd_strength: float = 0.75
    # The number of denoising steps. More denoising steps usually lead to a
    # higher quality image at the expense of slower inference.
    sd_steps: int = 50
    # Higher guidance scale encourages to generate images that are closely linked
    # to the text prompt, usually at the expense of lower image quality.
    sd_guidance_scale: float = 7.5
    sd_sampler: str = SDSampler.uni_pc
    # -1 mean random seed
    sd_seed: int = 42
    sd_match_histograms: bool = False

    # Configs for opencv inpainting
    cv2_flag: str = "INPAINT_NS"
    cv2_radius: int = 4

    # Paint by Example
    paint_by_example_steps: int = 50
    paint_by_example_guidance_scale: float = 7.5
    paint_by_example_mask_blur: int = 0
    paint_by_example_seed: int = 42
    paint_by_example_match_histograms: bool = False
    paint_by_example_example_image: Optional[PIL.Image] = None

    # InstructPix2Pix
    p2p_steps: int = 50
    p2p_image_guidance_scale: float = 1.5
    p2p_guidance_scale: float = 7.5

    # ControlNet
    controlnet_conditioning_scale: float = 0.4
    controlnet_method: str = "control_v11p_sd15_canny"


def ceil_modulo(x, mod):
    if x % mod == 0:
        return x
    return (x // mod + 1) * mod


def pad_img_to_modulo(
    img: np.ndarray, mod: int, square: bool = False, min_size: Optional[int] = None
):
    """

    Args:
        img: [H, W, C]
        mod:
        square: 是否为正方形
        min_size:

    Returns:

    """
    if len(img.shape) == 2:
        img = img[:, :, np.newaxis]
    height, width = img.shape[:2]
    out_height = ceil_modulo(height, mod)
    out_width = ceil_modulo(width, mod)

    if min_size is not None:
        assert min_size % mod == 0
        out_width = max(min_size, out_width)
        out_height = max(min_size, out_height)

    if square:
        max_size = max(out_height, out_width)
        out_height = max_size
        out_width = max_size

    return np.pad(
        img,
        ((0, out_height - height), (0, out_width - width), (0, 0)),
        mode="symmetric",
    )


def norm_img(np_img):
    if len(np_img.shape) == 2:
        np_img = np_img[:, :, np.newaxis]

    np_img = np.transpose(np_img, (2, 0, 1))
    np_img = np_img.astype("float32") / 255

    return np_img


def resize_max_size(
    np_img, size_limit: int, interpolation=cv2.INTER_CUBIC
) -> np.ndarray:
    # Resize image's longer size to size_limit if longer size larger than size_limit
    h, w = np_img.shape[:2]
    if max(h, w) > size_limit:
        ratio = size_limit / max(h, w)
        new_w = int(w * ratio + 0.5)
        new_h = int(h * ratio + 0.5)
        return cv2.resize(np_img, dsize=(new_w, new_h), interpolation=interpolation)
    else:
        return np_img


def switch_mps_device(model_name, device):
    if model_name not in MPS_SUPPORT_MODELS and str(device) == "mps":
        return torch.device("cpu")
    return device


def boxes_from_mask(mask: np.ndarray):
    """
    Args:
        mask: (h, w, 1)  0~255

    Returns:

    """
    height, width = mask.shape[:2]
    _, thresh = cv2.threshold(mask, 127, 255, 0)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        box = np.array([x, y, x + w, y + h]).astype(int)

        box[::2] = np.clip(box[::2], 0, width)
        box[1::2] = np.clip(box[1::2], 0, height)
        boxes.append(box)

    return boxes


class InpaintModel:
    name = "base"
    min_size: Optional[int] = None
    pad_mod = 8
    pad_to_square = False

    def __init__(self, device, **kwargs):
        """

        Args:
            device:
        """
        device = switch_mps_device(self.name, device)
        self.device = device
        self.init_model(device, **kwargs)

    @abc.abstractmethod
    def init_model(self, device, **kwargs):
        ...

    @staticmethod
    @abc.abstractmethod
    def is_downloaded() -> bool:
        ...

    @abc.abstractmethod
    def forward(self, image, mask, config: Config):
        """Input images and output images have same size
        images: [H, W, C] RGB
        masks: [H, W, 1] 255 为 masks 区域
        return: BGR IMAGE
        """
        ...

    def _pad_forward(self, image, mask, config: Config):
        origin_height, origin_width = image.shape[:2]
        pad_image = pad_img_to_modulo(
            image, mod=self.pad_mod, square=self.pad_to_square, min_size=self.min_size
        )
        pad_mask = pad_img_to_modulo(
            mask, mod=self.pad_mod, square=self.pad_to_square, min_size=self.min_size
        )

        result = self.forward(pad_image, pad_mask, config)
        result = result[0:origin_height, 0:origin_width, :]

        result, image, mask = self.forward_post_process(result, image, mask, config)

        mask = mask[:, :, np.newaxis]
        result = result * (mask / 255) + image[:, :, ::-1] * (1 - (mask / 255))
        return result

    def forward_post_process(self, result, image, mask, config):
        return result, image, mask

    @torch.no_grad()
    def __call__(self, image, mask, config: Config):
        """
        images: [H, W, C] RGB, not normalized
        masks: [H, W]
        return: BGR IMAGE
        """
        inpaint_result = None
        if config.hd_strategy == HDStrategy.CROP:
            if max(image.shape) > config.hd_strategy_crop_trigger_size:
                boxes = boxes_from_mask(mask)
                crop_result = []
                for box in boxes:
                    crop_image, crop_box = self._run_box(image, mask, box, config)
                    crop_result.append((crop_image, crop_box))

                inpaint_result = image[:, :, ::-1]
                for crop_image, crop_box in crop_result:
                    x1, y1, x2, y2 = crop_box
                    inpaint_result[y1:y2, x1:x2, :] = crop_image

        elif config.hd_strategy == HDStrategy.RESIZE:
            if max(image.shape) > config.hd_strategy_resize_limit:
                origin_size = image.shape[:2]
                downsize_image = resize_max_size(
                    image, size_limit=config.hd_strategy_resize_limit
                )
                downsize_mask = resize_max_size(
                    mask, size_limit=config.hd_strategy_resize_limit
                )

                inpaint_result = self._pad_forward(
                    downsize_image, downsize_mask, config
                )

                # only paste masked area result
                inpaint_result = cv2.resize(
                    inpaint_result,
                    (origin_size[1], origin_size[0]),
                    interpolation=cv2.INTER_CUBIC,
                )
                original_pixel_indices = mask < 127
                inpaint_result[original_pixel_indices] = image[:, :, ::-1][
                    original_pixel_indices
                ]

        if inpaint_result is None:
            inpaint_result = self._pad_forward(image, mask, config)

        return inpaint_result

    def _crop_box(self, image, mask, box, config: Config):
        """

        Args:
            image: [H, W, C] RGB
            mask: [H, W, 1]
            box: [left,top,right,bottom]

        Returns:
            BGR IMAGE, (l, r, r, b)
        """
        box_h = box[3] - box[1]
        box_w = box[2] - box[0]
        cx = (box[0] + box[2]) // 2
        cy = (box[1] + box[3]) // 2
        img_h, img_w = image.shape[:2]

        w = box_w + config.hd_strategy_crop_margin * 2
        h = box_h + config.hd_strategy_crop_margin * 2

        _l = cx - w // 2
        _r = cx + w // 2
        _t = cy - h // 2
        _b = cy + h // 2

        l = max(_l, 0)  # noqa
        r = min(_r, img_w)
        t = max(_t, 0)
        b = min(_b, img_h)

        # try to get more context when crop around image edge
        if _l < 0:
            r += abs(_l)
        if _r > img_w:
            l -= _r - img_w
        if _t < 0:
            b += abs(_t)
        if _b > img_h:
            t -= _b - img_h

        l = max(l, 0)  # noqa
        r = min(r, img_w)
        t = max(t, 0)
        b = min(b, img_h)

        crop_img = image[t:b, l:r, :]
        crop_mask = mask[t:b, l:r]

        return crop_img, crop_mask, [l, t, r, b]

    def _calculate_cdf(self, histogram):
        cdf = histogram.cumsum()
        normalized_cdf = cdf / float(cdf.max())
        return normalized_cdf

    def _calculate_lookup(self, source_cdf, reference_cdf):
        lookup_table = np.zeros(256)
        lookup_val = 0
        for source_index, source_val in enumerate(source_cdf):
            for reference_index, reference_val in enumerate(reference_cdf):
                if reference_val >= source_val:
                    lookup_val = reference_index
                    break
            lookup_table[source_index] = lookup_val
        return lookup_table

    def _match_histograms(self, source, reference, mask):
        transformed_channels = []
        for channel in range(source.shape[-1]):
            source_channel = source[:, :, channel]
            reference_channel = reference[:, :, channel]

            # only calculate histograms for non-masked parts
            source_histogram, _ = np.histogram(source_channel[mask == 0], 256, [0, 256])
            reference_histogram, _ = np.histogram(
                reference_channel[mask == 0], 256, [0, 256]
            )

            source_cdf = self._calculate_cdf(source_histogram)
            reference_cdf = self._calculate_cdf(reference_histogram)

            lookup = self._calculate_lookup(source_cdf, reference_cdf)

            transformed_channels.append(cv2.LUT(source_channel, lookup))

        result = cv2.merge(transformed_channels)
        result = cv2.convertScaleAbs(result)

        return result

    def _apply_cropper(self, image, mask, config: Config):
        img_h, img_w = image.shape[:2]
        l, t, w, h = (
            config.croper_x,
            config.croper_y,
            config.croper_width,
            config.croper_height,
        )
        r = l + w
        b = t + h

        l = max(l, 0)  # noqa
        r = min(r, img_w)
        t = max(t, 0)
        b = min(b, img_h)

        crop_img = image[t:b, l:r, :]
        crop_mask = mask[t:b, l:r]
        return crop_img, crop_mask, (l, t, r, b)

    def _run_box(self, image, mask, box, config: Config):
        """

        Args:
            image: [H, W, C] RGB
            mask: [H, W, 1]
            box: [left,top,right,bottom]

        Returns:
            BGR IMAGE
        """
        crop_img, crop_mask, [l, t, r, b] = self._crop_box(image, mask, box, config)

        return self._pad_forward(crop_img, crop_mask, config), [l, t, r, b]


class DiffusionInpaintModel(InpaintModel):
    @torch.no_grad()
    def __call__(self, image, mask, config: Config):
        """
        images: [H, W, C] RGB, not normalized
        masks: [H, W]
        return: BGR IMAGE
        """
        # boxes = boxes_from_mask(mask)
        if config.use_croper:
            crop_img, crop_mask, (l, t, r, b) = self._apply_cropper(image, mask, config)
            crop_image = self._scaled_pad_forward(crop_img, crop_mask, config)
            inpaint_result = image[:, :, ::-1]
            inpaint_result[t:b, l:r, :] = crop_image
        else:
            inpaint_result = self._scaled_pad_forward(image, mask, config)

        return inpaint_result

    def _scaled_pad_forward(self, image, mask, config: Config):
        longer_side_length = int(config.sd_scale * max(image.shape[:2]))
        origin_size = image.shape[:2]
        downsize_image = resize_max_size(image, size_limit=longer_side_length)
        downsize_mask = resize_max_size(mask, size_limit=longer_side_length)

        inpaint_result = self._pad_forward(downsize_image, downsize_mask, config)
        # only paste masked area result
        inpaint_result = cv2.resize(
            inpaint_result,
            (origin_size[1], origin_size[0]),
            interpolation=cv2.INTER_CUBIC,
        )
        original_pixel_indices = mask < 127
        inpaint_result[original_pixel_indices] = image[:, :, ::-1][
            original_pixel_indices
        ]
        return inpaint_result


BASE_CONFIG = Config(
    ldm_steps=1,
    ldm_sampler=LDMSampler.plms,
    hd_strategy=HDStrategy.ORIGINAL,
    hd_strategy_crop_margin=32,
    hd_strategy_crop_trigger_size=200,
    hd_strategy_resize_limit=200,
)


class LaMa(InpaintModel):
    name = "lama"
    pad_mod = 8

    def __init__(self, checkpoint: str) -> None:
        self.device = "cpu"
        self.model = self._load_jit_model(checkpoint).eval()

    def _load_jit_model(self, checkpoint):
        model = torch.jit.load(checkpoint, map_location="cpu")
        model.eval()
        return model

    def forward(self, image, mask, config: Config):
        """Input image and output image have same size
        image: [H, W, C] RGB
        mask: [H, W]
        return: BGR IMAGE
        """
        image = norm_img(image)
        mask = norm_img(mask)

        mask = (mask > 0) * 1
        image = torch.from_numpy(image).unsqueeze(0).to(self.device)
        mask = torch.from_numpy(mask).unsqueeze(0).to(self.device)

        inpainted_image = self.model(image, mask)

        cur_res = inpainted_image[0].permute(1, 2, 0).detach().cpu().numpy()
        cur_res = np.clip(cur_res * 255, 0, 255).astype("uint8")
        cur_res = cv2.cvtColor(cur_res, cv2.COLOR_RGB2BGR)
        return cur_res


if __name__ == "__main__":
    config = Config(
        ldm_steps=1,
        ldm_sampler=LDMSampler.plms,
        hd_strategy=HDStrategy.ORIGINAL,
        hd_strategy_crop_margin=32,
        hd_strategy_crop_trigger_size=200,
        hd_strategy_resize_limit=200,
    )

    image = np.asarray(Image.open("last_used_image.png"))
    mask = np.asarray(Image.open("last_used_mask.png"))

    # image = cv2.imread("last_used_image.png")
    # image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
    # mask = cv2.imread("last_used_mask.png", cv2.IMREAD_GRAYSCALE)

    image = cv2.resize(image, None, fx=1, fy=1, interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, None, fx=1, fy=1, interpolation=cv2.INTER_NEAREST)

    model = LaMa("weights/big-lama.pt")
    res = model(image, mask, config)

    cv2.imwrite("test_output.png", res)

    # img = Image.fromarray(res, mode="RGB")
    # img.save("test_output.png")
