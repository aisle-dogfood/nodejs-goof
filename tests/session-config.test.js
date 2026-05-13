var tap = require('tap');
var sessionConfig = require('../session-config');

tap.test('buildSessionOptions hardens development cookies without forcing HTTPS', function (t) {
  var sessionOptions = sessionConfig.buildSessionOptions({
    secret: 'development-test-session-secret',
    nodeEnv: 'development',
    cookieDomain: '   ',
  });

  t.equal(sessionOptions.cookie.path, '/', 'keeps the application cookie path');
  t.equal(sessionOptions.cookie.httpOnly, true, 'marks the cookie as HTTP only');
  t.equal(sessionOptions.cookie.maxAge, sessionConfig.SESSION_COOKIE_TTL_MS, 'sets a persistent cookie lifetime');
  t.equal(sessionOptions.cookie.sameSite, 'strict', 'prevents cross-site cookie use');
  t.equal(sessionOptions.cookie.secure, false, 'does not break local HTTP development');
  t.notOk(sessionOptions.cookie.domain, 'keeps the default host-only scope when no domain is configured');
  t.equal(sessionOptions.resave, false, 'avoids unnecessary session rewrites');
  t.equal(sessionOptions.saveUninitialized, false, 'does not create sessions for anonymous visitors');
  t.equal(sessionOptions.proxy, false, 'does not require a trusted proxy outside production');
  t.end();
});

tap.test('buildSessionOptions requires HTTPS in production and honors a configured domain', function (t) {
  var sessionOptions = sessionConfig.buildSessionOptions({
    secret: 'production-test-session-secret',
    nodeEnv: 'production',
    cookieDomain: 'app.example.com',
  });

  t.equal(sessionOptions.cookie.httpOnly, true, 'retains HTTP only protection');
  t.equal(sessionOptions.cookie.maxAge, sessionConfig.SESSION_COOKIE_TTL_MS, 'retains the cookie lifetime');
  t.equal(sessionOptions.cookie.sameSite, 'strict', 'retains cross-site request protection');
  t.equal(sessionOptions.cookie.secure, true, 'only sends the cookie over HTTPS');
  t.equal(sessionOptions.cookie.domain, 'app.example.com', 'pins the cookie to the configured domain');
  t.equal(sessionOptions.resave, false, 'avoids unnecessary session rewrites');
  t.equal(sessionOptions.saveUninitialized, false, 'does not create sessions for anonymous visitors');
  t.equal(sessionOptions.proxy, true, 'allows secure cookies behind a reverse proxy');
  t.end();
});
