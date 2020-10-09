const Sentry = require('@sentry/minimal');

const ALLOWED_LEVELS = [ 'critical', 'fatal', 'error', 'warning', 'info', 'log', 'debug' ];

module.exports = class Vedette {

  static captureException(err, additional = null) {
    return (new Vedette()).captureException(err, additional);
  }
  static captureMessage(msg, additional = null) {
    return (new Vedette()).captureMessage(msg, additional);
  }

  constructor({ tags = {}, user = {}, extra = {}, level = null } = {}) {
    Object.defineProperties(this, {
      breadcrumbs: {
        enumerable: true,
        writable: true,
        value: [],
      },
      tags: {
        enumerable: true,
        writable: true,
        value: tags,
      },
      user: {
        enumerable: true,
        writable: true,
        value: user,
      },
      extra: {
        enumerable: true,
        writable: true,
        value: extra,
      },
      level: {
        enumerable: true,
        writable: true,
        value: typeof level === 'string' ? level : null,
      },
    });
  }

  addBreadcrumb(crumb) {
    const timestamp = Math.floor(Date.now() / 1000);
    this.breadcrumbs.push({ timestamp, ...crumb });
    return this;
  }
  clearBreadcrumbs() {
    this.breadcrumbs = [];
    return this;
  }

  setTag(key, value) {
    this.tags[key] = value;
    return this;
  }
  setTags(tags) {
    this.tags = { ...this.tags, ...tags };
    return this;
  }

  setUser(user) {
    this.user = { ...this.user, ...user };
    return this;
  }

  setExtra(key, value) {
    this.extra[key] = value;
    return this;
  }
  setExtras(extra) {
    this.extra = { ...this.extra, ...extra };
    return this;
  }

  setLevel(level) {
    this.level = typeof level === 'string' ? level : null;
    return this;
  }

  populateSentryScope(scope, additional = null) {
    this.breadcrumbs.reduce((s, crumb) => s.addBreadcrumb(crumb), scope);

    const { tags, user, extra, level } = { ...additional };
    scope.setTags(JSON.parse(JSON.stringify({ ...this.tags, ...tags })));
    scope.setUser(JSON.parse(JSON.stringify({ ...this.user, ...user })));
    scope.setExtras(JSON.parse(JSON.stringify({ ...this.extra, ...extra })));

    if (typeof (this.level || level) === 'string' && ALLOWED_LEVELS.includes(this.level || level)) {
      scope.setLevel(this.level || level);
    }
  }

  captureException(err, additional = null) {
    Sentry.withScope(scope => {
      this.populateSentryScope(scope, additional);
      Sentry.captureException(err);
    });
    return this;
  }

  captureMessage(message, additional = null) {
    Sentry.withScope(scope => {
      this.populateSentryScope(scope, additional);
      Sentry.captureMessage(message);
    });
    return this;
  }

};
