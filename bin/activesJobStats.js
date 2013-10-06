var opxi2 = require( 'opxi2node' );

var type = process.argv[ 2 ] /*|| 'active'*/ || 'active';
opxi2.kue.Job.rangeByState( type, 0, -1, 'asc', function( err, jobs ) {
    if (err) {
        return console.error( err );
    }
    var job_type_map = {};
    jobs.forEach( function( job ) {
        var p = job._progress + '%';
        job_type_map[ job.type ] = job_type_map[ job.type ] || { count: 0, progress: {} };
        job_type_map[ job.type ].count++;
        job_type_map[ job.type ].progress[ p ] = job_type_map[ job.type ].progress[ p ] || 0;
        job_type_map[ job.type ].progress[ p ]++;
        if( job.data && job.data.error ) {
            job_type_map.errors = job_type_map.errors || { count: 0 };
            job_type_map.errors[ job.data.message ] = job_type_map.errors[ job.data.message ] || 0;
            job_type_map.errors[ job.data.message ]++;
            job_type_map.errors.count++;
        }
    });
    console.log( job_type_map );
    process.exit( 0 );
});