var fs = require('fs');
var https = require('https');

function readPemValue(env, directNames, pathNames) {
  var i;
  var value;

  for (i = 0; i < directNames.length; i++) {
    value = env[directNames[i]];
    if (value) {
      return value.replace(/\\n/g, '\n');
    }
  }

  for (i = 0; i < pathNames.length; i++) {
    value = env[pathNames[i]];
    if (value) {
      return fs.readFileSync(value);
    }
  }

  return null;
}

function getTlsOptions(env) {
  env = env || process.env;

  var key = readPemValue(env, ['TLS_KEY', 'SSL_KEY'], ['TLS_KEY_PATH', 'SSL_KEY_PATH']);
  var cert = readPemValue(env, ['TLS_CERT', 'SSL_CERT'], ['TLS_CERT_PATH', 'SSL_CERT_PATH']);

  if (!key || !cert) {
    throw new Error('TLS_KEY/TLS_CERT or TLS_KEY_PATH/TLS_CERT_PATH must be set to start the HTTPS server.');
  }

  var options = {
    key: key,
    cert: cert
  };

  var ca = readPemValue(env, ['TLS_CA', 'SSL_CA'], ['TLS_CA_PATH', 'SSL_CA_PATH']);
  if (ca) {
    options.ca = ca;
  }

  if (env.TLS_PASSPHRASE || env.SSL_PASSPHRASE) {
    options.passphrase = env.TLS_PASSPHRASE || env.SSL_PASSPHRASE;
  }

  return options;
}

function createHttpsServer(app, env, httpsModule) {
  return (httpsModule || https).createServer(getTlsOptions(env), app);
}

function isProxyTlsEnabled(env) {
  env = env || process.env;
  return !!env.TRUST_PROXY;
}

function getHttpsRedirectLocation(env, originalUrl) {
  env = env || process.env;

  if (!env.CANONICAL_HOST) {
    throw new Error('CANONICAL_HOST must be set when TRUST_PROXY is enabled.');
  }

  return 'https://' + env.CANONICAL_HOST + originalUrl;
}

module.exports = {
  createHttpsServer: createHttpsServer,
  getTlsOptions: getTlsOptions,
  isProxyTlsEnabled: isProxyTlsEnabled,
  getHttpsRedirectLocation: getHttpsRedirectLocation
};
