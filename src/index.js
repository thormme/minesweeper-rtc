import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import './index.css';

const ydoc = new Y.Doc();
// clients connected to the same room-name share document updates
const provider = new WebrtcProvider('testing-room-12345678909876543218', ydoc);
const boardMines = ydoc.getMap('boardMines');
const boardVisibility = ydoc.getMap('boardVisibility');
const boardOptions = ydoc.getMap('boardOptions');
const cursorPositions = ydoc.getMap('cursorPositions');

let mineElements = [];
let cursorElements = [];

const CELL_HIDDEN = 0;
const CELL_REVEALED = 1;
const CELL_FLAGGED = 2;

provider.on('peers', peerInfo => {
    for (let peer of peerInfo.added) {
        let cursor = document.createElement("div");
        cursor.className = 'cursor';
        document.body.appendChild(cursor);
        cursorElements[peer] = cursor;
    }
    for (let peer of peerInfo.removed) {
        let cursor = cursorElements[peer];
        if (cursor) {
            document.body.removeChild(cursor);
        }
    }
})

cursorPositions.observe((event) => {
    for (let key of event.keysChanged) {
        if (cursorElements[key]) {
            cursorElements[key].style.left = `${cursorPositions.get(key).x}px`;
            cursorElements[key].style.top = `${cursorPositions.get(key).y}px`;
        }
    }
});

boardOptions.observe((event) => {
    for (let key of event.keysChanged) {
        switch (key) {
            case 'boardWidth':
                createBoard();
                break;
            case 'boardHeight':
                createBoard();
                break;
            case 'numMines':
                break;
            default:
                break;
        }
    }
});

boardVisibility.observe((event, e2, e3) => {
    for (let key of event.keysChanged) {

      //console.log(event.changes.keys.get(key).action);
      if (mineElements[key] === undefined) {
          return;
      }
      mineElements[key].className = 'cell'
      if (boardVisibility.get(key) == CELL_REVEALED) {
          mineElements[key].classList.add('revealed');
          if (boardMines.get(key) === true) {
              mineElements[key].classList.add('mine');
          } else {
              let count = 0;
              let boardWidth = boardOptions.get('boardWidth');
              let boardHeight = boardOptions.get('boardHeight');
              let keyY = Math.floor(parseInt(key) / boardWidth);
              let keyX = parseInt(key) % boardWidth;
              for (let y = keyY - (keyY > 0 ? 1 : 0); y <= keyY + 1 && y < boardHeight; y++) {
                  for (let x = keyX - (keyX > 0 ? 1 : 0); x <= keyX + 1 && x < boardWidth; x++) {
                      let checkIndex = x + y * boardWidth;
                      if (boardMines.get(`${checkIndex}`) === true) {
                          count++;
                      }
                  }
              }
              let numClass = 'revealed';
              switch (count) {
                  case 0:
                      numClass = 'revealed';
                      break;
                  case 1:
                      numClass = 'one';
                      break;
                  case 2:
                      numClass = 'two';
                      break;
                  case 3:
                      numClass = 'three';
                      break;
                  case 4:
                      numClass = 'four';
                      break;
                  case 5:
                      numClass = 'five';
                      break;
                  case 6:
                      numClass = 'six';
                      break;
                  case 7:
                      numClass = 'seven';
                      break;
                  case 8:
                      numClass = 'eight';
                      break;
                  default:
                      numClass = 'revealed';
              }
              mineElements[key].classList.add(numClass);
          }
      } else if (boardVisibility.get(key) == CELL_HIDDEN) {
          // nothing
      } else if (boardVisibility.get(key) == CELL_FLAGGED) {
          mineElements[key].classList.add('flag');
      }

      //mineElements[key].textContent = boardMines.get(key) === true ? '1' : '0';
  }
});

function floodFill(index) {
    boardVisibility.set(`${index}`, CELL_REVEALED);
    let count = 0;
    let boardWidth = boardOptions.get('boardWidth');
    let boardHeight = boardOptions.get('boardHeight');
    let keyY = Math.floor(index / boardWidth);
    let keyX = index % boardWidth;
    for (let y = keyY - (keyY > 0 ? 1 : 0); y <= keyY + 1 && y < boardHeight; y++) {
        for (let x = keyX - (keyX > 0 ? 1 : 0); x <= keyX + 1 && x < boardWidth; x++) {
            let checkIndex = x + y * boardWidth;
            if (boardMines.get(`${checkIndex}`) === true) {
                count++;
            }
        }
    }
    if (count === 0) {
        for (let y = keyY - (keyY > 0 ? 1 : 0); y <= keyY + 1 && y < boardHeight; y++) {
            for (let x = keyX - (keyX > 0 ? 1 : 0); x <= keyX + 1 && x < boardWidth; x++) {
                let checkIndex = x + y * boardWidth;
                if (!(x === keyX && y === keyY) && boardVisibility.get(`${checkIndex}`) !== CELL_REVEALED) {
                    floodFill(checkIndex);
                }
            }
        }
    }
}

function createBoard() {
    var board = document.querySelector('.board') || document.createElement("ul");
    board.className = "board";
    board.style.gridTemplateColumns = `repeat(${boardOptions.get('boardWidth')}, 16px)`;

    for (let cell of mineElements) {
        board.removeChild(cell);
    }
    mineElements = [];

    for (let i = 0; i < boardOptions.get('boardWidth') * boardOptions.get('boardHeight'); i++) {
        var cell = document.createElement("li");                 // Create a <li> node
        cell.className = "cell";
        //var textnode = document.createTextNode("0");         // Create a text node
        //cell.appendChild(textnode);                              // Append the text to <li>
        board.appendChild(cell);
        mineElements[i] = cell;

        cell.addEventListener('click', () => {
            if (boardVisibility.get(`${i}`) !== CELL_FLAGGED) {
                floodFill(i);
            }
        });

        cell.addEventListener('contextmenu', (e) => {
            if (boardVisibility.get(`${i}`) === CELL_HIDDEN || boardVisibility.get(`${i}`) === undefined) {
                boardVisibility.set(`${i}`, CELL_FLAGGED);
            } else if (boardVisibility.get(`${i}`) === CELL_FLAGGED) {
                boardVisibility.set(`${i}`, CELL_HIDDEN);
            }
            e.preventDefault();
            return false;
        });
    }
    document.body.appendChild(board);
}

window.addEventListener('DOMContentLoaded', (event) => {
    document.body.addEventListener('mousemove', e => {
        let x = e.clientX;
        let y = e.clientY;
        cursorPositions.set(provider.room.peerId, {x: x, y: y})
    });

    let newGameButton = document.querySelector('#new-game');
    newGameButton.addEventListener('click', () => {
        let boardWidth = document.querySelector('#board-width').value;
        let boardHeight = document.querySelector('#board-height').value;
        let numMines = document.querySelector('#num-mines').value;
        numMines = Math.min(numMines, boardWidth * boardHeight);

        boardOptions.set("boardWidth", boardWidth);
        boardOptions.set("boardHeight", boardHeight);
        boardOptions.set("numMines", numMines);

        for (let i = 0; i < boardWidth * boardHeight; i++) {
            boardMines.set(`${i}`, false);
            boardVisibility.set(`${i}`, CELL_HIDDEN);
        }
        for (let i = 0; i < numMines; i++) {
            let pos = Math.floor(Math.random() * boardWidth * boardHeight);
            while (boardMines.get(`${pos}`) == true) { // TODO: This probably doesn't work
                pos = Math.floor(Math.random() * boardWidth * boardHeight);
            }
            boardMines.set(`${pos}`, true);
        }
    });
});
