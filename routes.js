
var db = require('./database'),
        photos = db.photos,
        users = db.users;



var url = require("url");

module.exports = function(app) {

    // homepage
    app.get('/', function(req, res) {

        // find all photos
        photos.find({type: "pup"}, function(err, all_pups) {


            photos.find({type: "kitten"}, function(err, all_kittens) {
                // find the current user
                users.find({ip: req.ip}, function(err, u) {

                    var voted_on = [];

                    if (u.length == 1) {
                        voted_on = u[0].votes;
                    }

                    // find which photos the user hasn't still voted on

                    var pups_not_voted_on = all_pups.filter(function(photo) {
                        return voted_on.indexOf(photo._id) == -1;
                    });

                    var kittens_not_voted_on = all_kittens.filter(function(photo) {
                        return voted_on.indexOf(photo._id) == -1;
                    });

                    var pup = null;
                    var kitten = null;


                    if (pups_not_voted_on.length > 0) {
                        // choose a random image from the unvoted pups array
                        pup = pups_not_voted_on[Math.floor(Math.random() * pups_not_voted_on.length)];


                    }


                    if (kittens_not_voted_on.length > 0) {
                        // choose a random image from the unvoted kittens array
                        kitten = kittens_not_voted_on[Math.floor(Math.random() * kittens_not_voted_on.length)];


                    }

			//send the two pics to the home page
                    res.render('home', {photo1: pup, photo2: kitten});

                });

            });

        });

    });



    // register the user in the database by ip address; doesnt work on heroku
    app.get('*', function(req, res, next) {
        users.insert({
            ip: req.ip,
            votes: []
        }, function() {
            // pass to next middleware
            next();
        });

    });

    app.get('/standings', function(req, res) {

        photos.find({}).sort({ratings: -1}).exec(function(err, all_photos) {




            // render the standings page and pass the photos
            res.render('standings', {standings: all_photos});

        });

    });




    app.get('/score/', function(req, res) {

        var _get = url.parse(req.url, true).query;
        //get winner photo name
        var winner = _get['winner'];
        //get loser photo name
        var loser = _get['loser'];

        var winner_rating = 0;
        var loser_rating = 0;
        var winnerAdjustment = 0;
        var loserAdjustment = 0;
        var k = 20;

        //find winner ratings
        photos.findOne({name: winner}, function(err, found1) {



            winner_rating = found1.ratings;



            //find loser ratings
            photos.findOne({name: loser}, function(err, found2) {



                loser_rating = found2.ratings;

                //Elo's rating algorithm
                winnerExpected = 1 / (1 + (Math.pow(10, (loser_rating - winner_rating) / 400)));
                loserExpected = 1 / (1 + (Math.pow(10, (winner_rating - loser_rating) / 400)));



                winnerAdjustment = Math.round(winner_rating + (k * (1 - winnerExpected)));
                loserAdjustment = Math.round(loser_rating + (k * (0 - loserExpected)));




                photos.find({name: winner}, function(err, found_win) {

                    if (found_win.length == 1) {
                        //update new winner ratings
                        photos.update(found_win[0], {$set: {ratings: winnerAdjustment}}, function(err) {
                            //mark photo voted by user
                            users.update({ip: req.ip}, {$addToSet: {votes: found_win[0]._id}}, function(err) {
                                photos.find({name: loser}, function(err, found_los) {
                                    if (found_los.length == 1) {
                                        //update new loser ratings
                                        photos.update(found_los[0], {$set: {ratings: loserAdjustment}}, function(err) {
                                            //mark photo voted by user
                                            users.update({ip: req.ip}, {$addToSet: {votes: found_los[0]._id}}, function() {
                                                //refresh page for new battle
                                                res.redirect('../');
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    }
                });

            });




        });



    });

};





		
