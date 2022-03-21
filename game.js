
(function () {

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d'); // how to pass to draw functions?

    const COLORS = {
        pewter: "#b9b7bd",
        "X": "#219ebc",
        "O": "#e07a5f",
        tealGreen: "#0d877a"
    }

    const GAMEPLAY_STATES = {
        playing: "playing",
        tie: "tie",
        victory: "victory"
    }

    const switchTurnTo = {
        "X" : "O",
        "O" : "X",
    }

    // want to define an interface which is the game. The game can then have functions which manage its data. <-- OOP

    let game = { // can turn into Class or write a series of functions which manage the updating of this state. 
        // game data
        board: null,
        playerX: "X",
        playerO: "O",
        playerTurn: null,
        gameOver: false, 
        outcome: null, // "tie" or "victory"
        //view data
        mouseX: 0, 
        mouseY: 0, 
        margin: null,
        grid: null, 
        gap: null,
        cornerRadius: null,
        highlightedSquare: {row: null, col: null} 
    }





    function init () {
        const SIZE = 600;
        const BOARD_SIZE = 3;

        canvas.height = canvas.width = SIZE;
        canvas.style.width = canvas.style.height = SIZE;

        game.board = makeBoard(BOARD_SIZE); 
        game.margin = SIZE/20;
        game.grid = (SIZE - game.margin * 2) / game.board.length;
        game.gap = game.grid/10;
        game.cornerRadius = 10;

        game.playerTurn = game.playerX

        drawGame(game);

        // interactions
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mousedown", handleMouseClick);

    }
    /* ------------------------- 
    model functions 
    ------------------------- */ 


    /* computation helpers 
    
    functions who aren't modifying the game object 
    should not need to directly access it
    */ 

    function makeBoard(size) {
        let board = [];
        for (var row =  0; row < size; row++){
            board[row] = [];
            for (var col = 0; col < size; col++) {
                board[row].unshift(0);
            }
        }
        return board;
    }

    function getGridCoords(row, col, boardMargin, grid, gap){
        // utility 
        return {
            x: boardMargin + (col*grid),
            y: boardMargin + (row*grid),
            width: grid - gap,
            height: grid - gap
        }
    }

    function isValidPlay(row, col) {
        //TODO (will need more params)
        // determine if this is a legal move
        // not game over, that square is free
        return true
    }

    function checkGameEnd(board) {
        // TODO
        // -- Victory
        // A victory is when player gets 3 of their tokens in a row 
        // (vertical, horizontal or diagonal). 
        // -- Tie
        // A tie is when the grid has no more empty squares and no tokens form 3 in a row. 
        // return gameplay State (on, tie, victory)

        return GAMEPLAY_STATES.playing;
    }

    /* Actions API, 
    these are called by events to produce changes in the game state.
    These are either "interactive actions" - changes to data governing visual representation of the game
    These are either "game actions" - actions that change the state of the game itself
    DESIRABLE - refactor mutating functions so that same inputs produce same effect.
    */ 


    function updateMouse(mouseX, mouseY) { 
        game.mouseX = mouseX;
        game.mouseY = mouseY;
    }

    function setHighlightedSquare(row, col) {
        let { board } = game; // assumes board is well formed 

        //validate inputs
        if(row > board.length || row < 0 || col > board[0].length || col < 0) {
            console.log("error in setting highlited square, index out of bounds")
            console.log(`row: ${row}, col: ${col}`);
            return;
        }

        game.highlightedSquare.row = row;
        game.highlightedSquare.col = col;
    }

    function clearHighlightedSquare(){
        game.highlightedSquare = {row: null, col: null} 

    }

    function endGame(outcome) {
        let { playerTurn, playerX, playerO } = game;
        if (playerTurn != playerX || playerTurn != playerO) {
            console.log("error endGame - turn doesn't have a valid player")
            return;
        }
        if(outcome != GAMEPLAY_STATES.tie || GAMEPLAY_STATES.victory){
            console.log(`error in endGame - given game outcome '${outcome}' is invalid`);
            return;
        }
        game.outcome = outcome;
        return game.outcome;
    }

    function switchTurn() {
        const newPlayer = switchTurnTo[game.playerTurn];
        if (!newPlayer) {
            console.log (`error switching turns - invalid player ${game.playerTurn}`);
            return;
        } 
        game.playerTurn = newPlayer;   
    }

    function playSquare(row, col) {
        // If valid move, play square, then check for victory, then switch turns. 
        // return info so redraw can be called. 
        if (!isValidPlay(row, col)){
            console.log(`invalid play at {${row}, ${col}}`);
            return null;
        }

        game.board[row][col] = game.playerTurn;

        let outcome = checkGameEnd(game.board); 
        if (outcome === GAMEPLAY_STATES.playing) {
            switchTurn();
        } else {
            endGame(outcome);
        }
        console.log("square played! Board - ", game.board);
        return outcome;

    }

    /* ------------------------- 
    controller/event handler logic
    need global read access to data, 
    but writing is done through data interface functions
    ------------------------- */ 

    function handleMouseMove(e) {


        let rect = this.getBoundingClientRect(); // 'this' references canvas here
        mouseX = e.clientX - rect.left
        mouseY = e.clientY - rect.top
        updateMouse(mouseX, mouseY);

        let square = checkForSquareHover(); // {row: int, col: int}

        if (square && game.board[square.row][square.col] === 0){
            setHighlightedSquare(square.row, square.col);
            redraw(game);
        } else if (game.highlightedSquare.row != null || game.highlightedSquare.col != null) {
            clearHighlightedSquare();
            redraw(game);
        }
    }

    function handleMouseClick(e) {
        let square = checkForSquareHover(); // {row: int, col: int}
        let outcome;
        if (square) {
            outcome = playSquare(square.row, square.col);
        }
        if (outcome) {
            redraw(game);
        } 
    }


    function checkForSquareHover() {
        // given a "game" object, 
        // if the mouse is hovering over a square, 
        // returns row, col object for that square
        // Otherwise returns null

        let { board, mouseX, mouseY } = game;

        for (let row = 0; row < board.length; row++){
            for (let col = 0; col < board.length; col++){
                if (checkForMouseCollision(mouseX, mouseY, row, col)){
                    // console.log(`collision found for {${row}, ${col}}. Mouse: {${mouseX}, ${mouseY}}`);
                    return {row: row, col: col};
                }
            }
        }

        return null;

    }

    function checkForMouseCollision(mouseX, mouseY, row, col) {
        let {margin, grid, gap} = game;
        let { x, y, width, height } = getGridCoords(row, col, margin, grid, gap);

        return (
            mouseX >= x && mouseX <= x + width && 
            mouseY >= y && mouseY <= y + height
        );


    }

    /* -------------------------
    Drawing functions -- need global access to canvas context + colors
    ------------------------- */

    function redraw(game){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGame(game);
    }


    function drawGame(game){
        // interfaces with the game object to draw based on the data it recieves. 
        // this function maps the information contained in the game 
        // object to the functions that draw purely based on inputs   
        drawBoard(
            game.board, 
            game.margin, 
            game.grid, 
            game.gap, 
            game.cornerRadius, 
            game.highlightedSquare
        );
        drawTurn(game.playerTurn, game.margin);
    }


   function drawBoard(board, margin, grid, gap, cornerRadius, highlightedSquare) {
        //Get grid size by dividing game board up into the length of the board.
        //Use a margin 

        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[0].length; col++){
                const {x, y, width, height} = getGridCoords(row, col, margin, grid, gap);
                let highlighted = false; 
                const token = board[row][col]; 

                if (highlightedSquare.row == row && highlightedSquare.col == col) {
                    highlighted = true;
                }
                drawGridSquare(x, y, width, height, cornerRadius, highlighted);
                if (token) {
                    drawToken(x, y, width, height, token);
                }

            }
        }
    }

    function drawGridSquare(x, y, width, height, cornerRadius, highlighted) {
        let color = COLORS.pewter;
        if (highlighted) {
            color = COLORS.tealGreen
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
    

        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);

        ctx.lineTo(x + width - cornerRadius, y);
        ctx.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);

        ctx.lineTo(x + width, y + height - cornerRadius);
        ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + width, cornerRadius);

        ctx.lineTo(x + cornerRadius, y + height);
        ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);

        ctx.lineTo(x, y + cornerRadius);
        ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
        ctx.stroke();
    }

    function drawToken(x, y, width, height, token) {
        let color = COLORS[token]

        ctx.fillStyle = color;
        ctx.font = `${2*width/3}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(token, x + (width/2), y + (height/2))
    }

    function drawTurn(player, margin) {      
        ctx.fillStyle = COLORS.pewter;
        ctx.font = `${2*margin/3}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Player Turn: ${player}`, margin, 0);
    }

    window.onload = init;
})();


