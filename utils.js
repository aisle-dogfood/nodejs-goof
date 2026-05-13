var marked = require('marked');
var url = require('url');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(candidate, options) {
  if (typeof candidate != 'string') {
    return false;
  }

  var trimmed = candidate.trim();
  if (!trimmed) {
    return false;
  }

  var normalized = trimmed;
  try {
    normalized = decodeURIComponent(normalized);
  } catch (e) {
  }

  normalized = normalized.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  if (/^(javascript|vbscript|data):/.test(normalized)) {
    return false;
  }

  if (trimmed.charAt(0) == '#') {
    return true;
  }

  if (trimmed.indexOf('//') === 0) {
    return false;
  }

  var parsed = url.parse(trimmed);
  if (!parsed.protocol) {
    return true;
  }

  if (parsed.protocol == 'http:' || parsed.protocol == 'https:') {
    return true;
  }

  return Boolean(options && options.allowMailto && parsed.protocol == 'mailto:');
}

function createMarkdownRenderer() {
  var renderer = new marked.Renderer();

  renderer.link = function (href, title, text) {
    if (!isSafeUrl(href, { allowMailto: true })) {
      return text;
    }

    var out = '<a href="' + escapeHtml(href) + '"';
    if (title) {
      out += ' title="' + escapeHtml(title) + '"';
    }
    out += '>' + text + '</a>';
    return out;
  };

  renderer.image = function (href, title, text) {
    if (!isSafeUrl(href)) {
      return escapeHtml(text);
    }

    var out = '<img src="' + escapeHtml(href) + '" alt="' + escapeHtml(text) + '"';
    if (title) {
      out += ' title="' + escapeHtml(title) + '"';
    }
    out += '>';
    return out;
  };

  return renderer;
}

function renderMarkdown(value) {
  return marked(escapeHtml(value), {
    renderer: createMarkdownRenderer(),
    sanitize: false,
  });
}

module.exports = {

  ran_no: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  uid: function (len) {
    var str = '';
    var src = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var src_len = src.length;
    var i = len;

    for (; i--;) {
      str += src.charAt(this.ran_no(0, src_len - 1));
    }

    return str;
  },

  forbidden: function (res) {
    var body = 'Forbidden';
    res.statusCode = 403;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.end(body);
  },

  renderMarkdown: renderMarkdown,
};
