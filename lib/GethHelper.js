"use strict";
const Promise = require('bluebird');
class GethHelper {
    static inSync(instance) {
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
                return false;
            }
            return [data[1]];
        });
    }
}
const helper = new GethHelper();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = helper;
