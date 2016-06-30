import GethConnector from 'GethConnector';
import * as Promise from 'bluebird';

class GethHelper {
    /**
     *
     * @param instance
     * @returns {Bluebird}
     */
    public static inSync(instance: GethConnector) {
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
export default helper;