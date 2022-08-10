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

module.exports = {GAMEPLAY_STATES, switchTurnTo}