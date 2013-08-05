function (head, req) {

    var opxi2 = opxi2 || {};
    var totalRecepients = 0, totalSenders = 0;
    opxi2.charts = function( row, value ) {
        value.senders = value.senders || { };
        value.recepients = value.recepients || { };
        value.total = value.total || {
            all: 0
        };

        if( true/*value.recepients[ row.fromDisplay ] === undefined && totalRecepients < 50*/ ) {
            if( value.senders[ row.fromDisplay ] === undefined ) {
                totalRecepients++;
            }
            value.senders[ row.fromDisplay ] = value.senders[ row.fromDisplay ] || { all: 0, status: {} };
            value.senders[ row.fromDisplay ].all++;
            value.senders[ row.fromDisplay ][ row.media ] = value.senders[ row.fromDisplay ][ row.media ] || 0;
            value.senders[ row.fromDisplay ][ row.media ]++;

            value.senders[ row.fromDisplay ][ row.status ] = value.senders[ row.fromDisplay ].status[ row.status ] || 0;
            value.senders[ row.fromDisplay ][ row.status ]++;

            value.senders[ row.fromDisplay ].status[ row.media ] = value.senders[ row.fromDisplay ].status[ row.media ] || {};
            value.senders[ row.fromDisplay ].status[ row.media ][ row.status ] = value.senders[ row.fromDisplay ].status[ row.media ][ row.status ] || 0;
            value.senders[ row.fromDisplay ].status[ row.media ][ row.status ]++;
        }

        var tos = row.toDisplay.split( ',' );
        for( var i=0; i<tos.length; i++ ) {
            var to = tos[ i ];
            if( value.recepients[ to ] === undefined && totalSenders < 50 ) {
                if( value.recepients[ to ] === undefined ) {
                    totalSenders++;
                }
                value.recepients[ to ] = value.recepients[ to ] || { all: 0, status:{} };
                value.recepients[ to ].all++;
                value.recepients[ to ][ row.media ] = value.recepients[ to ][ row.media ] || 0;
                value.recepients[ to ][ row.media ]++;
                value.recepients[ to ][ row.status ] = value.recepients[ to ].status[ row.status ] || 0;
                value.recepients[ to ][ row.status ]++;

                value.recepients[ to ].status[ row.media ] = value.recepients[ to ].status[ row.media ] || {};
                value.recepients[ to ].status[ row.media ][ row.status ] = value.recepients[ to ].status[ row.media ][ row.status ] || 0;
                value.recepients[ to ].status[ row.media ][ row.status ]++;
            }
        }
        value.total.all++;
        value.total[ row.media ] = value.total[ row.media ] || 0;
        value.total[ row.media ]++;
    };

    opxi2.transform = function( values ) {
        var results = { senders: [], recepients: [], total: {} };
        results.total = values.total;
        for( var s in values.senders ) {
            values.senders[ s ].sender = s;
            results.senders.push( values.senders[ s ] );
            results.total[ s ] = [];
            for( var t in values.senders[ s ].status ) {
                values.senders[ s ].status[t].media = t;
                results.total[ s ].push( values.senders[ s ].status[t] );
            }
        }
        for( var r in values.recepients ) {
            values.recepients[ r ].recepient = r;
            results.recepients.push( values.recepients[ r ] );

            results.total[ r ] = [];
            for( var t in values.recepients[ r ].status ) {
                values.recepients[ r ].status[t].media = t;
                results.total[ r ].push( values.recepients[ r ].status[t] );
            }
        }
        return results;
    };

    var row;
    start({
        "headers":{
            "Content-Type":"text/plain;charset=utf-8"
        }
    });
    var globalValue = {};
    var response = [];
    var loginName = {};
    var accountId = {};
    var paging = {};
    var first = true, firstPaging = true;
    var pageSize = req.query.pageSize || Number.MAX_VALUE;
    var countAll = req.query.countAll;
    var opxi2_limit = req.query.opxi2_limit;

    var visitor = req.query.visitor;
    var sentRows = 0, totalRecords = 0;
    try {
        var filter = JSON.parse(req.body);
    } catch( e ) {
        var filter = req.query;
    }
    var global_search = (filter.user && filter.user.length > 0) ? false : true;
    if (!global_search) {
        for (var u in filter.user) {
            loginName[filter.user[u].loginName] = 1;
            accountId[filter.user[u].id] = 1;
        }
    }

    send("{\"results\": [\n");

    while (row = getRow()) {
        var doc = row.value;

        if( !countAll && sentRows >= pageSize ) {
            break;
        }

        if( countAll && opxi2_limit && opxi2_limit == totalRecords ) {
            break;
        }

        var outbound = doc.type == 'out';
        if (!global_search) {
            // here we sould test the user of message
            var user_matched = false;
            if (outbound) {
                // assumes that first log of message is accounting
                if (doc.user && accountId[ doc.user.id ]) {
                    user_matched = true;
                }
            } else {
                if (doc.user && doc.user.names) {
                    for (var l in doc.user.names) {
                        var name = doc.user.names[l];
                        if (loginName[ name ]) {
                            user_matched = true;
                            break;
                        }
                        if (user_matched) {
                            break;
                        }
                    }
                }
            }
            if (!user_matched) {
                continue;
            }
        }

        if (filter.sender) {
            if (!doc.from.match(filter.sender)) {
                continue;
            }
        }

        if (filter.subject && doc.subject) {
            if (!doc.subject.match(filter.subject)) {
                continue;
            }
            if( doc.content ) {
                if (!doc.content.match(filter.subject)) {
                    continue;
                }
            }

        }

        if (filter.recipient) {
            var recipient_matched = false;
            if (outbound) {
                if (doc.toName.match(filter.recipient) || doc.to.match(filter.recipient)) {
                    recipient_matched = true;
                }
            } else {
                if (doc.user && doc.user.names) {
                    for ( var nn in doc.user.names) {
                        var name = doc.user.names[ nn ];
                        if (name.match(filter.recipient)) {
                            recipient_matched = true;
                            break;
                        }
                    }
                }
            }

            if (!recipient_matched) {
                continue;
            }
        }
        if (filter.media) {
            var filter_matched = false;
            for( var i=0; i<filter.media.length; i++ ) {
                if (doc.media.match(filter.media[i])) {
                    filter_matched = true;
                    break;
                }
            }
            if( !filter_matched ) {
                continue;
            }
        }

        if (filter.status) {
            var status_matched = false;
            for ( var ss in doc.messages ) {
                var msg = doc.messages[ ss ];
                for ( var s in filter.status ) {
                    var status = filter.status[ s ];
                    if( status.status ) {
                        if( msg.status.match( status.status ) ) {
                            var s_matched = true;
                        }
                    }
                    if( status.message ) {
                        if( msg.message.match( status.message ) ) {
                            var m_matched = true;
                        }
                    }
                    if( status.status && status.message ) {
                        status_matched = m_matched && s_matched;
                    } else if( status.status ) {
                        status_matched = s_matched;
                    } else if( status.message ) {
                        status_matched = m_matched;
                    }
                    if ( status_matched ) {
                        break;
                    }
                    /*if( status.status && doc.status.match( status.status ) ) {
                        status_matched = true;
                        break;
                    }*/
                }
                if( status_matched ) {
                    break;
                }
            }

            if ( !status_matched ) {
                continue;
            }
        }

        totalRecords++;
        if( !countAll ) {
            if( sentRows < pageSize ) {
                if (first) {
                    first = false;
                } else {
                    send(',\n');
                }
                sentRows++;
                var output = row.value;
                output._id = row.id;
                output.key = row.key;
                send(JSON.stringify(output));
            }
        } else { // countAll
            // apply visitor!
            if( visitor && opxi2[visitor] ) {
                opxi2[ visitor ]( row.value, globalValue );
            } else {
                var pageNum = Math.floor( (totalRecords-1) / pageSize );
                if( paging[ pageNum ] === undefined ) {
                    paging[ pageNum ] = {
                        startkey: row.key,
                        startkey_docid: row.id,
                        keys: [ row.key ]
                    };
                    if( pageNum-1 > -1 ) {
                        if (firstPaging) {
                            firstPaging = false;
                        } else {
                            send(',\n');
                        }
                        send(JSON.stringify(paging[ pageNum-1 ]));
                    }
                } else {
                    paging[ pageNum ].keys.push( row.key );
                }
            }
        }
    }
    if( countAll && ( !visitor || !opxi2[visitor] ) ) {
        if (firstPaging) {
            firstPaging = false;
        } else {
            send(',\n');
        }
        if(  paging[ pageNum ]  ) {
            send(JSON.stringify( paging[ pageNum ] ) );
        }
    }
    send("\n]");
    if( visitor && opxi2[visitor] ) {
        globalValue = opxi2.transform( globalValue ) || {};
        send( ", \"" + visitor + "\": " + JSON.stringify( globalValue ) );
    }
    send(", \"totalcount\": " + totalRecords + "}");
}