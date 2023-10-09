import React, { useState } from "react";
import InputAdornment from "@mui/material/InputAdornment";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import styled from "styled-components";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";

const Wrapper = styled.div`
  margin: 25px 5px;
  /* height: 225px; */
`;

function PromptBox({ handleImageGen, setHistory }) {
  const [value, setValue] = useState("");

  return (
    <Wrapper>
      <Box
        component="form"
        sx={{
          "& .MuiTextField-root": { m: 1, width: "325px" },
        }}
        noValidate
        autoComplete="off"
      >
        <TextField
          id="outlined-multiline-flexible"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          label="Prompt"
          multiline
          maxRows={7}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="generate image from prompt"
                  onClick={() => {
                    handleImageGen(value);
                    setHistory((history) => [value, ...history]);
                  }}
                  edge="end"
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Wrapper>
  );
}

export default PromptBox;
