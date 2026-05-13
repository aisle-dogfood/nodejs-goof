var t = require('tap');
var utils = require('../utils');

t.test('renderMarkdown escapes raw html while preserving markdown formatting', function (t) {
  var html = utils.renderMarkdown('<img src=x onerror=alert(1)> **safe**');

  t.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  t.match(html, /<strong>safe<\/strong>/);
  t.notMatch(html, /<img src=x onerror=alert\(1\)>/);
  t.end();
});

t.test('renderMarkdown rejects unsafe markdown urls', function (t) {
  var html = utils.renderMarkdown('[xss](javascript%3Aalert(1))');

  t.notMatch(html, /href=/);
  t.match(html, />xss</);
  t.end();
});

t.test('renderMarkdown keeps safe markdown urls', function (t) {
  var html = utils.renderMarkdown('[docs](https://example.com/path?q=1)');

  t.match(html, /<a href="https:\/\/example.com\/path\?q=1">docs<\/a>/);
  t.end();
});
