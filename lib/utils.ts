import { Request } from 'express';
import { LevelsMap } from './types';
import * as _ from 'lodash';

const MASK = 'XXXXX';
const NA = 'N/A';
const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error']
const DEFAULT_LEVEL = 'info';

export const getUrl = function (req: Request) {
    const url = req && req.url || NA;

    return url;
};

export const getRoute = function (req: Request) {
    var url = NA;

    if (req) {
        var route = req.baseUrl;
        if (req.route && route) {
            url = route + req.route.path;
        }
    }

    return url;
};

export function cleanOmitKeys(obj?: Object, omitKeys?: string[]) {
    if (obj && !_.isEmpty(omitKeys)) {
        type KT = keyof typeof obj;
        Object.keys(obj).forEach(function (key) {
            if (_.some(omitKeys, (omitKey: any) => key === omitKey)) {
                delete obj[key as KT];
            } else {
                (obj[key as KT] && typeof obj[key as KT] === 'object') && cleanOmitKeys(obj[key as KT]);
            }
        });
    }
        return obj;
};

export const shouldAuditURL = function (excludeURLs: string[], req: Request) {
    return _.every(excludeURLs, function (path: string) {
        var url = getUrl(req);
        var route = getRoute(req);
        return !(url.includes(path) || route.includes(path));
    });
};

export const maskJson = function (jsonObj: object, fieldsToMask: string[]) {
    let jsonObjCopy = _.cloneDeepWith(jsonObj, function (value, key) {
        if (_.includes(fieldsToMask, key)) {
            return MASK
        }
    })
    return jsonObjCopy;
};

export const getLogLevel = function (statusCode: number, levelsMap: LevelsMap) {
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

export const getBodyStr = function (body: string | any, maxBodyLength?: number) {
    if (_.isEmpty(body)) {
        return NA
    } else {
        let bodyStr = (typeof body !== 'string') ? JSON.stringify(body) : body;
        let shouldShorten = maxBodyLength && maxBodyLength > 0 && bodyStr.length > maxBodyLength;
        return shouldShorten ? bodyStr.substr(0, maxBodyLength) + '...' : bodyStr;
    }
}
