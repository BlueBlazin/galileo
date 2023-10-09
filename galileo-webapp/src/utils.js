export const CANVAS_SIZE = 768;

export function generateBase64MaskImage(
  segments,
  segmentToIdx,
  brushSelections,
  width,
  height
) {
  const numChannels = 4;
  const bytesArray = new Uint8Array(height * width * numChannels);

  // Initialize to black, as the mask is expected to be white
  bytesArray.fill(0);

  // Add segments selections
  for (let segment of segments) {
    for (let idx of segmentToIdx[segment]) {
      const i = numChannels * idx;
      bytesArray[i + 0] = 255;
      bytesArray[i + 1] = 255;
      bytesArray[i + 2] = 255;
      bytesArray[i + 3] = 255;
    }
  }

  // Add brush stroke selections
  for (let idx = 0; idx < brushSelections.length; idx++) {
    if (brushSelections[idx] === 1) {
      const i = numChannels * idx;
      bytesArray[i + 0] = 255;
      bytesArray[i + 1] = 255;
      bytesArray[i + 2] = 255;
      bytesArray[i + 3] = 255;
    }
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(bytesArray),
    width,
    height
  );

  const canvas = document.createElement("canvas");
  canvas.height = height;
  canvas.width = width;
  const ctx = canvas.getContext("2d");

  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/jpeg");
  return dataUrl;
}

// export function generateBase64MaskImage(
//   segments,
//   segmentToIdx,
//   brushSelections,
//   width,
//   height
// ) {
//   const numChannels = 4;
//   const bytesArray = new Uint8Array(height * width * numChannels);

//   // Initialize to white, as the mask is expected to be black
//   bytesArray.fill(255);

//   // Add segments selections
//   for (let segment of segments) {
//     for (let idx of segmentToIdx[segment]) {
//       const i = numChannels * idx;
//       bytesArray[i + 0] = 0;
//       bytesArray[i + 1] = 0;
//       bytesArray[i + 2] = 0;
//     }
//   }

//   // Add brush stroke selections
//   for (let idx = 0; idx < brushSelections.length; idx++) {
//     if (brushSelections[idx] === 1) {
//       const i = numChannels * idx;
//       bytesArray[i + 0] = 0;
//       bytesArray[i + 1] = 0;
//       bytesArray[i + 2] = 0;
//     }
//   }

//   const imageData = new ImageData(
//     new Uint8ClampedArray(bytesArray),
//     width,
//     height
//   );

//   const canvas = document.createElement("canvas");
//   canvas.height = height;
//   canvas.width = width;
//   const ctx = canvas.getContext("2d");

//   ctx.putImageData(imageData, 0, 0);
//   const dataUrl = canvas.toDataURL("image/jpeg");
//   return dataUrl;
// }

export function readAndProcessImage(rawImage, setImage, fetchSegments) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const img = new Image();

  img.onload = () => {
    ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const finalImage = new Image();

    finalImage.onload = () => {
      setImage(finalImage);
    };

    const dataUrl = canvas.toDataURL("image/jpeg");
    finalImage.src = dataUrl;
    fetchSegments(dataUrl);
  };

  img.src = rawImage;
}

export function stripBase64Prefix(dataUrl) {
  return dataUrl.split("base64,").at(-1);
}
