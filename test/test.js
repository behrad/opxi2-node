var request = require( 'request' );
var fs = require( 'fs' );
var opxi2 = require( './opxi2' );


/*

opxi2.taskq.process( "test_job", function (job, done) {
    setTimeout( function(){
        done( */
/*{error: true, message: "cannot!" }*//*
 );
    }, 1000 );
});

var my_job = opxi2.taskq.create( "test_job", {}).attempts( 2 ).save().on( 'failed', function(){
    console.log( "failed! " );
}).on( 'complete', function(){
    console.log( "complete! " );
});
setTimeout( function(){ console.log( my_job.id + " created" ); }, 200);

opxi2.taskq.on( 'job complete', function(id) {
    console.log( id + " completed!" );
});*/

var rules = require( "./accounting" );
rules.forEach( function(r){
    console.log( r() );
});