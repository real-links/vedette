/* eslint-env node, mocha */
const assert = require('assert');
const createError = require('http-errors');
const nock = require('nock');
const rewire = require('rewire');
const Sentry = require('@sentry/node');
const uuid = require('uuid/v4');

// Set a fake Sentry DSN & disable all network connections
// eslint-disable-next-line no-process-env
process.env.SENTRY_DSN = 'https://TestSentryIntegrationForVedette@sentry.io/11211';
nock.disableNetConnect();
nock('https://sentry.io:443')
  .persist()
  .post('/api/11211/store/')
  .reply(200, { id: uuid() });

function assertVedette(ved, { breadcrumbs = [], tags = {}, user = {}, extra = {}, level = null } = {}) {
  assert.deepStrictEqual(ved.breadcrumbs, breadcrumbs, 'Breadcrumbs array does not deepStrictEqual');
  assert.deepStrictEqual(ved.tags, tags, 'Tags object does not deepStrictEqual');
  assert.deepStrictEqual(ved.user, user, 'User object does not deepStrictEqual');
  assert.deepStrictEqual(ved.extra, extra, 'Extra object does not deepStrictEqual');
  assert.strictEqual(ved.level, level, 'Level string does not strictEqual');
}

describe('Vedette', () => {
  Sentry.init({ debug: true, defaultIntegrations: false });
  const Vedette = rewire('./index');

  it('should successfully run Sentry.captureException', () => {
    const err = createError(404, new Error('These are not the droids you are looking for, move along'), {
      code: 'DROIDS_NOT_FOUND',
    });
    Sentry.captureException(err);
  });

  it('should create a Vedette instance, setting relevant defaults', () => {
    assertVedette(new Vedette());
  });

  it('should create a Vedette instance, setting values on construction', () => {
    assertVedette(new Vedette({
      tags: { key: 'value' },
      user: { id: 'example-id' },
      extra: { key: 'value' },
    }), {
      tags: { key: 'value' },
      user: { id: 'example-id' },
      extra: { key: 'value' },
    });
  });

  describe('#breadcrumbs', () => {

    it('should add one breadcrumb', () => {
      const ved = new Vedette();

      const crumb = { type: 'info', message: 'This is the way.' };
      const timestamp = Math.floor(Date.now() / 1000);
      ved.addBreadcrumb(crumb);

      assertVedette(ved, { breadcrumbs: [ { timestamp, ...crumb } ] });
    });

    it('should add many breadcrumbs', () => {
      const ved = new Vedette();

      const breadcrumbs = [];

      for (let i = 3; i > 0; i -= 1) {
        const crumb = { timestamp: Math.floor(Date.now() / 1000) - i, type: 'info', message: `Crumb #${i}` };
        ved.addBreadcrumb(crumb);
        breadcrumbs.push(crumb);
      }

      assert.strictEqual(ved.breadcrumbs.length, breadcrumbs.length);
      assertVedette(ved, { breadcrumbs });
    });

    it('should clear any number of breadcrumbs added', () => {
      const ved = new Vedette();

      const breadcrumbs = [];

      for (let i = 5; i > 0; i -= 1) {
        const crumb = { timestamp: Math.floor(Date.now() / 1000) - i, type: 'info', message: `Crumb #${i}` };
        ved.addBreadcrumb(crumb);
        breadcrumbs.push(crumb);
      }

      assertVedette(ved, { breadcrumbs });

      ved.clearBreadcrumbs();
      assertVedette(ved, { breadcrumbs: [] });
    });

  });

  describe('#tags', () => {

    it('should add one tag', () => {
      const ved = new Vedette();
      ved.setTag('key', 'value');
      assertVedette(ved, { tags: { key: 'value' } });
    });

    it('should add many tags', () => {
      const ved = new Vedette();
      ved.setTags({ key1: 'value1', key2: 'value2', key3: 'value3' });
      assertVedette(ved, { tags: { key1: 'value1', key2: 'value2', key3: 'value3' } });
    });

  });

  describe('#user', () => {

    it('should add some user details', () => {
      const ved = new Vedette();
      ved.setUser({ id: 'some-id', ip_address: '127.0.0.1' });
      assertVedette(ved, { user: { id: 'some-id', ip_address: '127.0.0.1' } });
    });

  });

  describe('#extra', () => {

    it('should add one extra', () => {
      const ved = new Vedette();
      ved.setExtra('key', 'value');
      assertVedette(ved, { extra: { key: 'value' } });
    });

    it('should add many extras', () => {
      const ved = new Vedette();
      ved.setExtras({ key1: 'value1', key2: 'value2', key3: 'value3' });
      assertVedette(ved, { extra: { key1: 'value1', key2: 'value2', key3: 'value3' } });
    });

  });

  describe('#level', () => {

    it('should set the level', () => {
      const ved = new Vedette();
      ved.setLevel('warning');
      assertVedette(ved, { level: 'warning' });
    });

    it('should set then clear the level', () => {
      const ved = new Vedette();

      ved.setLevel('warning');
      assertVedette(ved, { level: 'warning' });

      ved.setLevel(1);
      assertVedette(ved, { level: null });

      ved.setLevel(null);
      assertVedette(ved, { level: null });
    });

  });

  describe('#populateSentryScope', () => {

    class FakeSentryScope {
      constructor() {
        Object.defineProperties(this, {
          breadcrumbs: {
            enumerable: true,
            writable: true,
            value: [],
          },
          tags: {
            enumerable: true,
            writable: true,
            value: {},
          },
          user: {
            enumerable: true,
            writable: true,
            value: {},
          },
          extra: {
            enumerable: true,
            writable: true,
            value: {},
          },
          level: {
            enumerable: true,
            writable: true,
            value: null,
          },
        });
      }
      addBreadcrumb(crumb) {
        this.breadcrumbs.push(crumb);
        return this;
      }
      setTags(tags) {
        this.tags = tags;
        return this;
      }
      setUser(user) {
        this.user = user;
        return this;
      }
      setExtras(extra) {
        this.extra = extra;
        return this;
      }
      setLevel(level) {
        this.level = level;
        return this;
      }
    }

    it('should populate the Sentry scope with an empty object', () => {
      const scope = new FakeSentryScope();
      const ved = new Vedette();
      ved.populateSentryScope(scope);
      assertVedette(scope);
    });

    it('should populate the Sentry scope with an full object', () => {
      const scope = new FakeSentryScope();
      const ved = new Vedette();

      const timestamp = Math.floor(Date.now() / 1000);
      ved.addBreadcrumb({ type: 'info', message: 'The Force will be with you, always' });
      ved.setTags({ tag1: 'value1' });
      ved.setUser({ id: 'some-id', ip_address: '127.0.0.1' });
      ved.setExtras({ extra1: 'value1' });
      ved.setLevel('warning');

      ved.populateSentryScope(scope);

      assertVedette(scope, {
        breadcrumbs: [ { timestamp, type: 'info', message: 'The Force will be with you, always' } ],
        tags: { tag1: 'value1' },
        user: { id: 'some-id', ip_address: '127.0.0.1' },
        extra: { extra1: 'value1' },
        level: 'warning',
      });
    });

    it('should drop `undefined` attributes when populating the Sentry scope', () => {
      const scope = new FakeSentryScope();
      const ved = new Vedette();

      const timestamp = Math.floor(Date.now() / 1000);
      ved.addBreadcrumb({ type: 'info', message: 'The Force will be with you, always' });
      ved.setTags({ tag1: 'value1', tag2: undefined, tag3: 'value3' });
      ved.setUser({ id: undefined, ip_address: '127.0.0.1' });
      ved.setExtras({ extra1: 'value1', extra2: undefined, extra3: 'value3' });

      ved.populateSentryScope(scope);

      assertVedette(scope, {
        breadcrumbs: [ { timestamp, type: 'info', message: 'The Force will be with you, always' } ],
        tags: { tag1: 'value1', tag3: 'value3' },
        user: { ip_address: '127.0.0.1' },
        extra: { extra1: 'value1', extra3: 'value3' },
      });
    });

  });

  describe('#captureException #captureMessage', () => {

    it('should send a Vedette-filled exception to Sentry', () => {
      const ved = new Vedette({
        tags: { tag1: 'value1' },
        user: { id: 'some-id', ip_address: '127.0.0.1' },
        extra: { extra1: 'value1' },
        level: 'fatal',
      });

      const err = createError(404, new Error('These are not the droids you are looking for, move along'), {
        code: 'DROIDS_NOT_FOUND',
      });

      ved.captureException(err);
    });

    it('should send a Vedette-filled message to Sentry', () => {
      const ved = new Vedette({
        tags: { tag1: 'value1' },
        user: { id: 'some-id', ip_address: '127.0.0.1' },
        extra: { extra1: 'value1' },
      });

      ved.captureMessage('This is the way');
    });

  });

  describe('.captureException .captureMessage', () => {

    it('should send a Vedette-filled exception to Sentry', () => {
      const err = createError(404, new Error('These are not the droids you are looking for, move along'), {
        code: 'DROIDS_NOT_FOUND',
      });

      Vedette.captureException(err);

      Vedette.captureException(err, {
        tags: { tag1: 'value1' },
        user: { id: 'some-id', ip_address: '127.0.0.1' },
        extra: { extra1: 'value1' },
      });
    });

    it('should send a Vedette-filled message to Sentry', () => {
      Vedette.captureMessage('This is the way');

      Vedette.captureMessage('This is the way', {
        tags: { tag1: 'value1' },
        user: { id: 'some-id', ip_address: '127.0.0.1' },
        extra: { extra1: 'value1' },
      });
    });

  });

  after(() => Sentry.flush(2000));
});
