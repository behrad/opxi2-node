/**
 * Created with JetBrains WebStorm.
 * User: jrad
 * Date: 8/21/12
 * Time: 3:21 PM
 * To change this template use File | Settings | File Templates.
 */


(function () {

    var request = require( 'request' );
    var util = require( 'util' );
    var fs = require( 'fs' );
    var path = require( 'path' );
    var os = require( 'os' );
    var opxi2 = require( './opxi2' );
    var async = require( 'async' );

    var Message = function( type, data, ids ) {
        this.type = 'MSGLOG';
        if( typeof data === 'undefined' && typeof ids === 'undefined' ) { // SINGLE ARG CALL
            if( typeof type === 'string' ) { // stored msg ID
//                this.data.id = type;
                throw new Error( "not supported!");
            } else if( type ) {
                this.extend( type );
//                if( type._id ) { // COPY Constructor from a doc!
//                    this.data.extend( type );
//                    this.id = type._id;
//                } else { // COPY Constructor from another msg
//                    this.extend( type );
//                }
            } else {
                // empty constructor!!!
            }
        } else { // two arguments call: ( dest , CampaignData )
//            this.from_campaign( type, data );
//            this[ 'as_' + type ] && this[ 'as_' + type ]( data );
        }
        if( this.direction == "outbound" ) {
        }
    };

    Message.prototype.as_logable = function() {
        var copy = {}.extend( this );
        var props = Object.getOwnPropertyNames( copy );
        props.forEach(function(name) {
            if ( name.indexOf( "__" ) == 0 ) {
                delete copy[name];
            }
        });
        return copy;
    };

    Message.prototype.as_outbound = function() {
        this.direction = "outbound";
        return this;
    };

    Message.prototype.from_campaign = function( dest, campaign, cId ) {
        this.direction = "outbound";
        this.to = dest;
        this.from = campaign.from;
        this.channel = campaign.channel;
        this.media_url = campaign.content;
        if( cId ) {
            this.campaign_id = cId;
        } else {
            this.campaign_id = campaign.id;
        }
        return this;
    };

    Message.prototype.as_campaign = function( id ) {
        this.type = 'CMPLOG';
        if( !this.from ) {
            this.from = this.created_by;
        }
        if( id ) {
            this.id = id;
        }
        return this;
    };

    Message.prototype.is_voice = function() {
        return this.channel == 'voice';
    };

    Message.prototype.is_sms = function() {
        return this.channel == 'sms';
    };

    Message.prototype.is_fax = function() {
        return this.channel == 'fax';
    };

    Message.prototype.attach_body = function( clbk ) {
        var self = this;
        opxi2.db.rev( self._id, function( err, rev ){
            if( err ) return clbk && clbk( err );
            request( self.media_url, function( err, resp, body ){
                if( err ) return clbk && clbk( err );
                if( resp.statusCode != 200 && resp.statusCode != 304 ) {
                    return clbk && clbk( {error: resp.statusCode, message: "Unauthorized " + self.media_url} );
                }
                var rsc = JSON.parse( body );
                if( self.is_voice() || self.is_fax() ) {
                    var media = rsc.medium;
                    if( media ) {
                        var file_name = media.original_filename.replace( /^_/, '' );
                        var voice_url = media.medium_url.split( "id" )[0] + media.filename;
                        var tmp_file_path = path.join( os.tmpdir(), file_name );
                        var tmp_file = fs.createWriteStream( tmp_file_path );
                        request.get( voice_url ).on( 'end', function() {
                            fs.createReadStream( tmp_file_path ).on( 'end', function() {
                                fs.unlink( tmp_file_path, function( err ){
                                    console.log( tmp_file_path + " attached then deleted! ", err );
                                });
                            }).pipe(
                                opxi2.db.attachment.insert( self._id, file_name, null, media.mime, { rev: rev }, clbk )
                            );
                            /*fs.readFile(tmp_file_path, function(err, data) {
                              if (!err) {
                                opxi2.db.attachment.insert( self._id, file_name, null, media.mime, { rev: rev }, clbk );
                              } else { clbk(err); }
                            });*/
                        }).pipe(
                            tmp_file
                        );
                    } else {
                        clbk && clbk( {error: true, message: "No Media" } );
                    }
                } else {
                    if( !rsc.body || rsc.body == "" ) {
                        return clbk && clbk( {error: true, message: "No Body" } );
                    }
                    var content = self.compileContent( rsc.body, rsc );
                    var subject = self.compileContent( rsc.title, rsc );
                    if( self.is_sms() ) {
                        content = self.filterContent( content );
                    }
                    opxi2.db.updateLog( "log/inplace", self._id, {
                        content: content,
                        subject: subject
                        }, clbk
                    );
                }
            });
        });
    };

    Message.prototype.compileContent = function( body, resrouce ) {
        try {
            var context = { self: resrouce }.extend( this ).extend( this["__context_data"] );
            return require( 'handlebars' ).compile( body )( context );
        } catch( e ) {
            console.error( e );
            return body;
        }
    };

    Message.prototype.filterContent = function( content ) {
        return content && content.replace( /<br\/*>/g, '\n' ).replace( /<[^>]+>/g, '' );
    };

    Message.prototype.as_log = function( action, log, index ) {
        var logJson = {};
        var action_transform_method = 'log_as_' + action.replace( /-/g, '_' );
        if( this[action_transform_method] ) {
            logJson[ action ] = this[action_transform_method](log, index);
        } else {
            logJson[ action ] = log;
        }

        return logJson;
    };

    Message.prototype.log_as_posting = function( log, index ) {
        var obj = {
            "id": log.sendId && (log.sendId[index] || log.sendId[0]),
            "error": log.error
        };
        if( !log.error ) {
            obj[ "status" ] = (log.status && (log.status[index] || log.status[0])) || "sent";
        }
        return obj;
    };

    Message.prototype.log_as_delivery_report = function( log ) {
        return {
            "sendId": log.sendId,
            "status": log.status
        };
    };

    Message.prototype.as_email = function( msg ) {
        msg.to = [];
        msg.from = [];
        msg.toDisplay = [];
        msg.fromDisplay = [];
        msg.date = msg.email_headers.date[ 0 ];
        msg.email_headers.to.forEach( function( toAddrs, i ) {
            var toMatch = toAddrs.match( /([^<].*[^\s])\s*<(.+)>/ );
            if( toMatch ) {
                msg.to[ i ] = toMatch[ 2 ];
                msg.toDisplay[ i ] = toMatch[ 1 ];
            } else {
                msg.to[ i ] = toAddrs;
            }
            var inmatched = toAddrs.match( new RegExp( opxi2.CONFIG.core.routes.inbound ) );
            var outmatched = toAddrs.match( new RegExp( opxi2.CONFIG.core.routes.outbound ) );
            if( inmatched ) {
                msg.direction = 'inbound';
                msg.media = 'email';
            } else if( outmatched ) {
                msg.direction = 'outbound';
                msg.media = outmatched[1];
                msg.to[ i ] = outmatched[ 2 ];
            }
        });
        if( msg.email_headers.cc ) {
            msg.email_headers.cc.forEach( function( toAddrs, i ) {
                var toMatch = toAddrs.match( /([^<].*[^\s])\s*<(.+)>/ );
                if( toMatch ) {
                    msg.to.push( toMatch[ 2 ] );
                    msg.toDisplay.push( toMatch[ 1 ] );
                } else {
                    msg.to.push( toAddrs );
                }
                var inmatched = toAddrs.match( new RegExp( opxi2.CONFIG.core.routes.inbound ) );
                var outmatched = toAddrs.match( new RegExp( opxi2.CONFIG.core.routes.outbound ) );
                if( inmatched ) {
                    msg.direction = 'inbound';
                    msg.media = 'email';
                } else if( outmatched ) {
                    msg.direction = 'outbound';
                    msg.media = outmatched[1];
                    msg.to[ msg.to.length-1 ] = outmatched[ 2 ];
                }
            });
        }

        msg.email_headers.from.forEach( function( fromAddr, i ) {
            var fromMatch = fromAddr.match( /([^<].*[^\s])\s*<(.+)>/ );
            if( fromMatch ) {
                msg.from[ i ] = fromMatch[ 2 ];
                msg.fromDisplay[ i ] = fromMatch[ 1 ];
            } else {
                msg.from[ i ] = fromAddr;
            }
        });
        msg.subject = msg.email_headers.subject[ 0 ];
    };

    Message.prototype.as_sms = function( msg ) {
        if( !msg.shortnumber ) {
            if( !msg.toDisplay ) msg.toDisplay = msg.to;
            if( !msg.fromDisplay ) msg.fromDisplay = msg.from;
            if( msg.text ) {
                msg.title = decodeURIComponent( msg.text[0].replace(/\+/g, " ") );
            }
        } else {
            msg.to = [ msg.shortnumber ];
            msg.from = [ msg.srcaddress ];
            msg.toDisplay = [ msg.shortnumber ];
            msg.fromDisplay = [ msg.srcaddress ];
            msg.title = decodeURIComponent( msg.body.replace(/\+/g, " ") );
        }
    };

    Message.prototype.log = function( done ) {
        var self = this;
        if( this.data.direction ) {
            this._log( function( err ){
                if( !err ) {
                    opxi2.taskq.create( 'opxi2.accounting',{
                        title: 'Accounting for message ' + self.ids,
                        message: self
                    }).save();
                }
                done( err );
            });
        } else {
            done( {message: util.format("Cannot recognize message route: %j", this.data)} );
        }
    };

    Message.prototype._log = function( done ) {
        // TODO done should be called when all ids are logged!
        this.ids.forEach( function( id ) {
            opxi2.db.save(id, this.data, function(err, res) {
                if (err) {
                    console.error("Error logging message request: ", err);
                    done(err);
                } else {
                    console.log("Logged message request: ", res.id);
                    done();
                }
            });
        });
    };

    Message.prototype.getUsedMessagesBy = function( options, done ) {
        var msg = this;
        var startkey = [ options.username, msg.data.media ];
        if( options.startdate ){
            startkey.push( options.startdate.getFullYear() );
            startkey.push( options.startdate.getMonth() + 1 );
            startkey.push( options.startdate.getDate() );
            startkey.push( options.startdate.getHours() );
            startkey.push( options.startdate.getMinutes() );
        }
        var endkey = [ options.username, msg.data.media ];
        if( options.enddate ){
            endkey.push( options.enddate.getFullYear() );
            endkey.push( options.enddate.getMonth() + 1 );
            endkey.push( options.enddate.getDate() );
            endkey.push( options.enddate.getHours() );
            endkey.push( options.enddate.getMinutes() );
        }
        endkey.push( {} );
        opxi2.db.view( 'query/bySender', {
            startkey: startkey,
            endkey: endkey,
            reduce: true
        }, function (err, res) {
            var total = 0;
            if( err ) {
                console.error( "Error calling query/bySender: %j", err.reason );
            } else {
                if( res.length == 0 ) {
                    total = 0;
                } else {
                    res.forEach(function (row) {
                        if( row.value && row.value ) {
                            total = Number( row.value );
                        }
                    });
                }
            }
            done && done( null, total );
        });
    };

    Message.prototype.getCustomerHistory = function( done ) {
        var msg = this;
        var startkey = [ msg.data.from[ 0 ] ];
        var endkey = [ msg.data.from[ 0 ], {} ];
        var usernames = [];
        opxi2.db.view( 'query/byCustomer', {
            startkey: startkey,
            endkey: endkey,
            reduce: true,
            group_level: 1
        }, function (err, res) {
            if( err ) {
                console.error( "Error calling query/byCustomer: " + err.reason );
            } else {
                res.forEach(function (row) {
                    if( row.value && row.value.users ) {
                        for( var u in row.value.users ) {
                            usernames.push( row.value.users[ u ] );
                        }
                    }
                });
            }
            done && done( null, usernames );
        });
    };

    Message.prototype.getSubject = function() {
        if( this.data.subject ) {
            return this.data.subject;
        }
        return '';
    };

    Message.prototype.getBodyText = function() {
        return this[ "_getBodyText_" + this.data.media ] && this[ "_getBodyText_" + this.data.media ]();
    };

    Message.prototype._getBodyText_email = function() {
        if( this.data.parts.length == 0 ) {
            return this.data.body_text;
        } else {
            return this.data.parts[0].bodytext;
        }
    };

    Message.prototype._getBodyText_sms = function() {
        if( !this.data.title ) {
            return this._getBodyText_email();
        }
        return this.data.title;
    };

    Message.prototype.updateLog = function( log, clbk ) {
        var msg = this;
        msg.ids.forEach( function( id ) {
            opxi2.db.updateLog( 'log/msgLog', id, log, function( err, res ) {
                if( err ) {
                    console.error( "Unable to update log " + id + ": " + err );
                }
                clbk && clbk.call( msg, err, res, id );
            });
        });
    };

    Message.updateLog = function( id, log, clbk ) {
        opxi2.db.updateLog( 'log/msgLog', id, log, function( err, res ) {
            if( err ) {
                console.error( "Unable to update log " + id + ": " + err );
            }
            clbk && clbk( err, res, id );
        });
    };

    Message.prototype.print = function() {
        console.log( this.data.media + ": " + JSON.stringify(this.data) );
    };


    if( module.exports != undefined ) {
        module.exports = Message;
    }


})();