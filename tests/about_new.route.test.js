const t = require('tap');
const mongoose = require('mongoose');

function loadRoutes() {
  const originalModel = mongoose.model;
  const routesPath = require.resolve('../routes/index.js');

  mongoose.model = function (name) {
    if (name === 'Todo' || name === 'User') {
      return function FakeModel() {};
    }

    return originalModel.apply(this, arguments);
  };

  delete require.cache[routesPath];

  return {
    routes: require('../routes/index.js'),
    restore() {
      delete require.cache[routesPath];
      mongoose.model = originalModel;
    },
  };
}

function renderAboutNew(query) {
  const loaded = loadRoutes();
  let rendered;

  try {
    loaded.routes.about_new(
      { query: query },
      {
        render(view, context) {
          rendered = { view: view, context: context };
        },
      }
    );

    return rendered;
  } finally {
    loaded.restore();
  }
}

t.test('about_new marks Desktop requests with a safe boolean flag', function (t) {
  const rendered = renderAboutNew({ device: 'Desktop' });

  t.equal(rendered.view, 'about_new.dust');
  t.equal(rendered.context.device, 'Desktop');
  t.equal(rendered.context.isDesktop, true);
  t.end();
});

t.test('about_new keeps Mobile as a scalar value without enabling desktop mode', function (t) {
  const rendered = renderAboutNew({ device: 'Mobile' });

  t.equal(rendered.context.device, 'Mobile');
  t.equal(rendered.context.isDesktop, false);
  t.end();
});

t.test('about_new drops non-allowlisted device values', function (t) {
  const rendered = renderAboutNew({
    device: "Desktop'-require('child_process').exec('id')-'",
  });

  t.equal(rendered.context.device, undefined);
  t.equal(rendered.context.isDesktop, false);
  t.end();
});

t.test('about_new rejects array device values', function (t) {
  const rendered = renderAboutNew({ device: ['Desktop'] });

  t.equal(rendered.context.device, undefined);
  t.equal(rendered.context.isDesktop, false);
  t.end();
});
