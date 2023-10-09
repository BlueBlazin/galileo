import React from "react";
import styled from "styled-components";

export const TOOLBAR_HEIGHT = 80;
export const SUB_TOOLBAR_WIDTH = 400;
export const HISTORY_WIDTH = 300;

export const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #111;
`;

export const ToolsContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100vw;
  height: ${TOOLBAR_HEIGHT}px;
  background-color: #000;
  border-bottom: 1px solid #2d2c2b;
`;

export const AppBodySection = styled.div`
  display: flex;
`;

export const SubToolsContainer = styled.div`
  width: ${SUB_TOOLBAR_WIDTH}px;
  height: calc(100vh - ${TOOLBAR_HEIGHT}px);
  background-color: #000;
  border-left: 1px solid #2d2c2b;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const CanvasWrapper = styled.div`
  position: relative;
  width: calc(100vw - ${SUB_TOOLBAR_WIDTH}px - ${HISTORY_WIDTH}px);
  height: calc(100vh - ${TOOLBAR_HEIGHT}px);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;

  &::-webkit-scrollbar {
    width: 6px;
    background-color: #1a1a1a;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #555;
    border-radius: 4px;
  }
`;

export const CanvasContainer = styled.div`
  position: relative;
  background-color: #222;
  border-radius: 4px;
  width: 1024px;
  height: 768px;
  background-image: linear-gradient(45deg, #333 25%, transparent 25%),
    linear-gradient(135deg, #333 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #333 75%),
    linear-gradient(135deg, transparent 75%, #333 75%);
  background-size: 25px 25px; /* Must be a square */
  background-position: 0 0, 12.5px 0, 12.5px -12.5px, 0px 12.5px; /* Must be half of one side of the square */
`;

export const HistoryWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: ${HISTORY_WIDTH}px;
  min-height: calc(100vh - ${TOOLBAR_HEIGHT}px);
  padding: 25px 0;
`;

export const HistoryContainer = styled.div`
  display: flex;
  justify-content: center;
  width: ${HISTORY_WIDTH - 50}px;
  min-height: 100%;
  background-color: #222;
  border-radius: 10px;
`;
