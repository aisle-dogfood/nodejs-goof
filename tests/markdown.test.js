var tap = require('tap');
var utils = require('../utils');

tap.test('renderTodoContent preserves safe markdown formatting', function (t) {
  var html = utils.renderTodoContent('**ship fix**');

  t.match(html, /<strong>ship fix<\/strong>/, 'renders basic markdown formatting');
  t.end();
});

tap.test('renderTodoContent does not emit user-controlled links', function (t) {
  var html = utils.renderTodoContent('[click me](javascript:alert(1))');

  t.notMatch(html, /<a\b/i, 'does not render nested anchor tags');
  t.notMatch(html, /javascript:/i, 'does not preserve dangerous protocols');
  t.match(html, /click me/, 'preserves link text');
  t.end();
});

tap.test('renderTodoContent escapes raw html and strips image urls', function (t) {
  var html = utils.renderTodoContent('![owned](javascript:alert(1) "title") <img src=x onerror=alert(1)>');

  t.notMatch(html, /<img\b/i, 'does not render attacker-controlled image tags');
  t.notMatch(html, /javascript:/i, 'does not preserve dangerous image protocols');
  t.match(html, /owned/, 'preserves image alt text');
  t.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, 'escapes raw html instead of rendering it');
  t.end();
});
