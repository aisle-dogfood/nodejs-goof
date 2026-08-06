const t = require('tap');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

if (!mongoose.models.Todo) {
  mongoose.model('Todo', new mongoose.Schema({}));
}

if (!mongoose.models.User) {
  mongoose.model('User', new mongoose.Schema({}));
}

const routes = require('../routes');

t.test('about_new marks Desktop requests using a trusted boolean', function (t) {
  let renderedView;
  let renderedLocals;

  routes.about_new({ query: { device: 'Desktop' } }, {
    render: function (view, locals) {
      renderedView = view;
      renderedLocals = locals;
    }
  });

  t.equal(renderedView, 'about_new.dust');
  t.equal(renderedLocals.device, 'Desktop');
  t.equal(renderedLocals.isDesktop, true);
  t.end();
});

t.test('about_new does not trust non-string device query values', function (t) {
  let renderedLocals;

  routes.about_new({ query: { device: ['Desktop'] } }, {
    render: function (view, locals) {
      renderedLocals = locals;
    }
  });

  t.equal(renderedLocals.device, '');
  t.equal(renderedLocals.isDesktop, false);
  t.end();
});

t.test('about_new template does not embed request data in a Dust cond expression', function (t) {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'about_new.dust'), 'utf8');

  t.notMatch(template, /\{@if\s+cond=/);
  t.match(template, /\{#isDesktop\}/);
  t.end();
});
