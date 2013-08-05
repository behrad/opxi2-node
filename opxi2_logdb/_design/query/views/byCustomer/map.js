function( doc ) {
    if( doc.type == 'MSGLOG' ) {
        var customers = (doc.direction == 'inbound') ? doc.from : doc.to;
        var date = new Date( doc.date );
        for( var i=0; i<customers.length; i++ ) {
            for( var j=0; j<doc.log.length; j++ ) {
                var deliveries = doc.log[j].event[ "delivery-report" ];
                if( deliveries ) {
//                    for( var k=0; k<deliveries.length; k++ ) {
                        if( deliveries/*[ k ]*/.user ) {
                            emit([customers[i],
                                date.getFullYear(),
                                date.getMonth()+1,
                                date.getDate(),
                                date.getHours(),
                                date.getMinutes()
                            ],{
                                "to" : doc.to,
                                "subject" : doc.subject,
                                "user": deliveries/*[ k ]*/.user,
                                "type": deliveries/*[ k ]*/.type
                            });
                        }
//                    }
                }
            }
        }
    }
}