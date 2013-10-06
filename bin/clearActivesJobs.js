var opxi2 = require( 'opxi2node' );

//TODO vaziaate job haye moonde tooye active, inactive, delayed ro baaresi kone o age lazeme dar biaare! (inactive ro chetori mishe dobare inactive kard ke biaad too?)
//TODO job ha tooye delayed mimooonan??? (age delay+created_at > now shode vaghteshe dg!)
//TODO dorost kardane job_keeper tooye clearActives va opxi2Console ro berooz kardan vaseye start ba forever

var type1 = process.argv[ 2 ] || 'active';
var HOUSE_KEEPING_INTERVAL = (10*60*1000);

clearInactives( type1 );
clearInactives( 'inactive' );
setInterval( function(){ clearInactives(type1); }, HOUSE_KEEPING_INTERVAL );
setInterval( function(){ clearInactives('inactive'); }, HOUSE_KEEPING_INTERVAL );


function clearInactives( type ){
    var d = new Date();
    var clean_to = d.getTime() - HOUSE_KEEPING_INTERVAL;
	console.log( 'running ', type );
    opxi2.kue.Job.rangeByState( type, 0, 2000, 'asc', function( err, jobs ) {
        if( err ){
            return console.error( err );
        }
        if( jobs && jobs.length == 0 ) {
            return /*console.log( "No Jobs in " + type + " state" )*/;
        }
        jobs.forEach( function( job ) {
            if( Number( job.created_at ) < clean_to ) {
//                TODO should be this job really a bad active job? or a valid long-running job!!!?
                console.log( "%s: Re-activating %s(%s) created @ ", d, job.type, job.id, new Date(Number(job.created_at)) );
                job.inactive();
            }
        });
    });
}