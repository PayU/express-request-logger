'use strict';

var httpMocks = require('node-mocks-http'),
    utils = require('../lib/utils'),
    should = require('should');

describe('utils tests', function(){
    describe('When calling getUrl', function(){
        var request;
        var expectedPath = 'path/123';
        beforeEach(function(){
            request = httpMocks.createRequest({
                method: 'POST',
                url: expectedPath
            });
        });
        it('Should return url for a path with no route', function(){
            var url = utils.getUrl(request);
            should(url).eql(expectedPath);
        });
        it('Should return url for a path with route', function(){
            request.baseUrl = 'path';
            request.route = {
                path: '/123'
            };

            var url = utils.getUrl(request);
            should(url).eql(expectedPath);
        });
        it('Should N/A for not valid req obj', function(){
            var url = utils.getUrl(undefined);
            should(url).eql('N/A');
        });
    });

    describe('When calling maskJsonValue', function(){
        var originalJsonObj;
        var expectedJsonObj;

        var fieldsToMask;
        var expectedMaskedValue = 'XXXXX';

        beforeEach(function(){
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
        it('Should return original Json Object if specified field not found', function(){
            fieldsToMask = ['other_field'];
            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(originalJsonObj);
        });
        it('Should return original Json Object with specified field masked', function(){
            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(expectedJsonObj);
        });
        it('Should return original Json Object with more than one specified field masked', function(){
            fieldsToMask = ['secret', 'public'];
            expectedJsonObj = {
                secret: expectedMaskedValue,
                public: expectedMaskedValue
            };

            var masked = utils.maskJson(originalJsonObj, fieldsToMask);
            should(masked).eql(expectedJsonObj);
        });
        it('Should return null for null input', function(){
            var masked = utils.maskJson(null, fieldsToMask);
            should(masked).eql(null);
        });
        it('Should return undefined for undefined input', function(){
            var masked = utils.maskJson(undefined, fieldsToMask);
            should(masked).eql(undefined);
        });
        it('Should return empty object for empty object input', function(){
            var masked = utils.maskJson({}, fieldsToMask);
            should(masked).eql({});
        });
    });

    describe('When calling shouldAuditURL', function(){
        var urls = [];
        var request;
        var urlToExclude = 'exclude';
        var urlNotToExclude = 'audit';
        beforeEach(function(){
            urls = ['exclude'];
            request = httpMocks.createRequest({
                method: 'POST',
                url: urlNotToExclude + '/123'
            });
        });
        it('Should return true if none of the specified urls match the current path', function(){
            var res = utils.shouldAuditURL(urls, request);
            should(res).eql(true);
        });
        it('Should return false if one of the specified urls match the current path', function(){
            request.url = urlToExclude + '/123';
            var res = utils.shouldAuditURL(urls, request);
            should(res).eql(false);
        });
    });
});