var mongoose = require('mongoose');
var cfenv = require("cfenv");
var Schema = mongoose.Schema;

var Todo = new Schema({
  content: Buffer,
  updated_at: Date,
});

mongoose.model('Todo', Todo);

var User = new Schema({
  username: String,
  password: String,
});

mongoose.model('User', User);

// CloudFoundry env vars
var mongoCFUri = cfenv.getAppEnv().getServiceURL('goof-mongo');
// SECURITY FIX: Removed logging of full CloudFoundry environment object
// The cfenv.getAppEnv() object contains sensitive data including service credentials,
// API keys, and configuration secrets. Logging this data exposes it to anyone with
// access to application logs, which could lead to unauthorized access to services.

// Default Mongo URI is local
const DOCKER = process.env.DOCKER
if (DOCKER === '1') {
  var mongoUri = 'mongodb://goof-mongo/express-todo';
} else {
  var mongoUri = 'mongodb://localhost/express-todo';
}


// CloudFoundry Mongo URI
if (mongoCFUri) {
  mongoUri = mongoCFUri;
} else if (process.env.MONGOLAB_URI) {
  // Generic (plus Heroku) env var support
  mongoUri = process.env.MONGOLAB_URI;
} else if (process.env.MONGODB_URI) {
  // Generic (plus Heroku) env var support
  mongoUri = process.env.MONGODB_URI;
}

// SECURITY FIX: Redact credentials from MongoDB URI before logging
// MongoDB connection strings follow the format: mongodb://username:password@host
// Logging the full URI would expose database credentials in application logs.
// This function sanitizes the URI by replacing credentials with asterisks.
function redactUri(uri) {
  if (!uri) return uri;
  try {
    // Replace credentials in mongodb://username:password@host format
    return uri.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
  } catch (e) {
    // If redaction fails for any reason, hide the entire URI to prevent credential exposure
    return '[REDACTED]';
  }
}

console.log("Using Mongo URI " + redactUri(mongoUri));

mongoose.connect(mongoUri);

User = mongoose.model('User');
User.find({ username: 'admin@snyk.io' }).exec(function (err, users) {
  console.log(users);
  if (users.length === 0) {
    console.log('no admin');
    new User({ username: 'admin@snyk.io', password: 'SuperSecretPassword' }).save(function (err, user, count) {
      if (err) {
        console.log('error saving admin user');
      }
    });
  }
});