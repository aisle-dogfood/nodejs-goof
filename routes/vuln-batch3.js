/**
 * INTENTIONAL TEST FIXTURES (batch 3) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures and /vuln-batch2 — Low through Critical.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var net = require('net');
var secrets = require('../config/vuln-batch3-secrets');
var merge = require('merge-deep');
var yaml = require('js-yaml');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection via spawn shell
router.get('/critical/dig', function (req, res) {
  var domain = req.query.domain || 'example.com';
  childProcess.exec('nslookup ' + domain, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection — ORDER BY concatenation
router.get('/critical/todos-sort', function (req, res) {
  var sort = req.query.sort || 'id';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = 'SELECT * FROM todos ORDER BY ' + sort;
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: dynamic Function constructor code injection
router.post('/critical/compute', function (req, res) {
  var expr = req.body.expr || 'return 1';
  var fn = new Function(expr);
  return res.json({ result: fn() });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal with path.join still allowing ../ escape from base
router.get('/high/asset', function (req, res) {
  var name = req.query.name || 'index.html';
  var target = path.join(__dirname, '..', 'public', name);
  fs.readFile(target, 'utf8', function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.type('text/plain').send(data);
  });
});

// High: weak hashing (MD5) for auth material
router.post('/high/fingerprint', function (req, res) {
  var value = req.body.value || 'token';
  var hash = crypto.createHash('md5').update(value).digest('hex');
  return res.json({ algorithm: 'md5', hash: hash });
});

// High: SSRF-style socket connect to user-controlled host/port
router.get('/high/probe', function (req, res) {
  var host = req.query.host || '127.0.0.1';
  var port = Number(req.query.port || 3001);
  var socket = net.connect({ host: host, port: port }, function () {
    socket.end();
    return res.json({ ok: true, host: host, port: port });
  });
  socket.on('error', function (err) {
    return res.status(502).json({ error: err.message, host: host, port: port });
  });
});

// High: hardcoded secrets exposure
router.get('/high/keys', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    analyticsApiKey: secrets.analyticsApiKey,
    cacheAuthToken: secrets.cacheAuthToken,
  });
});

// High: unsafe deep merge / prototype pollution surface
router.post('/high/config', function (req, res) {
  var base = { theme: 'light', role: 'user' };
  var merged = merge(base, req.body || {});
  return res.json(merged);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/echo', function (req, res) {
  var q = req.query.q || 'batch3';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><div id="out">' + q + '</div></body></html>');
});

// Medium: open redirect
router.get('/medium/next', function (req, res) {
  var url = req.query.url || '/';
  return res.redirect(url);
});

// Medium: insecure cookie
router.get('/medium/tracking', function (req, res) {
  res.cookie('batch3Track', 'b3-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: insecure legacy cipher API
router.post('/medium/seal', function (req, res) {
  var payload = req.body.payload || 'batch3';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch3-static-key');
  var sealed = cipher.update(payload, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ sealed: sealed });
});

// Medium: unsafe YAML load of user input
router.post('/medium/yaml', function (req, res) {
  var doc = req.body.doc || 'name: batch3';
  var parsed = yaml.load(doc);
  return res.json({ parsed: parsed });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/fail', function (req, res) {
  try {
    throw new Error('batch3 scanner fixture');
  } catch (err) {
    return res.status(500).send(err.stack);
  }
});

// Low: TLS verification off
router.get('/low/insecure-https', function (req, res) {
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
    .get('http://example.com/health', function (upstream) {
      return res.json({ protocol: 'http', statusCode: upstream.statusCode });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: weak PRNG
router.get('/low/id', function (req, res) {
  return res.json({ id: Math.random().toString(36).slice(2), prng: 'Math.random' });
});

module.exports = router;
