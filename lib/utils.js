'use strict';

var _ = require('lodash');
const MASK = 'XXXXX';
const NA = 'N/A';
const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error']
const DEFAULT_LEVEL = 'info';

var getUrl = function (req) {
    var url = req && req.url || NA;

    return url;
};

var getRoute = function (req) {
    var url = NA;

    if (req) {
        var route = req.baseUrl;
        if (req.route && route) {
            url = route + req.route.path;
        }
    }

    return url;
};

function cleanOmitKeys(obj, omitKeys) {
    if (obj && !_.isEmpty(omitKeys)) {
        Object.keys(obj).forEach(function (key) {
            if (_.some(omitKeys, omitKey => key === omitKey)) {
                delete obj[key];
            } else {
                (obj[key] && typeof obj[key] === 'object') && cleanOmitKeys(obj[key]);
            }
        });
    }
    return obj;
};

var shouldAuditURL = function (excludeURLs, req) {
    return _.every(excludeURLs, function (path) {
        var url = getUrl(req);
        var route = getRoute(req);
        return !(url.includes(path) || route.includes(path));
    });
};

var maskJson = function (jsonObj, fieldsToMask) {
    let jsonObjCopy = _.cloneDeepWith(jsonObj, function (value, key) {
        if (_.includes(fieldsToMask, key)) {
            return MASK
        }
    })
    return jsonObjCopy;
};

var getLogLevel = function (statusCode, levelsMap) {
    let level = DEFAULT_LEVEL; // Default

    if (levelsMap) {
        let status = statusCode.toString();

        if (levelsMap[status]) {
            level = VALID_LEVELS.includes(levelsMap[status]) ? levelsMap[status] : level;
        } else {
            let statusGroup = `${status.substring(0, 1)}xx`; // 5xx, 4xx, 2xx, etc..
            level = VALID_LEVELS.includes(levelsMap[statusGroup]) ? levelsMap[statusGroup] : level;
        }
    }

    return level;
}

var getBodyStr = function (body, maxBodyLength) {
    if (_.isEmpty(body)) {
        return NA
    } else {
        let bodyStr = (typeof body !== 'string') ? JSON.stringify(body) : body;
        let shouldShorten = maxBodyLength && maxBodyLength > 0 && bodyStr.length > maxBodyLength;
        return shouldShorten ? bodyStr.substr(0, maxBodyLength) + '...' : bodyStr;
    }
}


module.exports = {
    getRoute: getRoute,
    getUrl: getUrl,
    shouldAuditURL: shouldAuditURL,
    maskJson: maskJson,
    cleanOmitKeys: cleanOmitKeys,
    getLogLevel: getLogLevel,
    getBodyStr: getBodyStr
};