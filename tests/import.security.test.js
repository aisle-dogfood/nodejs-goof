var t = require('tap');
var utils = require('../utils');

t.test('shared middleware options enforce upload limits', function (t) {
  var limits = utils.getImportLimits();
  var bodyParserOptions = utils.getBodyParserOptions();
  var urlEncodedOptions = utils.getUrlEncodedParserOptions();
  var fileUploadOptions = utils.getFileUploadOptions();

  t.equal(bodyParserOptions.limit, limits.bodySizeLimit);
  t.equal(urlEncodedOptions.limit, limits.bodySizeLimit);
  t.equal(urlEncodedOptions.extended, false);
  t.equal(fileUploadOptions.abortOnLimit, true);
  t.equal(fileUploadOptions.limits.fileSize, limits.uploadFileSizeLimitBytes);
  t.end();
});

t.test('truncated uploads are rejected', function (t) {
  t.equal(utils.isImportFileTooLarge({ truncated: true, data: new Buffer('ok') }), true);
  t.end();
});

t.test('oversized uploads are rejected', function (t) {
  var limits = utils.getImportLimits();
  var oversized = {
    truncated: false,
    data: {
      length: limits.uploadFileSizeLimitBytes + 1
    }
  };

  t.equal(utils.isImportFileTooLarge(oversized), true);
  t.end();
});

t.test('import text rejects excessive record counts before splitting', function (t) {
  var limits = utils.getImportLimits();
  var lines = [];

  for (var i = 0; i < limits.maxImportLines + 1; i++) {
    lines.push('todo');
  }

  t.equal(utils.validateImportText(lines.join('\n')), 'Import file contains too many records');
  t.end();
});

t.test('valid import text remains allowed', function (t) {
  t.equal(utils.validateImportText('todo one\ntodo two'), null);
  t.end();
});
