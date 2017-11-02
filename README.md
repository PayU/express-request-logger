[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![MIT License][license-image]][license-url]

# express-request-logger
Middleware for logging request/responses in Express apps

## Supported features
- Logging request
- Logging response
- Mask request body fields
- Exclude logging specific headers
- Mask response body fields
- Exclude specific URLs from logging

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install express-requests-logger
```

## API

```js
var audit = require('express-requests-logger')
```

### audit(options)

Create an audit middleware with ther given `options`.

#### options

the `express-requests-logger` accepts the following properties in the options object.

#### logger

The logger to use for logging the request/response.
Package tested only with [bunyan](https://github.com/trentm/node-bunyan) logger, but should work with any logger which has a `info` method which takes an object.

#### doubleAudit

`true` - log once the request arrives (request details), and log after response is sent (both request and response). - Useful if there is a concern that the server will crash during the request and there is a need to log the request before it's processed.

`false` - log only after the response is sent.
#### excludeURLs

Array of strings - if the request url matches one of the values in the array, the request/response won't be logged.
For example: if there is a path `/v1/health` that we do not want to log, add:
```js
excludeURLs: ['health']
```
#### request

Specific configuration for requests
##### audit

Boolean - `true` - include request in audit, `false` - don't.
##### maskBody

Array of strings - pass the fields you wish to mask in the body of the requests (sensitive data like passwords, credit cards numbers etc..).

##### maskQuery

Array of strings - pass the fields you wish to mask in the query of the requests (sensitive data like passwords, credit cards numbers etc..).
##### excludeHeaders

Array of strings - pass the header names you wish to exclude from the audit (senstitive data like authorization headers etc..).

#### response

Specific configuration for responses

##### audit

Boolean - `true` - include response in audit, `false` - don't.

##### maskBody

Array of strings - pass the fields you wish to mask in the body of the responses (sensitive data like passwords, credit cards numbers etc..).

### Example

```js
app.use(audit({
    logger: logger, // Existing bunyan logger
    excludeURLs: [‘health’, ‘metrics’], // Exclude paths which enclude 'health' & 'metrics'
    request: {
        maskBody: [‘password’], // Mask 'password' field in incoming requests
        excludeHeaders: [‘authorization’] // Exclude 'authorization' header from requests
    },
    response: {
        maskBody: [‘session_token’] // Mask 'session_token' field in response body
    }
}));
```

[npm-image]: https://img.shields.io/npm/v/express-requests-logger.svg?style=flat
[npm-url]: https://npmjs.org/package/express-requests-logger
[travis-image]: https://travis-ci.org/ugolas/express-request-logger.svg?branch=master
[travis-url]: https://travis-ci.org/ugolas/express-request-logger
[coveralls-image]: https://coveralls.io/repos/github/ugolas/express-request-logger/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/ugolas/express-request-logger?branch=master
[downloads-image]: http://img.shields.io/npm/dm/express-requests-logger.svg?style=flat
[downloads-url]: https://npmjs.org/package/express-requests-logger
[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE
