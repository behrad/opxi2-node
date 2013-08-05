/*!
 * Tine 2.0 - CCenter 
 * Copyright (c) 2007-2011 Metaways Infosystems GmbH (http://www.metaways.de)
 * http://www.gnu.org/licenses/agpl.html AGPL Version 3
 */
function(doc, req) {
    var value = doc;
    var toShow = req.query.field;
    if( toShow ) {
        value = doc[ toShow ];
    }
    var index = req.query.i;
    if( index ) {
        value = value[ index ];
    }
    return {
        body: JSON.stringify( value, null, "\t" ),
        headers: {
            "Content-Type" : "text/plain; charset=utf-8"
        }
    }
}