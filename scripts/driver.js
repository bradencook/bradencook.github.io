let canvas = document.getElementById('id-canvas');
let context = canvas.getContext('2d');
let keyQueue = [];
let updates = [];
let downKeys = new Set();
let finished = false;
let crumbs = false;
let hint = false;
let path = false;
let timer = 0;
let penalty = 0;
let timing = false;
let oldAnimationFrameID = 1;
let scores5 = [];
let scores10 = [];
let scores15 = [];
let scores20 = [];
let scored = true;
window.addEventListener('keydown', (e) => {
    if (!downKeys.has(e.key)) {
        downKeys.add(e.key);
        keyQueue.push(e.key);
    }});
window.addEventListener("keyup", (e) => {downKeys.delete(e.key)})

let moves = {
    up: ['w', 'i', 'ArrowUp'],
    down: ['s', 'k', 'ArrowDown'],
    left: ['a', 'j', 'ArrowLeft'],
    right: ['d', 'l', 'ArrowRight']
}


let texSphere = {
    imageSrc:  'images/sphere.png',
    center: { x: canvas.width / 2, y: canvas.height / 2 },
    width: null,
    height: null
};

texSphere.image = new Image();
texSphere.image.ready = false;
texSphere.image.onload = function() {
    this.ready = true;
};
texSphere.image.src = texSphere.imageSrc;

let texBackground = {
    imageSrc:  'images/background.jpg',
    center: { x: canvas.width / 2, y: canvas.height / 2 },
    width: canvas.width / 2,
    height: canvas.height - 2
};

texBackground.image = new Image();
texBackground.image.ready = false;
texBackground.image.onload = function() {
    this.ready = true;
};
texBackground.image.src = texBackground.imageSrc;

let texFlag = {
    imageSrc:  'images/flag.png',
    center: { x: canvas.width / 2, y: canvas.height / 2 },
    width: null,
    height: null
};

texFlag.image = new Image();
texFlag.image.ready = false;
texFlag.image.onload = function() {
    this.ready = true;
};
texFlag.image.src = texFlag.imageSrc;

function renderTexture(texture) {
    if (texture.image.ready) {
        context.drawImage(
            texture.image,
            texture.center.x - texture.width / 2,
            texture.center.y - texture.height / 2,
            texture.width, texture.height);
    }
}


function shuffleList(list) {
    for (let i = list.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

class Maze {
    size;
    cellsGrid = [];
    character;
    goal;
    shortestPath = [];
    next;
    constructor(size) {
        this.size = size;
        for (let i = 0; i < size; i++) {
            this.cellsGrid.push([]);
            for (let j = 0; j < size; j++) {
                this.cellsGrid[i].push(new Cell(i, j));
            }
        }
        this.goal = this.cellsGrid[this.size - 1][this.size - 1];
        this.character = new Character(this);
    }
    
    render(x, y, width, height) {
        let cellWidth = width / this.size;
        let cellHeight = height / this.size;
        // render end cell
        texFlag.height = cellHeight;
        texFlag.width = cellWidth;
        texFlag.center.x = x + this.goal.col * cellWidth + cellWidth / 2
        texFlag.center.y = y + this.goal.row * cellHeight + cellHeight / 2
        renderTexture(texFlag);

        context.fillStyle = 'rgba(255,255,255,0.7)';
        if (path) {
            for (let i = 0; i < this.shortestPath.length; i++) {
                context.fillRect(x + this.shortestPath[i].col * cellWidth, y + this.shortestPath[i].row * cellHeight, cellWidth, cellHeight);
            }
        }
        if (hint && !finished) {
            context.fillRect(x + this.shortestPath[this.shortestPath.length - 1].col * cellWidth, y + this.shortestPath[this.shortestPath.length - 1].row * cellHeight, cellWidth, cellHeight);

        }
        if (hint || path) {
            context.fillRect(x + this.character.location.col * cellWidth, y + this.character.location.row * cellHeight, cellWidth, cellHeight);

        }
        // render walls
        context.beginPath();
        context.moveTo(x + width, y);
        context.lineTo(x + width, y + height);
        context.moveTo(x, y + height);
        context.lineTo(x + width, y + height);
        for (let i = 0; i < this.size; i ++) {
            for (let j = 0; j < this.size; j++) {
                if (this.cellsGrid[i][j].n === undefined) {
                    context.moveTo(x + cellWidth * j, y + cellHeight * i);
                    context.lineTo(x + cellWidth * (j + 1), y + cellHeight * i);
                }
                if (this.cellsGrid[i][j].w === undefined) {
                    context.moveTo(x + cellWidth * j, y + cellHeight * i);
                    context.lineTo(x + cellWidth * j, y + cellHeight * (i + 1));
                }
            }
        }
        context.lineWidth = 2;
        context.strokeStyle = 'rgb(0,0,0)';
        context.stroke();

        // render character
        texSphere.height = 5 * cellHeight / 4;
        texSphere.width = 5 * cellWidth / 4;
        texSphere.center.x = x + this.character.location.col * cellWidth + cellWidth / 2;
        texSphere.center.y = y + this.character.location.row * cellHeight + cellHeight / 2;
        renderTexture(texSphere);

        if (crumbs) {
            context.globalAlpha = .35;
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    let crumb = this.cellsGrid[i][j];
                    if (this.character.breadcrumbs.has(crumb)) {
                        texSphere.center.x = x + crumb.col * cellWidth + cellWidth / 2;
                        texSphere.center.y = y + crumb.row * cellHeight + cellHeight / 2;
                        renderTexture(texSphere);
                    }
                }
            }
        }
        context.globalAlpha = 1;

        // render high scores
        if (this.size === 5) {
            this.renderHighScores(scores5);
        }
        if (this.size === 10) {
            this.renderHighScores(scores10);
        }
        if (this.size === 15) {
            this.renderHighScores(scores15);
        }
        if (this.size === 20) {
            this.renderHighScores(scores20);
        }
    }
    renderHighScores(scores) {
        let x = 850;
        let y = 70;
        let spacing = 30;
        context.font = '25px Tahoma';
        context.fillStyle = 'rgb(0,0,0)';
        for (let i = 0; i < scores.length; i++) {
            context.fillText(scores[i].toFixed(2), x, y + i * spacing);
        }
    }

    getRandomCell() {
        let row = Math.floor(Math.random() * this.size);
        let col = Math.floor(Math.random() * this.size);
        return this.cellsGrid[row][col];
    }
    
    populateNeighbors(cell, maze, neighbors) {
        if (cell.row > 0) {
            let above = this.cellsGrid[cell.row - 1][cell.col];
            if (!maze.has(above) && !neighbors.includes(above)) {
                neighbors.push(above);
            }
        }
        if (cell.col < this.size - 1) {
            let right = this.cellsGrid[cell.row][cell.col + 1];
            if (!maze.has(right) && !neighbors.includes(right)) {
                neighbors.push(right);
            }
        } 
        if (cell.row < this.size - 1) {
            let below = this.cellsGrid[cell.row + 1][cell.col];
            if (!maze.has(below) && !neighbors.includes(below)) {
                neighbors.push(below);
            }
        }
        
        if (cell.col > 0) {
            let left = this.cellsGrid[cell.row][cell.col - 1];
            if (!maze.has(left) && !neighbors.includes(left)) {
                neighbors.push(left);
            }
        }
    }
    
    generate() {
        let neighbors = [];
        let startCell = this.getRandomCell();
        let maze = new Set();
        maze.add(startCell);
        this.populateNeighbors(startCell, maze, neighbors);
        while (neighbors.length > 0) {
            shuffleList(neighbors);
            let newCell = neighbors.pop();
            maze.add(newCell);

            // remove a wall
            let walls = ['n', 'e', 's', 'w'];
            shuffleList(walls);
            let found = false;
            while (!found) {
                let wall = walls.pop();

                if (wall === 'n' && newCell.row > 0) {
                    let above = this.cellsGrid[newCell.row - 1][newCell.col];
                    if (maze.has(above)) {
                        above.s = newCell;
                        newCell.n = above;
                        found = true;
                    }
                }
                if (wall === 'e' && newCell.col < this.size - 1) {
                    let right = this.cellsGrid[newCell.row][newCell.col + 1];
                    if (maze.has(right)) {
                        right.w = newCell;
                        newCell.e = right;
                        found = true;
                    }
                }
                if (wall === 's' && newCell.row < this.size - 1) {
                    let below = this.cellsGrid[newCell.row + 1][newCell.col];
                    if (maze.has(below)) {
                        below.n = newCell;
                        newCell.s = below;
                        found = true;
                    }
                }
                if (wall === 'w' && newCell.col > 0) {
                    let left = this.cellsGrid[newCell.row][newCell.col - 1];
                    if (maze.has(left)) {
                        left.e = newCell;
                        newCell.w = left;
                        found = true;
                    }
                }
            }
            this.populateNeighbors(newCell, maze, neighbors);
        }
        this.findShortestPath();
    }

    findShortestPath() {
        let current = this.character.location;
        let visited = new Set();
        this.shortestPath = this.dfs(current, visited);
        this.shortestPath.reverse();
        this.shortestPath.pop();
        this.next = this.shortestPath[this.shortestPath.length - 1];
    }

    dfs(cell, visited) {
        visited.add(cell);
        let path = [cell];
        if (cell === this.goal) {
            return path;
        }
        if (cell.n && !visited.has(cell.n)){
            let nPath = this.dfs(cell.n,  visited);
            if (nPath.length !== 0){
                return path.concat(nPath);
            }
        }
        if (cell.s && !visited.has(cell.s)){
            let sPath = this.dfs(cell.s,  visited);
            if (sPath.length !== 0){
                return path.concat(sPath);
            }
        }
        if (cell.e && !visited.has(cell.e)){
            let ePath = this.dfs(cell.e,  visited);
            if (ePath.length !== 0){
                return path.concat(ePath);
            }
        }
        if (cell.w && !visited.has(cell.w)){
            let wPath = this.dfs(cell.w,  visited);
            if (wPath.length !== 0){
                return path.concat(wPath);
            }
        }
        return [];
    }
}

class Cell {
    row;
    col;
    n;
    e;
    s;
    w;
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
}

class Character {
    maze;
    location;
    breadcrumbs = new Set();

    constructor(maze) {
        this.maze = maze;
        this.location = maze.cellsGrid[0][0];
    }

    updateLocation(dir) {
        let current = this.location;
        if (dir === 'up' && this.location.n) {
            this.location = this.location.n;
        }
        if (dir === 'down' && this.location.s) {
            this.location = this.location.s;
        }
        if (dir === 'left' && this.location.w) {
            this.location = this.location.w;
        }
        if (dir === 'right' && this.location.e) {
            this.location = this.location.e;
        }

        if (current !== this.location) {
            if (this.location === this.maze.next) {
                this.maze.shortestPath.pop();
            } else {
                penalty += 1;
                this.maze.shortestPath.push(current);
            }
            if (this.maze.shortestPath.length === 0) {
                finished = true;
            } else {
                this.maze.next = this.maze.shortestPath[this.maze.shortestPath.length - 1];
            }

            this.breadcrumbs.add(current);
            this.breadcrumbs.delete(this.location);
        }
    }

}

function renderText() {
    context.font = '50px Marker Felt';
    context.fillStyle = 'rgb(220,170,245)';
    context.strokeStyle = 'rgb(0,0,0)';
    context.textBaseline = 'top';
    context.fillText('Maze Game', 0, 5);
    context.strokeText('Maze Game', 0, 5);
    context.fillText('High Scores', 770, 5);
    context.strokeText('High Scores', 770, 5);
    context.font = '20px Tahoma';
    context.fillStyle = 'rgb(0,0,0)';
    context.fillText('B - toggle breadcrumbs', 20, 70);
    context.fillText('H - toggle hint', 20, 100);
    context.fillText('P - show path to finish', 20, 130);
    context.fillText('+1 second', 60, 360);
    context.fillText('for wrong moves', 40, 385);
    context.fillText('Time: ' + (timer / 1000).toFixed(2) + '   + ' + penalty, 20, 440);
}

function renderFinished() {
    if (finished) {
        let thisScore = Math.round(timer / 10) / 100 + penalty;
        context.fillStyle = 'rgba(0,0,0,0.75)';
        context.fillRect(canvas.width / 4, 1, canvas.width / 2, canvas.height - 2);
        context.font = '60px Marker Felt';
        context.fillStyle = 'rgb(0,255,255)';
        context.strokeStyle = 'rgb(0,0,0)';
        context.textBaseline = 'top';
        context.fillText('Nice Job!', 390, 150);
        context.strokeText('Nice Job!', 390, 150);
        context.font = '20px Tahoma';
        context.fillStyle = 'rgb(255,255,255)';
        context.fillText('YOUR SCORE: ' + thisScore.toFixed(2), 405, 230);
        context.fillText('select a maze size to play again', 355, 260);

    }
}

function initialize(size) {
    if (oldAnimationFrameID) {
        cancelAnimationFrame(oldAnimationFrameID);
        finished = false;
        crumbs = false;
        hint = false;
        path = false;
        timer = 0;
        penalty = 0;
        timing = false;
        scored = false;
    }
    let maze = new Maze(size);
    maze.generate();
    requestAnimationFrame((t) => gameLoop(maze, t));
}

function processInput() {
    while (keyQueue.length > 0) {
        let key = keyQueue.shift();
        for (let move in moves) {
            if (moves[move].includes(key)) {
                updates.push(move);
            }
        }
        if (key === 'b') { crumbs = !crumbs;}
        if (key === 'h') {
            hint = !hint;
            if (hint) {
                path = false;
            }
        }
        if (key === 'p') {
            path = !path;
            if (path) {
                hint = false;
            }
        }
        key = null;
    }
}

function update(elapsed, maze) {
    while (updates.length > 0) {
        let action = updates.shift();
        if (moves[action] && !finished) {
            maze.character.updateLocation(action);
        }
    }
    if (maze.character.location !== maze.cellsGrid[0][0] && !finished) {
        timing = true;
    }
    if (timing) {
        timer += elapsed;
    }
    if (finished && !scored) {
        timing = false;
        if (maze.size === 5) {
            scores5.push(Math.round(timer / 10) / 100 + penalty)
            scores5.sort((a, b) => (a - b))
            if (scores5.length > 10) {
                scores5.pop();
            }
        }
        if (maze.size === 10) {
            scores10.push(Math.round(timer / 10) / 100 + penalty)
            scores10.sort((a, b) => (a - b))
            if (scores10.length > 10) {
                scores10.pop();
            }
        }
        if (maze.size === 15) {
            scores15.push(Math.round(timer / 10) / 100 + penalty)
            scores15.sort((a, b) => (a - b))
            if (scores15.length > 10) {
                scores15.pop();
            }
        }
        if (maze.size === 20) {
            scores20.push(Math.round(timer / 10) / 100 + penalty)
            scores20.sort((a, b) => (a - b))
            if (scores20.length > 10) {
                scores20.pop();
            }
        }
        scored = true;
    }
}

function render(elapsed, maze) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    renderTexture(texBackground);
    maze.render(canvas.width / 4, 1, canvas.width / 2, canvas.height - 2);
    renderText();
    if (finished) {
        renderFinished();
    }
}

function gameLoop(maze, time, prev) {
    let elapsedTime = time - prev;
    processInput();
    update(elapsedTime, maze);
    render(elapsedTime, maze);
    oldAnimationFrameID = requestAnimationFrame((t) => gameLoop(maze, t, time));

}

function run(size) {
    requestAnimationFrame(() => initialize(size));
}

run(10);