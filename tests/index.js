"use strict";
const index_1 = require('../index');
const events = require('../lib/Constants');
const sinon = require('sinon');
const path_1 = require('path');
const rimraf = require('rimraf');
const chai_1 = require('chai');
const TestRPC = require('ethereumjs-testrpc');
const binPath = path_1.join(__dirname, 'testBin');
let accounts = [];
describe('GethConnector', function () {
    this.timeout(60000);
    before(function (done) {
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
    it('should write genesis block', function (done) {
        index_1.GethConnector.getInstance().setOptions({ datadir: path_1.join(__dirname, 'testBin', 'chain') });
        index_1.GethConnector.getInstance().writeGenesis(path_1.join(__dirname, 'genesis.json'), (err, data) => {
            chai_1.expect(err).to.not.exist;
            done();
        });
    });
    it('should #start geth process', function (done) {
        this.timeout(360000);
        const spy = sinon.spy();
        index_1.GethConnector.getInstance().once(events.STARTING, spy);
        index_1.GethConnector.getInstance().once(events.IPC_CONNECTED, function () {
            done();
        });
        index_1.GethConnector.getInstance().once(events.FATAL, function (err) {
            throw new Error(`could not start geth #FATAL ${err}`);
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
    it('should change web3 provider', function () {
        index_1.GethConnector.getInstance().web3.setProvider(TestRPC.provider());
        chai_1.expect(index_1.GethConnector.getInstance().web3.currentProvider.manager).to.be.an('object');
    });
    it('should be able to call web3 methods', function (done) {
        chai_1.expect(index_1.GethConnector.getInstance().web3).to.exist;
        index_1.GethConnector.getInstance().web3.eth.getBlockAsync(0).then((data) => {
            chai_1.expect(data).to.exist;
            done();
        });
    });
    it('should verify if address has local key', function (done) {
        index_1.gethHelper.hasKey('0x0000000000000000000000000000000000000000').then((found) => {
            chai_1.expect(found).to.be.false;
        });
        index_1.GethConnector.getInstance()
            .web3
            .eth
            .getAccountsAsync()
            .then((list) => {
            accounts = list;
            index_1.gethHelper.hasKey(list[0]).then((found) => {
                chai_1.expect(found).to.be.true;
                done();
            });
        });
    });
    it('should get syncronization status', function (done) {
        index_1.gethHelper.inSync().then((data) => {
            chai_1.expect(data).to.not.be.undefined;
            done();
        });
    });
    it('should be able to append tx to queue', function (done) {
        index_1.GethConnector.getInstance()
            .web3
            .eth
            .sendTransactionAsync({ from: accounts[0], to: accounts[1], value: 100 })
            .then((tx) => {
            chai_1.expect(index_1.gethHelper
                .addTxToWatch(tx, false)).not.to.throw;
            done();
        });
    });
    it('should autowatch new transaction', function (done) {
        let txHash;
        const cb = (tx) => {
            if (tx === txHash) {
                index_1.GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        index_1.gethHelper.syncing = false;
        index_1.GethConnector.getInstance().on(events.TX_MINED, cb);
        index_1.GethConnector.getInstance()
            .web3
            .eth
            .sendTransactionAsync({ from: accounts[0], to: accounts[1], value: 200 })
            .then((tx) => {
            txHash = tx;
            index_1.gethHelper.addTxToWatch(tx);
        });
    });
    it('should autowatch multiple transactions and emit when mined', function (done) {
        const txPool = [1, 2, 3].map((value) => {
            return index_1.GethConnector.getInstance()
                .web3
                .eth
                .sendTransactionAsync({ from: accounts[0], to: accounts[1], value: 100 * value });
        });
        let lList = [];
        index_1.gethHelper.stopTxWatch();
        const cb = (tx) => {
            const index = lList.indexOf(tx);
            lList.splice(index, 1);
            if (lList.length === 0) {
                index_1.GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        index_1.GethConnector.getInstance().on(events.TX_MINED, cb);
        Promise.all(txPool).then((list) => {
            lList = list;
            list.forEach((tx) => {
                index_1.gethHelper.addTxToWatch(tx);
            });
        });
    });
    it('should #stop geth process', function (done) {
        const spy = sinon.spy();
        index_1.GethConnector.getInstance().on(events.STOPPING, spy);
        index_1.GethConnector.getInstance().stop().then(() => done());
        sinon.assert.calledOnce(spy);
    });
    after(function (done) {
        rimraf(binPath, function () {
            index_1.GethConnector.getInstance().removeAllListeners(events.TX_MINED);
            done();
        });
    });
});
