const path = require('path');
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');
const { emit } = require('process');
const { GAMEPLAY_STATES, switchTurnTo } = require('../public/const');
const { json } = require('express/lib/response');
const cors = require('cors');

const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = new Server(server);

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//set up allowed origins on cors. 
app.use(cors({
  origin: 'https://www.eleutheradoplays.com'
}));

const ERRORS = {
  roomNotFound: "roomNotFound",
  roomFull: "roomFull"
}


const BOARD_SIZE = 3;

let ACTIVE_GAMES = {}
let GAMES_OF_ACTIVE_PLYRS = {}

/* API to access server-wide active_games. */

function gameExists(room) {
  return room in ACTIVE_GAMES;
}

function getGame(room) {
  if(gameExists(room)){
    return ACTIVE_GAMES[room];
  }
  return null;
}

// fns for multiple games 

function verifyConnectionToRoom(room, socketId) {
  const clients = io.sockets.adapter.rooms.get(room);
  return clients.has(socketId);
}

function verifyRoomCode(room) {
  // return number of connections in a given room or null if it doesn't exist. 
  const clients = io.sockets.adapter.rooms.get(room);
  const numClients = clients ? clients.size : 0;
  const roomExists = gameExists(room);

  return { numClients, roomExists };
}

function createRoom(room) {
  ACTIVE_GAMES[room] = new gameObj(room);
}

function removeRoom(room){
  delete ACTIVE_GAMES[room]
  console.log("room removed. Active Games: ", ACTIVE_GAMES);
}

function getGameBySocketId(socketId) {
  if (!socketId in GAMES_OF_ACTIVE_PLYRS) {
    console.log("Error getting game by socket id. Id not found");
    return null;
  }
  let room = GAMES_OF_ACTIVE_PLYRS[socketId];
  let game = getGame(room);

  if (!game) {
    console.log("Error getting game by socket id. Room not found");
    return null
  }
  return game
}




class gameObj {
  constructor(code) {
    this.game_code = code;
    this.game_state = {
      // create user A & B, assign them. Track game sess here.    
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
  }
  /* -- Game Model API -- 
  Functions here read and modify data from the game_state and stores to keep track of active games and players
  */

  registerGameOfPlyr(socketId){
    GAMES_OF_ACTIVE_PLYRS[socketId] = this.game_code;
  }

  deRegisterGameOfPlyr(socketId) {
    delete GAMES_OF_ACTIVE_PLYRS[socketId];
    console.log("deregistered game for socket Id. Games of Active Plyrs: ", GAMES_OF_ACTIVE_PLYRS);
    
  }
 
  joinGame(socketId) {
    console.log("joining game ", this.game_code);
    // console.log("attempting to join, gameState: ", this.game_state);
    let { plyr1, plyr2, p1Token, p2Token } = this.game_state;
  
    if (plyr1 == null){
      this.game_state.plyr1 = socketId;
      this.registerGameOfPlyr(socketId);
      console.log(`${socketId} joined p1`);

      return p1Token;
  
    } else if (plyr2 == null) {
      this.game_state.plyr2 = socketId;
      this.registerGameOfPlyr(socketId);
      console.log(`${socketId} joined p2`);

      return p2Token;
  
    } else {
      console.log("failed to join, game is full");
      return null;
    }
  }

  leaveGame(socketId) {
    console.log("leaving game");
    let { plyr1, plyr2 } = this.game_state;
  
    if (plyr1 === socketId){
      this.game_state.plyr1 = null;
      this.deRegisterGameOfPlyr(socketId);
      return true;
  
    } else if (plyr2 === socketId){
      this.game_state.plyr2 = null;
      this.deRegisterGameOfPlyr(socketId);
      return true;
    }
    return false; 
  } 

  newGame(restart=false) {
    // Assumes that plyr1 & plyr2 have been declared. 
    if (!this.playersReady()){
      console.log("ERROR - new game attempted but 2 players not ready");
      return;
    }
    console.log(`NEW GAME init in room ${this.game_code}`);
    this.game_state.game.numMoves = 0; 
  
    this.game_state.game.board = makeBoard(BOARD_SIZE);
  
    let token = this.selectStarter(restart);
    this.game_state.game.playerTurn = token;
    this.game_state.starter = token;
    this.game_state.game.outcome = GAMEPLAY_STATES.playing;
    this.game_state.game.winner = null;
  }

  selectStarter(restart) {
    let token; 
    if (restart) {
      token = switchTurnTo[this.game_state.starter]

    } else {
      token = this.game_state.p1Token;
    }
    return token;
  }

  playersReady() {
    return Boolean(this.game_state.plyr1 && this.game_state.plyr2);
  }

  verifyMoveId(id, token) {
    return (
      (id === this.game_state.plyr1 && token === this.game_state.p1Token) || 
      (id === this.game_state.plyr2 && token === this.game_state.p2Token)
    )
  }

  gameIsOn() {
    return this.game_state.game.outcome === GAMEPLAY_STATES.playing
  }  

  updateServerGame(game) {
    this.game_state.game.board = game.board; // TODO - check that new board is obtainable by a single legal move.
    this.game_state.game.playerTurn = this.switchTurn(this.game_state.game.playerTurn);
  
    /* TODO verify game outcomes on server */
    this.game_state.game.outcome = game.outcome;
    this.game_state.game.winner = game.winner;
    
  
    this.game_state.game.numMoves += 1; // How to do on restart
  
  }
  
  switchTurn(playerTurn) {
    // pure function

    const newPlayer = switchTurnTo[playerTurn];
    if (!newPlayer) {
        console.log (`error switching turns - invalid player ${GAME_STATE.game.playerTurn}`);
        return;
    } 
    return newPlayer;
  }
}

/* -- Utilties -- */
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
      io.to(room).emit('joinedRoom', { numClients: numClients + 1 , roomCode: room })

    } else if (!roomExists) {
      // fail bc wrong room number. 
      console.log('wrong room number - ', room);

    } else {
      // fail bc of numClients
      console.log('num clients: ', numClients);

    }
  })

  socket.on('startGame', ({ room }) => {

    let game = getGame(room);

    let token = game.joinGame(socket.id);

    if (token) {
      if (verifyConnectionToRoom(room, socket.id)) {
        io.to(socket.id).emit('youJoined', {id: socket.id, token });
      } else {
        console.log(`error in startGame - not connected to room given by client. Room: ${room}`);
        console.log("Active Rooms", ACTIVE_GAMES);
      }

    } else {
      io.to(socket.id).emit('gameFull', {id: socket.id});
    }

    let ready = game.playersReady();
    if (ready) {
      game.newGame();
    }
    console.log(`game ready: ${ready}`);
    console.log(game.game_code, game.game_state);
    io.to(room).emit('startedGame', { playersReady: ready })
  })

  socket.on('playMove', ({id, token, game, room}) => {
    console.log(`move played in room ${room}`);
    let gameObj = getGame(room);
    // console.log({id, token, game});
    let validId = gameObj.verifyMoveId(id, token);
    let gameIsOn = gameObj.gameIsOn();

    if (validId && gameIsOn) {
      gameObj.updateServerGame(game)

      let { numMoves } = gameObj.game_state.game;
      let serverGame = gameObj.game_state.game;
      io.to(room).emit('newMove', { serverGame , numMoves, mover_id: id });
    } else {
      // TODO error handling? 
      console.log('player ID and token invalid');
    }

  })

  socket.on('restartGame', ({ id, token, room }) => {
    console.log("game restart");

    let game = getGame(room)

    
    let validId = game.verifyMoveId(id, token);
    if (validId) {
      game.newGame(true);

      let serverGame = game.game_state.game;
      io.to(room).emit('restartGame', { serverGame });
    } else {
      // TODO error handling? 
      console.log('player ID and token invalid');
    }
  })

    
  
  socket.on('disconnect', () => {
    let game = getGameBySocketId(socket.id);
    if (game) {
      let room = game.game_code;
      let { numClients, roomExists} = verifyRoomCode(room);
      
      if (roomExists && game.leaveGame(socket.id)) {
        io.to(room).emit('leftGame', {id: socket.id })
  
        if(numClients == 0) {
          removeRoom(room);
        }
      } else {
  
        console.log(`error leaving game. Socket ${socket.id} not found as player in room ${room}`);
      }
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

  if (gameExists(code)) {
    console.log(`code collision:${code}, \n ACTIVE_GAMES: ${Object.keys(ACTIVE_GAMES)}`)
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

  //Create new GAME store
  createRoom(code)

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
      res.json({
        error: `Error ${ERRORS.roomNotFound} - room ${code} does not exist`, 
        errorType: ERRORS.roomNotFound 
      });
      // console.log('wrong room number - ', room);

    } else {
      // fail bc of numClients
      res.json({ 
        error: `Error ${ERRORS.roomFull} - this room is already full with ${numClients} connections`, 
        errorType: ERRORS.roomFull
      });
      // throw new Error(`Error - this room is already full with ${numClients} connections`);
      // console.log('num clients: ', numClients);

    }
})



// serve the content
app.use(express.static(publicPath));

// connect to port
server.listen(port, () => {
  console.log(`Server is up. Listening on port ${port}.`)
});

