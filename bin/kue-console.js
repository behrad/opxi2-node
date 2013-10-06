/**
 * Created with PyCharm.
 * User: jrad
 * Date: 8/14/13
 * Time: 1:30 PM
 * To change this template use File | Settings | File Templates.
 */
var opxi2 = require( "opxi2node" );

if( opxi2.kue.app && opxi2.kue.app.listen ) {
    try {
        try{
            var express = require( 'express' );
            var app = express();
            app.use(express.basicAuth( opxi2.CONFIG.core.kue_console.user , opxi2.CONFIG.core.kue_console.pass ));
            app.use(kue.app);
            app.listen( opxi2.CONFIG.core.kue_console.port );
            app.set( 'title', opxi2.CONFIG.core.kue_console.title || 'Opxi2 Task Queue' );
        } catch( e ) {
            opxi2.kue.app.listen( opxi2.CONFIG.core.kue_console.port );
            opxi2.kue.app.set( 'title', opxi2.CONFIG.core.kue_console.title || 'Opxi2 Task Queue' );
        }
    } catch( e ) {
        console.log( "Couldn't start kue console..." );
    }
}

var PRO = Number( opxi2.CONFIG.core.job_promotion||3000 );
opxi2.taskq.promote( PRO );
console.log( "========================================================" );
console.log( "Activating Delayed Job Promotion: %dms", PRO );
console.log( "========================================================" );