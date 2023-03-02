'use strict';

var _ = require('lodash'),
    logger = require('bunyan').createLogger({ name: 'ExpressLogger' }),
    loggerHelper = require('./logger-helper'),
    setupOptions,
    flatten = require('flat');

var audit = function (req, res, next) {
    var oldWrite = res.write;
    var oldEnd = res.end;
    var oldJson = res.json;
    var chunks = [];

    // Log start time of request processing
    req.timestamp = new Date();

    if (setupOptions.doubleAudit) {
        loggerHelper.auditRequest(req, setupOptions);
    }

    res.write = function (chunk) {
        chunks.push(Buffer.from(chunk));
        oldWrite.apply(res, arguments);
    };

    // decorate response#json method from express
    res.json = function (bodyJson) {
        res._bodyJson = bodyJson;
        oldJson.apply(res, arguments);
    };

    // decorate response#end method from express
    res.end = function (chunk) {
        res.timestamp = new Date();
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }

        res._bodyStr = Buffer.concat(chunks).toString('utf8');

        // call to original express#res.end()
        oldEnd.apply(res, arguments);
        loggerHelper.auditResponse(req, res, setupOptions);
    };

    next();
};

module.exports = function (options) {
    options = options || {};
    var defaults = {
        logger: logger,
        request: {
            audit: true,
            maskBody: [],
            maskQuery: [],
            maskHeaders: [],
            excludeBody: [],
            excludeHeaders: []
        },
        response: {
            audit: true,
            maskBody: [],
            maskHeaders: [],
            excludeBody: [],
            excludeHeaders: []
        },
        doubleAudit: false,
        excludeURLs: [],
        levels: {
            '2xx': 'info',
            '3xx': 'info',
            '4xx': 'info',
            '5xx': 'error'
        },
        shouldSkipAuditFunc: function(req, res){
            return false;
        }
    };

    _.defaultsDeep(options, defaults);
    setupOptions = validateArrayFields(options, defaults);
    setBodyLengthFields(setupOptions);
    return audit;
};

// Convert all options fields that need to be array by default
function validateArrayFields(options, defaults) {
    let defaultsCopy = Object.assign({}, defaults);
    delete defaultsCopy.logger;

    Object.keys(flatten(defaultsCopy)).forEach((key) => {
        let optionValue = _.get(options, key);
        let defaultValue = _.get(defaultsCopy, key)
        if (_.isArray(defaultValue) && !_.isArray(optionValue)) {
            // throw error - wrong type passed
            let errMsg = `Invalid value specified for field: ${key}, expected array`;
            throw new Error(errMsg);
        }
    });

    return options;
}

function setBodyLengthFields(options) {
    const isValid = field => field && !isNaN(field) && field > 0;
    options.request.maxBodyLength = !isValid(options.request.maxBodyLength) ? undefined : options.request.maxBodyLength;
    options.response.maxBodyLength = !isValid(options.response.maxBodyLength) ? undefined : options.response.maxBodyLength;
}