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
- Exclude request body fields
- Exclude request specific headers
- Mask response body fields
- Exclude response body fields
- Exclude response specific headers
- Exclude specific URLs from logging
- Supported by Node v8 and above.

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

#### shouldSkipAuditFunc

Should be a function, that returns boolean value to indicate whether to skip the audit for the current request. Usually the logic should be around the request/response params. Useful to provide a custom logic for cases we would want to skip logging specific request.

The default implementation of the function returns false.

Example, skipping logging of all success responses:
```js
shouldSkipAuditFunc: function(req, res){
    let shouldSkip = false;
    if (res.statusCode === 200){
        // _bodyJson is added by this package
        if (res._bodyJson.result === "success"){
            shouldSkip = true;
        }
    }

    return shouldSkip;
}
```
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

##### excludeBody

Array of strings - pass the fields you wish to exclude in the body of the requests (sensitive data like passwords, credit cards numbers etc..).
`*` field - exclude all body

##### maskBody

Array of strings - pass the fields you wish to mask in the body of the requests (sensitive data like passwords, credit cards numbers etc..).

##### maskQuery

Array of strings - pass the fields you wish to mask in the query of the requests (sensitive data like passwords, credit cards numbers etc..).
##### excludeHeaders

Array of strings - pass the header names you wish to exclude from the audit (senstitive data like authorization headers etc..).
`*` field - exclude all headers

##### maskHeaders

Array of strings - pass the fields you wish to mask in the headers of the requests (senstitive data like authorization headers etc..).

 ##### maxBodyLength

 Restrict request body's logged content length (inputs other than positive integers will be ignored).

##### customMaskBodyFunc

 Additional to mask options, you can add your own functionality to mask request body. This function will execute 
 as a masking function before the package functions.
 The custom function gets the full express request and should return the masked body.

#### response

Specific configuration for responses

**Doesn't print headers for Node below v6.9.2**

**Non JSON responses are not masked, and are logged as is. This is deducted from the response header `content-type`**

##### audit

Boolean - `true` - include response in audit, `false` - don't.

##### excludeBody

Array of strings - pass the fields you wish to exclude in the body of the responses (sensitive data like passwords, credit cards numbers etc..).
`*` field - exclude all body

##### maskBody

Array of strings - pass the fields you wish to mask in the body of the responses (sensitive data like passwords, credit cards numbers etc..).

##### excludeHeaders

Array of strings - pass the header names you wish to exclude from the audit (senstitive data like authorization headers etc..).
`*` field - exclude all headers

##### maskHeaders

Array of strings - pass the fields you wish to mask in the headers of the responses (senstitive data like authorization headers etc..).

##### levels

Map of statusCodes to log levels. By default the audit is logged with level 'info'. It is possible to override it by configuration according to the statusCode of the response:
 
 - Key: status code, or status code group: '2xx', '401', etc.. First we try to match by exact match (for example 400), if no key found by exact match we fallback to match bu group (4xx).
 - Value: log level, valid values: 'trace', 'debug', 'info', 'warn', 'error'.
 - Configuration errors are ignored and the log is info by default.

 ##### maxBodyLength

 Restrict response body's logged content length (inputs other than positive integers will be ignored).

 
 Example:
```
levels: {
    "2xx":"info", // All 2xx responses are info
    "401":"warn", // 401 are warn
    "4xx':info", // All 4xx except 401 are info
    "503":"warn",
    "5xx":"error" // All 5xx except 503 are errors, 503 is warn,
}
```


### Example

```js
app.use(audit({
    logger: logger, // Existing bunyan logger
    excludeURLs: [‘health’, ‘metrics’], // Exclude paths which enclude 'health' & 'metrics'
    request: {
        maskBody: [‘password’], // Mask 'password' field in incoming requests
        excludeHeaders: [‘authorization’], // Exclude 'authorization' header from requests
        excludeBody: [‘creditCard’], // Exclude 'creditCard' field from requests body
        maskHeaders: [‘header1’], // Mask 'header1' header in incoming requests
        maxBodyLength: 50 // limit length to 50 chars + '...'
    },
    response: {
        maskBody: [‘session_token’] // Mask 'session_token' field in response body
        excludeHeaders: [‘*’], // Exclude all headers from responses,
        excludeBody: [‘*’], // Exclude all body from responses
        maskHeaders: [‘header1’], // Mask 'header1' header in incoming requests
        maxBodyLength: 50 // limit length to 50 chars + '...'
    },
    shouldSkipAuditFunc: function(req, res){
        // Custom logic here.. i.e: return res.statusCode === 200
        return false;
    }
}));
```

[npm-image]: https://img.shields.io/npm/v/express-requests-logger.svg?style=flat
[npm-url]: https://npmjs.org/package/express-requests-logger
[travis-image]: https://travis-ci.org/PayU/express-request-logger.svg?branch=master
[travis-url]: https://travis-ci.org/PayU/express-request-logger
[coveralls-image]: https://coveralls.io/repos/github/PayU/express-request-logger/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/PayU/express-request-logger?branch=master
[downloads-image]: http://img.shields.io/npm/dm/express-requests-logger.svg?style=flat
[downloads-url]: https://npmjs.org/package/express-requests-logger
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: https://opensource.org/licenses/Apache-2.0
[nsp-image]: https://nodesecurity.io/orgs/zooz/projects/ca2387c7-874c-4f5d-bd4e-0aa2874a1ae1/badge
[nsp-url]: https://nodesecurity.io/orgs/zooz/projects/ca2387c7-874c-4f5d-bd4e-0aa2874a1ae1
