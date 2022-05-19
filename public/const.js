const GAMEPLAY_STATES = {
  playing: "playing",
  tie: "tie",
  victory: "victory", 
  disconnected: "diconnected"
};

const switchTurnTo = {
  "X" : "O",
  "O" : "X",
};

const API_URL = 'http://localhost:3000/api'

module.exports = {GAMEPLAY_STATES, switchTurnTo, API_URL}