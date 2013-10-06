var opxi2 = require( 'opxi2node' );

function removeCompletedJobs() {
    for( var name in { "complete":true/*, "active":false, "inactive":false*/ }  ) {
        console.log( "Trying to fetch and remove 10000 complete jobs..." );
        opxi2.kue.Job.rangeByState( name/*'active'*/, 0, 10000, 'asc', function( err, jobs ) {
            if (err) {
                console.error( err );
                process.exit( 0 );
            }
            if( jobs.length == 0 || jobs.length < 1000 ) {
                console.log( "Not much jobs in complete state!" );
                process.exit( 0 );
            }
            jobs.forEach( function( job ) {
                try {
//                    opxi2.kue.Job.get( job.id, function( err, j ) {
                        console.log( "Remove job ", job.id );
                        job.remove();
//                    });
                } catch(e) {
                    console.error( e );
                }
            });
            removeCompletedJobs();
        });
    }
}

var q = new opxi2.kue();
console.log( q.complete );
//removeCompletedJobs();