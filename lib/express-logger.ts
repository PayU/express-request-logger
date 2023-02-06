import { RequestHandler } from 'express';
import { AuditOptions, AugmentedRequest, AugmentedResponse } from './types';
import * as _ from 'lodash';

let logger = require('bunyan').createLogger({ name: 'ExpressLogger' }),
    loggerHelper = require('./logger-helper'),
    setupOptions: AuditOptions,
    flatten = require('flat');

var audit: RequestHandler = function (req: AugmentedRequest, res: AugmentedResponse, next) {
    const oldWrite = res.write;
    const oldEnd = res.end;
    const oldJson = res.json;
    let chunks: any[] = [];

    // Log start time of request processing
    req.timestamp = new Date();

    if (setupOptions.doubleAudit) {
        loggerHelper.auditRequest(req, setupOptions);
    }

    res.write = function (chunk: any, ...rest: any[]) {
        chunks.push(Buffer.from(chunk));
        return (oldWrite as any).apply(res, [chunk, ...rest]);
    };

    // decorate response#json method from express
    res.json = function (bodyJson: any, ...rest: any[]) {
        res._bodyJson = bodyJson;
        return (oldJson as any).apply(res, [bodyJson, ...rest]);
    };

    // decorate response#end method from express
    // TODO Can't seem to get the types to match.
    // @ts-ignore 
    res.end = function (chunk: any, ...rest): AugmentedResponse {
        res.timestamp = new Date();
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }

        res._bodyStr = Buffer.concat(chunks).toString('utf8');

        // call to original express#res.end()
        const ret = (oldEnd as any).apply(res, [chunk, ...rest]);
        loggerHelper.auditResponse(req, res, setupOptions);
        return ret;
    };

    next();
};

export default function (options: Partial<AuditOptions>) {
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
            '5xx': 'info'
        }
    };

    setupOptions = _.defaultsDeep(options, defaults);
    validateArrayFields(options, defaults);
    setBodyLengthFields(setupOptions);
    return audit;
};

// Convert all options fields that need to be array by default
function validateArrayFields(options: Partial<AuditOptions>, defaults: Record<string, any>) {
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
}

function setBodyLengthFields(options: AuditOptions) {
    const isValid = (field: any) => field && !isNaN(field) && field > 0;
    options.request.maxBodyLength = !isValid(options.request.maxBodyLength) ? undefined : options.request.maxBodyLength;
    options.response.maxBodyLength = !isValid(options.response.maxBodyLength) ? undefined : options.response.maxBodyLength;
}