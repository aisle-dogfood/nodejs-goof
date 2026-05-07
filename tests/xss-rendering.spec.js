const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const t = require('tap');
const renderMarkdown = require('../service/markdown');

function renderTemplate(templateName, locals) {
  const templatePath = path.join(__dirname, '..', 'views', templateName);
  const template = fs.readFileSync(templatePath, 'utf8');

  return ejs.render(template, Object.assign({
    layout: function () {}
  }, locals), {
    filename: templatePath
  });
}

function renderIndex(content) {
  return renderTemplate('index.ejs', {
    title: 'TODO',
    todos: [{
      _id: 'todo-1',
      content: content
    }],
    renderMarkdown: renderMarkdown
  });
}

t.test('admin login escapes reflected redirectPage payloads', function (t) {
  const payload = '"><img src=x onerror=alert(1)><script>alert(1)</script>';
  const html = renderTemplate('admin.ejs', {
    title: 'Admin Access',
    granted: false,
    redirectPage: payload
  });

  t.match(html, /name="redirectPage"/);
  t.notMatch(html, /value=""><img src=x onerror=alert\(1\)>/);
  t.notMatch(html, /<script>alert\(1\)<\/script>/);
  t.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  t.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  t.end();
});

t.test('stored XSS payloads are sanitized before markdown is rendered', function (t) {
  const payload = '<script>alert(1)</script><img src=x onerror=alert(2)><a href="#" onclick="alert(3)">click</a>';
  const html = renderIndex(payload);

  t.notMatch(html, /<script>alert\(1\)<\/script>/);
  t.notMatch(html, /<img src=x onerror=alert\(2\)>/);
  t.notMatch(html, /<a href="#" onclick="alert\(3\)">click<\/a>/);
  t.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  t.match(html, /&lt;img src=x onerror=alert\(2\)&gt;/);
  t.match(html, /&lt;a href=&quot;#&quot; onclick=&quot;alert\(3\)&quot;&gt;click&lt;\/a&gt;/);
  t.end();
});

t.test('unsafe markdown URLs are stripped while safe markdown formatting still renders', function (t) {
  const payload = '**bold** *italic* [safe](https://example.com/docs) [bad](javascript:alert(1))';
  const html = renderIndex(payload);

  t.match(html, /<strong>bold<\/strong>/);
  t.match(html, /<em>italic<\/em>/);
  t.match(html, /<a href="https:\/\/example\.com\/docs">safe<\/a>/);
  t.notMatch(html, /href="javascript:alert\(1\)"/);
  t.notMatch(html, /javascript:alert\(1\)/);
  t.match(html, />bad</);
  t.end();
});

t.test('obfuscated unsafe protocols and inline event handlers stay inert', function (t) {
  const payload = '[encoded](java\nscript:alert(1))\n\n<img src="x" onerror="alert(2)">';
  const html = renderIndex(payload);

  t.notMatch(html, /href="javascript:alert\(1\)"/);
  t.notMatch(html, /<img src="x" onerror="alert\(2\)">/);
  t.match(html, /&lt;img src=&quot;x&quot; onerror=&quot;alert\(2\)&quot;&gt;/);
  t.end();
});
