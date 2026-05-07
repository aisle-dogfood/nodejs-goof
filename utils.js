var marked = require('marked');

/**
 * Escapes HTML special characters before untrusted text is placed into markup.
 *
 * @param {*} value The value to escape for safe HTML output.
 * @returns {string} The escaped string representation.
 */
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

/**
 * Decodes entity-encoded characters that could disguise dangerous URL schemes.
 *
 * @param {*} value The possibly encoded URL or attribute value.
 * @returns {string} The decoded string value.
 */
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

/**
 * Validates whether a markdown-generated URL uses an allowed protocol.
 *
 * The value is normalized by decoding HTML entities, attempting URL decoding,
 * and removing control characters before protocol checks. This blocks URLs such
 * as `javascript:` that may be obfuscated in markdown input.
 *
 * @param {string} url The URL extracted from markdown link or image syntax.
 * @returns {boolean} True when the URL is considered safe to render.
 */
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

/**
 * Renders markdown with security hardening to reduce XSS exposure.
 *
 * A custom `marked.Renderer` is used so raw HTML is escaped instead of trusted
 * and markdown links or images with dangerous protocols are rejected before the
 * resulting HTML is returned for display.
 *
 * @param {*} content The markdown source to render.
 * @returns {string} Sanitized HTML generated from the markdown input.
 */
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
