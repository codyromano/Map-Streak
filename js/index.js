/************************** Global Utilities ***********************/ 

/*Cycle through a series of functions, calling each at a fixed time interval. */ 

var cycleFns = function (fns, interval) {
    var i = 0, l = fns.length; 
    return window.setInterval(function () {
        fns[i](); 
        i = (i + 1 < l) ? ++i : 0; 
    }, interval); 
};

/* Haversine formula for calculating distance between two lat/lon pairs. Adapted from: 
http://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
*/ 

Number.prototype.toRad = function() {
   return this * Math.PI / 180;
};

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

function hasProps(obj) {
    var argsLen = arguments.length; 
    if (typeof obj !== 'object') return false; 
    if (argsLen <= 1) return false; 

    for (var i = 1, l = argsLen; i < l; i++)
        if (!obj.hasOwnProperty(arguments[i])) return false; 

    return true; 
}

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
    display = $("#stick-man-dialogue"),

    countdownDisplay = $("#timer"); 

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

            if (typeof array === 'undefined') { // create array if it doesn't exist
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

        // Public API 
        
        return {
            isPossible: isPossible,
            arrayPush: arrayPush,
            save: save, 
            get: get
        };
    })();
    
    /************************** Streaking-specific logic ***********************/ 
    
    var Streak = (function(){

        function getDist(){

            // For efficiency, we will calculate the longest single streak while calculating the total streaking distance
            var singleIndex = 0, 
            singleRecord = 0; 

            var dist = Storage.get('checkins').reduce(function(totalMiles, thisCheckIn, index, allCheckIns){
                var nextCheckIn = allCheckIns[index + 1] || false;

                // If there's no next check-in, there's no distance to calculate.
                if (typeof nextCheckIn !== 'object')
                    return totalMiles + 0;  

                // To be considered part of streak, a check-in must occur soon after the previous one.
                if (Checkin.secondsDiff(nextCheckIn, thisCheckIn) > Checkin.countdownlimit) {

                    // Too much time passed between check-ins; we have to break the streak. But if the single streak
                    // that we're keeping track of is greater than the previously recorded one, let's make this one the reigning champ.
                    if (singleIndex > singleRecord)
                        singleRecord = singleIndex; 

                    singleIndex = 0; 

                    // The check-ins are spaced out too much to be considered part of a streak
                    return totalMiles + 0; 
                }

                var distance = Checkin.distance(thisCheckIn, nextCheckIn);
                singleIndex+= distance; 

                // Return the total miles recorded plus the distance between the two check-ins currently being processed
               return totalMiles + Checkin.distance(thisCheckIn, nextCheckIn); 
            }, 0);

            if (singleIndex > singleRecord) singleRecord = singleIndex; 

            return {
                total_streak: dist, 
                max_single_streak: singleRecord
            };
        }

        function secondsSinceLastCheckin() {
            var checkins = Storage.get('checkins');

            // If it's the initial check-in, there's nothing to compare 
            if (typeof checkins === 'undefined' || checkins.length === 0) return undefined; 

            var lastCheckIn = new Date( checkins.last().date),
            secondsAgo = (new Date().getTime() - lastCheckIn.getTime()) / 1000; 

            return secondsAgo; 
        }
        
        function isActive(){
            var secondsAgo = secondsSinceLastCheckin(); 
            if (typeof secondsAgo === 'undefined') return false; 
            else return (secondsAgo <= Checkin.countdownLimit);
        }
        
        return {
            secondsSinceLastCheckin: secondsSinceLastCheckin,
            getDist: getDist,
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

        var countdownLimit = 5400, // seconds in 90 minutes
        travelMin = .25; // minimum distance users must travel before checking in

        function secondsDiff(checkin1, checkin2) {
            var result = new Date(checkin1.date).getTime() - new Date(checkin2.date).getTime(); 
            return result; 
        }


        function distance(checkin1, checkin2) {
            var coords1 = [checkin1.lat, checkin1.lon], 
            coords2 = [checkin2.lat, checkin2.lon];
            return haversine(coords1, coords2);
        }

        // Create a new check-in
        function create(lat, lon) {
            Storage.arrayPush('checkins', {
                lat: lat, 
                lon: lon,
                date: new Date()
            });
        }

        function handleLoc(pos){

            loc.status = loc.AVAILABLE;

            if (Streak.isActive()) {

                // Get the distance between this check-in & last one.
                var distance = Checkin.distance({
                    lat: pos.coords.latitude, 
                    lon: pos.coords.longitude
                }, Storage.get('checkins').last());

                // Make sure user has traveled far enough
 
                if (distance < travelMin) {
                    Notices.add("You have to travel at least "+travelMin.readable()+" miles before checking in.", 5000);
                    Notices.add("Tap to Check In!", 3000); 
                    return false; 
                }

                // Create a record of the check-in
                create(pos.coords.latitude, pos.coords.longitude); 
                Notices.add("You map-streaked "+distance.readable()+" miles since your last check-in!", 4000);
                Notices.add("Tap to Check In!");

            } else {
                create(pos.coords.latitude, pos.coords.longitude); 
                Notices.add("You are now map-streaking. You have " + Math.round(countdownLimit / 60) + " minutes to travel somewhere new.", 5000);
                Notices.add("Tap to Check-in!"); 
            }  

            Notices.startCountdown(); 
            Game.updateViews(); 
        }

        function locError(error){
            var notice = ''; 

            switch (error.code) {
                case error.PERMISSION_DENIED: 
                    loc.status = loc.DENIED; 
                    notice = "You refused to share your location or your phone's GPS is turned off.";
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
                    Notices.add("Please agree to share your location."); 
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
        processInterval = 100,
        countdown = $("<div></div>").addClass("countdown"),
        countdownInterval;  

        function startCountdown() {
            countdownDisplay.css("display","block");
            countdownInterval = setInterval(updateCountdown, 1000); 
        } 

        function stopCountdown() {
            StickMan.stop(); 
            countdownDisplay.css("display","none"); 
            clearInterval(countdownInterval); 
        }

        function updateCountdown() {
            /**
            * @todo Refactor this whole function. It works, but it's very confusing to read. 
            */ 
            // Time since last check-in
            var secs, mins, hours; 

            secs = Math.floor(Checkin.countdownLimit - Streak.secondsSinceLastCheckin());

            if (secs <= 0) {
                stopCountdown();
                Notices.add("Your streak ended!", 4000); 
                Notices.add("Tap to Streak!");  
                return false; 
            }

            if (secs > 0) {
                mins = secs / 60;
                secs = Math.floor((mins - Math.floor(mins)) * 60);
                mins = Math.floor(mins);  
            } else {
                secs = 0; 
            }

            if (secs < 10) secs = '0' + secs; 
            if (mins < 10) mins = '0' + mins; 
            countdownDisplay.text(mins+':'+secs); 
        }

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

            display.removeClass('fs-medium').removeClass('fs-small'); // reset display

            if (current.text.length > 15 && current.text.length < 25) {
                display.addClass('fs-medium'); 
            } else if (current.text.length >= 25) {
                display.addClass('fs-small'); 
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
            startCountdown: startCountdown,
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

                var distances = Streak.getDist();
                stats.checkins = geo.length; 
                stats.total_streak = distances.total_streak.toFixed(1);
                stats.max_single_streak = distances.max_single_streak.toFixed(1); 
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
                animationInt = cycleFns([streak1, streak2], 2500); 
            }
        }
        function stop(){
            stickManEl.removeClass('stick-streaking-1').removeClass('stick-streaking-2'); 
            clearInterval(animationInt); 
        }

        return {
            isStreaking: isStreaking,
            start: start, 
            stop: stop
        };
    }(); 

    /************************** Universal tasks such as updating views for all objects ***********************/ 
    
    var Game = function(){

        function updateViews() {
            var stats = Player.getStats(); 
            for (var key in stats) {
                if (typeof $('#'+key) === 'object') {
                    $('#'+key).text( stats[key] ); 
                }
            }
        }

        updateViews(); 

        return {
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
        if (Streak.isActive()) {
            Notices.add("Tap to check-in and keep your travel streak going.", 0); 
            Notices.startCountdown(); 
            StickMan.start(); 
        } else {
            Notices.add("Tap to Streak!", 0);
        } 
    })();

});