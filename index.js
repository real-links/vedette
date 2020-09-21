const Sentry = require('@sentry/minimal');

module.exports = class Vedette {

  static captureException(err, additional = {}) {
    return (new Vedette(additional)).captureException(err);
  }
  static captureMessage(msg, additional = {}) {
    return (new Vedette(additional)).captureMessage(msg);
  }

  constructor({ tags = {}, user = {}, extra = {} } = {}) {
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

  populateSentryScope(scope) {
    this.breadcrumbs.reduce((s, crumb) => s.addBreadcrumb(crumb), scope);

    scope.setTags(this.tags);
    scope.setUser(this.user);
    scope.setExtras(this.extra);
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
