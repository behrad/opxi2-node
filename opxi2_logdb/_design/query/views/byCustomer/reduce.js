function( keys, values, rereduce ) {
    var results = { users: {} };
    if( !rereduce ) {
        for( var i=0; i < values.length; i++ ) {
            if( !results.users[ values[ i ].user ] ) {
                results.users[ values[ i ].user ] = 1;
            } else {
                results.users[ values[ i ].user ]++;
            }
        }
    } else {
        for( var i=0; i < values.length; i++ ) {
            for( var p in values[ i ].users ) {
                if( !results.users[ p ] ) {
                    results.users[ p ] = 0;
                }
                results.users[ p ] += values[ i ].users[ p ];
            }
        }
    }
    return results;
}