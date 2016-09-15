"use strict";
const GethConnector_1 = require('./GethConnector');
const Promise = require('bluebird');
const Constants_1 = require('./Constants');
class GethHelper {
    constructor() {
        this.txQueue = new Map();
        this.syncing = true;
        this.watching = false;
    }
    inSync() {
        if (!GethConnector_1.default.getInstance().serviceStatus.api) {
            return Promise.reject(new Error('not connected to IPC'));
        }
        const rules = [
            GethConnector_1.default.getInstance().web3.eth.getSyncingAsync(),
            GethConnector_1.default.getInstance().web3.net.getPeerCountAsync(),
            GethConnector_1.default.getInstance().web3.eth.getBlockAsync('latest')
        ];
        return Promise.all(rules).then((data) => {
            const timeStamp = Math.floor(new Date().getTime() / 1000);
            if (data[0]) {
                return [data[1], data[0]];
            }
            if (!data[0] && data[1] > 0 && (data[2].timestamp + 60 * 2) > timeStamp) {
                this.syncing = false;
                return [];
            }
            return [data[1]];
        });
    }
    startTxWatch() {
        if (this.syncing) {
            return this.inSync().then(() => {
                if (this.syncing) {
                    throw new Error('Geth node is syncing, try calling #inSync() before this');
                }
                return this.startTxWatch();
            });
        }
        if (this.txQueue.size === 0) {
            return;
        }
        const currentQueue = [];
        this.watching = true;
        this.watcher = GethConnector_1.default.getInstance().web3.eth.filter('latest');
        this.watcher.watch((err, block) => {
            if (err) {
                return;
            }
            for (let hash of this.getCurrentTxQueue()) {
                currentQueue.push(GethConnector_1.default.getInstance().web3.eth.getTransactionReceiptAsync(hash));
            }
            Promise.all(currentQueue).then((receipt) => {
                receipt.forEach((data) => {
                    if (data) {
                        this.txQueue.delete(data.transactionHash);
                        if (this.txQueue.size === 0) {
                            this.stopTxWatch();
                        }
                        GethConnector_1.default.getInstance().emit(Constants_1.TX_MINED, data.transactionHash);
                    }
                });
            });
        });
        return Promise.resolve(this.watching);
    }
    hasKey(address) {
        return GethConnector_1.default.getInstance()
            .web3
            .eth
            .getAccountsAsync()
            .then((list) => {
            return list.indexOf(address) !== -1;
        });
    }
    stopTxWatch() {
        this.watching = false;
        return (this.watcher) ? this.watcher.stopWatching(() => { }) : '';
    }
    addTxToWatch(tx, autoWatch = true) {
        this.txQueue.set(tx, '');
        if (!this.watching && autoWatch) {
            this.startTxWatch();
        }
        return this;
    }
    getCurrentTxQueue() {
        return this.txQueue.keys();
    }
}
exports.GethHelper = GethHelper;
const helper = new GethHelper();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = helper;
