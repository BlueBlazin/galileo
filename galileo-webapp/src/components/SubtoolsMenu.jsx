import React from "react";
import styled from "styled-components";
import { ToolType } from "./ToolsMenu";
import Slider from "@mui/material/Slider";
import { DEFAULT_BRUSH_RADIUS } from "../App";
import MuiInput from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { BiBlock } from "react-icons/bi";
import { CgDropInvert } from "react-icons/cg";
import { PiStickerFill } from "react-icons/pi";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";

import styleAnimeIcon from "../assets/style-anime.png";
import styleComicBookIcon from "../assets/style-comic-book.png";
import styleDigitalArtIcon from "../assets/style-digital-art.png";
import styleNeonPunkIcon from "../assets/style-neon-punk.png";
import stylePhotographicIcon from "../assets/style-photographic.png";

const PRESET_IMAGE_SIZE = 80;

export const StylePreset = {
  NoPreset: null,
  Anime: "anime",
  Photography: "photographic",
  ComicBook: "comic-book",
  DigitalArt: "digital-art",
  NeonPunk: "neon-punk",
};

const Input = styled(MuiInput)`
  width: 42px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 370px;
`;

function SubToolsMenu({
  selectedTool,
  brushRadius,
  setBrushRadius,
  clearSelection,
  invertSelection,
  saveAsSticker,
  stylePreset,
  setStylePreset,
}) {
  return (
    <Container>
      <StyleSelect stylePreset={stylePreset} setStylePreset={setStylePreset} />
      <BrushMenu brushRadius={brushRadius} setBrushRadius={setBrushRadius} />
      <SelectionMenu
        clearSelection={clearSelection}
        invertSelection={invertSelection}
        saveAsSticker={saveAsSticker}
      />
    </Container>
  );
}

export default SubToolsMenu;

const StylesContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 320px;
  border-radius: 4px;
  /* border: 1px solid #444; */
  margin-bottom: 50px;
`;

const StylesRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
`;

const StyleWrapper = styled.div`
  width: ${PRESET_IMAGE_SIZE + 5}px;
  height: ${PRESET_IMAGE_SIZE + 5}px;
  border-radius: 5px;
  position: relative;
  /* background: linear-gradient(135deg, purple, indigo, violet); */
  /* background: linear-gradient(135deg, #1b4ae3, #5489d6, #9b72cb, #f49c46); */
  /* background: linear-gradient(135deg, #6681db, #8ba7d2, #b19bcb, #e8c199); */
  /* background: ${(props) =>
    props.selected
      ? "linear-gradient(135deg, #6681db, #8ba7d2, #b19bcb, #e8c199)"
      : "#555"}; */
  background: ${(props) =>
    props.selected
      ? "linear-gradient(135deg, #1b4ae3, #5489d6, #9b72cb, #f49c46)"
      : "#555"};
  margin: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

const StyleContainer = styled.div`
  width: ${PRESET_IMAGE_SIZE}px;
  height: ${PRESET_IMAGE_SIZE}px;
  border-radius: 5px;
  color: #999;
  position: absolute;
  z-index: 1;
  background-color: #111;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyleImage = styled.img`
  user-select: none;
  -webkit-user-drag: none;
`;

function StyleSelect({ stylePreset, setStylePreset }) {
  return (
    <StylesContainer>
      <Typography
        id="input-slider"
        gutterBottom
        style={{ color: "#ddd" }}
        fontSize="small"
      >
        Style Preset
      </Typography>
      <StylesRow>
        <StyleWrapper
          selected={stylePreset === StylePreset.NoPreset}
          onClick={() => setStylePreset(StylePreset.NoPreset)}
        >
          <Tooltip title="No Preset">
            <StyleContainer>
              {/* <StyleImage
                src=""
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              /> */}
              <BiBlock color="#ddd" size={50} />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
        <StyleWrapper
          selected={stylePreset === StylePreset.Anime}
          onClick={() => setStylePreset(StylePreset.Anime)}
        >
          <Tooltip title="Anime">
            <StyleContainer>
              <StyleImage
                src={styleAnimeIcon}
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
        <StyleWrapper
          selected={stylePreset === StylePreset.Photography}
          onClick={() => setStylePreset(StylePreset.Photography)}
        >
          <Tooltip title="Photography">
            <StyleContainer>
              <StyleImage
                src={stylePhotographicIcon}
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
      </StylesRow>

      <StylesRow>
        <StyleWrapper
          selected={stylePreset === StylePreset.ComicBook}
          onClick={() => setStylePreset(StylePreset.ComicBook)}
        >
          <Tooltip title="Comic Book">
            <StyleContainer>
              <StyleImage
                src={styleComicBookIcon}
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
        <StyleWrapper
          selected={stylePreset === StylePreset.DigitalArt}
          onClick={() => setStylePreset(StylePreset.DigitalArt)}
        >
          <Tooltip title="Digital Art">
            <StyleContainer>
              <StyleImage
                src={styleDigitalArtIcon}
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
        <StyleWrapper
          selected={stylePreset === StylePreset.NeonPunk}
          onClick={() => setStylePreset(StylePreset.NeonPunk)}
        >
          <Tooltip title="Neon Punk">
            <StyleContainer>
              <StyleImage
                src={styleNeonPunkIcon}
                height={PRESET_IMAGE_SIZE}
                width={PRESET_IMAGE_SIZE}
              />
            </StyleContainer>
          </Tooltip>
        </StyleWrapper>
      </StylesRow>
    </StylesContainer>
  );
}

const SelectionContainer = styled.div`
  width: 300px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 70px;
  height: 70px;
  border-radius: 5px;
  border: 1px solid #333;
  margin-right: 30px;
`;

function SelectionMenu({ clearSelection, invertSelection, saveAsSticker }) {
  return (
    <>
      <Typography
        id="input-slider"
        gutterBottom
        style={{ color: "#ddd", marginRight: "200px", marginBottom: "25px" }}
        fontSize="small"
      >
        Selection options
      </Typography>
      <SelectionContainer>
        <IconContainer>
          <Tooltip title="Clear Selection">
            <IconButton aria-label="delete" onClick={clearSelection}>
              <BiBlock color="#ddd" size={50} />
            </IconButton>
          </Tooltip>
        </IconContainer>

        <IconContainer>
          <Tooltip title="Invert Selection">
            <IconButton aria-label="delete" onClick={invertSelection}>
              <CgDropInvert color="#ddd" size={50} />
            </IconButton>
          </Tooltip>
        </IconContainer>

        <IconContainer>
          <Tooltip title="Save As Sticker">
            <IconButton aria-label="delete" onClick={saveAsSticker}>
              <PiStickerFill color="#ddd" size={50} />
            </IconButton>
          </Tooltip>
        </IconContainer>
      </SelectionContainer>
    </>
  );
}

const BrushContainer = styled.div`
  width: 300px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 50px;
`;

const InputContainer = styled.div`
  margin-left: 30px;
`;

function BrushMenu({ brushRadius, setBrushRadius }) {
  function handleChange(e) {
    setBrushRadius(
      e.target.value === "" ? DEFAULT_BRUSH_RADIUS : Number(e.target.value)
    );
  }

  return (
    <div>
      <Typography
        id="input-slider"
        gutterBottom
        style={{ color: "#ddd" }}
        fontSize="small"
      >
        Brush Radius
      </Typography>
      <BrushContainer>
        <Slider
          value={brushRadius}
          onChange={handleChange}
          aria-labelledby="input-slider"
          step={1}
          min={1}
          max={100}
        />
        <InputContainer>
          <Input
            value={brushRadius}
            size="small"
            onChange={handleChange}
            inputProps={{
              step: 1,
              min: 1,
              max: 100,
              type: "number",
              "aria-labelledby": "input-slider",
            }}
          />
        </InputContainer>
      </BrushContainer>
    </div>
  );
}
