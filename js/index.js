/************************** Global Utilities ***********************/ 

/*Cycle through a series of functions, calling them individually at a fixed time interval. */ 

var cycleFns = function (fns, interval) {
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

/* Haversine formula for calculating distance between two lat/lon pairs. */ 

var haversine = function(coords1, coords2) {

    var lat1 = coords1[0], 
    lon1 = coords1[1],
    lat2 = coords2[0], 
    lon2 = coords2[1],

    R = 6371, // km 

    x1 = lat2-lat1,
    dLat = x1.toRad(),  
    x2 = lon2-lon1,
    dLon = x2.toRad(),  
    a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
    Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)), 
    d = R * c; 

    return d; 
}

// Format a number for display
Number.prototype.readable = function(){
    return this.toFixed(2);
};

Number.prototype.toRad = function() {
   return this * Math.PI / 180;
};

function hasProps(obj) {
    var argsLen = arguments.length; 
    if (typeof obj !== 'object') return false; 
    if (argsLen <= 1) return false; 

    for (var i = 1, l = argsLen; i < l; i++)
        if (!obj.hasOwnProperty(arguments[i])) return false; 

    return true; 
}


Object.prototype.hasProps = function() {
    var hasAllProps = true;  
    arguments.forEach(function(prop){
        hasAllProps = (this.hasOwnProperty)
    }.bind(this));
};

Array.prototype.last = function () {
    return this[this.length - 1] || false; 
};
    
Date.prototype.addHours = function (h) {
    this.setHours(this.getHours() + h);
};

new Zepto(function ($) {
    "use strict";
    
    /************************** Universal Interface Elements ***********************/ 
    
    // Wrapper containing stick man and streaking status text
    var streakActions = $("#streak-actions"),

    // Where important game messages are displayed
    display = $("#stick-man-dialogue"); 

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
    
    /************************** Streaking-specific logic ***********************/ 
    
    var Streak = (function(){

        function getTotalDist(){
            var dist = Storage.get('checkins').reduce(function(totalMiles, thisCheckIn, index, allCheckIns){
                var nextCheckIn = allCheckIns[index + 1] || false;

                // If there's no next check-in, there's no distance to calculate.
                if (typeof nextCheckIn !== 'object')
                    return 0;  

                // To be considered part of streak, a check-in must occur soon after previous one.
                if (Checkin.secondsDiff(nextCheckIn, thisCheckIn) > Checkin.countdownlimit)
                    return 0; 

                // Return the total miles recorded plus the distance between two check-ins.
                return totalMiles + Checkin.distance(thisCheckIn, nextCheckIn);
            }, 0);
            
            return dist; 
        }
        
        function isActive(){
            var checkins = Storage.get('checkins');

            // If there's nothing to compare, streak can't be active
            if (checkins.length <= 1) return false; 

            // Get seconds between now and the second-to-last checkin
            var recent = checkins[checkins.length - 1],
            recentDate = new Date( checkins[checkins.length - 2].date),
            secondsAgo = (new Date().getTime() - recentDate.getTime()) / 1000; 
            
            return (secondsAgo <= Checkin.countdownLimit);
        }
        
        return {
            getTotalDist: getTotalDist,
            isActive: isActive
        };
    })(); 

    /************************** Handles geolocation functions ***********************/ 

    var Checkin = (function(){

        var loc = {
            AVAILABLE: 1, 
            DENIED: 2,
            UNAVAILABLE: 3, 
            WAITING: 4,
            NOT_REQUESTED: 5,
            status: null
        };
        
        loc.status = loc.NOT_REQUESTED; // default

        var countdownLimit = 324000, // seconds in 90 minutes
        travelMin = .25; // minimum distance users must travel before checking in

        function secondsDiff(checkin1, checkin2) {
            var result = new Date(checkin1.date).getTime() - new Date(checkin2.date).getTime(); 
            return result; 
        }

        function distance(checkin1, checkin2) {
            var coords1 = [checkin1.lat, checkin1.lon], 
            coords2 = [checkin2.lat, checkin2.lon];
            return haversine(coords1, coords2);
            //return haversine(coords1, coords2);  
        }

        function handleLoc(pos){

            /** 
            * @todo: Reorganize this function 
            */ 

            loc.status = loc.AVAILABLE;

            /*
            Storage.arrayPush('checkins', {
                lat: pos.coords.latitude, 
                lon: pos.coords.longitude,
                date: new Date()
            });
            */

            if (Streak.isActive()) {

                // Get the distance between this check-in & last one.
                var distance = Checkin.distance({
                    lat: pos.coords.latitude, 
                    lon: pos.coords.longitude
                }, Storage.get('checkins').last());

                if (distance < travelMin) {
                    Notices.add("You have to travel at least "+travelMin.readable()+" miles before checking in.", 5000);
                    Notices.add("Tap to Check In!", 3000); 
                    return false; 
                }

                /*
                Storage.arrayPush('checkins', {
                lat: pos.coords.latitude, 
                lon: pos.coords.longitude,
                date: new Date()
                });
                */

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
                    Notices.add("Still waiting for you to share location..."); 
                }
            }, 4000); 
        }

        return {
            travelMin: travelMin,
            distance: distance,
            secondsDiff: secondsDiff,
            countdownLimit: countdownLimit,
            geolocate: geolocate
        }
    })(); 



    var Notices = (function(){

        var current, 
        queue = [], 
        interval,
        processInterval = 100; 

        function add(text, expires) { 
            queue.push({
                text: text, 
                age: 0,
                expires: expires || 1500, 
                isExpired: function(){
                    return this.age > this.expires
                }
            }); 

            if (!isProcessing()) {
                startProcessing(); 
            }
        }

        function displayQueueItem(notice) {
            current = notice; 
            queue = queue.slice(1); 
            if (current.text.length > 15) {
                display.addClass('fs-small'); 
            } else {
                display.removeClass('fs-small'); 
            }
            display.text(current.text); 
        }

        function clearDisplay() {
            current = null; 
        }

        function processQueue() {

            // if there is an object in current, increase its age
            if (current && current.hasOwnProperty('age')) { 
                current.age+= processInterval;
            } else if (queue.length > 0) {
                displayQueueItem(queue[0]); // if nothing is in current and there's a queue, show the first object
            } 

            // if the object in current has expired, remove it 
            if (current && current.isExpired()) clearDisplay(); 

            if (queue.length === 0 && typeof current === 'null') {
                pauseProcessing();       
            }
        }

        function isProcessing() {
            return (typeof interval === 'number');
        }

        function startProcessing() {
            interval = setInterval(processQueue, processInterval);    
        }

        function pauseProcessing() {
            clearInterval(interval); 
            interval = null; 
        }

        startProcessing();

        return {
            add: add
        };
    })();

    var Player = function (){
    
        var display = $("#stick-man-dialogue"), 
        stats = {
            checkins: 0, // total checkins
            max_single_streak: 0, // longest single streak
            total_streak: 0 // total miles streaked
        }; 

        function getStats (){
            /* Get geolocation-related stats */ 
            var geo = Storage.get('checkins'); 
            if (typeof geo == 'object') {
                stats.checkins = geo.length; 
                stats.total_streak = Streak.getTotalDist();
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


    /************************** Universal tasks such as updating views for all objects ***********************/ 
    
    var Game = function(){

        /*
        var states = {
            'OBSERVING' : 1, 
            'TRYING_CHECKIN': 2, 
            'CHECKIN_SUCCESS': 3, 
            'CHECKIN_FAILURE': 4, 

        },
        state = 'observing'; // default state
        */

        function updateViews() {
            var stats = Player.getStats(); 
            for (var key in stats) {
                // @todo Need validation here
                $('#'+key).text( stats[key] ); 
            }
        }

        function getState() {
            return {
                current: state, 
                states: states
            };
        }

        /*
        function changeState(state) {
            switch (status.toLowerCase()) {
                case states.OBSERVING: 
                break;
                case states.TRYING_CHECKIN: 
                break;
                case states.CHECKIN_SUCCESS:
                break;
                case states.CHECKIN_FAILURE: 
                break;
            }
        }
        */

        updateViews(); 

        return {
            //getState: getState,
            //changeState: changeState,
            updateViews: updateViews
        };
    }(); 
    
    /************************** Streaking Actions Section ***********************/ 

    streakActions.on('click', function () {
        if (Player.isStreaking()) {
            console.log('stop streaking'); 
        } else {
            Player.startStreak(); 
        }
    });

        /************************** Initialization ***********************/ 

    (function() {
        Notices.add("Tap to Streak!", 0); 
    })();

});