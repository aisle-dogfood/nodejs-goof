/**
 * INTENTIONAL TEST FIXTURES (batch 8) for vulnerability scanner dogfooding.
 * Distinct from /scanner-fixtures and /vuln-batch{2-7}.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var vm = require('vm');
var secrets = require('../config/vuln-batch8-secrets');
var netmask = require('netmask');
var DOMParser = require('xmldom').DOMParser;
var globParent = require('glob-parent');
var ansiHTML = require('ansi-html');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: command injection
router.get('/critical/dig', function (req, res) {
  var name = req.query.name || 'example.com';
  childProcess.exec('dig +short ' + name, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection
router.get('/critical/where', function (req, res) {
  var clause = req.query.clause || '1=1';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });
  var sql = 'SELECT * FROM todos WHERE ' + clause;
  connection.query(sql, function (err, rows) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, sql: sql });
    }
    return res.json(rows);
  });
});

// Critical: code injection via vm.runInNewContext
router.post('/critical/vm', function (req, res) {
  var code = req.body.code || '1+1';
  var result = vm.runInNewContext(code, { secrets: secrets });
  return res.json({ result: result });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal
router.get('/high/stream', function (req, res) {
  var rel = req.query.rel || 'css/style.css';
  var target = path.join(__dirname, '..', 'public', rel);
  fs.createReadStream(target)
    .on('error', function (err) {
      return res.status(404).send(String(err));
    })
    .pipe(res);
});

// High: weak hashing
router.post('/high/md5', function (req, res) {
  var value = req.body.value || 'batch8';
  return res.json({
    algorithm: 'md5',
    digest: crypto.createHash('md5').update(value).digest('hex'),
  });
});

// High: SSRF
router.get('/high/relay', function (req, res) {
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
router.get('/high/secrets', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    telemetryKey: secrets.telemetryKey,
    backupPassphrase: secrets.backupPassphrase,
  });
});

// High: unsafe XML parse (XXE-prone parser) + netmask of untrusted CIDR
router.post('/high/xml', function (req, res) {
  var xml = req.body.xml || '<root/>';
  var doc = new DOMParser().parseFromString(xml, 'text/xml');
  var cidr = req.body.cidr || '10.0.0.0/8';
  var block = new netmask.Netmask(cidr);
  return res.json({
    xml: doc.toString(),
    cidr: cidr,
    first: block.first,
    last: block.last,
  });
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS
router.get('/medium/title', function (req, res) {
  var title = req.query.title || 'batch8';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><title>' + title + '</title></body></html>');
});

// Medium: open redirect
router.get('/medium/forward', function (req, res) {
  return res.redirect(req.query.dest || '/');
});

// Medium: insecure cookie
router.get('/medium/cookie', function (req, res) {
  res.cookie('batch8Sid', 'b8-' + Date.now(), { path: '/' });
  return res.json({ ok: true });
});

// Medium: weak cipher
router.post('/medium/crypt', function (req, res) {
  var text = req.body.text || 'batch8';
  var cipher = crypto.createCipher('aes-128-ecb', 'batch8-static-key');
  var out = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return res.json({ crypt: out });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: stack disclosure
router.get('/low/fail', function (req, res) {
  try {
    throw new Error('batch8 scanner fixture');
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
    .get('http://example.com/credentials', function (upstream) {
      return res.json({ protocol: 'http', statusCode: upstream.statusCode });
    })
    .on('error', function (err) {
      return res.status(502).json({ error: err.message });
    });
});

// Low: weak PRNG + ReDoS-prone glob-parent / ansi-html sinks
router.get('/low/id', function (req, res) {
  var glob = req.query.glob || '{a,b}/**';
  var ansi = req.query.ansi || '\u001b[31mbatch8';
  return res.json({
    id: Math.random().toString(36).slice(2),
    prng: 'Math.random',
    parent: globParent(glob),
    html: ansiHTML(ansi),
  });
});

module.exports = router;
