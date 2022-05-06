const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { emit } = require('process');


const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app);
let io = new Server(server);



let GAME_STATE = {
  // create user A & B, assign them. Track game sess here.
  /* server-wide data */ 

  /* games-specific data*/ 
  plyr1: null, 
  plyr2: null,
  p1Token: "X",
  p2Token: "O",

  numMoves: 0, 
}




/* Game Model API 
Functions here read and modify data from the GAME_STATE. 
*/ 

function newGame(p1, p2) {
  GAME_STATE.plyr1 = p1,
  GAME_STATE.plyr2 = p2,
  GAME_STATE.numMoves = 0
}

function playersReady() {
  return Boolean(GAME_STATE.plyr1 && GAME_STATE.plyr2);
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

  } else if (plyr2 === socketId){
    GAME_STATE.plyr2 = null;
  }

}


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
    console.log(`game ready: ${ready}`);
    io.to('game').emit('startGame', { playersReady: ready })
  })

  socket.on('playMove', ({id, token, game}) => {
    // TODO: check id & token, 
    // make move on server board
    // broadcast to 'game' room. 
    console.log("move played");
    console.log({id, token, game});
    let { numMoves } = GAME_STATE;
    io.to('game').emit('newMove', { game, numMoves });
  })

    
  
  socket.on('disconnect', () => {
    leaveGame(socket.id);

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

