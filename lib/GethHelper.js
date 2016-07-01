"use strict";
const Promise = require('bluebird');
const Constants_1 = require('./Constants');
class GethHelper {
    constructor() {
        this.txQueue = [];
        this.syncing = true;
    }
    inSync(instance) {
        if (!instance.serviceStatus.api) {
            return Promise.reject(new Error('not connected to IPC'));
        }
        const rules = [
            instance.web3.eth.getSyncingAsync(),
            instance.web3.net.getPeerCountAsync(),
            instance.web3.eth.getBlockAsync('latest')
        ];
        return Promise.all(rules).then((data) => {
            const timeStamp = Math.floor(new Date().getTime() / 1000);
            if (data[0]) {
                return [data[1], data[0]];
            }
            if (!data[0] && data[1] > 0 && (data[2].timestamp + 60 * 2) > timeStamp) {
                this.syncing = false;
                return false;
            }
            return [data[1]];
        });
    }
    startTxWatch(instance) {
        if (this.syncing) {
            throw new Error('Geth node is syncing, try calling #inSync() before this');
        }
        this.watcher = instance.web3.eth.filter('latest');
        this.watcher.watch((err, block) => {
            if (err) {
                return;
            }
            const currentQueue = this.txQueue.map((hash) => {
                return instance.web3.eth.getTransactionReceiptAsync(hash);
            });
            Promise.all(currentQueue).then((receipt) => {
                receipt.forEach((data, index) => {
                    if (data) {
                        this.txQueue.splice(index, 1);
                        instance.emit(Constants_1.TX_MINED, data.transactionHash);
                    }
                });
            });
        });
        return true;
    }
    stopTxWatch() {
        return (this.watcher) ? this.watcher.stopWatching() : '';
    }
    addTxToWatch(tx) {
        this.txQueue.push(tx);
        return this;
    }
    getCurrentTxQueue() {
        return this.txQueue;
    }
}
const helper = new GethHelper();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = helper;
