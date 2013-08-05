function( doc) {
    if (doc.type == 'MSGLOG' && doc.direction == 'outbound' ) {
        var date = new Date( doc.date );
        var re = new RegExp( /^(sms|fax|voice)\+([^@].+)@(.+)$/ );
        for( var j=0; j<doc.log.length; j++ ) {
            var accounting = doc.log[j].event[ "accounting" ];
            if( accounting && accounting[ doc.media ] && accounting.account ) {
                for(var i = 0; i < doc.to.length; i++) {
                    var patterns = doc.to[i].match( re );
                    var recipient = doc.to[ i ];
                    if ( patterns ) {
                        recipient = patterns[2];
                    }
                    emit([ accounting.account,
                        doc.media,
                        date.getFullYear(),
                        date.getMonth()+1,
                        date.getDate(),
                        date.getHours(),
                        date.getMinutes()
                    ],{
                        "to" : recipient,
                        "subject" : doc.subject
                    });
                }
            }
        }
    }
}