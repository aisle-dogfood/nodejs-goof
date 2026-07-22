var marked = require('marked');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTodoContent(content) {
  var renderer = new marked.Renderer();

  // Todos are already wrapped in an edit link, so nested user-controlled links
  // and images are rendered as text instead of emitting unsafe href/src values.
  renderer.link = function (href, title, text) {
    return text;
  };

  renderer.image = function (href, title, text) {
    return escapeHtml(text || '');
  };

  renderer.html = function (html) {
    return escapeHtml(html);
  };

  return marked(String(content == null ? '' : content), {
    sanitize: true,
    renderer: renderer,
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

  renderTodoContent: function (content) {
    return renderTodoContent(content);
  }
};
