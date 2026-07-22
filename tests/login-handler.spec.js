var tap = require('tap');
var mongoose = require('mongoose');

var originalModel = mongoose.model;
var todoModel = {};
var userModel = {
  findOne: function () {
    throw new Error('userModel.findOne stub was not configured');
  }
};

mongoose.model = function (name) {
  if (name === 'Todo') {
    return todoModel;
  }

  if (name === 'User') {
    return userModel;
  }

  throw new Error('Unexpected model requested: ' + name);
};

var routes = require('../routes');
mongoose.model = originalModel;

function createResponse() {
  return {
    statusCode: 200,
    sent: false,
    redirectedTo: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    send: function () {
      this.sent = true;
      return this;
    },
    redirect: function (location) {
      this.redirectedTo = location;
      return this;
    }
  };
}

tap.test('loginHandler rejects non-string password values before querying MongoDB', function (t) {
  var queried = false;

  userModel.findOne = function () {
    queried = true;
  };

  var req = {
    body: {
      username: 'admin@snyk.io',
      password: { '$gt': '' }
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(queried, false, 'does not pass operator objects into a query');
  t.equal(res.statusCode, 401, 'returns unauthorized');
  t.equal(res.sent, true, 'sends the unauthorized response');
  t.end();
});

tap.test('loginHandler authenticates with a normalized username lookup and string password comparison', function (t) {
  userModel.findOne = function (query, callback) {
    t.same(query, { username: 'admin@snyk.io' }, 'queries by normalized username only');
    callback(null, {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword'
    });
  };

  var req = {
    body: {
      username: '  ADMIN@SNYK.IO  ',
      password: 'SuperSecretPassword'
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(req.session.loggedIn, 1, 'marks the session as logged in');
  t.equal(res.redirectedTo, '/admin', 'redirects to the admin page');
  t.end();
});

tap.test('loginHandler rejects incorrect passwords for an existing user', function (t) {
  userModel.findOne = function (query, callback) {
    t.same(query, { username: 'admin@snyk.io' }, 'still queries by username only');
    callback(null, {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword'
    });
  };

  var req = {
    body: {
      username: 'admin@snyk.io',
      password: 'WrongPassword'
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(req.session.loggedIn, undefined, 'does not log the session in');
  t.equal(res.statusCode, 401, 'returns unauthorized');
  t.equal(res.sent, true, 'sends the unauthorized response');
  t.end();
});

tap.test('loginHandler ignores unsafe redirect targets after successful authentication', function (t) {
  userModel.findOne = function (query, callback) {
    t.same(query, { username: 'admin@snyk.io' }, 'queries by username only');
    callback(null, {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword'
    });
  };

  var req = {
    body: {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword',
      redirectPage: 'https://evil.example/phish'
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(req.session.loggedIn, 1, 'still logs the valid user in');
  t.equal(res.redirectedTo, '/admin', 'falls back to the default in-app destination');
  t.end();
});
