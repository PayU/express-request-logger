'use strict';

var _ = require('lodash');

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
    _.forEach(fieldsToMask, function(fieldToMask){
        jsonObj = maskJsonValue(jsonObj, fieldToMask);
    });

    return jsonObj;
};

var maskJsonValue = function(jsonObj, fieldToMask){
    if (jsonObj && jsonObj[fieldToMask]){
        jsonObj[fieldToMask] = 'XXXXX';
    }

    return jsonObj;
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