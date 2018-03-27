'use strict';

var utils = require('./utils');
var _ = require('lodash');
var ALL_FIELDS = '*';
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

        options.logger.info(auditObject, 'Inbound Transaction');
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

        options.logger.info(auditObject, 'Inbound Transaction');
    }
};

function getRequestAudit(req, options){
    var headers = _.get(req, 'headers');
    var requestFullURL = utils.getUrl(req);
    var requestRoute = utils.getRoute(req);
    var queryParams = req && req.query !== {} ? req.query : NA;
    var method = req && req.method ? req.method : NA;
    var URLParams = req && req.params ? req.params : NA;
    var timestamp = req && req.timestamp ? req.timestamp.toISOString() : NA;
    var timestamp_ms = req && req.timestamp ? req.timestamp.valueOf() : NA;
    var requestBody =  _.get(req, 'body');  //handle body clone the original body

    requestBody = handleJson(requestBody, options.logger, options.request.excludeBody, options.request.maskBody);

    queryParams = getMaskedQuery(queryParams, options.request.maskQuery);

    headers = handleJson(headers, options.logger, options.request.excludeHeaders, options.request.maskHeaders)

    var auditObject = {
        method: method,
        url_params: URLParams,
        url: requestFullURL,
        url_route: requestRoute,
        query: queryParams,
        headers: _.isEmpty(headers) ? NA: headers,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        body: _.isEmpty(requestBody) ? NA: JSON.stringify(requestBody)
    };

    return auditObject;
}

function handleJson(obj, logger, excludeFields, maskFields) {

    if(_.includes(excludeFields, ALL_FIELDS))
    {
        obj = undefined;
    }
    else if(obj)
    {
        try {
            //in case obj is string and need to convert to json
            if(typeof obj == 'string') {
                obj = JSON.parse(obj);
            }
            else if(typeof obj != 'object')
            {
                throw new Error("only json obj can be exclude/masked");
            }

            //order is important because body is clone first
            obj = utils.maskJson(obj, maskFields);
            obj = utils.cleanOmitKeys(obj, excludeFields);
        } catch (err){
            logger.warn('Error parsing json: ' + err);
            obj = undefined;
        }
    }


    return obj;
}



function getResponseAudit(req, res, options){
    var headers = _.get(res, '_headers');
    var elapsed = req && res ? res.timestamp - req.timestamp : 0;
    var timestamp = res && res.timestamp ? res.timestamp.toISOString() : NA;
    var timestamp_ms = res && res.timestamp ? res.timestamp.valueOf() : NA;
    var statusCode = res && res.statusCode ? res.statusCode : NA;
    var responseBody =  _.get(res, '_body'); //no need to clone because its not the original body

    responseBody = handleJson(responseBody, options.logger , options.response.excludeBody, options.response.maskBody);

    headers = handleJson(headers, options.logger, options.response.excludeHeaders, options.response.maskHeaders)

    var auditObject = {
        status_code: statusCode,
        timestamp: timestamp,
        timestamp_ms: timestamp_ms,
        elapsed: elapsed,
        headers: _.isEmpty(headers) ? NA: headers,
        body: _.isEmpty(responseBody) ? NA: JSON.stringify(responseBody)
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
