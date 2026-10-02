/**
 * INTENTIONAL TEST FIXTURES (batch 4) for vulnerability scanner dogfooding.
 * Distinct from prior /scanner-fixtures and /vuln-batch{2,3} PRs.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var secrets = require('../config/vuln-batch4-secrets');
var serialize = require('node-serialize');
var ini = require('ini');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection
router.get('/critical/whois', function (req, res) {
  var domain = req.query.domain || 'example.com';
  childProcess.exec('whois ' + domain, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection
router.get('/critical/search', function (req, res) {
  var term = req.query.q || 'admin';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = "SELECT * FROM todos WHERE content LIKE '%" + term + "%'";
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: insecure deserialization / RCE surface
router.post('/critical/deserialize', function (req, res) {
  var payload = req.body.payload || '{"rce":"_$$ND_FUNC$$_function (){return 1}()"}';
  var obj = serialize.unserialize(payload);
  return res.json({ obj: obj });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal
router.get('/high/download', function (req, res) {
  var file = req.query.file || 'readme.txt';
  var target = path.join(__dirname, '..', 'public', file);
  fs.readFile(target, function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.send(data);
  });
});

// High: weak hashing (MD5)
router.post('/high/digest', function (req, res) {
  var value = req.body.value || 'secret';
  var digest = crypto.createHash('md5').update(value).digest('hex');
  return res.json({ algorithm: 'md5', digest: digest });
});

// High: SSRF
router.get('/high/proxy', function (req, res) {
  var target = req.query.target || 'http://127.0.0.1:3001/';
  http.get(target, function (upstream) {
    var chunks = [];
    upstream.on('data', function (c) { chunks.push(c); });
    upstream.on('end', function () {
      return res.status(200).send(Buffer.concat(chunks).slice(0, 500));
    });
  }).on('error', function (err) {
    return res.status(502).json({ error: err.message, target: target });
  });
});

// High: hardcoded secrets exposure
router.get('/high/keys', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    metricsApiKey: secrets.metricsApiKey,
    queueApiToken: secrets.queueApiToken,
  });
});

// High: prototype pollution via ini parse of user input
router.post('/high/ini', function (req, res) {
  var text = req.body.text || 'role=user';
  var parsed = ini.parse(text);
  return res.json(parsed);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/banner', function (req, res) {
  var title = req.query.title || 'batch4';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><h2>' + title + '</h2></body></html>');
});

// Medium: open redirect
router.get('/medium/go', function (req, res) {
  return res.redirect(req.query.to || '/');
});

// Medium: insecure cookie
router.get('/medium/cookie', function (req, res) {
  res.cookie('batch4Sid', 'b4-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: weak/legacy cipher
router.post('/medium/lock', function (req, res) {
  var text = req.body.text || 'batch4';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch4-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ locked: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/stack', function (req, res) {
  try {
    throw new Error('batch4 scanner fixture');
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
    .get('http://example.com/session', function (upstream) {
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
