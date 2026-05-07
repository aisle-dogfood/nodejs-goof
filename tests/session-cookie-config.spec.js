var tap = require('tap');
var sessionCookieConfig = require('../session-cookie-config');

tap.test('session cookie defaults are explicit and hardened', function (t) {
  var cookieOptions = sessionCookieConfig.getSessionCookieOptions({});

  t.equal(cookieOptions.path, '/');
  t.equal(cookieOptions.domain, undefined);
  t.equal(cookieOptions.httpOnly, true);
  t.equal(cookieOptions.secure, 'auto');
  t.equal(cookieOptions.maxAge, sessionCookieConfig.DEFAULT_SESSION_COOKIE_MAX_AGE_MS);
  t.end();
});

tap.test('session cookie domain is normalized from configuration', function (t) {
  var cookieOptions = sessionCookieConfig.getSessionCookieOptions({
    SESSION_COOKIE_DOMAIN: ' .Example.COM '
  });

  t.equal(cookieOptions.domain, 'example.com');
  t.end();
});

tap.test('session cookie maxAge honors a valid override', function (t) {
  var cookieOptions = sessionCookieConfig.getSessionCookieOptions({
    SESSION_COOKIE_MAX_AGE_MS: '900000'
  });

  t.equal(cookieOptions.maxAge, 900000);
  t.end();
});