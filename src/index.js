import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import './index.css';

const ydoc = new Y.Doc();
// clients connected to the same room-name share document updates
const provider = new WebrtcProvider('testing-room-12345678909876543218', ydoc);
const boardMines = ydoc.getMap('boardMines');
const boardInteractions = ydoc.getMap('boardInteractions');
const boardOptions = ydoc.getMap('boardOptions');
const cursorPositions = ydoc.getMap('cursorPositions');

let mineElements = [];
let cursorElements = [];
let boardVisibility = [];
let flagPositions = new Set(); // Used to track remaining mines
let redrawTimeout;

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

boardMines.observe((event) => {
    // Redraw whole board for any changed mine.
    // This is slow when generating new boards, but needed to support flood fill.
    redrawBoard();
});

function redrawBoard() {
    // This is a hack to avoid redrawing the board many times in quick succession
    // Only render after a short timeout.
    if (redrawTimeout) {
        window.clearTimeout(redrawTimeout);
    }
    redrawTimeout = window.setTimeout(() => {
        let boardWidth = boardOptions.get('boardWidth');
        let boardHeight = boardOptions.get('boardHeight');

        for (let i = 0; i < boardWidth * boardHeight; i++) {
            mineElements[i].className = "cell";
            boardVisibility[i] = false;
        }
        clearFlagPositions();
        for (let i of boardInteractions.keys()) {
            updateCellVisibility(parseInt(i));
        }
    }, 20);
}

boardInteractions.observe((event) => {
    for (let key of event.keysChanged) {
        if (boardInteractions.get(key) === undefined) {
            // Needed for flood fill
            redrawBoard();
        } else {
            updateCellVisibility(parseInt(key));
        }
    }
});

function updateCellVisibility(index, visitedCells) {
    let key = `${index}`;
    let floodFill = visitedCells !== undefined;
    visitedCells = visitedCells || {};
    if (mineElements[key] === undefined || visitedCells[index] === true) {
        return;
    }
    visitedCells[index] = true;
    mineElements[key].className = 'cell'
    if (boardInteractions.get(key) == CELL_REVEALED || floodFill || boardVisibility[index] === true) {
        boardVisibility[index] = true;
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
                    for (let y = keyY - (keyY > 0 ? 1 : 0); y <= keyY + 1 && y < boardHeight; y++) {
                        for (let x = keyX - (keyX > 0 ? 1 : 0); x <= keyX + 1 && x < boardWidth; x++) {
                            let checkIndex = x + y * boardWidth;
                            if (!(x === keyX && y === keyY)) {
                                updateCellVisibility(checkIndex, visitedCells);
                            }
                        }
                    }
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
            // Keep flood filled flags visible
            if (boardInteractions.get(key) == CELL_FLAGGED) {
                mineElements[key].classList.add('flag');
            }
            mineElements[key].classList.add(numClass);
        }
    }
    if (boardInteractions.get(key) == CELL_FLAGGED) {
        mineElements[key].classList.add('flag');
        addFlagPosition(key);
    } else {
        removeFlagPosition(key);
    }
}

function updateMineCount() {
    let mineCountElement = document.querySelector("#remaining-mines");
    let remainingMines = boardOptions.get("numMines") - flagPositions.size;
    mineCountElement.textContent = `${remainingMines}`;
}
function addFlagPosition(key) {
    flagPositions.add(key);
    updateMineCount();
}
function removeFlagPosition(key) {
    flagPositions.delete(key);
    updateMineCount();
}
function clearFlagPositions(key) {
    flagPositions.clear();
    updateMineCount();
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
        board.appendChild(cell);
        mineElements[i] = cell;

        cell.addEventListener('click', () => {
            if (boardInteractions.get(`${i}`) !== CELL_FLAGGED) {
                boardInteractions.set(`${i}`, CELL_REVEALED);
            }
        });

        cell.addEventListener('contextmenu', (e) => {
            if (boardVisibility[i] !== true && boardInteractions.get(`${i}`) !== CELL_FLAGGED) {
                boardInteractions.set(`${i}`, CELL_FLAGGED);
            } else if (boardInteractions.get(`${i}`) === CELL_FLAGGED) {
                boardInteractions.delete(`${i}`);
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
        numMines = Math.min(numMines - 1, boardWidth * boardHeight);

        boardOptions.set("boardWidth", boardWidth);
        boardOptions.set("boardHeight", boardHeight);
        boardOptions.set("numMines", numMines);

        for (let i = 0; i < boardWidth * boardHeight; i++) {
            boardInteractions.delete(`${i}`);
        }
        for (let i = 0; i < boardWidth * boardHeight; i++) {
            boardMines.set(`${i}`, false);
        }
        for (let i = 0; i < numMines; i++) {
            let pos = Math.floor(Math.random() * boardWidth * boardHeight);
            while (boardMines.get(`${pos}`) == true) {
                pos = Math.floor(Math.random() * boardWidth * boardHeight);
            }
            boardMines.set(`${pos}`, true);
        }
    });
});
