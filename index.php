<!doctype HTML>
<html>
<head>
    <title> Map Streak - Go Streaking! </title>

    <meta charset='utf-8'> 
    <!-- For responsive design on mobile --> 
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Custom fonts --> 
    <link href="http://fonts.googleapis.com/css?family=Simonetta:400" rel="stylesheet" type="text/css">

    <!-- Simple responsive grid --> 
    <link rel="stylesheet" href="css/main.css" type="text/css">

    <!-- jQuery without all the blubber --> 
    <script src="js/zepto.min.js" type="text/javascript"></script>

    <script src="js/index.js" type="text/javascript"></script>

</head>
<body>

<div class="page">

    <header class="row">
        <div class="header col logo-bg">
            <span class="sprite" id="logo"></span>
        </div>
    </header>

    <section class="row" id="streak-actions">
        <div class="span_2 col">
            <div class="stick-waiting sprite" id="stick-man"></div> 
        </div>
        <div class="span_4 col" id="stick-man-dialogue">
            Tap to Streak!
        </div>
    </section>

    <section class="row" id="playerStats">
        <div class="row">
            <h2 class="span_6 col"> Your Stats </h2>
        </div>

        <div class="row">
            <label class="span_4 col"> Total Check-ins </label>
            <span class="span_2 col" id="checkins"> 0 </span>
        </div>

        <div class="row">
            <label class="span_4 col"> Longest Single Streak <span class="sprite info"></span></label>
            <span class="span_2 col" id="max_single_streak"> 0 Miles </span>
        </div>

        <div class="row">
            <label class="span_4 col"> Total Miles Streaked <span class="sprite info"></span></label>
            <span class="span_2 col" id="total_streak"> 0 </span>
        </div>

    </section>

    <section id="tripIdeas"> 

        <div class="row"> 
            <h2 class="span_6 col"> Trip Ideas </h2>
        </div>

        <div class="row"> 
            <div class="span_2 col icon icon1"></div>
            <div class="span_4 col"> 
                <h3> Salvatore's Bistro </h3>
                <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit. In at odio et nulla ultricies congue. 
                Donec in leo sed justo sodales hendrerit eu.</p>
            </div>
        </div>

        <div class="row"> 
            <div class="span_2 col icon icon2"></div>
            <div class="span_4 col"> 
                <h3> Chicago </h3>
                <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit. In at odio et nulla ultricies congue. 
                Donec in leo sed justo sodales hendrerit eu.</p>
            </div>
        </div>
    </section>

    <section id="stats">

    </section>

    <div class="span_6 col divider"></div>

    <footer class="row">
        <div class="span_6 col sprite logo-bg">
            <a href="#" class="span_2 col"> Credits </a>
            <a href="#" class="span_2 col"> Backstory </a>
            <a href="#" class="span_2 col"> Feedback </a>
        </div>
    </div>
</div>

</body>
</html>
