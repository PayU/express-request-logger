var expressLogger = require('../lib/express-logger'),
    httpMocks = require('node-mocks-http'),
    loggerHelper = require('../lib/logger-helper'),
    sinon = require('sinon'),
    should = require('should');

describe('express-logger tests', function(){
    var sandbox, auditRequestStub, auditResponseStub;
    var resEndStub, resWriteStub;
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

        next = sandbox.stub();
    });

    afterEach(function(){
        loggerHelper.auditRequest.restore();
        loggerHelper.auditResponse.restore();
    });
    describe('When calling express-logger module', function(){
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
            should(res._body).eql('chunk');
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
            should(res._body).eql('chunk');
        });
    });
});