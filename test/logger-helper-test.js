'use strict';

var httpMocks = require('node-mocks-http'),
    loggerHelper = require('../lib/logger-helper'),
    _ = require('lodash'),
    utils = require('../lib/utils'),
    sinon = require('sinon');

var NA = 'N/A';
var MASK = 'XXXXX';
var method = 'POST';
var url = 'somepath/123';
var startTime = new Date();
var endTime = new Date();
var elapsed = endTime - startTime;
var body = {
    body: 'body'
};
var params = {
    param1: "123"
};
var query = {
    q1: 'something',
    q2: 'fishy'
}

describe('logger-helpers tests', function(){
    var sandbox, clock, loggerInfoStub, shouldAuditURLStub;
    var request, response, options;

    var expectedAuditRequest = {
        method: method,
        url: url,
        url_route: '/somepath/:id',
        query: query,
        headers: {
            header1: 'some-value'
        },
        url_params: params,
        timestamp: startTime.toISOString(),
        timestamp_ms: startTime.valueOf(),
        body: JSON.stringify(body),
    };
    var expectedAuditResponse = {
        status_code: 200,
        timestamp: endTime.toISOString(),
        timestamp_ms: endTime.valueOf(),
        elapsed: elapsed,
        body: JSON.stringify(body)
    };
    before(function(){
        sandbox = sinon.sandbox.create();
        clock = sinon.useFakeTimers();
        shouldAuditURLStub = sandbox.stub(utils, 'shouldAuditURL');
    });
    after(function(){
        sandbox.restore();
        clock.restore();
    });
    describe('When calling auditRequest', function(){
        beforeEach(function(){
            request = httpMocks.createRequest({
                method: method,
                url: url,
                route: {
                    path: '/:id'
                },
                baseUrl: '/somepath',
                params: params,
                query: query,
                body: body,
                headers: {
                    header1: 'some-value'
                }
            });

            request.timestamp = startTime;
            response = httpMocks.createResponse();
            response._body = JSON.stringify(body);
            response.timestamp = endTime;
            options = {
                request: {
                    audit: true
                },
                response: {
                    audit: true
                },
                logger: {}
            };
            options.logger.info = function(){};

            loggerInfoStub = sandbox.stub(options.logger, 'info');
        });
        afterEach(function(){
            utils.shouldAuditURL.reset();
        });
        describe('And shouldAuditURL returns false', function(){
            it('Should not audit request', function(){
                shouldAuditURLStub.returns(false);

                loggerHelper.auditRequest(request, options);
                sinon.assert.notCalled(loggerInfoStub);
            });
        });
        describe('And shouldAuditURL returns true', function(){
            it('Should audit request if options.request.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
            });
            it('Should not audit request if options.request.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: undefined });
            });
        });
        describe('And additionalAudit is not empty', function(){
            beforeEach(function(){
                request.additionalAudit = {
                    field1: 'field1',
                    field2: 'field2'
                };
            });
            afterEach(function(){
                delete request.additionalAudit;
                delete expectedAuditRequest.field1;
                delete expectedAuditRequest.field2;
            });
            it('Should add to audit the additional audit details', function(){
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest, field1: 'field1', field2: 'field2' });
            });

            it('Should not add to audit the additional audit details if its an empty object', function(){
                request.additionalAudit = {};
                delete expectedAuditRequest.field1;
                delete expectedAuditRequest.field2;

                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
        });
        describe('And mask query params that are set to be masked', function(){
            it('Should mask the query param', function(){
                var maskedQuery = 'q1'
                options.request.maskQuery = [maskedQuery];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                let expected = _.cloneDeep(expectedAuditRequest)
                expected.query[maskedQuery] = MASK;
                sinon.assert.calledWithMatch(loggerInfoStub, { request: expected });

                // Clear created header for other tests
            });
            it('Should mask all query params', function(){
                var maskedQuery1 = 'q1'
                var maskedQuery2 = 'q2'
                options.request.maskQuery = [maskedQuery1, maskedQuery2];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                let expected = _.cloneDeep(expectedAuditRequest)
                expected.query[maskedQuery1] = MASK;
                expected.query[maskedQuery2] = MASK;
                sinon.assert.calledWith(loggerInfoStub, { request: expected });
            });
        })
        describe('And exclude headers contains an header to exclude', function(){
            var headerToExclude = 'header-to-exclude';
            beforeEach(function(){
                request.headers[headerToExclude] = 'other-value';
            });
            it('Should audit log without the specified header', function(){
                options.request.excludeHeaders = [headerToExclude];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
            it('Should audit log without the specified headers, if there are moer than one', function(){
                var anotherHeaderToExclude = 'another';
                options.request.excludeHeaders = [headerToExclude, anotherHeaderToExclude];
                request.headers[anotherHeaderToExclude] = 'some value';
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
            it('Should audit log with all headers, if exclude headers is an empty list', function(){
                options.request.excludeHeaders = ['other-header'];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                expectedAuditRequest.headers[headerToExclude] = 'other-value';
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });

                // Clear created header for other tests
                delete expectedAuditRequest.headers[headerToExclude];
            });
        });
        describe('And exclude Body', function(){
            beforeEach(function(){
                shouldAuditURLStub.returns(true);
            });

            //reset options and expectedAuditRequest
            afterEach(function(){
                delete options.request.excludeBody;
                expectedAuditRequest.body = JSON.stringify(body);
            });

            it('Should audit log with body, if no execludeBody was written in options', function(){
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
            it('Should audit log without body, when execludeBody was true', function(){
                options.request.excludeBody = true;

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
            it('Should audit log with body, when execludeBody was false', function(){
                options.request.excludeBody = false;

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
            it('Should audit log without body, when execludeBody true and there is no body', function(){
                options.request.excludeBody = true;
                delete request.body;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest });
            });
        });
    });

    describe('When calling auditResponse', function(){
        beforeEach(function(){
            request = httpMocks.createRequest({
                method: method,
                url: url,
                route: {
                    path: '/:id'
                },
                baseUrl: '/somepath',
                query: query,
                body: body,
                headers: {
                    header1: 'some-value'
                },
                params: params
            });

            request.timestamp = startTime;
            response = httpMocks.createResponse();
            response._body = JSON.stringify(body);
            response.timestamp = endTime;
            options = {
                request: {
                    audit: true
                },
                response: {
                    audit: true
                },
                logger: {}
            };
            options.logger.info = function(){};

            loggerInfoStub = sandbox.stub(options.logger, 'info');

        });
        afterEach(function(){
            utils.shouldAuditURL.reset();
        });
        describe('And shouldAuditURL returns false', function(){
            it('Should not audit request/response', function(){
                shouldAuditURLStub.returns(false);

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.notCalled(loggerInfoStub);
            });
        });
        describe('And shouldAuditURL returns true', function(){
            it('Should audit request if options.request.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse
                });
            });
            it('Should audit request if options.request.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse
                });
            });
            it('Should not audit request if options.request.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: undefined,
                    response: expectedAuditResponse
                });
            });
            it('Should audit response if options.response.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.response.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse
                });
            });
            it('Should not audit response if options.response.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.response.audit = false;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: undefined
                });
            });
            it('Should log empty values as N/A', function(){
                request = undefined;
                response = undefined;

                shouldAuditURLStub.returns(true);
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: {
                        method: NA,
                        url: NA,
                        url_route: NA,
                        query: NA,
                        url_params: NA,
                        headers: NA,
                        timestamp: NA,
                        timestamp_ms: NA,
                        body: NA
                    },
                    response: {
                        status_code: NA,
                        timestamp: NA,
                        timestamp_ms: NA,
                        elapsed: 0,
                        body: NA
                    }
                });
            });
        });
        describe('And exclude Body', function(){
            beforeEach(function(){
                shouldAuditURLStub.returns(true);
            });

            //reset options and expectedAuditResponse
            afterEach(function(){
                delete options.response.excludeBody;
                expectedAuditResponse.body = JSON.stringify(body);
            });

            it('Should audit log with body, if no execludeBody was written in options', function(){
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse});
            });
            it('Should audit log without body, when execludeBody was true', function(){
                options.response.excludeBody = true;

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse});
            });
            it('Should audit log with body, when execludeBody was false', function(){
                options.response.excludeBody = false;

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse});
            });
            it('Should audit log without body, when execludeBody true and there is no body', function(){
                options.response.excludeBody = true;
                delete response.body;
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    request: expectedAuditRequest,
                    response: expectedAuditResponse});
            });
        });
    });
});
