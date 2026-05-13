var SESSION_COOKIE_TTL_MS = 30 * 60 * 1000;

/**
 * Normalizes an optional cookie domain so blank values do not get emitted.
 *
 * @param {string} cookieDomain Raw configured cookie domain value.
 * @returns {string|undefined} A trimmed domain value when configured.
 */
function normalizeCookieDomain(cookieDomain) {
  if (typeof cookieDomain !== 'string') {
    return undefined;
  }

  cookieDomain = cookieDomain.trim();
  return cookieDomain.length > 0 ? cookieDomain : undefined;
}

/**
 * Builds the shared express-session configuration for the application.
 *
 * @param {Object} config Runtime session configuration.
 * @param {string} config.secret Secret used to sign session identifiers.
 * @param {string} [config.nodeEnv] Node environment used to decide secure-cookie behavior.
 * @param {string} [config.cookieDomain] Optional explicit cookie domain.
 * @returns {{secret: string, name: string, resave: boolean, saveUninitialized: boolean, proxy: boolean, cookie: Object}} Session middleware options.
 */
function buildSessionOptions(config) {
  config = config || {};

  var sessionSecret = config.secret || process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('A session secret must be provided.');
  }

  var nodeEnv = config.nodeEnv || process.env.NODE_ENV;
  var cookieDomain = normalizeCookieDomain(config.cookieDomain);
  var useSecureCookies = nodeEnv === 'production';

  if (!cookieDomain) {
    cookieDomain = normalizeCookieDomain(process.env.SESSION_COOKIE_DOMAIN);
  }

  var cookie = {
    path: '/',
    domain: cookieDomain,
    httpOnly: true,
    maxAge: SESSION_COOKIE_TTL_MS,
    sameSite: 'strict',
    secure: useSecureCookies,
  };

  return {
    secret: sessionSecret,
    name: 'connect.sid',
    resave: false,
    saveUninitialized: false,
    proxy: useSecureCookies,
    cookie: cookie,
  };
}

module.exports = {
  buildSessionOptions: buildSessionOptions,
  SESSION_COOKIE_TTL_MS: SESSION_COOKIE_TTL_MS,
};
