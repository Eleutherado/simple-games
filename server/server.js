const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { emit } = require('process');
const { GAMEPLAY_STATES, switchTurnTo } = require('../public/const');

const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = new Server(server);


const BOARD_SIZE = 3;

let GAME_STATE = {
  // create user A & B, assign them. Track game sess here.
  /* server-wide data */ 

  /* games-specific data*/ 
  plyr1: null, 
  plyr2: null,
  p1Token: "X",
  p2Token: "O",
  starter: null,

  game: { 
    numMoves: 0, 

    board: null,
    playerTurn: null,
    outcome: null, // will be set to one of the GAMEPLAY_STATES.
    winner: null,
  }
}




/* -- Game Model API -- 
Functions here read and modify data from the GAME_STATE. 
*/ 

function selectStarter(restart) {
  let token; 
  if (restart) {
    token = switchTurnTo[GAME_STATE.starter]

  } else {
    token = GAME_STATE.p1Token;
  }
  return token;
}

function newGame(p1, p2, restart=false) {
  GAME_STATE.plyr1 = p1,
  GAME_STATE.plyr2 = p2,
  GAME_STATE.game.numMoves = 0; 

  GAME_STATE.game.board = makeBoard(BOARD_SIZE);

  token = selectStarter(restart);
  GAME_STATE.game.playerTurn = token;
  GAME_STATE.starter = token;
  GAME_STATE.game.outcome = GAMEPLAY_STATES.playing;
  GAME_STATE.game.winner = null;
}

function joinGame(socketId) {
  console.log("attempting to join, gameState: ", GAME_STATE);
  let { plyr1, plyr2, p1Token, p2Token } = GAME_STATE;

  if (plyr1 == null){
    GAME_STATE.plyr1 = socketId;
    
    console.log(`${socketId} joined p1`);
    return p1Token;

  } else if (plyr2 == null) {
    GAME_STATE.plyr2 = socketId;
    console.log(`${socketId} joined p2`);
    return p2Token;

  } else {
    console.log("failed to join, game is full");
    return null;
  }

}

function leaveGame(socketId) {
  console.log("leaving game");
  let { plyr1, plyr2 } = GAME_STATE;

  if (plyr1 === socketId){
    GAME_STATE.plyr1 = null;
    return true;

  } else if (plyr2 === socketId){
    GAME_STATE.plyr2 = null;
    return true;

  }
  return false; 
}


function updateServerGame(game) {

  GAME_STATE.game.board = game.board; // TODO - check that new board is obtainable by a single legal move.
  GAME_STATE.game.playerTurn = switchTurn(GAME_STATE.game.playerTurn);

  /* TODO verify game outcomes on server */
  GAME_STATE.game.outcome = game.outcome;
  GAME_STATE.game.winner = game.winner;
  

  GAME_STATE.game.numMoves += 1; // How to do on restart

}

function playersReady() {
  return Boolean(GAME_STATE.plyr1 && GAME_STATE.plyr2);
}

function gameIsOn() {
  return GAME_STATE.game.outcome === GAMEPLAY_STATES.playing
}

function verifyMoveId(id, token) {
  return (
    (id === GAME_STATE.plyr1 && token === GAME_STATE.p1Token) || 
    (id === GAME_STATE.plyr2 && token === GAME_STATE.p2Token)
  )
}


function switchTurn(playerTurn) {
  // note: Absorbed from FE
  const newPlayer = switchTurnTo[playerTurn];
  if (!newPlayer) {
      console.log (`error switching turns - invalid player ${GAME_STATE.game.playerTurn}`);
      return;
  } 
  return newPlayer;
}

function makeBoard(size) {
  // note: Absorbed from FE
  let board = [];
  for (var row =  0; row < size; row++){
      board[row] = [];
      for (var col = 0; col < size; col++) {
          board[row].unshift(0);
      }
  }
  return board;
}


/* -- Socket Controller --
  controls the socket events and routes the handling of them. 
*/ 


io.on('connection', (socket) => {

  console.log('A user just connected.');
  console.log(`The client count is ${io.engine.clientsCount}`);

  socket.on('startGame', () => {

    let token = joinGame(socket.id);

    if (token) {
      io.to(socket.id).emit('youJoined', {id: socket.id, token });
      socket.join('game');

    } else {
      io.to(socket.id).emit('gameFull', {id: socket.id});
    }

    let ready = playersReady();
    if (ready) {
      newGame(GAME_STATE.plyr1, GAME_STATE.plyr2);
    }
    console.log(`game ready: ${ready}`);
    io.to('game').emit('startGame', { playersReady: ready })
  })

  socket.on('playMove', ({id, token, game}) => {
    console.log("move played");
    // console.log({id, token, game});
    let validId = verifyMoveId(id, token);

    if (validId && gameIsOn()) {
      console.log('valid move id & game is on');
      updateServerGame(game)

      let { numMoves } = GAME_STATE.game;
      let serverGame = GAME_STATE.game;
      io.to('game').emit('newMove', { serverGame, numMoves, mover_id: id });
    } else {
      // TODO error handling? 
      console.log('player ID and token invalid');
    }

  })

  socket.on('restartGame', ({id, token, game}) => {
    console.log("game restart");

    
    let validId = verifyMoveId(id, token);
    if (validId) {
      console.log('valid move id');
      newGame(GAME_STATE.plyr1, GAME_STATE.plyr2, true);

      let serverGame = GAME_STATE.game;
      io.to('game').emit('restartGame', { serverGame });
    } else {
      // TODO error handling? 
      console.log('player ID and token invalid');
    }
  })

    
  
  socket.on('disconnect', () => {

    if (leaveGame(socket.id)) {
      io.to('game').emit('leftGame', {id: socket.id })
    }

    console.log('A user has disconnected');
    console.log(`The client count is ${io.engine.clientsCount}`);

  })
  

})

// serve the content
app.use(express.static(publicPath));

// connect to port
server.listen(port, () => {
  console.log(`Server is up. Listening on port ${port}.`)
});

