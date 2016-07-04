import {GethConnector, gethHelper} from '../index';
import * as events from '../lib/Constants';
import * as sinon from 'sinon';
import {join as pathJoin} from 'path';
import * as rimraf from 'rimraf';
import {expect} from 'chai';

const binPath = pathJoin(__dirname, 'testBin');
const txQueue = [
    '0x8ed40509ad7087b45190488fcee0a8ff96c9349a9c99d6c0cc7f419f05204ace',
    '0x5f66db0283e5a155b10fa7744c776db395e3a2d5963b133b7968d5078045b51f',
    '0x0c7b697e3dcd0bc1ceacdf004f1402e87ddb66eca7a0b559228c013699b71f47',
    '0x64f95b53c085b3f860b74fedcf60758fe6d9ace45978571bb8d93ebbdbd7893f'
];
describe('GethConnector', function () {
    this.timeout(120000);
    before(function (done) {
        txQueue.forEach(
            function (hash) {
                gethHelper.addTxToWatch(hash, false);
            }
        );
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
        const spy = sinon.spy();
        GethConnector.getInstance().once(events.STARTING, spy);
        GethConnector.getInstance().once(events.STARTED, function () {
            done();
        });
        GethConnector.getInstance().once(events.FATAL, function () {
            throw new Error('could not start geth #FATAL');
        });

        GethConnector.getInstance().once(events.FAILED, function (reason: string) {
            throw new Error(`could not start geth #FAILED ${reason}`);
        });
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

    it('should be able to call web3 methods', function (done) {
        expect(GethConnector.getInstance().web3).to.exist;
        GethConnector.getInstance().web3.eth.getBlockAsync(0).then((data: any) => {
            expect(data).to.exist;
            done();
        });
    });

    it('should get syncronization status', function (done) {
        gethHelper.inSync().then((data: any[]) => {
            done();
        });
    });

    it('should be able to append tx to queue', function () {
        expect(
            gethHelper
                .addTxToWatch('0x0aabd7a4338df3d89a35df4653120451c59ebe415e0fd875a8f2e16d68c5a7c6', false)
        ).not.to.throw;
    });

    /**
     * Must be synced for this to work
     * works only on testnet(tx hash sources)
     */
    it('should get notified when tx is mined', function (done) {
        this.timeout(180000);
        let calledTimes = 0;
        const expectedTimes = gethHelper.txQueue.size;
        GethConnector.getInstance().on(events.TX_MINED, function (tx: string) {
            calledTimes++;
            if (!gethHelper.watching) {
                expect(calledTimes).to.equal(expectedTimes);
                done();
            }
        });
        function insync() {
             gethHelper.inSync().then(
                (data) => {
                    if (data.length === 0) {
                        return expect(
                            gethHelper.startTxWatch()
                        ).not.to.throw;
                    }
                    return setTimeout(function(){ insync(); }, 500);
                }
            );
        }
        insync();
    });

    it('should #stop geth process', function (done) {
        const spy = sinon.spy();
        GethConnector.getInstance().on(events.STOPPING, spy);
        GethConnector.getInstance().stop().then(() => done());
        sinon.assert.calledOnce(spy);
    });

    after(function (done) {
        rimraf(binPath, function () {
            done();
        });
    });

});