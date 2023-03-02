'use strict';

var  rewire = require('rewire'),
    expressLogger = rewire('../lib/express-logger'),
    httpMocks = require('node-mocks-http'),
    loggerHelper = require('../lib/logger-helper'),
    sinon = require('sinon'),
    should = require('should');

describe('express-logger tests', function(){
    var sandbox, auditRequestStub, auditResponseStub;
    var resEndStub, resWriteStub, resJsonStub;
    var req, res, next;

    before(function(){
        sandbox = sinon.sandbox.create();
        next = sandbox.stub();
    });

    after(function(){
        sandbox.restore();
    });

    beforeEach(function(){
        auditRequestStub = sandbox.stub(loggerHelper, 'auditRequest');
        auditResponseStub = sandbox.stub(loggerHelper, 'auditResponse');

        req = httpMocks.createRequest();
        res = httpMocks.createResponse();

        resEndStub = sandbox.stub(res, 'end');
        resWriteStub = sandbox.stub(res, 'write');
        resJsonStub = sandbox.stub(res, 'json');

        next = sandbox.stub();
    });

    afterEach(function(){
        loggerHelper.auditRequest.restore();
        loggerHelper.auditResponse.restore();
    });
    describe('When calling express-logger module', function(){
        it('should correctly setup', function(){
            let options = {
                request: {
                    audit: false,
                    maskBody: [10],
                    excludeBody: ['s'],
                    excludeHeaders: [2],
                    maskHeaders: [3],
                    maxBodyLength: 50
                },
                response: {
                    audit: false,
                    maskBody: [false],
                    excludeBody: ['t'],
                    excludeHeaders: ['d'],
                    maskHeaders: [2],
                    maxBodyLength: 50
                },
                doubleAudit: true,
                excludeURLs: ['a']
            };

             let expectedOptions = {
                    request: {
                        audit: false,
                        maskBody: [10],
                        maskQuery: [],
                        excludeBody: ['s'],
                        excludeHeaders: [2],
                        maskHeaders: [3],
                        maxBodyLength: 50
                    },
                    response: {
                        audit: false,
                        maskBody: [false],
                        excludeBody: ['t'],
                        excludeHeaders: ['d'],
                        maskHeaders: [2],
                        maxBodyLength: 50
                    },
                    doubleAudit: true,
                    excludeURLs: ['a']
                };

            expressLogger(options);
            let convertedOptions = expressLogger.__get__('setupOptions');
           delete convertedOptions.logger;
           (convertedOptions).should.containEql(expectedOptions);

        });
        it('should correctly setup in case of wrong options', function(){
            let options = {
                request: {
                    audit: false,
                    maskBody: 10,
                    excludeBody: 's',
                    excludeHeaders: 2,
                    maskHeaders: 3,
                    maxBodyLength: -5
                },
                response: {
                    audit: false,
                    maskBody: false,
                    excludeBody: 't',
                    excludeHeaders: 'd',
                    maskHeaders: 2,
                    maxBodyLength: 'asd'
                },
                doubleAudit: true,
                excludeURLs: 'a'
            };

             let expectedOptions = {
                    request: {
                        audit: false,
                        maskBody: [],
                        maskQuery: [],
                        excludeBody: [],
                        excludeHeaders: [],
                        maskHeaders: [],
                        maxBodyLength: undefined
                    },
                    response: {
                        audit: false,
                        maskBody: [],
                        excludeBody: [],
                        excludeHeaders: [],
                        maskHeaders: [],
                        maxBodyLength: undefined
                    },
                    doubleAudit: true,
                    excludeURLs: []
                };

                try {
                    expressLogger(options);
                    should.fail('Expected to throw an error');
                } catch (err){
                    should(err.message).eql('Invalid value specified for field: request.maskBody, expected array');
                }
        });
        it('should audit response and call next', function(){
            var auditMethod = expressLogger();
            // Start request
            auditMethod(req, res, next);
            should(auditRequestStub.called).eql(false);
            should(next.calledOnce).eql(true);

            // End request
            res.end();
            should(resEndStub.called).eql(true);
            should(auditResponseStub.called).eql(true);
        });
        it('should call auditRequest if options.doubleAudit = true', function(){
            var options = {
                doubleAudit: true
            };

            var auditMethod = expressLogger(options);
            // Start request
            auditMethod(req, res, next);
            should(auditRequestStub.called).eql(true);
            should(next.calledOnce).eql(true);

            // End request
            res.end();
            should(resEndStub.calledOnce).eql(true);
            should(auditResponseStub.calledOnce).eql(true);
        });
        it('should call auditRequest if options.doubleAudit = true', function(){
            var options = {
                doubleAudit: true
            };

            var auditMethod = expressLogger(options);
            // Start request
            auditMethod(req, res, next);
            should(auditRequestStub.called).eql(true);
            should(next.calledOnce).eql(true);

            // End request
            res.end();
            should(resEndStub.calledOnce).eql(true);
            should(auditResponseStub.calledOnce).eql(true);
        });
        it('Should add body from write chunks to response', function(){
            var auditMethod = expressLogger();
            // Start request
            auditMethod(req, res, next);
            should(next.calledOnce).eql(true);

            // Write to res
            res.write('chunk');
            should(resWriteStub.calledOnce).eql(true);

            // End request
            res.end();
            should(resEndStub.calledOnce).eql(true);
            should(auditResponseStub.calledOnce).eql(true);
            should(res._bodyStr).eql('chunk');
        });
        it('Should add body from end chunk to response', function(){
            var auditMethod = expressLogger();
            // Start request
            auditMethod(req, res, next);
            should(next.calledOnce).eql(true);

            // End request
            res.end('chunk');
            should(resEndStub.calledOnce).eql(true);
            should(auditResponseStub.calledOnce).eql(true);
            should(res._bodyStr).eql('chunk');
        });
        it('Should add bodyJson to response', function(){
            var auditMethod = expressLogger();
            // Start request
            auditMethod(req, res, next);
            should(next.calledOnce).eql(true);

            // End request
            res.json({ key: 'value'});
            res.end('chunk');
            should(resEndStub.calledOnce).eql(true);
            sinon.assert.calledOnce(resJsonStub);
            sinon.assert.calledWith(resJsonStub, {key: 'value'});
            should(auditResponseStub.calledOnce).eql(true);
            should(res._bodyStr).eql('chunk');
            should(res._bodyJson).eql({key: 'value'});
        });
        it('Should by default return false in shouldSkipAuditFunc', () => {
            expressLogger();
            let convertedOptions = expressLogger.__get__('setupOptions');
            let res = convertedOptions.shouldSkipAuditFunc()
            should(res).eql(false);
        })
    });
});