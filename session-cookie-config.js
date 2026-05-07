var DEFAULT_SESSION_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Normalize an optional cookie domain from configuration.
 * Returns undefined to preserve host-only cookies when no domain is configured.
 */
function normalizeCookieDomain(domain) {
  if (typeof domain !== 'string') {
    return undefined;
  }

  var normalizedDomain = domain.trim().toLowerCase().replace(/^\./, '');

  if (!normalizedDomain) {
    return undefined;
  }

  return normalizedDomain;
}

/**
 * Resolve the session cookie lifetime from configuration.
 * Falls back to a one-hour default when no valid override is provided.
 */
function getSessionCookieMaxAge(env) {
  var parsedMaxAge = parseInt(env.SESSION_COOKIE_MAX_AGE_MS, 10);

  if (Number.isFinite(parsedMaxAge) && parsedMaxAge > 0) {
    return parsedMaxAge;
  }

  return DEFAULT_SESSION_COOKIE_MAX_AGE_MS;
}

/**
 * Build the explicit cookie settings used by express-session.
 * These defaults keep cookies HTTP-only, HTTPS-aware, and time-bounded.
 */
function getSessionCookieOptions(env) {
  var runtimeEnv = env || process.env;

  return {
    path: '/',
    domain: normalizeCookieDomain(runtimeEnv.SESSION_COOKIE_DOMAIN),
    httpOnly: true,
    secure: 'auto',
    maxAge: getSessionCookieMaxAge(runtimeEnv)
  };
}

module.exports = {
  DEFAULT_SESSION_COOKIE_MAX_AGE_MS: DEFAULT_SESSION_COOKIE_MAX_AGE_MS,
  getSessionCookieOptions: getSessionCookieOptions,
  normalizeCookieDomain: normalizeCookieDomain
};