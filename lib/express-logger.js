'use strict';

var _ = require('lodash'),
    logger = require('bunyan').createLogger({name: 'ExpressLogger'}),
    loggerHelper = require('./logger-helper'),
    setupOptions,
     flatten = require('flat')

var audit = function (req, res, next){
    var oldWrite = res.write;
    var oldEnd = res.end;
    var chunks = [];

    // Log start time of request processing
    req.timestamp = new Date();

    //clone body and headers of the requests in case double audit
    req._body = _.cloneDeep(req.body);
    req._headers = _.cloneDeep(req.headers);


    if (setupOptions.doubleAudit){
        loggerHelper.auditRequest(req, setupOptions);
    }

    res.write = function (chunk){
        chunks.push(new Buffer(chunk));
        oldWrite.apply(res, arguments);
    };

    // decorate response#end method from express
    res.end = function (chunk){
        res.timestamp = new Date();
        if (chunk){
            chunks.push(new Buffer(chunk));
        }

        var body = Buffer.concat(chunks).toString('utf8');

        res._body = body;
        res._headers = _.cloneDeep(res, 'headers');
        // call to original express#res.end()
        oldEnd.apply(res, arguments);
        loggerHelper.auditResponse(req, res, setupOptions);
    };

    next();
};

module.exports = function(options){
    options = options || {};
    var defaults = {
        logger: logger,
        request: {
            audit: true,
            maskBody: [],
            maskQuery: [],
            // maskHeaders: [],
            excludeBody: [],
            excludeHeaders: []
        },
        response: {
            audit: true,
            maskBody: [],
            // maskHeaders: [],
            excludeBody: [],
            excludeHeaders: []
        },
        doubleAudit: false,
        excludeURLs: []
    };

    _.defaultsDeep(options, defaults);
    setupOptions = validateArrayFields(options, defaults);
    return audit;
};

function validateArrayFields(options, defaults)
{
    Object.keys(flatten(options)).forEach((key) => {
        let optionValue = _.get(options, key);
        //if field need to be array by default and not
        if(_.isArray(_.get(defaults, key)) && !_.isArray(optionValue))
        {
            _.set(options, key, [].concat(optionValue));
        }
    });

    return options;
}