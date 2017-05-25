'use strict';

var utils = require('./utils');

var auditRequest = function(req, options){
    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);
    if (shouldAudit){
        var request;
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
    var headers = req && req.headers ? req.headers : 'N/A';
    var requestURL = utils.getUrl(req);
    var method = req && req.method ? req.method : 'N/A';

    var requestBody;

    // Mask Body:
    if (req && req.body){
        var requestBody = req.body;
        requestBody = getMaskedBody(requestBody, options.request.maskBody);
    } else {
        requestBody = 'N/A';
    }

    // Exclude Headers:
    if (options.request.excludeHeaders && Array.isArray(options.request.excludeHeaders) && options.request.excludeHeaders.length > 0){
        options.request.excludeHeaders.forEach(function(header) {
            delete headers[header];
        }, this);
    }

    var auditObject = {
        headers: headers,
        body: requestBody,
        url: requestURL,
        method: method
    };

    return auditObject;
}

function getResponseAudit(req, res, options){
    var elapsed = req ? new Date() - req.startTime : 0;
    var statusCode = res && res.statusCode ? res.statusCode : 'N/A';

    // Mask Body:
    if (res && res._body){
        var responseBody = res._body;
        try {
            responseBody = JSON.parse(responseBody);
        } catch (err){
            if (statusCode != 404){
                options.logger.error('Error parsing response json: ' + responseBody);
            }
            responseBody = 'N/A';
        }
        responseBody = getMaskedBody(responseBody, options.response.maskBody);
    } else {
        responseBody = 'N/A';
    }

    var auditObject = {
        status_code: statusCode,
        body: responseBody,
        elapsed: elapsed
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
        result = 'N/A';
    }
    return result;
}

module.exports = {
    auditRequest: auditRequest,
    auditResponse: auditResponse
};