'use strict';

var httpMocks = require('node-mocks-http'),
    loggerHelper = require('../lib/logger-helper'),
    _ = require('lodash'),
    utils = require('../lib/utils'),
    sinon = require('sinon'),
    should = require('should');

var NA = 'N/A';
var MASK = 'XXXXX';
var ALL_FIELDS = '*';
var method = 'POST';
var url = 'somepath/123';
var startTime = new Date();
var endTime = new Date();
var elapsed = endTime - startTime;
var body = {
    body: 'body'
};
var params = {
    param1: '123'
};
var query = {
    q1: 'something',
    q2: 'fishy'
};

var expectedUTCTimestamp = '1970-01-01T00:00:00.000Z';
var expectedMillisTimestamp = 0;

describe('logger-helpers tests', function () {
    var sandbox, clock, loggerInfoStub, shouldAuditURLStub, loggerWarnStub, loggerErrorStub, getLogLevelStub, maskJsonSpy;
    var request, response, options, expectedAuditRequest, getExpectedAuditRequest, expectedAuditResponse, getExpectedAuditResponse;

    before(function () {
        sandbox = sinon.sandbox.create();
        clock = sinon.useFakeTimers();
        shouldAuditURLStub = sandbox.stub(utils, 'shouldAuditURL');
        getLogLevelStub = sandbox.stub(utils, 'getLogLevel');
        maskJsonSpy = sandbox.spy(utils, 'maskJson');
    });

    beforeEach(function () {
        options = {
            request: {
                audit: true,
                excludeBody: [],
                maskBody: [],
                excludeHeaders: []
            },
            response: {
                audit: true,
                maskBody: [],
                excludeBody: [],
                excludeHeaders: []
            },
            logger: {}
        };

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
                'content-type': 'application/json',
                header1: 'some-value'
            }
        });

        request.timestamp = startTime;
        response = httpMocks.createResponse();
        response._bodyStr = JSON.stringify(body);
        response.timestamp = endTime;
        response.setHeader('header2', 'some-other-value')
        response.setHeader('content-type', 'application/json')

        options.logger.info = function () { };
        options.logger.warn = function () { };
        options.logger.error = function () { };

        loggerInfoStub = sandbox.stub(options.logger, 'info');
        loggerWarnStub = sandbox.stub(options.logger, 'warn');
        loggerErrorStub = sandbox.stub(options.logger, 'error');

        getLogLevelStub.returns('info');
        expectedAuditRequest = {
            method: method,
            url: url,
            url_route: '/somepath/:id',
            query: query,
            headers: {
                'content-type': 'application/json',
                header1: 'some-value'
            },
            url_params: params,
            timestamp: startTime.toISOString(),
            timestamp_ms: startTime.valueOf(),
            body: JSON.stringify(body),
        };
        getExpectedAuditRequest = () => expectedAuditRequest;
        expectedAuditResponse = {
            status_code: 200,
            timestamp: endTime.toISOString(),
            timestamp_ms: endTime.valueOf(),
            elapsed: elapsed,
            body: JSON.stringify(body),
            headers: {
                header2: 'some-other-value',
                'content-type': 'application/json'
            },
        };
        getExpectedAuditResponse = () => expectedAuditResponse;
    });

    afterEach(function () {
        sandbox.reset();
    });

    after(function () {
        sandbox.restore();
        clock.restore();
    });

    describe('When calling auditRequest', function () {
        afterEach(function () {
            utils.shouldAuditURL.reset();
        });
        describe('And shouldAuditURL returns false', function () {
            it('Should not audit request', function () {
                shouldAuditURLStub.returns(false);

                loggerHelper.auditRequest(request, options);
                sinon.assert.notCalled(loggerInfoStub);
            });
        });
        describe('And shouldAuditURL returns true', function () {
            it('Should audit request if options.request.audit is true', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
            });
            it('Should not audit request if options.request.audit is false', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: undefined,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
        });
        describe('And additionalAudit is not empty', function () {
            beforeEach(function () {
                request.additionalAudit = {
                    field1: 'field1',
                    field2: 'field2'
                };
            });
            afterEach(function () {
                delete request.additionalAudit;
                delete expectedAuditRequest.field1;
                delete expectedAuditRequest.field2;
            });
            it('Should add to audit the additional audit details', function () {
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { request: expectedAuditRequest, field1: 'field1', field2: 'field2', 'utc-timestamp': expectedUTCTimestamp, 'millis-timestamp': expectedMillisTimestamp, stage: 'start' });
            });

            it('Should not add to audit the additional audit details if its an empty object', function () {
                request.additionalAudit = {};
                delete expectedAuditRequest.field1;
                delete expectedAuditRequest.field2;

                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { stage: 'start', request: expectedAuditRequest, 'utc-timestamp': expectedUTCTimestamp, 'millis-timestamp': expectedMillisTimestamp });
            });
        });
        describe('When handling non-json body with json content-type', function () {
            it('Should issue a warning and set the body to "N/A"', function () {
                shouldAuditURLStub.returns(true);
                options.request.maskBody = ['test'];
                request.body = 'body';
                expectedAuditRequest.body = 'N/A';

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerWarnStub);
                sinon.assert.calledWithMatch(loggerWarnStub, sinon.match.instanceOf(Object), sinon.match('Error parsing json'));

                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { stage: 'start', request: expectedAuditRequest, 'utc-timestamp': expectedUTCTimestamp, 'millis-timestamp': expectedMillisTimestamp });
            })

        })
        describe('When handling non-json body', function () {
            it('Should not try to mask it and print the body as is', function () {
                shouldAuditURLStub.returns(true);
                options.request.maskBody = ['test'];
                request.body = 'body';
                delete request.headers['content-type'];
                delete expectedAuditRequest.headers['content-type'];
                expectedAuditRequest.body = 'body';

                loggerHelper.auditRequest(request, options);
                sinon.assert.notCalled(loggerWarnStub);

                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, { stage: 'start', request: expectedAuditRequest, 'utc-timestamp': expectedUTCTimestamp, 'millis-timestamp': expectedMillisTimestamp });
            })

        })
        describe('And mask query params that are set to be masked', function () {
            it('Should mask the query param', function () {
                var maskedQuery = 'q1';
                options.request.maskQuery = [maskedQuery];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                let expected = _.cloneDeep(expectedAuditRequest);
                expected.query[maskedQuery] = MASK;
                sinon.assert.calledWithMatch(loggerInfoStub, {
                    stage: 'start', 
                    request: expected,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                sinon.assert.calledOnce(maskJsonSpy);

                // Clear created header for other tests
            });
            it('Should mask all query params', function () {
                var maskedQuery1 = 'q1';
                var maskedQuery2 = 'q2';
                options.request.maskQuery = [maskedQuery1, maskedQuery2];
                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                let expected = _.cloneDeep(expectedAuditRequest);
                expected.query[maskedQuery1] = MASK;
                expected.query[maskedQuery2] = MASK;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expected,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('should execute custom mask function for request',function () {
                options.request.customMaskBodyFunc = function(request){
                    should(request.body).eql({
                        body: "body"
                    });
                    return {test:'MASKED'}
                };

                shouldAuditURLStub.returns(true);

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                let expected = _.cloneDeep(expectedAuditRequest);
                expected.body = '{"test":"MASKED"}';
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expected,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });


            })
        });
        describe('And exclude headers contains an header to exclude', function () {
            var headerToExclude = 'header-to-exclude';
            beforeEach(function () {
                request.headers[headerToExclude] = 'other-value';
            });
            it('Should audit log without the specified header', function () {
                options.request.excludeHeaders = [headerToExclude];
                shouldAuditURLStub.returns(true);
                let prevHeaders = _.cloneDeep(request.headers);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.headers, prevHeaders, 'headers of request change');
            });
            it('Should audit log without the specified headers, if there are more than one', function () {
                var anotherHeaderToExclude = 'another';
                options.request.excludeHeaders = [headerToExclude, anotherHeaderToExclude];
                request.headers[anotherHeaderToExclude] = 'some value';
                shouldAuditURLStub.returns(true);
                let prevHeaders = _.cloneDeep(request.headers);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.headers, prevHeaders, 'headers of request change');

            });
            it('Should audit log with all headers, if exclude headers is an empty list', function () {
                options.request.excludeHeaders = ['other-header'];
                shouldAuditURLStub.returns(true);
                let prevHeaders = _.cloneDeep(request.headers);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);

                expectedAuditRequest.headers[headerToExclude] = 'other-value';
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.headers, prevHeaders, 'headers of request change');
                // Clear created header for other tests
                delete expectedAuditRequest.headers[headerToExclude];
            });
        });
        describe('And exclude Body contains field to exclude', function () {
            before(function () {
                shouldAuditURLStub.returns(true);
            });

            afterEach(function () {
                expectedAuditRequest.body = JSON.stringify(body);
            });
            it('Should audit log with body, if no excludeBody was written in options', function () {
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should audit log without body, when excludeBody with \'*\'', function () {
                options.request.excludeBody = [ALL_FIELDS];
                let prevBody = _.cloneDeep(request.body);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.body, prevBody, 'body of request change');

            });
            it('Should audit log without body, when excludeBody with \'*\' and body is plain text', function () {
                options.request.excludeBody = [ALL_FIELDS];
                request.body = 'test';

                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should audit log without body, when excludeBody by field and all body', function () {
                options.request.excludeBody = ['field1', ALL_FIELDS];
                request.body = { 'field1': 1, 'field2': 'test' };
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should audit log body without specific field, when excludeBody by existing and unexisting field', function () {
                options.request.excludeBody = ['field3', 'field1'];
                request.body = { 'field1': 1, 'field2': 'test' };
                let prevBody = _.cloneDeep(request.body);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = JSON.stringify({ 'field2': 'test' });
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.body, prevBody, 'body of request change');
            });
            it('Should audit log without body, when no body in request and excludeBody by field', function () {
                options.request.excludeBody = ['field3', 'field1'];
                delete request.body;
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });

            it('Should audit log without body, when body is number (not json)', function () {
                options.request.excludeBody = ['field3', 'field1'];
                request.body = 3;
                let prevBody = _.cloneDeep(request.body);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledOnce(loggerWarnStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.body, prevBody, 'body of request change');
            });

            it('Should audit log without body, when body is string (not json)', function () {
                options.request.excludeBody = ['field3', 'field1'];
                request.body = 'test';
                let prevBody = _.cloneDeep(request.body);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledOnce(loggerWarnStub);
                expectedAuditRequest.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.body, prevBody, 'body of request change');
            });

            it('Should audit log without body, when body is json array', function () {
                options.request.excludeBody = ['field3', 'field1'];
                let newBody = ['a', 'b', 'c'];
                request.body = _.cloneDeep(newBody);
                expectedAuditRequest.body = JSON.stringify(newBody);
                let prevBody = _.cloneDeep(request.body);
                loggerHelper.auditRequest(request, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.notCalled(loggerWarnStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'start', 
                    request: expectedAuditRequest,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(request.body, prevBody, 'body of request change');
            });
        });
    });

    describe('When calling auditResponse', function () {
        afterEach(function () {
            utils.shouldAuditURL.reset();
        });
        describe('And shouldAuditURL returns false', function () {
            it('Should not audit request/response', function () {
                shouldAuditURLStub.returns(false);

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.notCalled(loggerInfoStub);
            });
        });
        describe('And shouldSkipAuditFunc returns true', () => {
            it('Should not audit the request', () => {
                shouldAuditURLStub.returns(true);
                options.shouldSkipAuditFunc =(req, res) => {
                    return true;
                }

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.notCalled(loggerInfoStub);
            })
            it('Should pass req and res objects to the func', () => {
                shouldAuditURLStub.returns(true);
                options.shouldSkipAuditFunc =(req, res) => {
                    should(req).eql(request);
                    should(res).eql(response);
                    return true;
                }
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.notCalled(loggerInfoStub);
            })
        })
        describe('And shouldSkipAuditFunc returns false', () => {
            it('Should audit the request', () => {
                shouldAuditURLStub.returns(true);
                options.shouldSkipAuditFunc =(req, res) => {
                    return false;
                }

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
            })
            it('Should pass req and res objects to the func', () => {
                shouldAuditURLStub.returns(true);
                options.shouldSkipAuditFunc =(req, res) => {
                    should(req).eql(request);
                    should(res).eql(response);
                    return false;
                }
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
            })
        })        
        describe('And shouldAuditURL returns true', function () {
            it('Should audit request if options.request.audit is true', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                sinon.assert.notCalled(maskJsonSpy);
            });
            it('Should use _bodyStr if masking is not used', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                let differentJsonBody = Object.assign({ key: 'value' }, body);
                response.json(differentJsonBody);
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                sinon.assert.notCalled(maskJsonSpy);
            });
            it('Should use _bodyJson if masking is used', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.response.excludeBody = ['someFile'];
                let differentJsonBody = Object.assign({ key: 'value' }, body);
                response._bodyJson = differentJsonBody;
                let expectedMaskedAuditResponse = _.cloneDeep(expectedAuditResponse);
                expectedMaskedAuditResponse.body = JSON.stringify(differentJsonBody)
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedMaskedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                sinon.assert.calledOnce(maskJsonSpy);
            });
            it('Should shorten response body if options.response.maxBodyLength < response body length', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.response.maxBodyLength = 5;
                clock.tick(elapsed);
                const expectedAuditResponse = getExpectedAuditResponse();
                expectedAuditResponse.body = '{"bod...';

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp

                });
            });
            it('Should audit request if options.request.audit is true and options.response.maxBodyLength is not a positive integer', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.response.maxBodyLength = -5;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp

                });
            });
            it('Should not shorten response body if options.response.maxBodyLength > response body length', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.response.maxBodyLength = 500000000;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp

                });
            });
            it('Should not shorten request body if options.request.maxBodyLength > request body length', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.response.maxBodyLength = 500000;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp

                });
            });
            it('Should shorten request body if options.request.maxBodyLength < request body length', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                options.request.maxBodyLength = 5;
                clock.tick(elapsed);
                const expectedAuditRequest = getExpectedAuditRequest();
                expectedAuditRequest.body = '{"bod...';

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp

                });
            });
            it('Should log as error if getLogLevel returns error', () => {
                getLogLevelStub.returns('error');
                shouldAuditURLStub.returns(true);
                loggerHelper.auditResponse(request, response, options);

                sinon.assert.calledOnce(loggerErrorStub);
                sinon.assert.calledWith(loggerErrorStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            })
            it('Should log as info if getLogLevel returns garbage', () => {
                getLogLevelStub.returns('garbage');
                shouldAuditURLStub.returns(true);
                loggerHelper.auditResponse(request, response, options);

                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            })
            it('Should log as info if getLogLevel returns undefined', () => {
                getLogLevelStub.returns(undefined);
                shouldAuditURLStub.returns(true);
                loggerHelper.auditResponse(request, response, options);

                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            })
            it('Should audit request if options.request.audit is true', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should not audit request if options.request.audit is false', function () {
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                options.request.maxBodyLength = 50;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: undefined,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should audit response if options.response.audit is true', function () {
                shouldAuditURLStub.returns(true);
                options.response.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should not audit response if options.response.audit is false', function () {
                shouldAuditURLStub.returns(true);
                options.response.audit = false;
                options.response.maxBodyLength = 50;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: undefined,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should log empty values as N/A', function () {
                request = undefined;
                response = undefined;

                shouldAuditURLStub.returns(true);
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
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
                        headers: NA,
                        body: NA
                    },
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
        });
        describe('And exclude Body contains field to exclude', function () {
            before(function () {
                shouldAuditURLStub.returns(true);
            });

            afterEach(function () {
                expectedAuditResponse.body = JSON.stringify(body);
            });
            it('Should audit log with body, if no excludeBody was written in options', function () {
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
            });
            it('Should audit log without body, when excludeBody with \'*\'', function () {
                options.response.excludeBody = [ALL_FIELDS];
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
            });
            it('Should audit log without body, when excludeBody with \'*\' and body is plain text', function () {
                options.response.excludeBody = [ALL_FIELDS];
                response.body = 'test';
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
            });
            it('Should audit log without body, when excludeBody by field and all body', function () {
                options.response.excludeBody = ['field1', ALL_FIELDS];
                response._bodyStr = JSON.stringify({ 'field1': 1, 'field2': 'test' });
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
            });
            it('Should audit log body without specific field, when excludeBody by existing and unexisting field', function () {
                options.response.excludeBody = ['field3', 'field1'];
                response._bodyStr = JSON.stringify({ 'field1': 1, 'field2': 'test' });
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = JSON.stringify({ 'field2': 'test' });
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
            });
            it('Should audit log without body, when no body in response and excludeBody by field', function () {
                options.response.excludeBody = ['field3', 'field1'];
                delete response._bodyStr;
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                expectedAuditResponse.body = NA;
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
            });
        });
        describe('And exclude headers contains an header to exclude', function () {
            var headerToExclude = 'header-to-exclude';
            before(() => {
                shouldAuditURLStub.returns(true);
            });

            beforeEach(function () {
                response.setHeader(headerToExclude, 'other-value');
            });

            it('Should audit log without the specified header', function () {
                options.response.excludeHeaders = [headerToExclude];
                let prevHeaders = _.cloneDeep(response.getHeaders());
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });

                should.deepEqual(response.getHeaders(), prevHeaders, 'headers of response change');
            });
            it('Should audit log without all headers', function () {
                options.response.excludeHeaders = [ALL_FIELDS];
                let prevHeaders = _.cloneDeep(response.getHeaders());
                loggerHelper.auditResponse(request, response, options);
                expectedAuditResponse.headers = NA;
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });

                should.deepEqual(response.getHeaders(), prevHeaders, 'headers of response change');
            });
            it('Should audit log without the specified headers, if there are more than one', function () {
                var anotherHeaderToExclude = 'another';
                options.response.excludeHeaders = [headerToExclude, anotherHeaderToExclude];
                response.setHeader(anotherHeaderToExclude, 'some value');

                let prevHeaders = _.cloneDeep(response.getHeaders());
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });

                should.deepEqual(response.getHeaders(), prevHeaders, 'headers of response change');
            });
            it('Should audit log with all headers, if exclude headers is an empty list', function () {
                options.response.excludeHeaders = ['other-header'];

                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);

                expectedAuditResponse.headers[headerToExclude] = 'other-value';
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                // Clear created header for other tests
                delete expectedAuditResponse.headers[headerToExclude];
            });
        });
        describe('And mask Body', function () {
            before(function () {
                shouldAuditURLStub.returns(true);
            });

            afterEach(function () {
                expectedAuditResponse.body = JSON.stringify(body);
            });
            it('Should audit log with body, if mask body specific field', function () {
                options.response.maskBody = ['test1'];
                let newBody = {
                    body: 'body',
                    test1: 'test2'
                };
                response._bodyStr = _.cloneDeep(newBody);
                let prevBody = _.cloneDeep(response.body);
                loggerHelper.auditResponse(request, response, options);
                sinon.assert.calledOnce(loggerInfoStub);
                newBody.test1 = MASK;
                expectedAuditResponse.body = JSON.stringify(newBody);
                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
                sinon.assert.calledOnce(maskJsonSpy);
            });
            it('Should not mask body if response content type is not json', () => {
                let testContentType = 'text/xml';
                options.response.maskBody = ['test1'];
                let newBody = {
                    body: 'body',
                    test1: 'test2'
                };
                response.setHeader('content-type', testContentType)
                response._bodyStr = _.cloneDeep(newBody);
                let prevBody = _.cloneDeep(response.body);

                loggerHelper.auditResponse(request, response, options);

                expectedAuditResponse.body = JSON.stringify(newBody);
                expectedAuditResponse.headers['content-type'] = testContentType;

                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
                sinon.assert.notCalled(maskJsonSpy);
            });
            it('Should not mask body if no headers', () => {
                options.response.maskBody = ['test1'];
                let newBody = {
                    body: 'body',
                    test1: 'test2'
                };

                Object.keys(response.getHeaders())
                  .map(headerName => response.removeHeader(headerName));

                response._bodyStr = _.cloneDeep(newBody);
                let prevBody = _.cloneDeep(response.body);

                loggerHelper.auditResponse(request, response, options);

                expectedAuditResponse.body = JSON.stringify(newBody);

                expectedAuditResponse.headers = NA;

                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
                sinon.assert.notCalled(maskJsonSpy);
            });
            it('Should not mask body if no content type header', () => {
                options.response.maskBody = ['test1'];
                let newBody = {
                    body: 'body',
                    test1: 'test2'
                };
                response.removeHeader('content-type') ;
                response._bodyStr = _.cloneDeep(newBody);
                let prevBody = _.cloneDeep(response.body);

                loggerHelper.auditResponse(request, response, options);

                expectedAuditResponse.body = JSON.stringify(newBody);
                delete expectedAuditResponse.headers['content-type'];

                sinon.assert.calledWith(loggerInfoStub, {
                    stage: 'end', 
                    request: expectedAuditRequest,
                    response: expectedAuditResponse,
                    'utc-timestamp': expectedUTCTimestamp,
                    'millis-timestamp': expectedMillisTimestamp
                });
                should.deepEqual(response.body, prevBody, 'body of resopnse change');
                sinon.assert.notCalled(maskJsonSpy);
            });
        });
    });
});
