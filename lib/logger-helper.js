'use strict';

var utils = require('./utils');
const NA = 'N/A';

var auditRequest = function(req, options){
    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);
    if (shouldAudit){
        var request;

        if (options.setupFunc){
            options.setupFunc(req, res);
        }

        if (options.request.audit){
            request = getRequestAudit(req, options);
        }

        var auditObject = {
            request: request
        };

        // Add additional audit fields
        if (req && req.additionalAudit){
            auditObject = Object.assign(auditObject, req.additionalAudit);
        }

        options.logger.info(auditObject);
    }
};

var auditResponse = function(req, res, options){
    var request;
    var response;

    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);
    if (shouldAudit){
        if (options.setupFunc){
            options.setupFunc(req, res);
        }

        if (options.request.audit){
            request = getRequestAudit(req, options);
        }

        if (options.response.audit){
            response = getResponseAudit(req, res, options);
        }

        var auditObject = {
            response: response,
            request: request
        };

        // Add additional audit fields
        if (req && req.additionalAudit){
            auditObject = Object.assign(auditObject, req.additionalAudit);
        }

        options.logger.info(auditObject);
    }
};

function getRequestAudit(req, options){
    var headers = req && req.headers ? req.headers : NA;
    var requestURL = utils.getUrl(req);
    var queryParams = req && req.query !== {} ? req.query : NA;
    var method = req && req.method ? req.method : NA;

    var requestBody;

    // Mask Body:
    if (req && req.body){
        var requestBody = req.body;
        requestBody = getMaskedBody(requestBody, options.request.maskBody);
        queryParams = getMaskedQuery(queryParams, options.request.maskQuery)
    } else {
        requestBody = NA;
    }

    // Exclude Headers:
    if (options.request.excludeHeaders && Array.isArray(options.request.excludeHeaders) && options.request.excludeHeaders.length > 0){
        options.request.excludeHeaders.forEach(function(header) {
            delete headers[header];
        }, this);
    }

    var auditObject = {
        method: method,
        url: requestURL,
        headers: headers,
        query: queryParams,
        body: requestBody,
    };

    return auditObject;
}

function getResponseAudit(req, res, options){
    var elapsed = req ? new Date() - req.startTime : 0;
    var statusCode = res && res.statusCode ? res.statusCode : NA;

    // Mask Body:
    if (res && res._body){
        var responseBody = res._body;
        try {
            responseBody = JSON.parse(responseBody);
        } catch (err){
            if (statusCode != 404){
                options.logger.error('Error parsing response json: ' + responseBody);
            }
            responseBody = NA;
        }
        responseBody = getMaskedBody(responseBody, options.response.maskBody);
    } else {
        responseBody = NA;
    }

    var auditObject = {
        status_code: statusCode,
        elapsed: elapsed,
        body: responseBody
    };

    return auditObject;
}

function getMaskedBody(body, fieldsToMask){
    // Mask Body:
    var result = body;
    if (body){
        var maskedBody = utils.maskJson(body, fieldsToMask);
        result = JSON.stringify(maskedBody);

    } else {
        result = NA;
    }
    return result;
}

function getMaskedQuery(query, fieldsToMask) {
    if (query) {
        return utils.maskJson(query, fieldsToMask);
    } else {
        return NA;
    }
}

module.exports = {
    auditRequest: auditRequest,
    auditResponse: auditResponse
};