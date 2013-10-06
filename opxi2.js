/**
 * Created with JetBrains WebStorm.
 * User: jrad
 * Date: 8/21/12
 * Time: 3:21 PM
 * To change this template use File | Settings | File Templates.
 */

var CONFIG = require( './config.json' );


var kue = require('kue');
var redis = require( 'redis' );
kue.redis.createClient = function() {
//    redis.debug_mode = true;
    return redis.createClient(
        CONFIG.redis.port,
        CONFIG.redis.host,
        {}
    );
};

//console.log( "========================================================" );
//console.log( "Using Kue version ", require('kue/package.json').version );
//console.log( "========================================================" );
var jobs = kue.createQueue();


kue.Job.prototype.get = function(key, fn){
    var id = this.id;
    this.client.hget('q:job:' + this.id, key, function( err, res ){
        if( res ) {
            try {
                if( res == '1' ) {
                    console.log( "Job get '%s' RESPONSE: ", id+"."+key, res );
                }
                res = JSON.parse( res );
            } catch( e ) {
                err = e;
                console.error( "Error parsing redis value: ", e, res );
            } finally {
                fn && fn( err, res );
            }
        } else {
            fn && fn( err );
        }
    });
    return this;
};

jobs.jobsOf = function( job_name, limit, clbk ) {
    var request = require( 'request' );
    var state = '';
    if( clbk == undefined ) {
        clbk = limit;
        limit = 100000;
    }
    if( isNaN(limit) ){
        state = limit;
        limit = 100000;
    }
    request(
        "http://" + CONFIG.redis.host + ":" +CONFIG.core.kue_console.port
        + "/jobs/" + job_name + (state==''? state: "/"+state) + "/0.."+limit,
        function( err, r, json ) {
            clbk && clbk( err, json && JSON.parse( json ) );
        }
    );
};



var brokerClient = function() {
//    redis.debug_mode = true;
//    console.log( "****************************** BROKER CLIENT ********************************" );
    var connection = redis.createClient(
        CONFIG.redis.port,
        CONFIG.redis.host,
        {}
    );
    connection.on( "error", function( err ) {
        console.log( "Redis Connection Error: ", err );
        connection.quit();
    });
    return connection;
    /*redis.getKey = function() {
        redis.get( key, this.property, value, this.errorHandler( redis ) );
    };
    redis.setKey = function( key, value ) {
        redis.set( key, value, value, this.errorHandler( redis ) );
    };*/
};
var singleton_connection = undefined;
var singletonBrokerClient = function() {
    if( singleton_connection === undefined ) {
        singleton_connection = brokerClient();
    }
    return singleton_connection;
};


try {
    var couch = require( 'nano' )({
        "url" : "http://"+CONFIG.couchdb.host+":"+CONFIG.couchdb.port+"/"+CONFIG.couchdb.log_db
    });
    couch.updateLog = function( handlerName, id, data, clbk ) {
        var updateHandlerName = handlerName || 'log/msgLog';
        var tokens = updateHandlerName.split( '/' );
        couch.atomic( tokens[0], tokens[1], id, data, clbk );
    };
    couch.rev = function (id, callback) {
      couch.get(id, function( err, doc ){
          if( err ) return callback && callback( err );
          callback && callback( null, doc._rev );
      });
    };
} catch( e ){
    console.log( "Nano is not installed!" );
}
if( couch === undefined ) {
    try {
        var cradle = require( 'cradle' );
        var couch = new(cradle.Connection)( CONFIG.couchdb.host, CONFIG.couchdb.port, {
            cache: false,
            raw: false,
            auth: { username: CONFIG.couchdb.user, password: CONFIG.couchdb.pass }
        }).database( CONFIG.couchdb.log_db );
        couch.updateLog = function( path, id, body, callback ) {
            var querystring = require( 'querystring' );
            path = path.split( '/' );
            return couch.query({
                method: 'PUT',
                path: ['_design', path[0], '_update', path[1], id ].map(querystring.escape).join('/'),
                body: body
            }, callback );
        };
    } catch( e ) {
        console.log( "Cradle is not installed!" );
    }
}


Object.defineProperty(Object.prototype, "extend", {
    enumerable: false,
    value: function(from) {
        if( from == undefined ){
            return this;
        }
        var props = Object.getOwnPropertyNames(from);
        var dest = this;
        props.forEach(function(name) {
//            if ( name.indexOf( "_" ) != 0 ) {
                var destination = Object.getOwnPropertyDescriptor(from, name);
                Object.defineProperty(dest, name, destination);
//            }
        });
        return this;
    }
});


try {
    var zotonic = require( "zotonic" )( CONFIG.zotonic );
} catch( e ) {
    console.error( "CMS module is not installed ", e );
}


if( module.exports !== undefined ) {
    module.exports.db = couch;
    module.exports.brokerClient = brokerClient;
    module.exports.singletonBrokerClient = singletonBrokerClient;
    module.exports.taskq = jobs;
    module.exports.kue = kue;
    module.exports.CONFIG = CONFIG;
    module.exports.cms = zotonic;
}