var DEFAULT_SESSION_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

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

function getSessionCookieMaxAge(env) {
  var parsedMaxAge = parseInt(env.SESSION_COOKIE_MAX_AGE_MS, 10);

  if (Number.isFinite(parsedMaxAge) && parsedMaxAge > 0) {
    return parsedMaxAge;
  }

  return DEFAULT_SESSION_COOKIE_MAX_AGE_MS;
}

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