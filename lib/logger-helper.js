'use strict';

var utils = require('./utils');

var auditRequest = function(req, options){
    var shouldAudit = utils.shouldAuditURL(options.excludeURLs, req);
    if (shouldAudit){
        var request;
        if (options.request.audit){
            request = getRequestAudit(req, options);
        }

        options.logger.info({
            request: request
        });
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
            response = getResponseAudit(req, res);
        }

        options.logger.info({
            response: response,
            request: request
        });
    }
};

function getRequestAudit(req, options){
    var headers = req && req.headers ? req.headers : 'N/A';
    var requestURL = utils.getUrl(req);
    var method = req && req.method ? req.method : 'N/A';

    var requestBody;
    if (req && req.body){
        var maskedBody = req.body;

        maskedBody = utils.maskJson(maskedBody, options.request.maskBody);

        requestBody = JSON.stringify(maskedBody);
    } else {
        requestBody = 'N/A';
    }

    return {
        headers: headers,
        body: requestBody,
        url: requestURL,
        method: method
    };
}

function getResponseAudit(req, res){
    var elapsed = req ? new Date() - req.startTime : 0;
    var statusCode = res && res.statusCode ? res.statusCode : 'N/A';

    var body = res ? res._body : 'N/A';

    return {
        status_code: statusCode,
        body: body,
        elapsed: elapsed
    };
}

module.exports = {
    auditRequest: auditRequest,
    auditResponse: auditResponse
};