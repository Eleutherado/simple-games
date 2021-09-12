// color palette: https://www.canva.com/colors/color-palettes/soft-focus-forest/ 
(function () {

    const SIZE = 600;
    let canvas, ctx; 

    function init () {
        canvas = document.querySelector('canvas');
        ctx = canvas.getContext('2d');
        canvas.height = canvas.width = SIZE;
        canvas.style.width = canvas.style.height = SIZE;
    }


    window.onload = init;
})();


