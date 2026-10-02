/**
 * INTENTIONAL TEST FIXTURES for vulnerability scanner dogfooding.
 * Each handler embeds a classic insecure pattern so SAST/SCA tools can
 * detect and flag findings from Low through Critical.
 *
 * These routes are for scanner validation only.
 */

var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var childProcess = require('child_process');
var mysql = require('mysql');
var axios = require('axios');
var secrets = require('../config/scanner-test-secrets');

var router = express.Router();

// ---------------------------------------------------------------------------
// CRITICAL
// ---------------------------------------------------------------------------

// Critical: OS command injection — unsanitized user input in a shell command
router.get('/critical/command', function (req, res) {
  var host = req.query.host || '127.0.0.1';
  childProcess.exec('ping -c 1 ' + host, function (err, stdout, stderr) {
    if (err) {
      return res.status(500).send(stderr || String(err));
    }
    return res.type('text/plain').send(stdout);
  });
});

// Critical: SQL injection — string-concatenated query from request input
router.get('/critical/sql', function (req, res) {
  var userId = req.query.id || '1';
  var connection = mysql.createConnection({
    host: 'localhost',
    user: secrets.dbUser,
    password: secrets.dbPassword,
    database: 'goof',
  });

  var query = 'SELECT * FROM users WHERE id = ' + userId;
  connection.query(query, function (err, results) {
    connection.end();
    if (err) {
      return res.status(500).json({ error: err.message, query: query });
    }
    return res.json(results);
  });
});

// Critical: code injection via eval of request body
router.post('/critical/eval', function (req, res) {
  var expression = req.body.expression || '1+1';
  var result = eval(expression);
  return res.json({ result: result });
});

// ---------------------------------------------------------------------------
// HIGH
// ---------------------------------------------------------------------------

// High: path traversal — user-controlled path joined without allowlisting
router.get('/high/file', function (req, res) {
  var name = req.query.name || 'readme.txt';
  var target = path.join(__dirname, '..', 'public', name);
  fs.readFile(target, 'utf8', function (err, data) {
    if (err) {
      return res.status(404).send(String(err));
    }
    return res.type('text/plain').send(data);
  });
});

// High: weak cryptographic hash used for password storage (MD5)
router.post('/high/weak-hash', function (req, res) {
  var password = req.body.password || 'password';
  var hash = crypto.createHash('md5').update(password).digest('hex');
  return res.json({ algorithm: 'md5', hash: hash });
});

// High: SSRF — server fetches an attacker-controlled URL
router.get('/high/ssrf', function (req, res) {
  var targetUrl = req.query.url || 'http://127.0.0.1:3001/';
  axios
    .get(targetUrl)
    .then(function (response) {
      return res.status(200).send(String(response.data).slice(0, 500));
    })
    .catch(function (err) {
      return res.status(502).json({ error: err.message, url: targetUrl });
    });
});

// High: hardcoded secrets exposed through an API response
router.get('/high/secrets', function (req, res) {
  return res.json({
    awsAccessKeyId: secrets.awsAccessKeyId,
    awsSecretAccessKey: secrets.awsSecretAccessKey,
    paymentApiKey: secrets.paymentApiKey,
    scmAccessToken: secrets.scmAccessToken,
  });
});

// ---------------------------------------------------------------------------
// MEDIUM
// ---------------------------------------------------------------------------

// Medium: reflected XSS — unsanitized input echoed as HTML
router.get('/medium/xss', function (req, res) {
  var name = req.query.name || 'guest';
  res.set('Content-Type', 'text/html');
  return res.send('<html><body><h1>Hello ' + name + '</h1></body></html>');
});

// Medium: open redirect — Location header from user input
router.get('/medium/redirect', function (req, res) {
  var nextUrl = req.query.next || '/';
  return res.redirect(nextUrl);
});

// Medium: insecure cookie flags (no httpOnly / secure / sameSite)
router.get('/medium/cookie', function (req, res) {
  res.cookie('sessionToken', 'scanner-test-' + Math.random(), {
    path: '/',
  });
  return res.json({ ok: true });
});

// Medium: deprecated / insecure cipher API
router.post('/medium/cipher', function (req, res) {
  var plaintext = req.body.text || 'scanner-test';
  var cipher = crypto.createCipher('aes-128-ecb', 'static-scanner-key');
  var encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return res.json({ encrypted: encrypted });
});

// ---------------------------------------------------------------------------
// LOW
// ---------------------------------------------------------------------------

// Low: information disclosure — stack traces returned to clients
router.get('/low/error', function (req, res) {
  try {
    throw new Error('intentional scanner fixture failure');
  } catch (err) {
    return res.status(500).send(err.stack);
  }
});

// Low: TLS certificate validation disabled
router.get('/low/insecure-tls', function (req, res) {
  var targetHost = req.query.host || 'example.com';
  var request = https.get(
    {
      hostname: targetHost,
      path: '/',
      rejectUnauthorized: false,
    },
    function (upstream) {
      return res.json({
        statusCode: upstream.statusCode,
        rejectUnauthorized: false,
      });
    }
  );
  request.on('error', function (err) {
    return res.status(502).json({ error: err.message });
  });
});

// Low: sensitive traffic over cleartext HTTP
router.get('/low/cleartext', function (req, res) {
  http.get('http://example.com/api/token', function (upstream) {
    return res.json({
      protocol: 'http',
      statusCode: upstream.statusCode,
      note: 'sensitive token fetch over cleartext',
    });
  }).on('error', function (err) {
    return res.status(502).json({ error: err.message });
  });
});

// Low: predictable token generation with Math.random
router.get('/low/token', function (req, res) {
  var token = Math.random().toString(36).slice(2);
  return res.json({ token: token, source: 'Math.random' });
});

module.exports = router;
