/**
 * INTENTIONAL TEST FIXTURES (batch 6) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures and /vuln-batch{2,3,4,5}.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var secrets = require('../config/vuln-batch6-secrets');
var shell = require('shelljs');
var dotProp = require('dot-prop');
var extend = require('extend');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection via shelljs
router.get('/critical/ls', function (req, res) {
  var dir = req.query.dir || '.';
  var result = shell.exec('ls -la ' + dir, { silent: true });
  if (result.code !== 0) {
    return res.status(500).send(result.stderr || 'exec failed');
  }
  return res.type('text/plain').send(result.stdout);
});

// Critical: SQL injection
router.get('/critical/find', function (req, res) {
  var name = req.query.name || 'todo';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = 'SELECT * FROM todos WHERE content = \'' + name + '\'';
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: child_process + user input
router.post('/critical/sh', function (req, res) {
  var cmd = req.body.cmd || 'echo batch6';
  childProcess.exec(cmd, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal
router.get('/high/cat', function (req, res) {
  var name = req.query.name || 'favicon.ico';
  fs.readFile(path.join('public', name), function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.send(data);
  });
});

// High: weak hashing
router.post('/high/md5', function (req, res) {
  var input = req.body.input || 'batch6';
  return res.json({
    algorithm: 'md5',
    hash: crypto.createHash('md5').update(input).digest('hex'),
  });
});

// High: SSRF
router.get('/high/pull', function (req, res) {
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

// High: hardcoded secrets
router.get('/high/creds', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    paymentsToken: secrets.paymentsToken,
    redisAuth: secrets.redisAuth,
  });
});

// High: prototype pollution via extend / dot-prop
router.post('/high/merge', function (req, res) {
  var base = { role: 'user' };
  var merged = extend(true, base, req.body || {});
  if (req.body && req.body.path && req.body.value !== undefined) {
    dotProp.set(merged, req.body.path, req.body.value);
  }
  return res.json(merged);
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/note', function (req, res) {
  var note = req.query.note || 'batch6';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><pre>' + note + '</pre></body></html>');
});

// Medium: open redirect
router.get('/medium/away', function (req, res) {
  return res.redirect(req.query.target || '/');
});

// Medium: insecure cookie
router.get('/medium/cookie', function (req, res) {
  res.cookie('batch6Sid', 'b6-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: weak cipher
router.post('/medium/enc', function (req, res) {
  var text = req.body.text || 'batch6';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch6-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ enc: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/boom', function (req, res) {
  try {
    throw new Error('batch6 scanner fixture');
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
    .get('http://example.com/login', function (upstream) {
      return res.json({ protocol: 'http', statusCode: upstream.statusCode });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: weak PRNG
router.get('/low/rand', function (req, res) {
  return res.json({ value: Math.random().toString(36).slice(2), prng: 'Math.random' });
});

module.exports = router;
