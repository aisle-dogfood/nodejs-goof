/**
 * INTENTIONAL TEST FIXTURES (batch 2) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures — Low through Critical patterns for SAST/SCA.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var vm = require('vm');
var childProcess = require('child_process');
var mysql = require('mysql');
var request = require('request');
var _ = require('underscore');
var secrets = require('../config/vuln-batch2-secrets');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: OS command injection via shell string concatenation
router.post('/critical/shell', function (req, res) {
  var filename = req.body.filename || 'status.txt';
  childProcess.exec('cat ./public/' + filename, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection — concatenated WHERE clause
router.get('/critical/users-lookup', function (req, res) {
  var email = req.query.email || 'admin@example.com';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });

  var sql = "SELECT * FROM users WHERE email = '" + email + "'";
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: code injection via vm.runInThisContext on request input
router.post('/critical/script', function (req, res) {
  var code = req.body.code || '1 + 1';
  var result = vm.runInThisContext(code);
  return res.json({ result: result });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal — unsanitized relative path
router.get('/high/read', function (req, res) {
  var rel = req.query.path || 'readme.txt';
  var filePath = './public/' + rel;
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.type('text/plain').send(data);
  });
});

// High: weak password hashing (SHA-1)
router.post('/high/hash', function (req, res) {
  var password = req.body.password || 'password';
  var digest = crypto.createHash('sha1').update(password).digest('hex');
  return res.json({ algorithm: 'sha1', digest: digest });
});

// High: SSRF via request to caller-controlled URL
router.get('/high/fetch', function (req, res) {
  var target = req.query.target || 'http://127.0.0.1:3001/';
  request(target, function (err, response, body) {
    if (err) {
      return res.status(502).json({ error: err.message, target: target });
    }
    return res.status(200).send(String(body).slice(0, 500));
  });
});

// High: hardcoded secrets returned to client
router.get('/high/creds', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    billingSecret: secrets.billingSecret,
    warehouseToken: secrets.warehouseToken,
  });
});

// High: prototype pollution via underscore defaults merge of user input
router.post('/high/merge', function (req, res) {
  var defaults = { role: 'user', active: true };
  var merged = _.defaults(req.body || {}, defaults);
  return res.json(merged);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/greet', function (req, res) {
  var msg = req.query.msg || 'world';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><p>Message: ' + msg + '</p></body></html>');
});

// Medium: open redirect
router.get('/medium/continue', function (req, res) {
  var dest = req.query.dest || '/';
  return res.redirect(dest);
});

// Medium: insecure session cookie flags
router.get('/medium/session-cookie', function (req, res) {
  res.cookie('batch2Session', 'batch2-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: ECB mode + static key via createCipher
router.post('/medium/encrypt', function (req, res) {
  var text = req.body.text || 'batch2';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch2-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ ciphertext: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: verbose error / stack disclosure
router.get('/low/boom', function (req, res) {
  try {
    JSON.parse('{not-json');
  } catch (err) {
    return res.status(500).send(err.stack);
  }
});

// Low: TLS verification disabled
router.get('/low/tls', function (req, res) {
  var host = req.query.host || 'example.com';
  var reqUpstream = https.request(
    { hostname: host, path: '/', method: 'GET', rejectUnauthorized: false },
    function (upstream) {
      return res.json({ statusCode: upstream.statusCode, rejectUnauthorized: false });
    }
  );
  reqUpstream.on('error', function (err) {
    return res.status(502).json({ error: err.message });
  });
  reqUpstream.end();
});

// Low: cleartext HTTP for sensitive-looking call
router.get('/low/http-token', function (req, res) {
  http.get('http://example.com/v1/session', function (upstream) {
    return res.json({ protocol: 'http', statusCode: upstream.statusCode });
  }).on('error', function (err) {
    return res.status(502).json({ error: err.message });
  });
});

// Low: weak PRNG for auth-like token
router.get('/low/nonce', function (req, res) {
  return res.json({ nonce: Math.random().toString(16).slice(2), prng: 'Math.random' });
});

module.exports = router;
