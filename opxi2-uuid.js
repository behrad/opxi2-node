(function(){
    var http = require( 'http' );
    var req = require( 'request' );
    var CONFIG = require( './config.json' );
    var emiFlake = null;
    try{
        emiFlake = require( 'emiflake' );
        var bignum = require( 'bignum' );
    } catch( e ){
        console.warn( "Emiflake not installed: ", e );
    }

    var get_uuid = function( cb, service ) {
        if( service == 'couchdb' ) {
            get_uuid_couchdb( cb );
        } else {
            get_uuid_def( cb );
        }
    };

    var get_uuid_couchdb = function( cb ) {
        req( 'http://' + CONFIG.couchdb.host + ":" + CONFIG.couchdb.port + '/_uuids', function( err, res, body ) {
            var uuid = JSON.parse( body ).uuids[ 0 ];
            cb && cb( uuid );
        });
    };

    var get_uuid_def = function( cb ) {
        if( emiFlake ) {
            var flake = new emiFlake(new Buffer([0x11]),
                 /*machineNumberLength:*/8,
                 /*sequenceNumberLength:*/16,
                 /*timestampLength:*/40,
                 /*timestampOffset:*/(2013-1970)*365*24*60*60*1000);
            return flake.generate( function( id ) {
                var uuid = toBase62(bignum.fromBuffer(id));
                cb && cb( uuid );
            });
        }
        return getSnowflakeId( function( decimalId ) {
            cb && cb( toBase62( decimalId ) );
        });
    };

    var toBase62 = function (decimal) {
        var symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
            , conversion = "";

        while (decimal >= 1) {
            conversion = symbols[(decimal - (62 * Math.floor(decimal / 62)))] +
                conversion;
            decimal = Math.floor(decimal / 62);
        }

        return conversion;
    };

    var getSnowflakeId = function(cb) {
        var options = {
            host: CONFIG.uuid.host,
            port: 1337,
            path: '/'
        };
        return http.get(options, function(res) {
            res.on('data', function(chunk){
                cb && cb( parseInt(chunk, 10) );
            });
            res.on('end', function(){
            });
            res.on('close', function(){
            });
        });
    };

    if( typeof module !== undefined && module.exports ) {
        module.exports.get_uuid = get_uuid;
    }

})();