new Zepto(function ($) {
    "use strict";
    
    Date.prototype.addHours = function (h) {
        this.setHours(this.getHours() + h);
    };
    
    /************************** Universal Interface Elements***********************/ 
    
    // Wrapper containing stick man and streaking status text
    var streakActions = $("#streak-actions"),
        
    /************************** Global Utilities ***********************/    

    /*Cycle through a series of functions, calling them individually at a fixed time interval. */ 

    cycleFns = function (fns, interval) {
        var i = 0, l = fns.length; 
        return window.setInterval(function () {
            fns[i](); 
            if (i + 1 < l) {
                i += 1; 
            } else {
                i = 0; 
            } 
        }, interval); 
    };

    /************************** Streaking Actions Section ***********************/ 

    streakActions.on('click', function () {
        if (Player.isStreaking()) {
            console.log('stop streaking'); 
        } else {
            Player.startStreak(); 
        }
    });

    /************************** Abstraction for Local Storage ***********************/ 

    var Storage = (function () {

        var appKey = 'mapStreakSession';

        function isPossible() {
            return (window.hasOwnProperty('localStorage')); 
        }

        function getKey(subKey) {
            return appKey + '.' + subKey; 
        }

        function save(subKey, object) {
            if (typeof object !== 'object') return false; 
            localStorage.setItem(getKey(subKey), JSON.stringify(object)); 
        }

        function arrayPush(subKey, element) {
            var array = get(subKey); 

            if (typeof array === 'undefined') { // array doesn't exist yet
                save(subKey, []); 
                array = get(subKey); 
            }
            array.push(element); 
            save(subKey, array); 
        }

        function get(subKey) {
            var key = getKey(subKey); 
            return (key in localStorage) ? JSON.parse(localStorage[key]) : undefined; 
        }

        if (!isPossible()) {
            return false; 
        }

        return {
            isPossible: isPossible,
            arrayPush: arrayPush,
            save: save, 
            get: get
        };
    })();

    /************************** Handles geolocation functions ***********************/ 

    var Checkin = function(){

        var loc = {
            AVAILABLE: 1, 
            DENIED: 2,
            UNAVAILABLE: 3, 
            WAITING: 4,
            NOT_REQUESTED: 5,
            status: null
        };
        
        loc.status = loc.NOT_REQUESTED; // default

        var countdownLimit = 324000; // seconds in 90 minutes

        function handleLoc(pos){
            loc.status = loc.AVAILABLE; 

            Storage.arrayPush('checkins', {
                lat: pos.coords.latitude, 
                lon: pos.coords.longitude,
                date: new Date()
            });

            //var firstCheckin = (Player.getStats().checkins === 1); 

            if (Player.hasActiveStreak()) {
                Notices.add("You map-streaked x miles since your last check-in!");
            } else {
                Notices.add("You are now map-streaking. You have x minutes to travel somewhere new."); 
            }  

            Game.updateViews(); 
        }

        function locError(error){
            var notice = ''; 

            switch (error.code) {
                case error.PERMISSION_DENIED: 
                    loc.status = loc.DENIED; 
                    notice = "You refused to share your location. Streaking can't work without it. :(";
                break;
                case error.POSITION_UNAVAILABLE:
                    loc.status = loc.UNAVAILABLE; 
                    // Default 
                    notice = "Please enable location sharing in your phone's settings.";

                    // Specific to iOS
                    if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
                        notice = "In your iPhone's settings, go to 'Privacy' and enable 'Location Services.'";
                    } 
                break;
                case error.TIMEOUT: 
                    notice = "The request for your location timed out. Please reload and try again.";
                break;
            } 

            Notices.add(notice); 
        }

        function geolocate(){
            loc.status = loc.WAITING; 

            Notices.add("Finding your location..."); 
            navigator.geolocation.getCurrentPosition(handleLoc, locError); 

            var reminder = setTimeout(function(){
                if (loc.status === loc.WAITING) {
                    Player.notice("Still waiting for you to share location..."); 
                }
            }, 4000); 
        }

        return {
            geolocate: geolocate
        }
    }(); 


    var Notices = function(){

        /* It looks bad when notices are overwritten just milliseconds 
        after they're added. To prevent this, I'm creating a queue and mandating
        that each notice be displayed for a minimum # of seconds */ 

        var display = $("#stick-man-dialogue"),
        noticeAge = 0,
        noticeMinAge = 1500, // must be in increments of 250 
        processing = false, // if queue is being processing
        processInterval = 250,
        queue = []; 

        function add(message) {
            queue.push(message);
            if (!processing) {
                process(); 
                processing = true; 
            } 
        }

        function show(text){
            // Make room by shrinking long strings of text
            if (text.length > 10) {
                display.addClass('fs-small'); 
            } else {
                display.removeClass('fs-small'); 
            }
            display.text(text); 
        }

        function process() {
            noticeAge+= processInterval; 
            var l = queue.length; 

            // Nothing to see here.d
            if (l === 0) {
                processing = false; 
                return;

            // If there's only one message, show it immediately.
            } else if (l === 1) {
                show(queue[0]);  
                queue = queue.slice(1);

            // If there's a waiting line, check the age of the current message.
            } else if (l > 1 && noticeAge >= noticeMinAge) {
                queue = queue.slice(1); 
                show(queue[0]); 
            }

            setTimeout(process, processInterval); 
        }

        /*
        function startCountdown(){
            // todo Add real logic to this. 

            var lastCheckin = new Date().addHours(-1),
            diff; 

            var interval = setInterval(function(){
                diff = countdownLimit - (new Date().getTime() - lastCheckin.getTime());

                if (diff >= 0) {
                    // set back to default screen 
                    clearInterval(interval); 
                    return; 
                }  
                
                //Notices.show(diff); 
                Notices.show("You are now travel-streaking! You have 90 minutes to check-in from a new location.");

            }, 1000); 
        }
        */ 

        return {
            add: add,
            show: show // this should only be used for the countdown
        };
    }(); 

    var Player = function (){
    
        var display = $("#stick-man-dialogue"), 
        stats = {
            checkins: 0, // total checkins
            max_single_streak: 0, // longest single streak
            total_streak: 0 // total miles streaked
        }; 

        function hasActiveStreak (){
            if (stats.checkins === 0) return false; 
            
            // Get last checkin
            var checkins = Storage.get('checkins');
            console.log(checkins[0]); 
            return false; 
        }

        function getStats (){
            /* Get geolocation-related stats */ 
            var geo = Storage.get('checkins'); 
            if (typeof geo == 'object') {
                stats.checkins = geo.length; 
            }

            return stats; 
        }

        function warnOldDevice () {
            Notices.add("Your device is too old to handle this app, but if it makes you feel better, you don't look a day over 25."); 
        }

        function startStreak () {
            if (!'geolocation' in navigator || !Storage.isPossible()) {
                warnOldDevice(); 
                return false; 
            }
            StickMan.start(); 
            Checkin.geolocate(); 
            Game.updateViews(); 
        }

        function stopStreak(){
            Notices.add('Tap to Streak!'); 
            display.removeClass('streaking'); 
        }

        function isStreaking(){
            return display.hasClass('streaking'); 
        }

        return {
            getStats: getStats,
            hasActiveStreak: hasActiveStreak,
            isStreaking: isStreaking, 
            startStreak: startStreak
        }

    }(); 

    var StickMan = function (){

        var stickManEl = $("#stick-man"), 
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
            if (!isStreaking()) {
                streak1(); 
                animationInt = cycleFns([streak1, streak2], 1500); 
            }
        }
        function stop(){
            //clearInterval(animationInt); 
        }

        return {
            isStreaking: isStreaking,
            start: start, 
            stop: stop
        };
    }(); 


    var Game = function(){

        function updateViews() {
            var stats = Player.getStats(); 
            for (var key in stats) {
                // @todo Need validation here
                $('#'+key).text( stats[key] ); 
            }
        }

        updateViews(); 

        return {
            updateViews: updateViews
        };
    }(); 

});