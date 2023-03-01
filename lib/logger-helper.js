'use strict';

var utils = require('./utils');
var _ = require('lodash');
var ALL_FIELDS = '*';
const NA = 'N/A';
const DEFAULT_LOG_LEVEL = 'info';
const START = 'start';
const END = 'end';

var auditRequest = function (req, options) {
    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);

    if (shouldAudit) {
        var request;

        if (options.setupFunc) {
            options.setupFunc(req, res);
        }

        if (options.request.audit) {
            request = getRequestAudit(req, options);
        }

        var auditObject = {
            request: request,
            'millis-timestamp': Date.now(),
            'utc-timestamp': new Date().toISOString(),
            stage: START
        };

        // Add additional audit fields
        if (req && req.additionalAudit) {
            auditObject = Object.assign(auditObject, req.additionalAudit);
        }

        options.logger.info(auditObject, 'Inbound Transaction');
    }
};

var auditResponse = function (req, res, options) {
    var request;
    var response;

    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);
    let shouldSkipAuditCustomConditions = options.shouldSkipAuditFunc ? options.shouldSkipAuditFunc(req, res) : false;
    if (shouldAudit && !shouldSkipAuditCustomConditions) {
        if (options.setupFunc) {
            options.setupFunc(req, res);
        }

        if (options.request.audit) {
            request = getRequestAudit(req, options);
        }

        if (options.response.audit) {
            response = getResponseAudit(req, res, options);
        }

        var auditObject = {
            response: response,
            request: request,
            'millis-timestamp': Date.now(),
            'utc-timestamp': new Date().toISOString(),
            stage: END
        };

        // Add additional audit fields
        if (req && req.additionalAudit) {
            auditObject = Object.assign(auditObject, req.additionalAudit);
        }

        let level = DEFAULT_LOG_LEVEL; // Default
        if (res) {
            // Make sure the resolved log level is supported by our logger:
            let resolvedLogLevel = utils.getLogLevel(res.statusCode, options.levels);
            level = options.logger[resolvedLogLevel] ? resolvedLogLevel : level;
        }
        options.logger[level](auditObject, 'Inbound Transaction');
    }
};

function getRequestAudit(req, options) {
    var headers = _.get(req, 'headers');
    var requestFullURL = utils.getUrl(req);
    var requestRoute = utils.getRoute(req);
    var queryParams = req && req.query !== {} ? req.query : NA;
    var method = req && req.method ? req.method : NA;
    var URLParams = req && req.params ? req.params : NA;
    var timestamp = req && req.timestamp ? req.timestamp.toISOString() : NA;
    var timestamp_ms = req && req.timestamp ? req.timestamp.valueOf() : NA;
    var requestBody = _.get(req, 'body');  //handle body clone the original body

    if (options.request.customMaskBodyFunc) {
        requestBody = options.request.customMaskBodyFunc(req);
    }

    if (isJsonBody(headers)) {
        requestBody = handleJson(requestBody, options.logger, options.request.excludeBody, options.request.maskBody);
    }

    queryParams = getMaskedQuery(queryParams, options.request.maskQuery);

    headers = handleJson(headers, options.logger, options.request.excludeHeaders, options.request.maskHeaders);

    var auditObject = {
        method: method,
        url_params: URLParams,
        url: requestFullURL,
        url_route: requestRoute,
        query: queryParams,
        headers: _.isEmpty(headers) ? NA : headers,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        body: utils.getBodyStr(requestBody, options.request.maxBodyLength)
    };

    return auditObject;
}

function handleResponseJson(objJson, objStr, logger, excludeFields, maskFields) {
    let result;
    if (shouldBeParsed(maskFields, excludeFields)) {
        result = objJson || objStr
    } else {
        result = objStr || objJson
    }
    return handleJson(result, logger, excludeFields, maskFields);
}

function handleJson(obj, logger, excludeFields, maskFields) {

    let result = obj;
    if (_.includes(excludeFields, ALL_FIELDS)) {
        result = undefined;
    }
    else if (obj) {
        if (shouldBeParsed(maskFields, excludeFields)) {
            try {
                let jsonObj;
                if (typeof obj === 'string') {
                    jsonObj = JSON.parse(obj);
                }
                else if (typeof obj !== 'object') {
                    throw new Error('only json obj can be exclude/masked');
                } else {
                    jsonObj = obj;
                }
                //order is important because body is clone first
                let maskedClonedObj = utils.maskJson(jsonObj, maskFields);
                result = utils.cleanOmitKeys(maskedClonedObj, excludeFields);
            } catch (err) {
                logger.warn({
                    error: {
                        message: err.message,
                        stack: err.stack
                    }
                }, 'Error parsing json');
                result = undefined;
            }
        }
    }
    return result;
}

function shouldBeParsed(maskFields, excludeFields) {
    return !_.includes(excludeFields, ALL_FIELDS) && (!_.isEmpty(maskFields) || !_.isEmpty(excludeFields));
}

function getResponseAudit(req, res, options) {
    var headers = res && 'function' === typeof res.getHeaders ? res.getHeaders() : _.get(res, '_headers');
    var elapsed = req && res ? res.timestamp - req.timestamp : 0;
    var timestamp = res && res.timestamp ? res.timestamp.toISOString() : NA;
    var timestamp_ms = res && res.timestamp ? res.timestamp.valueOf() : NA;
    var statusCode = res && res.statusCode ? res.statusCode : NA;
    var responseBodyStr = _.get(res, '_bodyStr'); //no need to clone because its not the original body
    var responseBodyJson = _.get(res, '_bodyJson'); //no need to clone because its not the original body

    let responseBody;
    if (isJsonBody(headers)) {
        // Handle JSON only for json responses:
        responseBody = handleResponseJson(
            responseBodyJson, responseBodyStr, options.logger, options.response.excludeBody, options.response.maskBody);
    } else {
        responseBody = responseBodyStr;
    }

    headers = handleJson(headers, options.logger, options.response.excludeHeaders, options.response.maskHeaders);

    var auditObject = {
        status_code: statusCode,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        elapsed: elapsed,
        headers: _.isEmpty(headers) ? NA : headers,
        body: utils.getBodyStr(responseBody, options.response.maxBodyLength)
    };

    return auditObject;
}

function isJsonBody(headers) {
    return headers && headers['content-type'] && headers['content-type'].includes('application/json')
}

function getMaskedQuery(query, fieldsToMask) {
    if (query) {
        return !_.isEmpty(fieldsToMask) ? utils.maskJson(query, fieldsToMask) : query
    } else {
        return NA;
    }
}

module.exports = {
    auditRequest: auditRequest,
    auditResponse: auditResponse
};
