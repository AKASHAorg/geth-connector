import {GethConnector, gethHelper} from '../index';
import * as events from '../lib/Constants';
import * as sinon from 'sinon';
import {join as pathJoin} from 'path';
import * as rimraf from 'rimraf';
import {expect} from 'chai';

const binPath = pathJoin(__dirname, 'testBin');
const txQueue = [
    '0xc52ea505a81076f98f3f56b893de417c524f98fa3a8bc66c0ba0edf73e52dca7',
    '0xde6bbfbe189c1d4baa7791e485e17a0c27a362391c8446741ff99a03302c74e6',
    '0x07dd3144fdd597692c7521af83e95f4accb6bb21738da72806c5de1af33517de',
    '0xc93da25b1c88a6b0484b81e54163958ff9a1a4a9b7064c8e2ac6f14b9eab4a87'
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
                .addTxToWatch('0x8e5dce4185f942d34da7449eea20010d9eead8159631ef8a6ef725c86050d12f', false)
        ).not.to.throw;
    });

    /**
     * Must be synced for this to work
     * works only on testnet(tx hash sources)
     */
    it.skip('should get notified when tx is mined', function (done) {
        this.timeout(180000);
        let calledTimes = 0;
        const expectedTimes = gethHelper.txQueue.size;
        const cb =  (tx: string) => {
            calledTimes++;
            if (!gethHelper.watching) {
                expect(calledTimes).to.equal(expectedTimes);
                GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        GethConnector.getInstance().on(events.TX_MINED, cb);
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

    it.skip('should autowatch new transaction', function (done){
        const txHash = '0x3273b3cf0cc4fbc5a32ad635c693c960f2e1a5789077b29255f875afa8e0251b';
        const cb =  (tx: string) => {
            if (tx === txHash) {
                GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        GethConnector.getInstance().on(events.TX_MINED, cb);
        gethHelper.addTxToWatch(txHash);
    });

    it.skip('should autowatch multiple transactions', function (done){
        const txPool = [
            '0x97215aeab84b8fc4d6398743ab4ba88c49b67cc4ee6c2e8adc139bd429dc371f',
            '0xe76b6e7c5327fc03d33d84795dd697d3259ff4340d4a400b2865ee96c2fc9b31',
            '0x6d8f06aff5e14694959c1fd9ab18775b07781d75b0fe0b65b5e5cf58a227b040',
            '0x5a88ffee1023f6898138bf1790c2884257c63e573b375f7d1b195efd6d4f9de5',
            '0x92c1abf1b0a8ac8a5a6d43255064ed95c17b2cbc898c46151656f9baaba23c63'
        ];
        gethHelper.stopTxWatch();
        const cb = (tx: string) => {
            const index = txPool.indexOf(tx);
            txPool.splice(index, 1);
            if (txPool.length === 0) {
                GethConnector.getInstance().removeAllListeners(events.TX_MINED);
                done();
            }
        };
        GethConnector.getInstance().on(events.TX_MINED, cb);
        txPool.forEach((tx) => {
            gethHelper.addTxToWatch(tx);
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