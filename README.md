# vedette

[![npm](https://badge.fury.io/js/vedette.svg)](https://npm.im/vedette)
[![actions](https://github.com/someimportantcompany/vedette/workflows/Test/badge.svg?event=push)](https://github.com/someimportantcompany/vedette/actions?query=branch%3Amaster)

Self-managed scope management for [@sentry/node](https://npm.im/@sentry/node).

> **Vedette:** A mounted sentry positioned beyond an army's outposts to observe the movements of the enemy.

```js
const Sentry = require('@sentry/node');
const Vedette = require('vedette');

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
});

const ved = new Vedette();

ved.setTag('hostname', 'localhost');
ved.setTags({ method: 'POST', endpoint: '/api' });

ved.setUser({ id: '11211', ip_address: '127.0.0.1' });

ved.setExtra('requestID', 'f05991fd-8719-4dd5-8e2e-a70c0ef0efbe');
ved.setExtras({ code: 'DROIDS_NOT_FOUND' });

ved.captureException(new Error('These are not the droids you are looking for, move along'));
ved.captureMessage('These are not the droids you are looking for, move along');
```

## Installation

```
$ npm install --save vedette
```

## Why?

Currently, [@sentry/node](https://npm.im/@sentry/node) doesn't appear to allow you to pass a scope as an argument, instead [continuing to use](https://github.com/getsentry/sentry-javascript/issues/1294) [the deprecated domains module](https://github.com/getsentry/raven-node/issues/264). They have their (good) reasons, however they still could allow scopes to be portable for those that don't want to use domains in their code.

This library attempts to solve this by wrapping around the default scope functions & calling `withScope` before `captureException`/`captureMessage` to include all your locally-set properties. This is designed to work in request/response or GraphQL environments, however it's relatively agnostic & can be used anywhere.

## API

### Instance Methods

```js
const ved = new Vedette();
```

#### ved.addBreadcrumb

```js
ved.addBreadcrumb({
  level: 'info',
  message: 'These are not the droids you are looking for, move along',
});
```

Passes breadcrumbs to [`Sentry.addBreadcrumb`](https://docs.sentry.io/enriching-error-data/breadcrumbs/?platform=node).

#### ved.clearBreadcrumbs

```js
ved.clearBreadcrumbs();
```

Clears all the [breadcrumbs]((https://docs.sentry.io/enriching-error-data/breadcrumbs/?platform=node)) stored so far.

#### ved.setTag

```js
ved.setTag('key', 'value');
```

Set [one tag](https://docs.sentry.io/enriching-error-data/context/?platform=node#tagging-events).

#### ved.setTags

```js
ved.setTags({
  key1: 'value1',
  key2: 'value2',
});
```

Set [multiple tags](https://docs.sentry.io/enriching-error-data/context/?platform=node#tagging-events).

#### ved.setUser

```js
ved.setUser({
  id: '11211',
  ip_address: '127.0.0.1',
});
```

Set [the user properties](https://docs.sentry.io/enriching-error-data/context/?platform=node#capturing-the-user).

#### ved.setExtra

```js
ved.setExtra('key', 'value');
```

Set [one extra property](https://docs.sentry.io/enriching-error-data/context/?platform=node#extra-context).

#### ved.setExtras

```js
ved.setExtras({
  key1: 'value1',
  key2: 'value2',
});
```

Set [multiple extra properties](https://docs.sentry.io/enriching-error-data/context/?platform=node#extra-context).

#### ved.populateSentryScope

```js
ved.populateSentryScope(scope);
```

Transfer the breadcrumbs, tags, user & extra data to the Sentry scope.

#### ved.captureException

```js
ved.captureException(new Error('These are not the droids you are looking for, move along'));
```

Capture an exception, transferring the breadcrumbs, tags, user & extra data to the Sentry scope before sending.

#### ved.captureMessage

```js
ved.captureMessage('These are not the droids you are looking for, move along');
```

Capture a message, transferring the breadcrumbs, tags, user & extra data to the Sentry scope before sending.

### Static Methods

For convenience, there are some static methods to complete common scenarios.

#### Vedette.captureException

```js
Vedette.captureException(new Error('These are not the droids you are looking for, move along'));

Vedette.captureException(new Error('These are not the droids you are looking for, move along'), {
  tags: { tag1: 'value1' },
  user: { id: '11211' },
  extra: { extra2: 'value2' },
});
```

Capture an exception, optionally throwing some tags, user & extra data into the mix in one function call.

#### Vedette.captureMessage

```js
Vedette.captureMessage('These are not the droids you are looking for, move along');

Vedette.captureMessage('These are not the droids you are looking for, move along', {
  tags: { tag1: 'value1' },
  user: { id: '11211' },
  extra: { extra2: 'value2' },
});
```

Capture a message, optionally throwing some tags, user & extra data into the mix in one function call.

## Examples

### Express Example

```js
const assert = require('http-assert');
const bodyParser = require('body-parser');
const express = require('express');
const Sequelize = require('sequelize');
const Sentry = require('@sentry/node');
const Vedette = require('vedette');

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
});

const app = express();
const sequel = new Sequelize('project', 'root', 'password', {
  host: '127.0.0.1',
  dialect: 'mysql',
});
const users = sequel.import('./UserModel');

app.use(bodyParser.json({ limit: '1mb' }));

app.use((req, res, next) => {
  req.ved = new Vedette();
  next();
});

app.get('/droids', function (req, res, next) {
  throw new Error('These are not the droids you are looking for, move along');
});

app.use((err, req, res, next) => {
  req.ved = req.ved || new Vedette();

  req.ved.setTags({
    method: req.method,
    path: req.route.path,
  });

  req.ved.captureException(err);

  res.status(err.status || 500).json(`${err}`);
})

app.listen(8080, () => console.log('🚀  Server ready at http://localhost:3000/'));
```

### GraphQL Example

```js
const Sentry = require('@sentry/node');
const Vedette = require('vedette');
const { ApolloServer, gql } = require('apollo-server');

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
});

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [ Book ]
  }
`;

const resolvers = {
  Query: {
    books(parent, args, ctx) {
      ctx.ved.addBreadcrumb({ message: 'Hit the books query' });

      throw new Error('These are not the droids you are looking for, move along');

      return [
        {
          title: 'Harry Potter and the Chamber of Secrets',
          author: 'J.K. Rowling',
        },
        {
          title: 'Jurassic Park',
          author: 'Michael Crichton',
        },
      ];
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context() {
    return {
      ved: new Vedette(),
    };
  },
  formatResponse(result, info) {
    const { context: ctx } = info;

    if (result.errors) {
      result.errors = result.errors.forEach(err => {
        if (err.originalError) {
          (ctx.ved || Vedette).captureException(err.originalError);
        } else {
          (ctx.ved || Vedette).captureException(err);
        }
      });
    }

    return result;
  },
});

server.listen().then(({ url }) => console.log(`🚀  Server ready at ${url}`));
```

### AWS Lambda Example

```js
const Sentry = require('@sentry/node');
const Vedette = require('vedette');

Sentry.init({
  environment: process.env.NODE_ENV || 'development',
});

module.exports.handler1 = function handler1(event, context, callback) {
  const ved = new Vedette();

  try {
    throw new Error('These are not the droids you are looking for, move along');
    callback();
  } catch (err) {
    // Capture the exception
    ved.captureException(err);
    // Push the exception to Sentry before Lambda finishes
    await Sentry.flush(2000);
    // Trigger the callback
    callback(err);
  }
};

module.exports.handler2 = function handler2(event, context, callback) {
  try {
    throw new Error('These are not the droids you are looking for, move along');
    callback();
  } catch (err) {
    // Capture the exception
    ved.captureException(err);
    // Push the exception to Sentry before Lambda finishes
    await Sentry.flush(2000);
    // Trigger the callback
    callback(err);
  }
};
```
