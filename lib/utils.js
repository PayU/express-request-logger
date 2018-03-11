'use strict';

var _ = require('lodash');
const MASK = 'XXXXX';
const NA = 'N/A';

var getUrl = function(req){
    var url = req && req.url || NA;

    return url;
};

var getRoute = function(req) {
    var url = NA;

    if (req){
        var route = req.baseUrl;
        if (req.route && route){
            url = route + req.route.path;
        }
    }

    return url;
};

function cleanOmitKeys (obj, omitKeys) {
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

var shouldAuditURL = function(excludeURLs, req){
    return _.every(excludeURLs, function(path){
        var url = getUrl(req);
        var route = getRoute(req);
        return !(url.includes(path) || route.includes(path));
    });
};

var maskJson = function(jsonObj, fieldsToMask){
    let jsonObjCopy = _.cloneDeepWith(jsonObj, function (value, key) {
        if (_.includes(fieldsToMask, key)) {
            return MASK
        }
    })
    return jsonObjCopy;
};


module.exports = {
    getRoute: getRoute,
    getUrl: getUrl,
    shouldAuditURL: shouldAuditURL,
    maskJson:maskJson,
    cleanOmitKeys:cleanOmitKeys
};