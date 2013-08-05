function(doc, req) {
    try {
        var data = JSON.parse( req.body );
    } catch( e ) {
        var data = req.body.query;
    }
    if( doc && doc._id ) {
    } else {
        doc = {
            "_id": req.uuid
        };
        if( data.id ) {
            doc._id = data.id;
        }
    }
    for( var p in data ) {
        if( data[p] == 'undefined' ) {
            delete doc[ p ];
        } else {
            if( doc[p] && doc[p].splice ) {
                doc[p] = doc[p].concat( data[ p ] );
            } else {
                doc[ p ] = data[ p ];
            }

        }
    }
    delete doc.id;
    return [ doc, '{ "ok": true, "id": "'+doc._id+'" }' ];

}