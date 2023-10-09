import React, { useEffect, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  AppBodySection,
  AppContainer,
  HistoryContainer,
  HistoryWrapper,
  SubToolsContainer,
  ToolsContainer,
} from "./components/AppContainers";
import FileUploadButton from "./components/FileUploadButton";
import CanvasArea from "./components/CanvasArea";
import {
  CANVAS_SIZE,
  generateBase64MaskImage,
  readAndProcessImage,
  stripBase64Prefix,
} from "./utils";
import PromptBox from "./components/PromptBox";
import ProgressIndicator from "./components/ProgressIndicator";
import ToolsMenu, { ToolType } from "./components/ToolsMenu";
import SubToolsMenu, { StylePreset } from "./components/SubtoolsMenu";
import History from "./components/History";

const EMPTY_CANVAS_RAW = new Array(CANVAS_SIZE * CANVAS_SIZE).fill(0);
export const DEFAULT_BRUSH_RADIUS = 15;

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function App() {
  const [image, setImage] = useState(null);
  const [idxToSegment, setIdxToSegment] = useState(null);
  const [segmentToIdx, setSegmentToIdx] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [awaitingResponse, setawaitingResponse] = useState(false);
  const [selectedTool, setSelectedTool] = useState(ToolType.Select);
  const [brushSelections, setBrushSelections] = useState(EMPTY_CANVAS_RAW);
  const [brushRadius, setBrushRadius] = useState(DEFAULT_BRUSH_RADIUS);
  const [history, setHistory] = useState([]);
  const [stylePreset, setStylePreset] = useState(StylePreset.NoPreset);

  useEffect(() => {
    function handleMessage(e) {
      const rawImage = e.data.imageDataUrl;
      if (rawImage) {
        setawaitingResponse(true);
        readAndProcessImage(rawImage, setImage, (dataUrl) => {
          fetchSegments(stripBase64Prefix(dataUrl));
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if ("launchQueue" in window && "files" in LaunchParams.prototype) {
      launchQueue.setConsumer((launchParams) => {
        // Nothing to do when the queue is empty.
        if (!launchParams.files.length) {
          return;
        }

        const fileHandle = launchParams.files[0];
        fileHandle.getFile().then((blob) => {
          const rawImage = window.URL.createObjectURL(blob);
          setawaitingResponse(true);
          readAndProcessImage(rawImage, setImage, (dataUrl) => {
            fetchSegments(stripBase64Prefix(dataUrl));
          });
        });
      });
    }
  }, []);

  useEffect(() => {
    function handleKeyPress(e) {
      e.preventDefault();
      if (e.key === "[") {
        setBrushRadius((radius) => Math.max(radius - 5, 0));
      } else if (e.key === "]") {
        setBrushRadius((radius) => Math.min(radius + 5, 100));
      }
    }

    if (selectedTool === ToolType.Brush) {
      document.addEventListener("keypress", handleKeyPress);
    } else {
      document.removeEventListener("keypress", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keypress", handleKeyPress);
    };
  }, [selectedTool]);

  function clearSelection() {
    setSelectedSegments([]);
    setBrushSelections(EMPTY_CANVAS_RAW);
    setSelectedTool(ToolType.Select);
  }

  function invertSelection() {
    // Set everything to selected
    const newBrushSelections = new Array(CANVAS_SIZE * CANVAS_SIZE).fill(1);

    // Remove brush selection pixels
    for (let idx = 0; idx < brushSelections.length; idx++) {
      newBrushSelections[idx] = 1 - brushSelections[idx];
    }

    // Remove segment selection pixels
    selectedSegments.forEach((segmentId) => {
      segmentToIdx[segmentId].forEach((idx) => {
        newBrushSelections[idx] = 0;
      });
    });

    setSelectedSegments([]);
    setBrushSelections(newBrushSelections);
  }

  function saveAsSticker() {
    if (!image) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const boundingBox = {
      x1: Infinity,
      y1: Infinity,
      x2: -Infinity,
      y2: -Infinity,
    };

    const idxToPos = (idx) => [
      idx % CANVAS_SIZE,
      Math.floor(idx / CANVAS_SIZE),
    ];

    // Make everything transparent
    for (let idx = 0; idx < CANVAS_SIZE * CANVAS_SIZE; idx++) {
      imageData.data[4 * idx + 3] = 0;
    }
    // Make sleected pixels opaque
    for (let idx = 0; idx < brushSelections.length; idx++) {
      if (brushSelections[idx]) {
        imageData.data[4 * idx + 3] = 255;

        const [x, y] = idxToPos(idx);
        boundingBox.x = Math.min(boundingBox.x, x);
        boundingBox.y = Math.min(boundingBox.y, y);
        boundingBox.x2 = Math.max(boundingBox.x2, x);
        boundingBox.y2 = Math.max(boundingBox.y2, y);
      }
    }

    selectedSegments.forEach((segmentId) => {
      segmentToIdx[segmentId].forEach((idx) => {
        imageData.data[4 * idx + 3] = 255;

        const [x, y] = idxToPos(idx);
        boundingBox.x1 = Math.min(boundingBox.x1, x);
        boundingBox.y1 = Math.min(boundingBox.y1, y);
        boundingBox.x2 = Math.max(boundingBox.x2, x);
        boundingBox.y2 = Math.max(boundingBox.y2, y);
      });
    });

    // Put image data back on the canvas
    ctx.putImageData(imageData, 0, 0);

    // Crop the image based on the bounds
    const stickerCanvas = document.createElement("canvas");
    stickerCanvas.width = boundingBox.x2 - boundingBox.x1;
    stickerCanvas.height = boundingBox.y2 - boundingBox.y1;
    const stickerCtx = stickerCanvas.getContext("2d");

    stickerCtx.putImageData(
      ctx.getImageData(
        boundingBox.x1,
        boundingBox.y1,
        stickerCanvas.width,
        stickerCanvas.height
      ),
      0,
      0
    );

    // Save image to disk
    const link = document.createElement("a");
    link.download = "sticker.png";
    link.href = stickerCanvas.toDataURL("image/png");
    link.click();
  }

  function resetState() {
    setImage(null);
    setIdxToSegment(null);
    setSegmentToIdx(null);
    setSelectedSegments([]);
    setHoveredSegment(null);
    setSelectedTool(ToolType.Select);
    setBrushSelections(EMPTY_CANVAS_RAW);
    setBrushRadius(DEFAULT_BRUSH_RADIUS);
    setStylePreset(StylePreset.NoPreset);
  }

  function getSegmentsFromData(base64Masks) {
    const bytesString = atob(base64Masks);
    const byteArray = new Uint8Array(bytesString.length);

    for (let i = 0; i < bytesString.length; i++) {
      byteArray[i] = bytesString.charCodeAt(i);
    }

    const segments = [];

    for (let i = 0; i < byteArray.length; i++) {
      segments.push(byteArray[i]);
    }

    return segments;
  }

  function createSegmentToIdxMap(segments) {
    const segToIdx = {};

    for (let i = 0; i < segments.length; i++) {
      const segmentId = segments[i];

      if (segmentId > 0) {
        if (!segToIdx[segmentId]) {
          segToIdx[segmentId] = [i];
        } else {
          segToIdx[segmentId].push(i);
        }
      }
    }

    return segToIdx;
  }

  function processRawSegments(base64Masks) {
    const segments = getSegmentsFromData(base64Masks);
    const segToIdx = createSegmentToIdxMap(segments);

    setIdxToSegment(segments);
    setSegmentToIdx(segToIdx);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];

    if (file) {
      // Convert the selected file to base64
      const reader = new FileReader();

      reader.onload = (e) => {
        const rawImage = e.target.result;

        readAndProcessImage(rawImage, setImage, (dataUrl) => {
          fetchSegments(stripBase64Prefix(dataUrl));
          // fetchSetImage(dataUrl);
        });
      };

      reader.readAsDataURL(file);
      setawaitingResponse(true);
    }
  }

  function fetchSetImage(base64Data) {
    fetch("http://localhost:8000/set-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Data }),
    }).then((response) => {
      setawaitingResponse(false);
    });
  }

  function fetchSegments(base64Data) {
    // Make the request to the backend sever
    fetch("http://localhost:8000/segment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Data, prompt: "" }),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        processRawSegments(data.masks);
        setawaitingResponse(false);
      });
  }

  function handleImageGen(prompt) {
    // Get the image and mask as base64 encoded strings
    const base64Image = image.src;
    const base64Mask = generateBase64MaskImage(
      selectedSegments,
      segmentToIdx,
      brushSelections,
      image.width,
      image.height
    );

    // Make the request to the backend server
    fetch("http://localhost:8000/erase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: stripBase64Prefix(base64Image),
        mask: stripBase64Prefix(base64Mask),
      }),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        // Reset state
        resetState();

        // Set new image
        readAndProcessImage(data.image, setImage, (dataUrl) => {
          // fetchSegments(stripBase64Prefix(dataUrl));
        });
      });

    // setawaitingResponse(true);
  }

  // function handleImageGen(prompt) {
  //   // Get the image and mask as base64 encoded strings
  //   const base64Image = image.src;
  //   const base64Mask = generateBase64MaskImage(
  //     selectedSegments,
  //     segmentToIdx,
  //     brushSelections,
  //     image.width,
  //     image.height
  //   );

  //   // Make the request to the backend server
  //   fetch("http://localhost:8000/generate", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       image: stripBase64Prefix(base64Image),
  //       mask: stripBase64Prefix(base64Mask),
  //       prompt,
  //       style: stylePreset,
  //     }),
  //   })
  //     .then((response) => {
  //       return response.json();
  //     })
  //     .then((data) => {
  //       // Reset state
  //       resetState();

  //       // Set new image
  //       readAndProcessImage(data.image, setImage, (dataUrl) => {
  //         fetchSegments(stripBase64Prefix(dataUrl));
  //       });
  //     });

  //   setawaitingResponse(true);
  // }

  return (
    <ThemeProvider theme={darkTheme}>
      <AppContainer>
        <ToolsContainer>
          <FileUploadButton onChange={handleFileChange} />
          <ToolsMenu
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
          />
        </ToolsContainer>
        <AppBodySection>
          <HistoryWrapper>
            <HistoryContainer>
              <History history={history} />
            </HistoryContainer>
          </HistoryWrapper>
          <CanvasArea
            image={image}
            idxToSegment={idxToSegment}
            segmentToIdx={segmentToIdx}
            selectedSegments={selectedSegments}
            setSelectedSegments={setSelectedSegments}
            hoveredSegment={hoveredSegment}
            setHoveredSegment={setHoveredSegment}
            selectedTool={selectedTool}
            brushSelections={brushSelections}
            setBrushSelections={setBrushSelections}
            brushRadius={brushRadius}
          >
            {awaitingResponse && <ProgressIndicator />}
          </CanvasArea>
          <SubToolsContainer>
            <PromptBox
              handleImageGen={handleImageGen}
              setHistory={setHistory}
            />
            <SubToolsMenu
              selectedTool={selectedTool}
              brushRadius={brushRadius}
              setBrushRadius={setBrushRadius}
              clearSelection={clearSelection}
              invertSelection={invertSelection}
              saveAsSticker={saveAsSticker}
              stylePreset={stylePreset}
              setStylePreset={setStylePreset}
            />
          </SubToolsContainer>
        </AppBodySection>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;
