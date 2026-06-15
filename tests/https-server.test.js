var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var httpsServer = require('../https-server');

test('getTlsOptions rejects startup without both key and certificate', function () {
  assert.throws(function () {
    httpsServer.getTlsOptions({});
  }, /TLS_KEY\/TLS_CERT or TLS_KEY_PATH\/TLS_CERT_PATH must be set/);
});

test('getTlsOptions normalizes PEM data passed directly in environment variables', function () {
  var options = httpsServer.getTlsOptions({
    TLS_KEY: 'line-one\\nline-two',
    TLS_CERT: 'cert-one\\ncert-two',
    TLS_CA: 'ca-one\\nca-two',
    TLS_PASSPHRASE: 'secret'
  });

  assert.equal(options.key, 'line-one\nline-two');
  assert.equal(options.cert, 'cert-one\ncert-two');
  assert.equal(options.ca, 'ca-one\nca-two');
  assert.equal(options.passphrase, 'secret');
});

test('getTlsOptions reads TLS material from configured file paths', function () {
  var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goof-https-'));
  var keyPath = path.join(tempDir, 'server.key');
  var certPath = path.join(tempDir, 'server.crt');
  var caPath = path.join(tempDir, 'server.ca');

  fs.writeFileSync(keyPath, 'file-key');
  fs.writeFileSync(certPath, 'file-cert');
  fs.writeFileSync(caPath, 'file-ca');

  var options = httpsServer.getTlsOptions({
    TLS_KEY_PATH: keyPath,
    TLS_CERT_PATH: certPath,
    TLS_CA_PATH: caPath
  });

  assert.equal(options.key.toString(), 'file-key');
  assert.equal(options.cert.toString(), 'file-cert');
  assert.equal(options.ca.toString(), 'file-ca');
});

test('isProxyTlsEnabled reflects whether secure proxy mode is configured', function () {
  assert.equal(httpsServer.isProxyTlsEnabled({}), false);
  assert.equal(httpsServer.isProxyTlsEnabled({ TRUST_PROXY: '1' }), true);
});

test('getHttpsRedirectLocation requires a canonical host in proxy mode', function () {
  assert.throws(function () {
    httpsServer.getHttpsRedirectLocation({}, '/login');
  }, /CANONICAL_HOST must be set when TRUST_PROXY is enabled/);

  assert.equal(
    httpsServer.getHttpsRedirectLocation({ CANONICAL_HOST: 'app.example.com' }, '/login'),
    'https://app.example.com/login'
  );
});

test('createHttpsServer delegates to https.createServer with TLS options', function () {
  var calls = [];
  var app = function () {};
  var server = { close: function () {} };

  var createdServer = httpsServer.createHttpsServer(
    app,
    {
      TLS_KEY: 'key-data',
      TLS_CERT: 'cert-data'
    },
    {
      createServer: function (options, requestHandler) {
        calls.push({
          options: options,
          requestHandler: requestHandler
        });
        return server;
      }
    }
  );

  assert.equal(createdServer, server);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].requestHandler, app);
  assert.equal(calls[0].options.key, 'key-data');
  assert.equal(calls[0].options.cert, 'cert-data');
});
