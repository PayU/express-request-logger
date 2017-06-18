'use strict';

var _ = require('lodash');
const MASK = 'XXXXX';
var getUrl = function(req){
    var url = req && req.url || 'N/A';

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
        if (_.indexOf(fieldsToMask, key) != -1) {
            return MASK
        }
    })

    return jsonObjCopy;
};

var shouldAuditURL = function(excludeURLs, req){
    return _.every(excludeURLs, function(path){
        var url = getUrl(req);
        return !url.includes(path);
    });
};

module.exports = {
    getUrl: getUrl,
    maskJson: maskJson,
    shouldAuditURL: shouldAuditURL
};