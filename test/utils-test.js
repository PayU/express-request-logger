'use strict';

var httpMocks = require('node-mocks-http'),
    utils = require('../lib/utils'),
    should = require('should');

describe('utils tests', function () {
    describe('When calling getUrl', function () {
        var request;
        var expectedPath = 'path/123';
        beforeEach(function () {
            request = httpMocks.createRequest({
                method: 'POST',
                url: expectedPath
            });
        });
        it('Should return url for a path with no route', function () {
            var url = utils.getUrl(request);
            should(url).eql(expectedPath);
        });
        it('Should return url for a path - route doesn\'t change the url', function () {
            request.baseUrl = 'path';
            request.route = {
                path: '/:id'
            };

            var url = utils.getUrl(request);
            should(url).eql(expectedPath);
        });
        it('Should N/A for not valid req obj', function () {
            var url = utils.getUrl(undefined);
            should(url).eql('N/A');
        });
    });

    describe('When calling getRoute', function () {
        var request;
        var expectedRoute = '/path/:id';
        beforeEach(function () {
            request = httpMocks.createRequest({
                method: 'POST',
                route: {
                    path: '/:id'
                },
                baseUrl: '/path',
            });
        });
        it('Should return url_route for a path', function () {
            var url_route = utils.getRoute(request);
            should(url_route).eql(expectedRoute);
        });
        it('Should N/A for not valid req obj', function () {
            var url = utils.getUrl(undefined);
            should(url).eql('N/A');
        });
    });

    describe('When calling maskJsonValue', function () {
        var originalJsonObj;
        var expectedJsonObj;

        var fieldsToMask;
        var expectedMaskedValue = 'XXXXX';

        beforeEach(function () {
            originalJsonObj = {
                secret: 'secret',
                public: 'public'
            };

            expectedJsonObj = {
                secret: expectedMaskedValue,
                public: 'public'
            };

            fieldsToMask = ['secret'];
        });
        it('Should return original Json Object if specified field not found', function () {
            fieldsToMask = ['other_field'];
            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(originalJsonObj);
        });
        it('Should return original Json Object with specified field masked', function () {
            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(expectedJsonObj);
        });
        it('Should return original Json Object with more than one specified field masked', function () {
            fieldsToMask = ['secret', 'public'];
            expectedJsonObj = {
                secret: expectedMaskedValue,
                public: expectedMaskedValue
            };

            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(expectedJsonObj);
        });
        it('Should return null for null input', function () {
            var masked = utils.maskJson(null, fieldsToMask);
            should(masked).eql(null);
        });
        it('Should return undefined for undefined input', function () {
            var masked = utils.maskJson(undefined, fieldsToMask);
            should(masked).eql(undefined);
        });
        it('Should return empty object for empty object input', function () {
            var masked = utils.maskJson({}, fieldsToMask);
            should(masked).eql({});
        });
        it('Should mask all field occurrences', function () {
            let fieldsToMask = ['password'];
            let originalJsonObj = {
                password: 'password',
                user: {
                    name: 'papa user',
                    password: 'password to change'
                },
                users: [
                    {
                        name: 'name1',
                        password: 'password to change'
                    },
                    {
                        name: 'name2',
                        password: 'password to change'
                    }
                ]
            };
            let expectedJsonObj = {
                password: expectedMaskedValue,
                user: {
                    name: 'papa user',
                    password: expectedMaskedValue
                },
                users: [
                    {
                        name: 'name1',
                        password: expectedMaskedValue
                    },
                    {
                        name: 'name2',
                        password: expectedMaskedValue
                    }
                ]
            };
            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(expectedJsonObj);
        });
    });

    describe('When calling shouldAuditURL', function () {
        var urls = [];
        var request;
        var urlToExclude = 'exclude';
        var urlNotToExclude = 'audit';
        beforeEach(function () {
            urls = ['exclude'];
            request = httpMocks.createRequest({
                method: 'POST',
                url: urlNotToExclude + '/123'
            });
        });
        it('Should return true if none of the specified urls match the current path', function () {
            var res = utils.shouldAuditURL(urls, request);
            should(res).eql(true);
        });
        it('Should return false if one of the specified urls match the current path', function () {
            request.url = urlToExclude + '/123';
            var res = utils.shouldAuditURL(urls, request);
            should(res).eql(false);
        });
        it('Should return false if url matches the route and not the req.url', () => {
            request.url = '/';
            request.baseUrl = '/exclude';
            request.route = {
                path: '/'
            };
            var res = utils.shouldAuditURL(urls, request);

            should(res).eql(false);
        });
    });
    describe('When calling getLogLevel', () => {
        it('Should return info if levels is undefined', () => {
            let result = utils.getLogLevel(200, undefined);
            should(result).eql('info');
        });
        it('Should return info if levels is empty array', () => {
            let result = utils.getLogLevel(200, []);
            should(result).eql('info');
        });
        it('Should return info if exact match but levelMap value is not valid level', () => {
            let result = utils.getLogLevel(200, { '200': 'not-valid' });
            should(result).eql('info');
        })
        it('Should return correct exact match of status with level map', () => {
            let result = utils.getLogLevel(200, { '200': 'error' });
            should(result).eql('error');
        });
        it('Should return correct exact match if group is configured as well', () => {
            let result = utils.getLogLevel(401, {
                '200': 'error',
                '4xx': 'debug',
                '401': 'error',
                '500': 'error'
            });
            should(result).eql('error');
        })
        it('Should fallback to status group if exact match not found', () => {
            let result = utils.getLogLevel(404, {
                '200': 'error',
                '4xx': 'debug',
                '401': 'error',
                '500': 'error'
            });
            should(result).eql('debug');
        })
        it('Should fallback to default info level if no match is found', () => {
            let result = utils.getLogLevel(302, {
                '200': 'error',
                '4xx': 'debug',
                '401': 'error',
                '500': 'error'
            });
            should(result).eql('info');
        })
    });
});