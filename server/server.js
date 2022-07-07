const path = require('path');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { emit } = require('process');
const { GAMEPLAY_STATES, switchTurnTo } = require('../public/const');
const { json } = require('express/lib/response');

const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = new Server(server);

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));



const BOARD_SIZE = 3;

let ACTIVE_GAMES = new Set();

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

// fns for multiple games 

async function validateSocketId(socketId) { 
  const ids = await io.allSockets();
  console.log(`ids: `, ids);
  return ids.has(socketId);
}

function verifyRoomCode(room) {
  // return number of connections in a given room or null if it doesn't exist. 
  const clients = io.sockets.adapter.rooms.get(room);
  const numClients = clients ? clients.size : 0;
  const roomExists = ACTIVE_GAMES.has(room);

  return { numClients, roomExists };
}

/* -- Socket Controller --
  controls the socket events and routes the handling of them. 
*/ 


io.on('connection', (socket) => {

  console.log('A user just connected.');
  console.log(`The client count is ${io.engine.clientsCount}`);

  socket.on('joinRoom', ({ room }) => {
    /* try to join room 
    verify code exists & has 1 person
    Then join --> connect socket to room & respond w 'joined'
    TODO If has 0 ppl, remove & fail. 
    If has 2 ppl, fail. 
    TODO   --> respond with 'error'
    */
    
    const { numClients, roomExists } = verifyRoomCode(room);
    if(roomExists && numClients <= 1) {
      // create or join room 
      socket.join(room)
      console.log('room joined!', room);
      io.to(room).emit('joinedRoom', { numClients , roomCode: room })

    } else if (!roomExists) {
      // fail bc wrong room number. 
      console.log('wrong room number - ', room);

    } else {
      // fail bc of numClients
      console.log('num clients: ', numClients);

    }
  })

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
      updateServerGame(game)

      let { numMoves } = GAME_STATE.game;
      let serverGame = GAME_STATE.game;
      io.to('game').emit('newMove', { serverGame, numMoves, mover_id: id });
    } else {
      // TODO error handling? 
      console.log('player ID and token invalid');
    }

  })

  socket.on('restartGame', ({ id, token }) => {
    console.log("game restart");

    
    let validId = verifyMoveId(id, token);
    if (validId) {
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

/* -- exposed API to Frontend -- 
*/ 

// helpers
function generateGameCode() {
  // must be unique - will use method for 755,160 games max (4 digit code from 31 char set)
  let alphaNumReadable = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'// removes 0,O,1,I,L
  let code = [];
  const codeLen = 4

  while (code.length < codeLen) {
    let newChar = alphaNumReadable[Math.floor(Math.random() * alphaNumReadable.length)]
    code.push(newChar);
  }

  return code.join("");
}

function generateUniqueGameCode(collisionCount=0) {
  let code = generateGameCode();

  if (ACTIVE_GAMES.has(code)) {
    console.log(`code collision:${code}, \n ACTIVE_GAMES: ${ACTIVE_GAMES}`)
    code = generateUniqueGameCode(collisionCount + 1)
  } else {
    return code
  }
}
// api routes & controllers
const apiRoute = '/api'

app.post(`${apiRoute}/tic-tac-toe/game`, (req, res) => { 
  // Generate valid 4 char code and send to user. 
  let code = generateUniqueGameCode()

  ACTIVE_GAMES.add(code);

  console.log('new game created, ACTIVE_GAMES: \n', ACTIVE_GAMES);
  res.json({ code })

})

app.post(`${apiRoute}/tic-tac-toe/game/join`, (req, res) => { 
  /* verifies room exists and has 1 or 0 ppl in it 
    Then join 
    If has 2 ppl, fail. 
    
  */
  let code = req.body.code;
  console.log(`code sent: ${code}`);

  const { numClients, roomExists } = verifyRoomCode(code);
    if(roomExists && numClients <= 1) {
      // room exists and has 1 or 0 connections. 
      res.json({ code })

    } else if (!roomExists) {
      res.json(`Error - room ${code} does not exist`);
      // console.log('wrong room number - ', room);

    } else {
      // fail bc of numClients
      res.json(`Error - this room is already full with ${numClients} connections`);
      // throw new Error(`Error - this room is already full with ${numClients} connections`);
      // console.log('num clients: ', numClients);

    }

  res.json({ code })

})



// serve the content
app.use(express.static(publicPath));

// connect to port
server.listen(port, () => {
  console.log(`Server is up. Listening on port ${port}.`)
});

