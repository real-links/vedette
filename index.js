const Sentry = require('@sentry/minimal');

const ALLOWED_LEVELS = [ 'critical', 'fatal', 'error', 'warning', 'info', 'log', 'debug' ];

module.exports = class Vedette {

  static captureException(err, additional = {}) {
    return (new Vedette(additional)).captureException(err);
  }
  static captureMessage(msg, additional = {}) {
    return (new Vedette(additional)).captureMessage(msg);
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

  populateSentryScope(scope) {
    this.breadcrumbs.reduce((s, crumb) => s.addBreadcrumb(crumb), scope);

    scope.setTags(JSON.parse(JSON.stringify(this.tags)));
    scope.setUser(JSON.parse(JSON.stringify(this.user)));
    scope.setExtras(JSON.parse(JSON.stringify(this.extra)));

    if (typeof this.level === 'string' && ALLOWED_LEVELS.includes(this.level)) {
      scope.setLevel(this.level);
    }
  }

  captureException(...args) {
    Sentry.withScope(scope => {
      this.populateSentryScope(scope);
      Sentry.captureException(...args);
    });
    return this;
  }

  captureMessage(...args) {
    Sentry.withScope(scope => {
      this.populateSentryScope(scope);
      Sentry.captureMessage(...args);
    });
    return this;
  }

};
