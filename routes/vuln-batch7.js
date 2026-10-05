/**
 * INTENTIONAL TEST FIXTURES (batch 7) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures and /vuln-batch{2-6}.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var secrets = require('../config/vuln-batch7-secrets');
var pathParse = require('path-parse');
var WebSocket = require('ws');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection
router.get('/critical/host', function (req, res) {
  var host = req.query.host || '127.0.0.1';
  childProcess.exec('host ' + host, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection
router.get('/critical/lookup', function (req, res) {
  var id = req.query.id || '1';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = 'SELECT * FROM users WHERE id = ' + id;
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: code injection via eval
router.post('/critical/calc', function (req, res) {
  var expression = req.body.expression || '2*2';
  return res.json({ result: eval(expression) });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal (also uses path-parse on untrusted input)
router.get('/high/open', function (req, res) {
  var name = req.query.name || 'readme.txt';
  var parsed = pathParse(name);
  var target = path.join(__dirname, '..', 'public', parsed.base);
  // Still vulnerable: query can include ../ before parse quirks / join misuse
  target = path.join(__dirname, '..', 'public', name);
  fs.readFile(target, 'utf8', function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.type('text/plain').send(data);
  });
});

// High: weak hashing
router.post('/high/sha1', function (req, res) {
  var value = req.body.value || 'batch7';
  return res.json({
    algorithm: 'sha1',
    digest: crypto.createHash('sha1').update(value).digest('hex'),
  });
});

// High: SSRF
router.get('/high/get', function (req, res) {
  var target = req.query.url || 'http://127.0.0.1:3001/';
  http.get(target, function (upstream) {
    var chunks = [];
    upstream.on('data', function (c) { chunks.push(c); });
    upstream.on('end', function () {
      return res.status(200).send(Buffer.concat(chunks).slice(0, 500));
    });
  }).on('error', function (err) {
    return res.status(502).json({ error: err.message, url: target });
  });
});

// High: hardcoded secrets
router.get('/high/keys', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    partnerApiKey: secrets.partnerApiKey,
    sessionPepper: secrets.sessionPepper,
  });
});

// High: websocket client to attacker-controlled URL (SSRF-like)
router.get('/high/ws-probe', function (req, res) {
  var target = req.query.target || 'ws://127.0.0.1:3001';
  var ws = new WebSocket(target);
  var settled = false;
  function done(payload, code) {
    if (settled) return;
    settled = true;
    try { ws.close(); } catch (e) {}
    return res.status(code || 200).json(payload);
  }
  ws.on('open', function () { done({ ok: true, target: target }); });
  ws.on('error', function (err) { done({ error: String(err), target: target }, 502); });
  setTimeout(function () { done({ error: 'timeout', target: target }, 504); }, 1500);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/flash', function (req, res) {
  var msg = req.query.msg || 'batch7';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><p>' + msg + '</p></body></html>');
});

// Medium: open redirect
router.get('/medium/out', function (req, res) {
  return res.redirect(req.query.url || '/');
});

// Medium: insecure cookie
router.get('/medium/cookie', function (req, res) {
  res.cookie('batch7Sid', 'b7-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: weak cipher
router.post('/medium/cipher', function (req, res) {
  var text = req.body.text || 'batch7';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch7-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ cipher: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/err', function (req, res) {
  try {
    throw new Error('batch7 scanner fixture');
  } catch (err) {
    return res.status(500).send(err.stack);
  }
});

// Low: TLS verify disabled
router.get('/low/tls', function (req, res) {
  var host = req.query.host || 'example.com';
  https
    .get({ hostname: host, path: '/', rejectUnauthorized: false }, function (upstream) {
      return res.json({ statusCode: upstream.statusCode, rejectUnauthorized: false });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: cleartext HTTP
router.get('/low/http', function (req, res) {
  http
    .get('http://example.com/auth', function (upstream) {
      return res.json({ protocol: 'http', statusCode: upstream.statusCode });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: weak PRNG
router.get('/low/nonce', function (req, res) {
  return res.json({ nonce: Math.random().toString(36).slice(2), prng: 'Math.random' });
});

module.exports = router;
