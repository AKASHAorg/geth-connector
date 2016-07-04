"use strict";
const index_1 = require('../index');
const events = require('../lib/Constants');
const sinon = require('sinon');
const path_1 = require('path');
const rimraf = require('rimraf');
const chai_1 = require('chai');
const binPath = path_1.join(__dirname, 'testBin');
const txQueue = [
    '0x8ed40509ad7087b45190488fcee0a8ff96c9349a9c99d6c0cc7f419f05204ace',
    '0x5f66db0283e5a155b10fa7744c776db395e3a2d5963b133b7968d5078045b51f',
    '0x0c7b697e3dcd0bc1ceacdf004f1402e87ddb66eca7a0b559228c013699b71f47',
    '0x64f95b53c085b3f860b74fedcf60758fe6d9ace45978571bb8d93ebbdbd7893f'
];
describe('GethConnector', function () {
    this.timeout(120000);
    before(function (done) {
        txQueue.forEach(function (hash) {
            index_1.gethHelper.addTxToWatch(hash, false);
        });
        index_1.GethConnector.getInstance().setLogger({
            info: function () {
            },
            error: function () {
            },
            warn: function () {
            }
        });
        rimraf(binPath, function () {
            done();
        });
    });
    it('should #start geth process', function (done) {
        const spy = sinon.spy();
        index_1.GethConnector.getInstance().once(events.STARTING, spy);
        index_1.GethConnector.getInstance().once(events.STARTED, function () {
            done();
        });
        index_1.GethConnector.getInstance().once(events.FATAL, function () {
            throw new Error('could not start geth #FATAL');
        });
        index_1.GethConnector.getInstance().once(events.FAILED, function (reason) {
            throw new Error(`could not start geth #FAILED ${reason}`);
        });
        index_1.GethConnector.getInstance().start();
        sinon.assert.calledOnce(spy);
    });
    it('should emit downloading event', function (done) {
        index_1.GethConnector.getInstance().setBinPath(binPath);
        index_1.GethConnector.getInstance().once(events.DOWNLOADING_BINARY, function () {
            done();
        });
        index_1.GethConnector.getInstance().once(events.BINARY_CORRUPTED, function () {
            throw new Error('There was a problem with geth binary');
        });
        setTimeout(function () {
            index_1.GethConnector.getInstance().restart();
        }, 7000);
    });
    it('should detect required version for geth', function (done) {
        index_1.GethConnector.getInstance().once(events.ETH_NODE_OK, function () {
            done();
        });
    });
    it('should be able to call web3 methods', function (done) {
        chai_1.expect(index_1.GethConnector.getInstance().web3).to.exist;
        index_1.GethConnector.getInstance().web3.eth.getBlockAsync(0).then((data) => {
            chai_1.expect(data).to.exist;
            done();
        });
    });
    it('should get syncronization status', function (done) {
        index_1.gethHelper.inSync().then((data) => {
            done();
        });
    });
    it('should be able to append tx to queue', function () {
        chai_1.expect(index_1.gethHelper
            .addTxToWatch('0x0aabd7a4338df3d89a35df4653120451c59ebe415e0fd875a8f2e16d68c5a7c6', false)).not.to.throw;
    });
    it('should get notified when tx is mined', function (done) {
        this.timeout(180000);
        let calledTimes = 0;
        const expectedTimes = index_1.gethHelper.txQueue.size;
        index_1.GethConnector.getInstance().on(events.TX_MINED, function (tx) {
            calledTimes++;
            if (!index_1.gethHelper.watching) {
                chai_1.expect(calledTimes).to.equal(expectedTimes);
                done();
            }
        });
        function insync() {
            index_1.gethHelper.inSync().then((data) => {
                if (data.length === 0) {
                    return chai_1.expect(index_1.gethHelper.startTxWatch()).not.to.throw;
                }
                return setTimeout(function () { insync(); }, 500);
            });
        }
        insync();
    });
    it('should #stop geth process', function (done) {
        const spy = sinon.spy();
        index_1.GethConnector.getInstance().on(events.STOPPING, spy);
        index_1.GethConnector.getInstance().stop().then(() => done());
        sinon.assert.calledOnce(spy);
    });
    after(function (done) {
        rimraf(binPath, function () {
            done();
        });
    });
});
