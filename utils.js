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

  // Only allow in-app redirects (absolute-path references like "/admin?x=y").
  // Prevents open-redirects to attacker-controlled external origins.
  safeRedirectPath: function (redirectPage, fallback) {
    fallback = fallback || '/admin';

    if (typeof redirectPage !== 'string' || redirectPage.length === 0) {
      return fallback;
    }

    // Avoid header injection and pathological inputs.
    if (redirectPage.length > 2048 || /[\r\n]/.test(redirectPage)) {
      return fallback;
    }

    // Explicitly block protocol-relative URLs (e.g. "//evil.com") and backslashes
    // (some user agents treat backslashes as forward slashes in URLs).
    if (redirectPage.startsWith('//') || redirectPage.includes('\\') || /%5c/i.test(redirectPage)) {
      return fallback;
    }

    try {
      const base = 'http://example.com';
      const u = new URL(redirectPage, base);

      // If input was absolute (http/https/javascript/etc.), origin will differ.
      if (u.origin !== base) {
        return fallback;
      }

      if (typeof u.pathname !== 'string' || !u.pathname.startsWith('/')) {
        return fallback;
      }

      return u.pathname + u.search + u.hash;
    } catch (e) {
      return fallback;
    }
  }
};
