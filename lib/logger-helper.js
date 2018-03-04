'use strict';

var utils = require('./utils');
var _ = require('lodash');
var ALL_BODY = '*';
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
    var headers = _.get(req, '_headers');
    var requestFullURL = utils.getUrl(req);
    var requestRoute = utils.getRoute(req);
    var queryParams = req && req.query !== {} ? req.query : NA;
    var method = req && req.method ? req.method : NA;
    var URLParams = req && req.params ? req.params : NA;
    var timestamp = req && req.timestamp ? req.timestamp.toISOString() : NA;
    var timestamp_ms = req && req.timestamp ? req.timestamp.valueOf() : NA;
    var requestBody =  _.get(req, '_body');

    requestBody = handleBody(requestBody, options.request.excludeBody, options.request.maskBody, options.logger);

    queryParams = getMaskedQuery(queryParams, options.request.maskQuery);

    // Exclude Headers:
    headers = excludeByFields(headers, options.request.excludeHeaders);
    headers = _.isEmpty(headers) ? NA : headers;


    var auditObject = {
        method: method,
        url_params: URLParams,
        url: requestFullURL,
        url_route: requestRoute,
        query: queryParams,
        headers: headers,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        body: requestBody
    };

    return auditObject;
}

function handleBody(body, fieldsToRemove, fieldsToMask, logger)
{
    if(fieldsToRemove.indexOf(ALL_BODY) != -1)
    {
        body = undefined;
    }
    else if(body)
    {
        try {
            //in case body is string and need to convert to json
            if(typeof body == 'string') {
                body = JSON.parse(body);
            }
            else if(typeof body != 'object')
            {
                throw new Error("only json body can be exclude/masked")
            }

            excludeByFields(body, fieldsToRemove);
            body = utils.maskJson(body, fieldsToMask);
        } catch (err){
            logger.error('Error parsing response json: ' + err);
            body = undefined;
        }
    }


    return _.isEmpty(body) ? NA: JSON.stringify(body);
}

function excludeByFields(obj, excludeFields){
    excludeFields.forEach((fieldName) => {
        _.unset(obj, fieldName);
    });

    return obj;
}

function getResponseAudit(req, res, options){
    var headers = _.get(res, '_headers');
    var elapsed = req && res ? res.timestamp - req.timestamp : 0;
    var timestamp = res && res.timestamp ? res.timestamp.toISOString() : NA;
    var timestamp_ms = res && res.timestamp ? res.timestamp.valueOf() : NA;
    var statusCode = res && res.statusCode ? res.statusCode : NA;
    var responseBody =  _.get(res, '_body'); //no need to clone because its not the original body


    responseBody = handleBody(responseBody, options.response.excludeBody, options.response.maskBody, options.logger);

    // Exclude Headers:
    headers = excludeByFields(headers, options.response.excludeHeaders, options);
    headers = _.isEmpty(headers) ? NA : headers;

    var auditObject = {
        status_code: statusCode,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        elapsed: elapsed,
        headers: headers,
        body: responseBody
    };

    return auditObject;
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
