var tap = require('tap');
var utils = require('../utils');

tap.test('extractMarkdownImageUrl returns a validated https image url', function (t) {
  var item = '![alt text](https://raw.githubusercontent.com/Snyk/goof/feat/oreilly/exploits/snyk.png "Image todo item")';

  t.equal(
    utils.extractMarkdownImageUrl(item),
    'https://raw.githubusercontent.com/Snyk/goof/feat/oreilly/exploits/snyk.png'
  );
  t.end();
});

tap.test('extractMarkdownImageUrl rejects command-injection-shaped markdown', function (t) {
  var item = '![alt text](https://raw.githubusercontent.com/Snyk/goof/feat/oreilly/exploits/snyk.png;touch ./public/p0wned "Image todo item")';

  t.equal(utils.extractMarkdownImageUrl(item), null);
  t.end();
});

tap.test('extractMarkdownImageUrl rejects non-http protocols', function (t) {
  var item = '![alt text](javascript:alert(1) "Image todo item")';

  t.equal(utils.extractMarkdownImageUrl(item), null);
  t.end();
});
