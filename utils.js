var validator = require('validator');

module.exports = {

  ran_no : function ( min, max ){
    return Math.floor( Math.random() * ( max - min + 1 )) + min;
  },

  uid : function ( len ){
    var str     = '';
    var src     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var src_len = src.length;
    var i       = len;

    for( ; i-- ; ){
      str += src.charAt( this.ran_no( 0, src_len - 1 ));
    }

    return str;
  },

  forbidden : function ( res ){
    var body       = 'Forbidden';
    res.statusCode = 403;

    res.setHeader( 'Content-Type', 'text/plain' );
    res.setHeader( 'Content-Length', body.length );
    res.end( body );
  },

  extractMarkdownImageUrl : function ( item ){
    if ( typeof item !== 'string' ) {
      return null;
    }

    var imgRegex = /^\!\[alt text\]\((\S+)\s\"[^\"]*\"\)$/;
    var match = item.match( imgRegex );
    if ( !match ) {
      return null;
    }

    var imageUrl = match[1];
    if ( !validator.isURL( imageUrl, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    })) {
      return null;
    }

    return imageUrl;
  }
};
