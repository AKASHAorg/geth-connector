import GethConnector from 'GethConnector';
import * as Promise from 'bluebird';
import {TX_MINED} from './Constants';

class GethHelper {
    public watcher: any;
    public txQueue: string[] = [];
    public syncing: boolean = true;

    /**
     *
     * @param instance
     * @returns {Bluebird}
     */
    public inSync(instance: GethConnector) {
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

    /**
     * @fires GethConnector#TX_MINED
     * @param instance
     * @returns {boolean}
     */
    public startTxWatch(instance: GethConnector) {
        if (this.syncing) {
            throw new Error('Geth node is syncing, try calling #inSync() before this');
        }
        this.watcher = instance.web3.eth.filter('latest');
        this.watcher.watch((err: any, block: any) => {
            if (err) {
                return;
            }
            const currentQueue = this.txQueue.map((hash: string) => {
                return instance.web3.eth.getTransactionReceiptAsync(hash);
            });
            Promise.all(currentQueue).then((receipt: any[]) => {
                receipt.forEach((data: any, index: number) => {
                    if (data) {
                        this.txQueue.splice(index, 1);
                        /**
                         * @event GethConnector#TX_MINED
                         */
                        instance.emit(TX_MINED, data.transactionHash);
                    }
                });
            });
        });
        return true;
    }

    /**
     *
     * @returns {string}
     */
    public stopTxWatch() {
        return (this.watcher) ? this.watcher.stopWatching() : '';
    }

    /**
     *
     * @param tx
     * @returns {GethHelper}
     */
    public addTxToWatch(tx: string) {
        this.txQueue.push(tx);
        return this;
    }

    /**
     *
     * @returns {string[]}
     */
    public getCurrentTxQueue() {
        return this.txQueue;
    }
}

const helper = new GethHelper();
export default helper;