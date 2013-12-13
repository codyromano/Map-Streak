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

/* Basic prototype extensions / polyfills for older browsers */ 

if (!'forEach' in window) {
    Array.prototype.forEach = function(func) {
        for (var i = 0, l = this.length; i<l; i++) {
            func(this[i]); 
        }
    }; 
}

if (!'map' in window) {
   Array.prototype.map = function(func) {
       var result = []; 
       this.forEach(function(el){
           result.push(func(el)); 
       }); 
       return result; 
   }; 
}

Array.prototype.compare = function(func) {
    for (var i = 0, l = this.length; i<l; i++) {
        if (this.hasOwnProperty(i + 1)) {
            func(this[i], this[i+1]); 
        } else {
            func(this[i], 0); 
        }
    }
}; 

Array.prototype.reduce = function(callback, opt_initialValue){
    'use strict';
    if (null === this || 'undefined' === typeof this) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
          'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index, value,
        length = this.length >>> 0,
        isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for (index = 0; length > index; ++index) {
      if (this.hasOwnProperty(index)) {
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        }
        else {
          value = this[index];
          isValueSet = true;
        }
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };

Array.prototype.last = function () {
    return this[this.length - 1];
};
    
Date.prototype.addHours = function (h) {
    this.setHours(this.getHours() + h);
};



new Zepto(function ($) {
    "use strict";
    
    /************************** Universal Interface Elements***********************/ 
    
    // Wrapper containing stick man and streaking status text
    var streakActions = $("#streak-actions");

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
    
    /************************** Specific streaking logic ***********************/ 
    
    var Streak = (function(){
        
        function getDist( coords1, coords2) {
            // @todo: replace this with Haversine formula
            return coords1.lat + coords2.lat; 
        }
    
        function getTotalDist(){
            
            var miles = 0;
            Storage.get('checkins').compare(function(a, b){
                if (b.hasOwnProperty('lat') && b.hasOwnProperty('lon')) {
                    miles+= getDist(a, b); 
                } else {
                }
            }); 
            
            return miles; 
        }
        
        function isActive(){
            var checkins = Storage.get('checkins'), 
            recent = new Date( checkins[checkins.length - 2].date), // date of second-to-last checkin
            secondsAgo = (new Date().getTime() - recent.getTime()) / 1000; 
            
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

        var countdownLimit = 324000; // seconds in 90 minutes

        function handleLoc(pos){
            loc.status = loc.AVAILABLE; 

            Storage.arrayPush('checkins', {
                lat: pos.coords.latitude, 
                lon: pos.coords.longitude,
                date: new Date()
            });

            //var firstCheckin = (Player.getStats().checkins === 1); 

            if (Streak.isActive()) {
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
            countdownLimit: countdownLimit,
            geolocate: geolocate
        }
    })(); 


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
    
    /************************** Streaking Actions Section ***********************/ 

    streakActions.on('click', function () {
        if (Player.isStreaking()) {
            console.log('stop streaking'); 
        } else {
            Player.startStreak(); 
        }
    });

});