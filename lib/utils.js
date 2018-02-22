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

var maskJson = function(jsonObj, fieldsToMask){
    let jsonObjCopy = _.cloneDeepWith(jsonObj, function (value, key) {
        if (_.includes(fieldsToMask, key)) {
            return MASK;
        }
    });
    return jsonObjCopy;
};

var shouldAuditURL = function(excludeURLs, req){
    return _.every(excludeURLs, function(path){
        var url = getUrl(req);
        var route = getRoute(req);
        return !(url.includes(path) || route.includes(path));
    });
};

module.exports = {
    getRoute: getRoute,
    getUrl: getUrl,
    maskJson: maskJson,
    shouldAuditURL: shouldAuditURL
};