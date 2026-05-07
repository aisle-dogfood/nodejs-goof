var marked = require('marked');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#(\d+);?/g, function (_, codePoint) {
      return String.fromCharCode(parseInt(codePoint, 10));
    })
    .replace(/&#x([0-9a-f]+);?/gi, function (_, codePoint) {
      return String.fromCharCode(parseInt(codePoint, 16));
    })
    .replace(/&colon;/gi, ':')
    .replace(/&newline;/gi, '')
    .replace(/&tab;/gi, '');
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }

  var trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return '';
  }

  var normalizedUrl = decodeHtmlEntities(trimmedUrl)
    .replace(/[\u0000-\u001F\u007F\s]+/g, '')
    .toLowerCase();

  if (/^(javascript|vbscript|data):/.test(normalizedUrl)) {
    return null;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmedUrl) && !/^(https?|mailto):/i.test(trimmedUrl)) {
    return null;
  }

  return trimmedUrl;
}

var renderer = new marked.Renderer();

renderer.html = function (html) {
  return escapeHtml(html);
};

renderer.link = function (href, title, text) {
  var safeHref = sanitizeUrl(href);

  if (!safeHref) {
    return text;
  }

  var output = '<a href="' + escapeHtml(safeHref) + '"';
  if (title) {
    output += ' title="' + escapeHtml(title) + '"';
  }

  output += '>' + text + '</a>';
  return output;
};

renderer.image = function (href, title, text) {
  var safeHref = sanitizeUrl(href);

  if (!safeHref) {
    return escapeHtml(text || '');
  }

  var output = '<img src="' + escapeHtml(safeHref) + '" alt="' + escapeHtml(text || '') + '"';
  if (title) {
    output += ' title="' + escapeHtml(title) + '"';
  }

  output += '>';
  return output;
};

function renderMarkdown(content) {
  if (content === null || typeof content === 'undefined') {
    return '';
  }

  return marked(String(content), {
    renderer: renderer,
    gfm: true,
    breaks: false,
    sanitize: false
  });
}

module.exports = renderMarkdown;
