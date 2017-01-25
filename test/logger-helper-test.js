'use strict';

var httpMocks = require('node-mocks-http'),
    loggerHelper = require('../lib/logger-helper'),
    should = require('should'),
    utils = require('../lib/utils'),
    sinon = require('sinon');

var method = 'POST';
var url = 'somepath/123';
var elapsed = 10;
var body = {
    body: 'body'
};


describe('logger-helpers tests', function(){
    var sandbox, clock, loggerInfoStub, shouldAuditURLStub;
    var request, response, options;

    var expectedAuditRequest = {
        headers: {},
        body: JSON.stringify(body),
        url: url,
        method: method
    };
    var expectedAuditResponse = {
        status_code: 200,
        body: undefined,
        elapsed: elapsed
    };
    before(function(){
        sandbox = sinon.sandbox.create();
        clock = sinon.useFakeTimers();
    });
    after(function(){
        sandbox.restore();
        clock.restore();
    });
    beforeEach(function(){
        request = httpMocks.createRequest({
            method: method,
            url: url,
            body: body
        });

        request.startTime = new Date();
        response = httpMocks.createResponse();

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
        shouldAuditURLStub = sandbox.stub(utils, 'shouldAuditURL');
    });
    afterEach(function(){
        utils.shouldAuditURL.restore();
    });
    describe('When calling auditRequest', function(){
        describe('And shouldAuditURL returns false', function(){
            it('Should not audit request', function(){
                shouldAuditURLStub.returns(false);

                loggerHelper.auditRequest(request, options);
                should(loggerInfoStub.called).eql(false);
            });
        });
        describe('And shouldAuditURL returns true', function(){
            it('Should audit request if options.request.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                loggerHelper.auditRequest(request, options);
                should(loggerInfoStub.calledOnce).eql(true);
                //should(loggerInfoStub.calledWith({ request: undefined })).eql(true);
            });
            it('Should not audit request if options.request.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                loggerHelper.auditRequest(request, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({ request: undefined })).eql(true);
            });
        });
    });

    describe('When calling auditResponse', function(){
        describe('And shouldAuditURL returns false', function(){
            it('Should not audit request/response', function(){
                shouldAuditURLStub.returns(false);

                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.called).eql(false);
            });
        });
        describe('And shouldAuditURL returns true', function(){
            it('Should audit request if options.request.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({
                    request: expectedAuditRequest,
                    response: expectedAuditResponse
                })).eql(true);
            });
            it('Should not audit request if options.request.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.request.audit = false;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({
                    request: undefined,
                    response: expectedAuditResponse
                })).eql(true);
            });
            it('Should audit response if options.response.audit is true', function(){
                shouldAuditURLStub.returns(true);
                options.response.audit = true;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({
                    request: expectedAuditRequest,
                    response: expectedAuditResponse
                })).eql(true);
            });
            it('Should not audit response if options.response.audit is false', function(){
                shouldAuditURLStub.returns(true);
                options.response.audit = false;
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({
                    request: expectedAuditRequest,
                    response: undefined
                })).eql(true);
            });
            it('Should log empty values as N/A', function(){
                request = undefined;
                response = undefined;

                shouldAuditURLStub.returns(true);
                clock.tick(elapsed);
                loggerHelper.auditResponse(request, response, options);
                should(loggerInfoStub.calledOnce).eql(true);
                should(loggerInfoStub.calledWith({
                    request: {
                        headers: 'N/A',
                        body: 'N/A',
                        url: 'N/A',
                        method: 'N/A'
                    },
                    response: {
                        status_code: 'N/A',
                        body: 'N/A',
                        elapsed: 0
                    }
                })).eql(true);
            });
        });
    });
});