import React, { useEffect, useRef, useState } from "react";
import { CanvasContainer, CanvasWrapper } from "./AppContainers";
import styled from "styled-components";
import { ToolType } from "./ToolsMenu";
import { CANVAS_SIZE } from "../utils";

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 4px;
`;

function CanvasArea({
  image,
  idxToSegment,
  segmentToIdx,
  selectedSegments,
  setSelectedSegments,
  hoveredSegment,
  setHoveredSegment,
  selectedTool,
  brushSelections,
  setBrushSelections,
  brushRadius,
  children,
}) {
  const [mouseDown, setMouseDown] = useState(false);
  const lastPoint = useRef([null, null]);
  const lastMouseLocation = useRef([null, null]);

  useEffect(() => {
    const canvas = document.getElementById("pseudo-canvas");

    if (selectedTool === ToolType.MagicSelect && hoveredSegment) {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "auto";
    }
  }, [hoveredSegment, selectedTool]);

  useEffect(() => {
    if (!image) {
      return;
    }

    const canvas = document.getElementById("pseudo-canvas");

    function paintBrushStroke(x, y) {
      const canvas = document.getElementById("free-layer");
      canvas.style.opacity = 0.5;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      ctx.beginPath();
      ctx.moveTo(lastPoint.current[0], lastPoint.current[1]);
      ctx.strokeStyle = `rgb(255, 70, 40)`;
      ctx.lineWidth = 2 * brushRadius;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPoint.current = [x, y];
    }

    function painBrush(x, y) {
      const canvas = document.getElementById("brush-layer");
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.beginPath(); // Start a new path
      ctx.arc(x, y, brushRadius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 70, 40, 0.75)";
      ctx.fill();
    }

    function handleMouseMove(e) {
      const [x, y] = [e.offsetX, e.offsetY];

      if (selectedTool === ToolType.MagicSelect) {
        const segmentId = idxToSegment[y * CANVAS_SIZE + x];
        setHoveredSegment(segmentId > 0 ? segmentId : null);
      } else if (selectedTool === ToolType.Brush) {
        if (mouseDown) {
          paintBrushStroke(x, y);
        }

        painBrush(x, y);
        lastMouseLocation.current = [x, y];
      }
    }

    function handleMouseEnter(e) {
      if (selectedTool === ToolType.Brush) {
        canvas.style.cursor = "none";
      }
    }

    function handleMouseLeave(e) {
      if (selectedTool === ToolType.MagicSelect) {
        setHoveredSegment(null);
      } else if (selectedTool === ToolType.Brush) {
        const canvas = document.getElementById("brush-layer");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      canvas.style.cursor = "auto";
    }

    function handleClick(e) {
      const [x, y] = [e.offsetX, e.offsetY];

      if (selectedTool === ToolType.MagicSelect) {
        const idx = y * CANVAS_SIZE + x;
        const segmentId = idxToSegment[idx];

        if (segmentId === 0) {
          return;
        }

        setSelectedSegments((oldSegments) => {
          if (oldSegments.includes(segmentId)) {
            return oldSegments.filter((id) => id !== segmentId);
          } else {
            return [segmentId, ...oldSegments];
          }
        });
      }
    }

    function handleMouseDown(e) {
      const [x, y] = [e.offsetX, e.offsetY];
      lastPoint.current = [x, y];
      setMouseDown(true);
    }

    function handleMouseUp(e) {
      if (selectedTool === ToolType.Brush) {
        // Extract pixels colored by the last brush stroke
        const canvas = document.getElementById("free-layer");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const newBrushSelections = [...brushSelections];

        for (let idx = 0; idx < CANVAS_SIZE * CANVAS_SIZE; idx++) {
          if (imageData.data[4 * idx + 0] > 0) {
            newBrushSelections[idx] = 1;
          }
        }

        setBrushSelections(newBrushSelections);
      }

      lastPoint.current = [null, null];
      setMouseDown(false);
    }

    if (
      selectedTool === ToolType.Brush &&
      lastMouseLocation.current[0] !== null
    ) {
      painBrush(lastMouseLocation.current[0], lastMouseLocation.current[1]);
    }

    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    image,
    idxToSegment,
    selectedTool,
    mouseDown,
    brushRadius,
    brushSelections,
  ]);

  useEffect(() => {
    if (!image) {
      return;
    }

    function paintImageLayer() {
      const canvas = document.getElementById("image-layer");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    function paintSelectedSegments() {
      const canvas = document.getElementById("segments-layer");
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

      selectedSegments.forEach((segmentId) => {
        segmentToIdx[segmentId].forEach((idx) => {
          imageData.data[4 * idx + 0] = 255;
          imageData.data[4 * idx + 1] = 70;
          imageData.data[4 * idx + 2] = 40;
          imageData.data[4 * idx + 3] = 100;
        });
      });

      ctx.putImageData(imageData, 0, 0);
    }

    function paintBrushSelections() {
      const canvas = document.getElementById("free-layer");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

      for (let idx = 0; idx < brushSelections.length; idx++) {
        if (brushSelections[idx]) {
          imageData.data[4 * idx + 0] = 255;
          imageData.data[4 * idx + 1] = 70;
          imageData.data[4 * idx + 2] = 40;
          imageData.data[4 * idx + 3] = 200;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }

    function paintHoverLayer() {
      if (selectedTool !== ToolType.MagicSelect) {
        return;
      }

      const canvas = document.getElementById("hover-layer");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (!hoveredSegment) {
        return;
      }

      const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      segmentToIdx[hoveredSegment]?.forEach((idx) => {
        imageData.data[4 * idx + 0] = 255;
        imageData.data[4 * idx + 1] = 70;
        imageData.data[4 * idx + 2] = 40;
        imageData.data[4 * idx + 3] = 200;
      });

      ctx.putImageData(imageData, 0, 0);
    }

    // Paint the base image on the canvas
    paintImageLayer();
    // Paint the selected segments on the canvas
    paintSelectedSegments();
    // Paint the brush selections on the canvas
    paintBrushSelections();
    // Paint the hovered segment if the current tool is 'magic select'
    paintHoverLayer();
    // Paint the brush circle if the current tool is 'brush'
  }, [image, selectedSegments, hoveredSegment, selectedTool, brushSelections]);

  // =========================================================================

  return (
    <CanvasWrapper>
      {children}
      <CanvasContainer>
        {image && (
          <Canvas id="image-layer" width={CANVAS_SIZE} height={CANVAS_SIZE} />
        )}
        {image && (
          <Canvas
            id="segments-layer"
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
          />
        )}
        {image && (
          <Canvas id="hover-layer" width={CANVAS_SIZE} height={CANVAS_SIZE} />
        )}
        {image && (
          <Canvas id="free-layer" width={CANVAS_SIZE} height={CANVAS_SIZE} />
        )}
        {image && (
          <Canvas id="brush-layer" width={CANVAS_SIZE} height={CANVAS_SIZE} />
        )}
        <Canvas id="pseudo-canvas" width={CANVAS_SIZE} height={CANVAS_SIZE} />
      </CanvasContainer>
    </CanvasWrapper>
  );
}

export default CanvasArea;

// import { useEffect } from "react";
// import { CanvasContainer, CanvasWrapper } from "./AppContainers";
// import styled from "styled-components";
// import { ToolType } from "./ToolsMenu";

// const Canvas = styled.canvas`
//   position: absolute;
//   top: 0;
//   left: 0;
//   border-radius: 4px;
// `;

// function CanvasArea({
//   image,
//   idxToSegment,
//   segmentToIdx,
//   selectedSegments,
//   setSelectedSegments,
//   hoveredSegment,
//   setHoveredSegment,
//   selectedTool,
//   children,
// }) {
//   const [height, width] = [image?.height, image?.width];

//   // =========================================================================
//   // Paint multiple layers over the canvas
//   // =========================================================================

//   useEffect(() => {
//     if (!image) {
//       return;
//     }

//     const canvas = document.getElementById("image-canvas");

//     function handleHover(x, y) {
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];
//       setHoveredSegment(segmentId === 0 ? null : segmentId);
//     }

//     function handleSelect(x, y) {
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];

//       if (segmentId === 0) {
//         return;
//       }

//       setSelectedSegments((oldSegments) => {
//         if (oldSegments.includes(segmentId)) {
//           return oldSegments.filter((id) => id !== segmentId);
//         } else {
//           return [segmentId, ...oldSegments];
//         }
//       });
//     }

//     function handleMouseMove(e) {
//       const [x, y] = [e.offsetX, e.offsetY];

//       if (selectedTool === ToolType.MagicSelect) {
//         handleHover(x, y);
//       }
//     }

//     function handleClick(e) {
//       const [x, y] = [e.offsetX, e.offsetY];

//       if (selectedTool === ToolType.MagicSelect) {
//         handleSelect(x, y);
//       }
//     }

//     canvas.addEventListener("mousemove", handleMouseMove);
//     canvas.addEventListener("click", handleClick);
//     return () => {
//       canvas.removeEventListener("mousemove", handleMouseMove);
//       canvas.removeEventListener("click", handleClick);
//     };
//   }, [image, selectedTool]);

//   useEffect(() => {
//     if (!image) {
//       return;
//     }

//     const canvas = document.getElementById("image-canvas");
//     const ctx = canvas.getContext("2d", { willReadFrequently: true });
//     const imageData = ctx.getImageData(0, 0, width, height);

//     function paintBaseImage() {
//       ctx.clearRect(0, 0, width, height);
//       ctx.drawImage(image, 0, 0, width, height);
//     }

//     function paintSelectedSegments() {
//       selectedSegments.forEach((segmentId) => {
//         segmentToIdx[segmentId].forEach((idx) => {
//           imageData.data[4 * idx + 0] = 255;
//           imageData.data[4 * idx + 0] = 70;
//           imageData.data[4 * idx + 0] = 40;
//           imageData.data[4 * idx + 0] = 100;
//         });
//       });
//     }

//     function paintBrushSelections() {}

//     function paintHoveredSegment() {
//       if (!hoveredSegment) {
//         return;
//       }

//       segmentToIdx[hoveredSegment].forEach((idx) => {
//         imageData.data[4 * idx + 0] = 255;
//         imageData.data[4 * idx + 0] = 70;
//         imageData.data[4 * idx + 0] = 40;
//         imageData.data[4 * idx + 0] = 200;
//       });

//       ctx.putImageData(imageData, 0, 0);
//     }

//     function paintBrushCursor() {}

//     // Paint the base image on the canvas
//     paintBaseImage();
//     // Paint the selected segments on the canvas
//     paintSelectedSegments();
//     // Paint the brush selections on the canvas
//     paintBrushSelections();
//     // Paint the hovered segment if the current tool is 'magic select'
//     paintHoveredSegment();
//     // Paint the brush circle if the current tool is 'brush'
//     paintBrushCursor();
//   }, [image, selectedSegments, hoveredSegment, selectedTool]);

//   // =========================================================================

//   function renderCanvas() {
//     return <Canvas id="image-canvas" width={width} height={height}></Canvas>;
//   }

//   return (
//     <CanvasWrapper>
//       {children}
//       <CanvasContainer>{image && renderCanvas()}</CanvasContainer>
//     </CanvasWrapper>
//   );
// }

// export default CanvasArea;

// function MaskLayer({
//   height,
//   width,
//   selectedSegments,
//   idxToSegment,
//   segmentToIdx,
//   setSelectedSegments,
//   hoveredSegment,
//   setHoveredSegment,
//   selectedTool,
// }) {
//   // Add event listeners
//   useEffect(() => {
//     const canvas = document.getElementById("hovered-overlay-canvas");

//     function handleHover(e) {
//       if (selectedTool !== ToolType.MagicSelect) {
//         return;
//       }

//       const [x, y] = [e.offsetX, e.offsetY];
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];

//       if (segmentId === 0) {
//         setHoveredSegment(null);
//       } else {
//         setHoveredSegment(segmentId);
//       }
//     }

//     function handleSelect(e) {
//       if (selectedTool !== ToolType.MagicSelect) {
//         return;
//       }

//       const [x, y] = [e.offsetX, e.offsetY];
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];

//       if (segmentId > 0) {
//         setSelectedSegments((selectedSegs) => {
//           if (selectedSegs.includes(segmentId)) {
//             return selectedSegs.filter((id) => id !== segmentId);
//           } else {
//             return [segmentId, ...selectedSegs];
//           }
//         });
//       }
//     }

//     function handleMouseLeave() {
//       setHoveredSegment(null);
//     }

//     canvas.addEventListener("mousemove", handleHover);
//     canvas.addEventListener("mouseleave", handleMouseLeave);
//     canvas.addEventListener("click", handleSelect);

//     return () => {
//       canvas.removeEventListener("mousemove", handleHover);
//       canvas.removeEventListener("mouseleave", handleMouseLeave);
//       canvas.removeEventListener("click", handleSelect);
//     };
//   }, [selectedTool]);

//   // Draw all selected segment overlays
//   useEffect(() => {
//     const canvas = document.getElementById("overlay-canvas");
//     const ctx = canvas.getContext("2d");
//     const overlays = ctx.createImageData(width, height);

//     function drawOverlay(segmentId) {
//       for (let idx of segmentToIdx[segmentId]) {
//         const i = 4 * idx;
//         overlays.data[i + 0] = 255;
//         overlays.data[i + 1] = 70;
//         overlays.data[i + 2] = 40;
//         overlays.data[i + 3] = 100;
//       }
//     }

//     selectedSegments.forEach(drawOverlay);
//     ctx.clearRect(0, 0, width, height);
//     ctx.putImageData(overlays, 0, 0);
//   }, [selectedSegments]);

//   // Draw hovered segment overlay
//   useEffect(() => {
//     const canvas = document.getElementById("hovered-overlay-canvas");
//     const ctx = canvas.getContext("2d");

//     if (!hoveredSegment) {
//       ctx.clearRect(0, 0, width, height);
//       return;
//     }

//     const overlays = ctx.createImageData(width, height);

//     for (let idx of segmentToIdx[hoveredSegment]) {
//       const i = 4 * idx;
//       overlays.data[i + 0] = 255;
//       overlays.data[i + 1] = 70;
//       overlays.data[i + 2] = 40;
//       overlays.data[i + 3] = 200;
//     }

//     ctx.putImageData(overlays, 0, 0);
//   }, [hoveredSegment]);

//   return (
//     <>
//       <Canvas id="overlay-canvas" height={height} width={width}></Canvas>
//       <Canvas
//         id="hovered-overlay-canvas"
//         height={height}
//         width={width}
//       ></Canvas>
//     </>
//   );
// }

// function BrushLayer({ height, width, selectedTool }) {
//   useEffect(() => {
//     const canvas = document.getElementById("brush-canvas");

//     function handleMouseMove(e) {
//       if (selectedTool !== ToolType.Brush) {
//         return;
//       }
//     }

//     canvas.addEventListener("mousemove", handleMouseMove);

//     return () => {
//       canvas.removeEventListener("mousemove", handleMouseMove);
//     };
//   }, [selectedTool]);

//   return <Canvas id="brush-canvas" height={height} width={width}></Canvas>;
// }

// import { useEffect } from "react";
// import { CanvasContainer, CanvasWrapper } from "./AppContainers";
// import styled from "styled-components";
// import { ToolType } from "./ToolsMenu";

// const Canvas = styled.canvas`
//   position: absolute;
//   top: 0;
//   left: 0;
//   border-radius: 4px;
// `;

// function CanvasArea({
//   image,
//   idxToSegment,
//   segmentToIdx,
//   selectedSegments,
//   setSelectedSegments,
//   hoveredSegment,
//   setHoveredSegment,
//   selectedTool,
//   children,
// }) {
//   const [height, width] = [image?.height, image?.width];

//   function renderCanvases() {
//     return (
//       <>
//         {image && <BaseLayer image={image} width={width} height={height} />}
//         {image && idxToSegment && (
//           <MaskLayer
//             height={height}
//             width={width}
//             selectedSegments={selectedSegments}
//             idxToSegment={idxToSegment}
//             segmentToIdx={segmentToIdx}
//             setSelectedSegments={setSelectedSegments}
//             hoveredSegment={hoveredSegment}
//             setHoveredSegment={setHoveredSegment}
//             selectedTool={selectedTool}
//           />
//         )}
//         {image && (
//           <BrushLayer
//             height={height}
//             width={width}
//             selectedTool={selectedTool}
//           />
//         )}
//       </>
//     );
//   }

//   return (
//     <CanvasWrapper>
//       {children}
//       <CanvasContainer>{image && renderCanvases()}</CanvasContainer>
//     </CanvasWrapper>
//   );
// }

// export default CanvasArea;

// function BaseLayer({ image, width, height }) {
//   useEffect(() => {
//     const canvas = document.getElementById("image-canvas");
//     const ctx = canvas.getContext("2d");

//     ctx.clearRect(0, 0, width, height);
//     ctx.drawImage(image, 0, 0, width, height);
//   }, [image]);

//   return <Canvas id="image-canvas" width={width} height={height}></Canvas>;
// }

// function MaskLayer({
//   height,
//   width,
//   selectedSegments,
//   idxToSegment,
//   segmentToIdx,
//   setSelectedSegments,
//   hoveredSegment,
//   setHoveredSegment,
//   selectedTool,
// }) {
//   // Add event listeners
//   useEffect(() => {
//     const canvas = document.getElementById("hovered-overlay-canvas");

//     function handleHover(e) {
//       if (selectedTool !== ToolType.MagicSelect) {
//         canvas.style.cursor = "auto";
//         return;
//       }

//       const [x, y] = [e.offsetX, e.offsetY];
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];

//       if (segmentId === 0) {
//         setHoveredSegment(null);
//         canvas.style.cursor = "auto";
//       } else {
//         setHoveredSegment(segmentId);
//         canvas.style.cursor = "pointer";
//       }
//     }

//     function handleSelect(e) {
//       if (selectedTool !== ToolType.MagicSelect) {
//         return;
//       }

//       const [x, y] = [e.offsetX, e.offsetY];
//       const idx = y * width + x;
//       const segmentId = idxToSegment[idx];

//       if (segmentId > 0) {
//         setSelectedSegments((selectedSegs) => {
//           if (selectedSegs.includes(segmentId)) {
//             return selectedSegs.filter((id) => id !== segmentId);
//           } else {
//             return [segmentId, ...selectedSegs];
//           }
//         });
//       }
//     }

//     function handleMouseLeave() {
//       setHoveredSegment(null);
//     }

//     canvas.addEventListener("mousemove", handleHover);
//     canvas.addEventListener("mouseleave", handleMouseLeave);
//     canvas.addEventListener("click", handleSelect);

//     return () => {
//       canvas.removeEventListener("mousemove", handleHover);
//       canvas.removeEventListener("mouseleave", handleMouseLeave);
//       canvas.removeEventListener("click", handleSelect);
//     };
//   }, [selectedTool]);

//   // Draw all selected segment overlays
//   useEffect(() => {
//     const canvas = document.getElementById("overlay-canvas");
//     const ctx = canvas.getContext("2d");
//     const overlays = ctx.createImageData(width, height);

//     function drawOverlay(segmentId) {
//       for (let idx of segmentToIdx[segmentId]) {
//         const i = 4 * idx;
//         overlays.data[i + 0] = 255;
//         overlays.data[i + 1] = 70;
//         overlays.data[i + 2] = 40;
//         overlays.data[i + 3] = 100;
//       }
//     }

//     selectedSegments.forEach(drawOverlay);
//     ctx.clearRect(0, 0, width, height);
//     ctx.putImageData(overlays, 0, 0);
//   }, [selectedSegments]);

//   // Draw hovered segment overlay
//   useEffect(() => {
//     const canvas = document.getElementById("hovered-overlay-canvas");
//     const ctx = canvas.getContext("2d");

//     if (!hoveredSegment) {
//       ctx.clearRect(0, 0, width, height);
//       return;
//     }

//     const overlays = ctx.createImageData(width, height);

//     for (let idx of segmentToIdx[hoveredSegment]) {
//       const i = 4 * idx;
//       overlays.data[i + 0] = 255;
//       overlays.data[i + 1] = 70;
//       overlays.data[i + 2] = 40;
//       overlays.data[i + 3] = 200;
//     }

//     ctx.putImageData(overlays, 0, 0);
//   }, [hoveredSegment]);

//   return (
//     <>
//       <Canvas id="overlay-canvas" height={height} width={width}></Canvas>
//       <Canvas
//         id="hovered-overlay-canvas"
//         height={height}
//         width={width}
//       ></Canvas>
//     </>
//   );
// }

// function BrushLayer({ height, width, selectedTool }) {
//   useEffect(() => {
//     const canvas = document.getElementById("brush-canvas");

//     function handleMouseMove(e) {
//       if (selectedTool !== ToolType.Brush) {
//         canvas.style.cursor = "auto";
//         return;
//       }

//       canvas.style.cursor = "crosshair";
//     }

//     function handleMouseEnter() {
//       canvas.style.cursor = "crosshair";
//     }
//     function handleMouseLeave() {
//       canvas.style.cursor = "auto";
//     }

//     canvas.addEventListener("mousemove", handleMouseMove);
//     canvas.addEventListener("mouseenter", handleMouseEnter);
//     canvas.addEventListener("mouseleave", handleMouseLeave);

//     return () => {
//       canvas.style.cursor = "auto";
//       canvas.removeEventListener("mousemove", handleMouseMove);
//       canvas.removeEventListener("mouseenter", handleMouseEnter);
//       canvas.removeEventListener("mouseleave", handleMouseLeave);
//     };
//   }, [selectedTool]);

//   return <Canvas id="brush-canvas" height={height} width={width}></Canvas>;
// }
