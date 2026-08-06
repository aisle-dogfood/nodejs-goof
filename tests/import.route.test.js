const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const mongoose = require('mongoose');

const savedTodos = [];
const originalModel = mongoose.model;

function FakeTodo(doc) {
  Object.assign(this, doc);
}

FakeTodo.prototype.save = function (cb) {
  savedTodos.push(this.content);
  if (cb) {
    cb(null, this, 1);
  }
};

mongoose.model = function (name) {
  if (name === 'Todo') {
    return FakeTodo;
  }

  if (name === 'User') {
    return function FakeUser() {};
  }

  return originalModel.apply(this, arguments);
};

const routes = require('../routes/index');
mongoose.model = originalModel;

test.after(function () {
  delete require.cache[require.resolve('../routes/index')];
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    redirectedTo: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    send: function (body) {
      this.body = body;
      return this;
    },
    redirect: function (location) {
      this.redirectedTo = location;
      return this;
    }
  };
}

function callImportRoute(fileBuffer) {
  return new Promise(function (resolve, reject) {
    const req = {
      files: {
        importFile: {
          data: fileBuffer
        }
      }
    };
    const res = createResponse();
    const originalSend = res.send;
    const originalRedirect = res.redirect;

    res.send = function (body) {
      originalSend.call(this, body);
      resolve(this);
      return this;
    };

    res.redirect = function (location) {
      originalRedirect.call(this, location);
      resolve(this);
      return this;
    };

    savedTodos.length = 0;

    try {
      routes.import(req, res, function (err) {
        if (err) {
          reject(err);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

test('imports a safe top-level backup.txt from a ZIP upload', async function () {
  const zip = new AdmZip();
  zip.addFile('backup.txt', Buffer.from('Buy milk\n'));

  const res = await callImportRoute(zip.toBuffer());

  assert.equal(res.statusCode, 200);
  assert.equal(res.redirectedTo, '/');
  assert.deepEqual(savedTodos, ['Buy milk']);
});

test('rejects ZIP uploads with traversal entry paths', async function () {
  const maliciousZip = fs.readFileSync(path.join(__dirname, '..', 'exploits', 'zip-slip', 'malicious_backup.zip'));

  const res = await callImportRoute(maliciousZip);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body, 'Invalid zip file uploaded');
  assert.equal(res.redirectedTo, null);
  assert.deepEqual(savedTodos, []);
});

test('rejects highly compressed ZIP uploads that exceed archive limits', async function () {
  const zip = new AdmZip();
  zip.addFile('backup.txt', Buffer.alloc(256 * 1024, 'a'));

  const res = await callImportRoute(zip.toBuffer());

  assert.equal(res.statusCode, 400);
  assert.equal(res.body, 'Invalid zip file uploaded');
  assert.equal(res.redirectedTo, null);
  assert.deepEqual(savedTodos, []);
});
