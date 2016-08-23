import { GethConnector, gethHelper } from '../index';
import * as events from '../lib/Constants';
import * as sinon from 'sinon';
import { join as pathJoin } from 'path';
import * as rimraf from 'rimraf';
import { expect } from 'chai';
import TestRPC = require('ethereumjs-testrpc');

const binPath = pathJoin(__dirname, 'testBin');
let accounts: string[] = [];
describe('GethConnector', function () {
    this.timeout(120000);
    before(function (done) {
        GethConnector.getInstance().setLogger({
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
        this.timeout(360000);
        const spy = sinon.spy();
        GethConnector.getInstance().once(events.STARTING, spy);
        GethConnector.getInstance().once(events.IPC_CONNECTED, function () {
            done();
        });
        GethConnector.getInstance().once(events.FATAL, function (err: string) {
            throw new Error(`could not start geth #FATAL ${err}`);
        });

        GethConnector.getInstance().once(events.FAILED, function (reason: string) {
            throw new Error(`could not start geth #FAILED ${reason}`);
        });
        GethConnector.getInstance().setOptions({ datadir: pathJoin(__dirname, 'testBin', 'chain') });
        GethConnector.getInstance().start();
        sinon.assert.calledOnce(spy);
    });

    it('should emit downloading event', function (done) {
        // set the new bin path
        GethConnector.getInstance().setBinPath(binPath);
        GethConnector.getInstance().once(events.DOWNLOADING_BINARY, function () {
            done();
        });

        GethConnector.getInstance().once(events.BINARY_CORRUPTED, function () {
            // explicit fail
            throw new Error('There was a problem with geth binary');
        });
        setTimeout(function () {
            // trigger downloading
            GethConnector.getInstance().restart();
        }, 7000);
    });

    it('should detect required version for geth', function (done) {
        GethConnector.getInstance().once(events.ETH_NODE_OK, function () {
            done();
        });
    });

    it('should change web3 provider', function () {
        GethConnector.getInstance().web3.setProvider(TestRPC.provider());
        expect(GethConnector.getInstance().web3.currentProvider.manager).to.be.an('object');
    });

    it('should be able to call web3 methods', function (done) {
        expect(GethConnector.getInstance().web3).to.exist;
        GethConnector.getInstance().web3.eth.getBlockAsync(0).then((data: any) => {
            expect(data).to.exist;
            done();
        });
    });

    it('should verify if address has local key', function (done) {
        gethHelper.hasKey('0x0000000000000000000000000000000000000000').then((found: boolean) => {
            expect(found).to.be.false;
        });

        GethConnector.getInstance()
            .web3
            .eth
            .getAccountsAsync()
            .then((list: string[]) => {
                accounts = list;
                gethHelper.hasKey(list[0]).then((found: boolean) => {
                    expect(found).to.be.true;
                    done();
                });
            });
    });

    it('should get syncronization status', function (done) {
        gethHelper.inSync().then((data: any[]) => {
            expect(data).to.not.be.undefined;
            done();
        });
    });

    it('should be able to append tx to queue', function (done) {
        GethConnector.getInstance()
            .web3
            .eth
            .sendTransactionAsync({from: accounts[0], to: accounts[1], value: 100})
            .then((tx: string) => {
                expect(
                    gethHelper
                        .addTxToWatch(tx, false)
                ).not.to.throw;
                done();
            });
    });

    it('should autowatch new transaction', function (done) {
        let txHash: string;
        const cb = (tx: string) => {
            if (tx === txHash) {
                GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        gethHelper.syncing = false;
        GethConnector.getInstance().on(events.TX_MINED, cb);
        GethConnector.getInstance()
            .web3
            .eth
            .sendTransactionAsync({from: accounts[0], to: accounts[1], value: 200})
            .then((tx: string) => {
                txHash = tx;
                gethHelper.addTxToWatch(tx);
            });
    });

    it('should autowatch multiple transactions and emit when mined', function (done) {
        const txPool = [1, 2, 3].map((value) => {
            return GethConnector.getInstance()
                .web3
                .eth
                .sendTransactionAsync({from: accounts[0], to: accounts[1], value: 100 * value});
        });
        let lList: any[] = [];
        gethHelper.stopTxWatch();
        const cb = (tx: string) => {
            const index = lList.indexOf(tx);
            lList.splice(index, 1);
            if (lList.length === 0) {
                GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        GethConnector.getInstance().on(events.TX_MINED, cb);
        Promise.all(txPool).then((list) => {
            lList = list;
            list.forEach((tx) => {
                gethHelper.addTxToWatch(tx);
            });
        });
    });

    it('should #stop geth process', function (done) {
        const spy = sinon.spy();
        GethConnector.getInstance().on(events.STOPPING, spy);
        GethConnector.getInstance().stop().then(() => done());
        sinon.assert.calledOnce(spy);
    });

    after(function (done) {
        rimraf(binPath, function () {
            GethConnector.getInstance().removeAllListeners(events.TX_MINED)
            done();
        });
    });

});