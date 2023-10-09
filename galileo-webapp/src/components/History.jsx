import React from "react";
import styled from "styled-components";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { TransitionGroup } from "react-transition-group";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const ItemContainer = styled.div`
  color: #ddd;
  border: 1px solid #333;
  border-radius: 4px;
  margin: 5px 0;
  width: 220px;
`;

const MAX_LENGTH = 18;

function History({ history }) {
  function formatPrompt(prompt) {
    return prompt.length <= MAX_LENGTH
      ? prompt
      : `${prompt.slice(0, MAX_LENGTH)}...`;
  }

  function handleCopy(prompt) {
    navigator.clipboard.writeText(prompt);
  }

  function renderItems() {
    return history.map((prompt, idx) => (
      <Collapse key={`${idx}-${prompt}`}>
        <ItemContainer>
          <ListItem
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                title="Copy"
                onClick={() => handleCopy(prompt)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText primary={formatPrompt(prompt)} />
          </ListItem>
        </ItemContainer>
      </Collapse>
    ));
  }

  return (
    <List sx={{ mt: 1 }}>
      <TransitionGroup>{renderItems()}</TransitionGroup>
    </List>
  );
}

export default History;
