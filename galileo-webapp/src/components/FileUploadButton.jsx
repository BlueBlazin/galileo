import React from "react";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import styled from "styled-components";

const VisuallyHiddenInput = styled.input`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

export default function FileUploadButton({ onChange }) {
  return (
    <Button
      component="label"
      variant="outlined"
      startIcon={<CloudUploadIcon />}
      style={{
        height: 35,
        width: 130,
        fontSize: 10,
        margin: 35,
      }}
    >
      Upload file
      <VisuallyHiddenInput type="file" accept="image/*" onChange={onChange} />
    </Button>
  );
}
