/**
 * INTENTIONAL TEST FIXTURES (batch 5) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures and /vuln-batch{2,3,4}.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var secrets = require('../config/vuln-batch5-secrets');
var qs = require('qs');
var cookie = require('tough-cookie');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection
router.post('/critical/run', function (req, res) {
  var bin = req.body.bin || 'uname';
  childProcess.exec(bin + ' -a', function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection
router.get('/critical/filter', function (req, res) {
  var status = req.query.status || 'open';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = 'SELECT * FROM todos WHERE status = "' + status + '"';
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: dynamic code execution
router.post('/critical/fn', function (req, res) {
  var body = req.body.code || 'return 42';
  var fn = new Function(body);
  return res.json({ result: fn() });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal
router.get('/high/load', function (req, res) {
  var rel = req.query.rel || 'index.html';
  fs.readFile('./public/' + rel, 'utf8', function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.type('text/plain').send(data);
  });
});

// High: weak hashing (SHA1)
router.post('/high/sign', function (req, res) {
  var data = req.body.data || 'payload';
  var digest = crypto.createHash('sha1').update(data).digest('hex');
  return res.json({ algorithm: 'sha1', digest: digest });
});

// High: SSRF
router.get('/high/mirror', function (req, res) {
  var target = req.query.url || 'http://127.0.0.1:3001/';
  http.get(target, function (upstream) {
    var buf = [];
    upstream.on('data', function (c) { buf.push(c); });
    upstream.on('end', function () {
      return res.status(200).send(Buffer.concat(buf).slice(0, 500));
    });
  }).on('error', function (err) {
    return res.status(502).json({ error: err.message, url: target });
  });
});

// High: hardcoded secrets
router.get('/high/secrets', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    webhookSecret: secrets.webhookSecret,
    smtpPassword: secrets.smtpPassword,
  });
});

// High: prototype pollution via qs parse
router.post('/high/qs', function (req, res) {
  var raw = req.body.raw || 'a[__proto__][polluted]=batch5';
  var parsed = qs.parse(raw, { allowPrototypes: true });
  return res.json(parsed);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/label', function (req, res) {
  var label = req.query.label || 'batch5';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><span>' + label + '</span></body></html>');
});

// Medium: open redirect
router.get('/medium/jump', function (req, res) {
  return res.redirect(req.query.href || '/');
});

// Medium: insecure cookie (also uses tough-cookie surface)
router.get('/medium/cookie', function (req, res) {
  var c = new cookie.Cookie({
    key: 'batch5Sid',
    value: 'b5-' + Date.now(),
    httpOnly: false,
    secure: false,
  });
  res.setHeader('Set-Cookie', c.cookieString());
  return res.json({ ok: true, cookie: c.cookieString() });
});

// Medium: weak cipher API
router.post('/medium/wrap', function (req, res) {
  var text = req.body.text || 'batch5';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch5-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ wrapped: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/trace', function (req, res) {
  try {
    throw new Error('batch5 scanner fixture');
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
router.get('/low/plain', function (req, res) {
  http
    .get('http://example.com/oauth/token', function (upstream) {
      return res.json({ protocol: 'http', statusCode: upstream.statusCode });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: weak PRNG
router.get('/low/id', function (req, res) {
  return res.json({ id: Math.random().toString(16).slice(2), prng: 'Math.random' });
});

module.exports = router;
