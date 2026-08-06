var t = require('tap');
var childProcess = require('child_process');
var mongoose = require('mongoose');

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader: function (name, value) {
      this.headers[name] = value;
    },
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    send: function (body) {
      this.body = body;
      return this;
    },
  };
}

function loadRoutes(execFileStub) {
  var originalExecFile = childProcess.execFile;
  var originalModel = mongoose.model;
  var savedTodoContent;

  function Todo(doc) {
    this.content = doc.content;
    this.updated_at = doc.updated_at;
  }

  Todo.prototype.save = function (cb) {
    savedTodoContent = this.content;
    cb(null, { content: this.content }, 1);
  };

  function User() {}

  User.find = function (query, cb) {
    cb(null, []);
  };

  childProcess.execFile = execFileStub;
  mongoose.model = function (name) {
    if (name === 'Todo') {
      return Todo;
    }

    if (name === 'User') {
      return User;
    }

    return originalModel.apply(this, arguments);
  };

  delete require.cache[require.resolve('../routes/index')];
  var routes = require('../routes/index');

  return {
    routes: routes,
    getSavedTodoContent: function () {
      return savedTodoContent;
    },
    restore: function () {
      childProcess.execFile = originalExecFile;
      mongoose.model = originalModel;
      delete require.cache[require.resolve('../routes/index')];
    },
  };
}

t.test('create saves markdown image todos without spawning child processes', function (t) {
  var execCalls = [];
  var loaded = loadRoutes(function () {
    execCalls.push([].slice.call(arguments));
  });

  var content = '![alt text](https://example.com/image.png "demo")';
  var res = createResponse();

  loaded.routes.create({ body: { content: content } }, res, function (err) {
    t.error(err);
  });

  t.equal(execCalls.length, 0, 'does not invoke external image inspection');
  t.equal(loaded.getSavedTodoContent(), content, 'saves the original todo content');
  t.equal(res.headers.Location, '/', 'preserves redirect location');
  t.equal(res.statusCode, 302, 'preserves redirect status');
  t.equal(res.body, content, 'returns the saved content');
  loaded.restore();
  t.end();
});

t.test('create rejects unsafe markdown image URLs instead of executing them', function (t) {
  var execCalls = [];
  var loaded = loadRoutes(function () {
    execCalls.push([].slice.call(arguments));
  });

  var content = '![alt text](https://example.com/image.png|id "demo") in 2 days';
  var res = createResponse();

  loaded.routes.create({ body: { content: content } }, res, function (err) {
    t.error(err);
  });

  t.equal(execCalls.length, 0, 'does not invoke identify for an unsafe URL');
  t.equal(loaded.getSavedTodoContent(), content, 'does not alter image markdown content when skipping inspection');
  t.equal(res.statusCode, 302, 'preserves redirect status');
  t.equal(res.body, content, 'returns the saved content');
  loaded.restore();
  t.end();
});
