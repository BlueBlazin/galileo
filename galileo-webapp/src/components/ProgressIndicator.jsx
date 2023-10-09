import React from "react";
import styled, { keyframes } from "styled-components";
import magicIcon from "../assets/magic.gif";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningImage = styled.img`
  animation: ${spin} 1.5s linear infinite;
`;

const Container = styled.div`
  width: 35px;
  height: 35px;
  border-radius: 5px;
  position: absolute;
  top: 50px;
  left: 18px;
  border-radius: 50%;
  overflow: hidden;
`;

function ProgressIndicator() {
  return (
    <Container>
      <SpinningImage
        src={magicIcon}
        alt="Sparkles icon"
        width={40}
        height={40}
      />
    </Container>
  );
}

export default ProgressIndicator;
