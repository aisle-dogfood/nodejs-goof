var marked = require('marked');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, function (char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);?/gi, function (match, codePoint) {
      return String.fromCharCode(parseInt(codePoint, 16));
    })
    .replace(/&#([0-9]+);?/g, function (match, codePoint) {
      return String.fromCharCode(parseInt(codePoint, 10));
    })
    .replace(/&colon;/gi, ':')
    .replace(/&newline;/gi, '\n')
    .replace(/&tab;/gi, '\t');
}

function isSafeUrl(url) {
  var normalized = decodeHtmlEntities(url || '');

  try {
    normalized = decodeURIComponent(normalized);
  } catch (error) {
  }

  normalized = normalized
    .replace(/[\u0000-\u0020\u007f-\u009f\s]+/g, '')
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  if (normalized.indexOf('#') === 0 || normalized.indexOf('/') === 0 || normalized.indexOf('./') === 0 || normalized.indexOf('../') === 0) {
    return true;
  }

  if (/^(https?:|mailto:|tel:)/.test(normalized)) {
    return true;
  }

  return !/^[a-z][a-z0-9+.-]*:/.test(normalized);
}

var markdownRenderer = new marked.Renderer();

markdownRenderer.html = function (html) {
  return escapeHtml(html);
};

markdownRenderer.link = function (href, title, text) {
  if (!isSafeUrl(href)) {
    return text;
  }

  var output = '<a href="' + escapeHtml(href) + '" rel="noopener noreferrer"';

  if (title) {
    output += ' title="' + escapeHtml(title) + '"';
  }

  output += '>' + text + '</a>';
  return output;
};

markdownRenderer.image = function (href, title, text) {
  if (!isSafeUrl(href)) {
    return escapeHtml(text || '');
  }

  var output = '<img src="' + escapeHtml(href) + '" alt="' + escapeHtml(text || '') + '"';

  if (title) {
    output += ' title="' + escapeHtml(title) + '"';
  }

  output += '>';
  return output;
};

function renderMarkdown(content) {
  if (typeof content === 'undefined' || content === null) {
    return '';
  }

  return marked(String(content), {
    renderer: markdownRenderer,
    sanitize: false
  });
}

module.exports = {

  ran_no : function ( min, max ){
    return Math.floor( Math.random() * ( max - min + 1 )) + min;
  },

  uid : function ( len ){
    var str     = '';
    var src     = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var src_len = src.length;
    var i       = len;

    for( ; i-- ; ){
      str += src.charAt( this.ran_no( 0, src_len - 1 ));
    }

    return str;
  },

  forbidden : function ( res ){
    var body       = 'Forbidden';
    res.statusCode = 403;

    res.setHeader( 'Content-Type', 'text/plain' );
    res.setHeader( 'Content-Length', body.length );
    res.end( body );
  },

  renderMarkdown : renderMarkdown
};
