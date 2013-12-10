Zepto(function($){

    /************************** Universal Interface Elements ***********************/ 

    // Wrapper containing stick man and streaking status text
    var streakActions = $("#streak-actions");


    /************************** Global Utilities ***********************/    

    /* Cycle through a series of functions, calling them individually at a fixed time interval. */ 

    var cycleFns = function(fns, interval) {
        var i = 0, l = fns.length; 
        return setInterval(function(){
            fns[i](); 
            i = (i + 1 < l) ? ++i : 0; 
        }, interval); 
    }

    /************************** Streaking Actions Section ***********************/ 

    streakActions.on('click',function(){
        if (StickMan.isStreaking()) {
            StickMan.stop();  
        } else {
            StickMan.start(); 
        }
    });


    var StickMan = function(){

        var stickManEl = $("#stick-man"), // DOM element
        animationInt; // animation interval

        function isStreaking(){
            return (stickManEl.hasClass('stick-streaking-1') || stickManEl.hasClass('stick-streaking-2')); 
        }
        function streak1(){
            stickManEl.removeClass('stick-streaking-2').addClass('stick-streaking-1');   
        }
        function streak2(){
            stickManEl.removeClass('stick-streaking-1').addClass('stick-streaking-2');   
        }

        function start(){
            streak1(); 
            animationInt = cycleFns([streak1, streak2], 2000); 
        }
        function stop(){
            clearInterval(animationInt); 
        }

        return {
            isStreaking: isStreaking,
            start: start, 
            stop: stop
        };
    }(); 



}); 