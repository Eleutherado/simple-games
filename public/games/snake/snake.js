// Color Palette: https://www.canva.com/colors/color-palettes/san-francisco-clouded/ 
// I want to refactor to funcitonal - I will do when its done tho. 
const SIZE = 600;
const canvas = document.querySelector('canvas');
canvas.height = canvas.width = SIZE;
canvas.style.height = canvas.style.width = SIZE + 'px';
const ctx = canvas.getContext("2d");
const grid = SIZE / 40;

const rate = 50 //milliseconds


const dirs = {
  'right': {x: 1, y: 0},
  'left': {x: -1, y: 0},
  'up': {x: 0, y: -1},
  'down': {x: 0, y: 1},
}

let dir = dirs.right;
let dirChange = null; 

const keysToDirs = {
  'ArrowRight': dirs.right,
  'ArrowLeft': dirs.left,
  'ArrowUp': dirs.up,
  'ArrowDown': dirs.down,
};

const dirToOffset = {
  'right': {x: -canvas.width, y: 0},
  'left': {x: canvas.width, y: 0},
  'up': {x: 0,  y: canvas.height}, 
  'down':{x: 0, y: -canvas.height}
}



const snakeColor = '#e57f84';
const snakeGap = 1;

let snakeLen = 10;
let snakeCoords = [{x: SIZE / 2, y: SIZE / 2}] // snake head will be first element. 

const foodColor = '#00A4DE';
let foodCoords = null;

const gameOverColor = '#f4eae6';

let score = 0;
let gameOver = false;
let interval; 



/* --------- utilities --------- */ 
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/* --------- game logic --------- */ 

function resetGame() {
  location.reload(); // maps to this file. 
}

function growSnake() {
  // grow in the direction of the snake. 
  
  let newBlock = {
    x: snakeCoords[0].x + dir.x*grid, 
    y: snakeCoords[0].y + dir.y*grid
  }
  snakeCoords.unshift(newBlock);

}

function setFoodCoords() {

  let foodX = getRandomInt(canvas.width/grid) * grid;
  let foodY = getRandomInt(canvas.height/grid) * grid;

  foodCoords = {x: foodX, y: foodY} 

}

function boundaryCheck() {
  // return true if boundary hit, false otherwise. 
  head = snakeCoords[0];

  return (
    head.x >= canvas.width  ||
    head.x < 0 || 
    head.y >= canvas.height || 
    head.y < 0
  );
}

function getWrapOffset() {
  let offset; 

  if (!boundaryCheck()) {
    offset = {x: 0, y: 0};
  } else {
    dirName = getKeyByValue(dirs, dir);
    offset = dirToOffset[dirName]; // get offset to wrap around canvas
  }
  return offset
}

function moveSnake() {
  if (snakeCoords.length < snakeLen) {
    //grow snake to default length (for start of game)
    growSnake();
  } else {
    // define new square based on direction. 
    let offset = getWrapOffset(); 

    prevHead = snakeCoords[0];
      head = {
        x: prevHead.x + offset.x + (dir.x * grid),
        y: prevHead.y + offset.y + (dir.y * grid)
      }
    
    //remove 'tail' square and add new 'head' square
    snakeCoords = snakeCoords.slice(0, snakeLen - 1);
    snakeCoords.unshift(head);
  }
  
}

function handleDirChange(){
  if (dirChange && !boundaryCheck()){
    dir = dirChange
    dirChange = null
  }
}


function foodCollision() { 
  snakeHead = snakeCoords[0];

  return(snakeHead.x === foodCoords.x && snakeHead.y === foodCoords.y);
}


function handleFoodCollision(){ 
  if(foodCollision()){
    setFoodCoords();
    score += 1;
    snakeLen += 1;
  }
}


function snakeCollision() {
  snakeHead = snakeCoords[0]
  snakeBody = snakeCoords.slice(1, snakeCoords.length);

  for( var i = 0; i < snakeBody.length; i++){
    if(snakeBody[i].x === snakeHead.x && snakeBody[i].y === snakeHead.y){
      return true;
    }
  }
  return false;
}

function handleSnakeCollision() {
  if (snakeCollision()){
    gameOver = true;
  }
}

function collisionHandler(){ 
  handleFoodCollision();
  handleSnakeCollision();


  // check for boundary collision. 
}



function drawSnake() {
  ctx.clearRect(0,0, canvas.width, canvas.height);
  ctx.fillStyle = snakeColor;
  for (var i = 0; i < snakeCoords.length; i++) {
    snakeSquare = snakeCoords[i];
    ctx.fillRect(snakeSquare.x, snakeSquare.y, grid - snakeGap , grid - snakeGap);
    // console.log(snakeSquare);
  }
}

function drawFood() {
  ctx.fillStyle = foodColor;
  ctx.fillRect(foodCoords.x, foodCoords.y, grid - snakeGap , grid - snakeGap);

  
}

function drawScore() {
  ctx.fillStyle = snakeColor;
  fontSize = grid * 1.5
  ctx.font = `${fontSize}px monospace`
  ctx.fillText(`Score: ${score}`, grid, grid*2);
}

function drawGameOver() { 

  ctx.fillStyle = gameOverColor;
  
  fontSize = grid * 4
  ctx.font = `${fontSize}px monospace`
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', SIZE/2, SIZE/2);

  fontSize = grid * 2
  ctx.font = `${fontSize}px monospace`
  ctx.textAlign = 'center';
  ctx.fillText(`Score: ${score}`, SIZE/2, SIZE/2 + 2*grid);


  ctx.textAlign = 'center';
  ctx.fillText('Press the Spacebar to continue', SIZE/2, SIZE/2 + 4*grid);

}

function tick() {
  if (!gameOver) {
    handleDirChange();
    moveSnake();
    collisionHandler();

    drawSnake();
    drawScore();
    drawFood(); 
    
  } else {
    drawGameOver();

  }
}


function legalDirChange(dir, newDir) {
  sumX = Math.abs(dir.x + newDir.x) 
  sumY = Math.abs(dir.y + newDir.y)
  return sumX + sumY
}


function handleKeyDown(e) {
  console.log('key event code: ', e.code)
  if(!gameOver){
    let newDir = keysToDirs[e.code];
    if (newDir && newDir != dir && legalDirChange(dir, newDir)) {
      dirChange = newDir;
    }
  } else {
    if (e.code === 'Space') {
      resetGame();
    }
  }

}


/* ------ initialize game loop ------ */ 

window.onload = function () {
  setFoodCoords();
  interval = setInterval(tick, rate);
  window.onkeydown = handleKeyDown
}