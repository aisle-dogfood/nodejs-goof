const t = require('tap');
const mongoose = require('mongoose');

if (!mongoose.models.Todo) {
  mongoose.model('Todo', new mongoose.Schema({}));
}

if (!mongoose.models.User) {
  mongoose.model('User', new mongoose.Schema({
    username: String,
    password: String,
  }));
}

const User = mongoose.model('User');

delete require.cache[require.resolve('../routes/index.js')];
const routes = require('../routes/index.js');

function createResponse() {
  return {
    statusCode: null,
    redirectedTo: null,
    sent: false,
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

t.test('loginHandler rejects object passwords before querying MongoDB', function (t) {
  var queryExecuted = false;
  User.findOne = function () {
    queryExecuted = true;
  };

  var req = {
    body: {
      username: 'admin@snyk.io',
      password: { $ne: null }
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(queryExecuted, false, 'no database query is made for object passwords');
  t.equal(res.statusCode, 401, 'request is rejected');
  t.equal(res.sent, true, 'response is sent');
  t.equal(req.session.loggedIn, undefined, 'session is not authenticated');
  t.end();
});

t.test('loginHandler authenticates with literal string credentials', function (t) {
  User.findOne = function (query, callback) {
    t.same(query, {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword'
    }, 'query uses literal string values');

    callback(null, { username: query.username });
  };

  var req = {
    body: {
      username: 'admin@snyk.io',
      password: 'SuperSecretPassword'
    },
    session: {}
  };
  var res = createResponse();

  routes.loginHandler(req, res, function (err) {
    t.error(err);
  });

  t.equal(req.session.loggedIn, 1, 'session is authenticated');
  t.equal(res.redirectedTo, '/admin', 'successful login redirects to the admin page');
  t.end();
});
