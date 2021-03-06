
(function () {

    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d'); // how to pass to draw functions?

    const COLORS = {
        pewter: "#b9b7bd",
        "X": "#219ebc",
        "O": "#e07a5f",
        tealGreen: "#0d877a",
        ghostWhite: "#FFFFFF"
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
        outcome: null, // will be set to one of the GAMEPLAY_STATES.
        winner: null, // will be set to PlayerX or PlayerO if there is a winner. 
        //view data
        mouseX: 0, 
        mouseY: 0, 
        margin: null,
        grid: null, 
        gap: null,
        size: null,
        cornerRadius: null,
        highlightedSquare: {row: null, col: null},
        restartBtnDimensions: { x: null, y: null, width: null, height: null },
        restartBtnHighlighted: false, 
    }





    function init () {
        const SIZE = 600;
        const BOARD_SIZE = 3;

        canvas.height = canvas.width = SIZE;
        canvas.style.width = canvas.style.height = SIZE;

        game.size = SIZE;
        game.board = makeBoard(BOARD_SIZE); 
        game.margin = SIZE/20;
        game.grid = (SIZE - game.margin * 2) / game.board.length;
        game.gap = game.grid/10;
        game.cornerRadius = 10;

        game.restartBtnDimensions.x = game.size/12, 
        game.restartBtnDimensions.y = 9*game.size/12, 
        game.restartBtnDimensions.width = 10*game.size/12
        game.restartBtnDimensions.height = 2*game.size/12 ; 

        game.playerTurn = game.playerX
        game.outcome = GAMEPLAY_STATES.playing

        drawGame(game);

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

    function isValidPlay(row, col, board, outcome) {
        // determine if this is a legal move
        if  (outcome != GAMEPLAY_STATES.playing) {
            console.log("invalid play - game is over")
            return false
        } else {
            let squareIsFree = (board[row][col] === 0)
            if (!squareIsFree) {
                console.log(`invalid play - square [${row}, ${col}] is not empty`)
            }
            return squareIsFree
        }
    }

    function checkHorizontalWin(row, board, curPlayer){
        let isWin = board[row].every((square) => square === curPlayer);
        console.log("horizontal win - ", isWin);
        return isWin
    }
    
    function checkVerticalWin(col, board, curPlayer){
        isWin = true
        for (let row in board){
            if (board[row][col] != curPlayer)
            isWin = false; 
        }
        console.log("verticalWin - ", isWin);
        return isWin
    }

    function checkDiagonal1Win(board, curPlayer) {
        isWin = true
        for (let row in board){
            if (board[row][row] != curPlayer) { 
                isWin = false
            }
        }
        console.log("Diag 1 Win - ", isWin);
        return isWin

    }

    function checkDiagonal2Win(board, curPlayer) {
        //diag 2 on square board
        isWin = true
        for (let row in board){
            if (board[row][board.length - 1 - row] != curPlayer){ 
                isWin = false
            }
        }
        console.log("Diag 2 Win - ", isWin);
        return isWin;
    }

    function checkBoardIsFull(board){
        isFull = true
        for (let row in board){ 
            for (let col in board[0]){
                if (board[row][col] === 0){
                    isFull = false;
                }
            }
        }
        return isFull
    }


    function checkGameEnd(board, curPlayer) {
        // Returns { outcome, winner} where outcome is type of GAMEPLAY_STATES, and winner is playerX, playerO or null.
        const winResult = {
            outcome: GAMEPLAY_STATES.victory,
            winner: curPlayer
        };

        const tieResult = {
            outcome: GAMEPLAY_STATES.tie, 
            winner: null
        }

        const playOn = {
            outcome: GAMEPLAY_STATES.playing, 
            winner: null
        }
        // Victory: when player gets 3 of their tokens in a row (vertical, horizontal or diagonal).
        for (let row = 0; row < board.length; row++){
            if (checkHorizontalWin(row, board, curPlayer)) {
                return winResult
            }
        }
        for (let col = 0; col < board[0].length; col++){
            if(checkVerticalWin(col, board, curPlayer)){
                return winResult
            }
        }

        if(checkDiagonal1Win(board, curPlayer)){
            return winResult
        }

        if(checkDiagonal2Win(board, curPlayer)){
            return winResult
        }
        // Tie: when the grid has no more empty squares and no tokens form 3 in a row. 
        if(checkBoardIsFull(board)){
            console.log("we have a tie")
            return tieResult
        }

        return playOn;
    }

    /* Actions API, 
    these are called by events to produce changes in the game state.
    These are either "interactive actions" - changes to data governing visual representation of the game
    Or "game actions" - actions that change the state of the game itself
    DESIRABLE - refactor mutating functions so that same inputs produce same effect.
    */ 


    function updateMouse(mouseX, mouseY) { 
        game.mouseX = mouseX;
        game.mouseY = mouseY;
    }

    function setHighlightedRestart() {
        game.restartBtnHighlighted = true;
    }

    function clearHighlightedRestart() {
        game.restartBtnHighlighted = false;
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

    function endGame(outcome, winner) {
        let { playerTurn, playerX, playerO } = game;
        if (winner != null && playerTurn != winner){
            console.log("error endGame - winner is not current Player")
        }
        if (playerTurn != playerX && playerTurn != playerO) {
            console.log("error endGame - turn doesn't have a valid player")
            return;
        }
        if(outcome != GAMEPLAY_STATES.tie && outcome != GAMEPLAY_STATES.victory){
            console.log(`error in endGame - given game outcome '${outcome}' is invalid`);
            return;
        }
        game.outcome = outcome;
        game.winner = winner;
        
        return game.outcome;
    }

    function restartGame() {
        init();
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
        if (!isValidPlay(row, col, game.board, game.outcome)){
            console.log(`invalid play at {${row}, ${col}}`);
            return null;
        }

        game.board[row][col] = game.playerTurn;

        let { outcome, winner } = checkGameEnd(game.board, game.playerTurn); // return {outcome, winner}. If tie, winner = null;
        if (outcome === GAMEPLAY_STATES.playing) {
            switchTurn();
        } else {
            endGame(outcome, winner);
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

        if (game.outcome != GAMEPLAY_STATES.playing) {
            if (checkForRestartHover()){
                console.log('hovering over Restart!!')
                setHighlightedRestart();
                redraw(game);
            } else {
                clearHighlightedRestart();
                redraw(game);
            }
        } 

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
        if (game.outcome != GAMEPLAY_STATES.playing && checkForRestartHover()) { 
            restartGame();
        } else {
            let outcome;
            if (square) {
                outcome = playSquare(square.row, square.col);
            }
            if (outcome) {
                redraw(game);
            } 
        }
    }

    function checkForRestartHover() {
        let { restartBtnDimensions, mouseX, mouseY } = game;

        return (
            mouseX >= restartBtnDimensions.x 
            && mouseX <= restartBtnDimensions.x + restartBtnDimensions.width
            && mouseY >= restartBtnDimensions.y
            && mouseY <= restartBtnDimensions.y + restartBtnDimensions.height
        );
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
        // interfaces with the game object to draw based on the data it recieves. 
        // this function maps the information contained in the game 
        // object to the functions that draw purely based on inputs   
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (game.outcome != GAMEPLAY_STATES.playing) {
            ctx.globalAlpha = 0.3

            drawGame(game);
            
            ctx.globalAlpha = 1;
            drawOutcome(game.outcome, game.winner, game.size);
            drawRestart(game.size, game.restartBtnDimensions, game.restartBtnHighlighted);

        } else {
            // normal draw 
            drawGame(game);

        }
    }


    function drawGame(game){
            drawBoard(
                game.board, 
                game.margin, 
                game.grid, 
                game.gap, 
                game.cornerRadius, 
                game.highlightedSquare,
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

    function drawOutcome(outcome, winner, gameSize){
        ctx.fillStyle = COLORS.ghostWhite;
        ctx.font = `bold ${gameSize/8}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Game Over", gameSize/2, gameSize/3);

        if (outcome == GAMEPLAY_STATES.tie) { 
            ctx.fillText("Tie", gameSize/2, 2*gameSize/3);     
        } else {
            ctx.fillStyle = COLORS[winner];
            ctx.fillText(`Winner is ${winner}`, gameSize/2, 2*gameSize/3)
        }
    }

    function drawRestart(gameSize, btnDimensions, highlighted){

        let color = COLORS.ghostWhite;
        if (highlighted) {
            color = COLORS.tealGreen
        }
        ctx.fillStyle = color;
        ctx.font = `bold ${gameSize/14}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        
        ctx.fillText("Click to Restart", gameSize/2, 5*gameSize/6);

        ctx.lineWidth = gameSize/120;
        ctx.strokeStyle = color;
        ctx.strokeRect(btnDimensions.x, btnDimensions.y, btnDimensions.width, btnDimensions.height); 
    }

    window.onload = () => {
        init();
        // interactions
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mousedown", handleMouseClick);
    }
})();


