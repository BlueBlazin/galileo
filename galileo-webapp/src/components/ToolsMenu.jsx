import React from "react";
import styled from "styled-components";
import Stack from "@mui/material/Stack";
import { GiArrowCursor } from "react-icons/gi";
import { HiSparkles } from "react-icons/hi2";
import { FaPaintBrush } from "react-icons/fa";
import { FaHatWizard } from "react-icons/fa";
import Tooltip from "@mui/material/Tooltip";

const Container = styled.div`
  margin-left: auto;
  margin-right: 750px;
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  background-color: ${(props) => (props.selected ? "#222" : "")};

  &:hover {
    background-color: #222;
    border: 1px solid #333;
  }

  &:active {
    background-color: #222;
  }
`;

export const ToolType = {
  Select: "Select",
  MagicSelect: "MagicSelect",
  Brush: "Brush",
  Wizard: "Wizard",
};

function ToolsMenu({ selectedTool, setSelectedTool }) {
  function handleSelect(tool) {
    console.log(tool, selectedTool);
    if (selectedTool === tool) {
      return;
    }

    switch (tool) {
      case ToolType.Select: {
        setSelectedTool(ToolType.Select);
        break;
      }
      case ToolType.MagicSelect: {
        setSelectedTool(ToolType.MagicSelect);
        break;
      }
      case ToolType.Brush: {
        setSelectedTool(ToolType.Brush);
        break;
      }
      case ToolType.Wizard: {
        setSelectedTool(ToolType.Wizard);
        break;
      }
    }
  }

  return (
    <Container>
      <Stack direction="row" spacing={3}>
        <Tooltip title="select">
          <IconContainer
            selected={selectedTool === ToolType.Select}
            onClick={() => handleSelect(ToolType.Select)}
          >
            <GiArrowCursor color="#fff" size={20} />
          </IconContainer>
        </Tooltip>

        <Tooltip title="brush">
          <IconContainer
            selected={selectedTool === ToolType.Brush}
            onClick={() => handleSelect(ToolType.Brush)}
          >
            <FaPaintBrush color="#fff" size={20} />
          </IconContainer>
        </Tooltip>

        <Tooltip title="magic select">
          <IconContainer
            selected={selectedTool === ToolType.MagicSelect}
            onClick={() => handleSelect(ToolType.MagicSelect)}
          >
            <MagicSelectIcon color="#fff" size={20} />
          </IconContainer>
        </Tooltip>

        <Tooltip title="wizard">
          <IconContainer
            selected={selectedTool === ToolType.Wizard}
            onClick={() => handleSelect(ToolType.Wizard)}
          >
            <FaHatWizard color="#fff" size={20} />
          </IconContainer>
        </Tooltip>
      </Stack>
    </Container>
  );
}

export default ToolsMenu;

const MagicSelectIconContainer = styled.div`
  position: relative;
`;

function MagicSelectIcon({ color, size }) {
  return (
    <MagicSelectIconContainer>
      <GiArrowCursor
        color={color}
        size={size}
        style={{
          position: "absolute",
          top: -size / 2,
          left: -size / 2 - 4,
        }}
      />
      <HiSparkles
        color="#fff"
        size={12}
        style={{
          position: "absolute",
          top: -12,
          left: 0,
        }}
      />
    </MagicSelectIconContainer>
  );
}
