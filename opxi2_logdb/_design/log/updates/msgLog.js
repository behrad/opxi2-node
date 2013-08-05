function(doc, req) {
    if( !doc ) {
        return [null, '{ "error": "true", "reason": "provide a docid" }' ];
    }
    if( !doc.log ) {
        doc.log = [];
    }
    if( req.body ) {
        var event = JSON.parse( req.body );
        doc.log.push({
            timestamp: new Date().getTime(),
            event: event
        });
        return [doc, '{ "ok": "true" }' ];
    }
    return [ null, '{ "error": "true", "reason": "provide event body" }' ];
}
