var DEFAULT_BODY_SIZE_LIMIT = '100kb';
var DEFAULT_IMPORT_UPLOAD_LIMIT_BYTES = 1024 * 1024;
var DEFAULT_IMPORT_LINE_LIMIT = 10000;

function readPositiveInt(envName, fallback) {
  var value = parseInt(process.env[envName], 10);
  if (isNaN(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function getImportLimits() {
  return {
    bodySizeLimit: process.env.BODY_SIZE_LIMIT || DEFAULT_BODY_SIZE_LIMIT,
    uploadFileSizeLimitBytes: readPositiveInt('IMPORT_UPLOAD_LIMIT_BYTES', DEFAULT_IMPORT_UPLOAD_LIMIT_BYTES),
    maxImportLines: readPositiveInt('IMPORT_LINE_LIMIT', DEFAULT_IMPORT_LINE_LIMIT)
  };
}

function countLinesUntilLimit(text, maxLines) {
  var lineCount = 1;

  for (var i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lineCount += 1;
      if (lineCount > maxLines) {
        return lineCount;
      }
    }
  }

  return lineCount;
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

  getImportLimits: function () {
    return getImportLimits();
  },

  getBodyParserOptions: function () {
    return {
      limit: getImportLimits().bodySizeLimit
    };
  },

  getUrlEncodedParserOptions: function () {
    return {
      extended: false,
      limit: getImportLimits().bodySizeLimit
    };
  },

  getFileUploadOptions: function () {
    return {
      abortOnLimit: true,
      limits: {
        fileSize: getImportLimits().uploadFileSizeLimitBytes
      }
    };
  },

  isImportFileTooLarge: function (importFile) {
    if (!importFile || !importFile.data) {
      return false;
    }

    return importFile.truncated === true || importFile.data.length > getImportLimits().uploadFileSizeLimitBytes;
  },

  validateImportText: function (text) {
    if (typeof text !== 'string') {
      return 'Invalid import file uploaded';
    }

    if (countLinesUntilLimit(text, getImportLimits().maxImportLines) > getImportLimits().maxImportLines) {
      return 'Import file contains too many records';
    }

    return null;
  }
};
