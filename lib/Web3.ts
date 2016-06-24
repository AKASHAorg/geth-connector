import Web3Factory = require('web3');
import Promise = require('bluebird');
import {Socket} from 'net';

export class Web3 {
    public web3Instance: Web3Factory;

    constructor() {
        this.web3Instance = new Web3Factory();
        this.web3Instance.eth = Promise.promisifyAll(this.web3Instance.eth);
        this.web3Instance.shh = Promise.promisifyAll(this.web3Instance.shh);
        this.web3Instance.personal = Promise.promisifyAll(this.web3Instance.personal);
        this.web3Instance.net = Promise.promisifyAll(this.web3Instance.net);
        this.web3Instance._extend({
            property: 'admin',
            properties: this._adminProps().properties
        });

        this.web3Instance.admin = Promise.promisifyAll(this.web3Instance.admin);
    }

    get web3() {
        return this.web3Instance;
    }

    /**
     *
     * @param gethIpc
     * @param socket
     * @returns {Bluebird}
     */
    setProvider(gethIpc: string, socket: Socket) {
        if (this.web3Instance.currentProvider) {
            this.web3Instance.reset();
        }
        this.web3Instance.setProvider(new this.web3Instance.providers.IpcProvider(gethIpc, socket));
        return this.web3Instance.admin.nodeInfoAsync();
    }

    _adminProps() {
        return {
            properties: [
                new this.web3Instance._extend.Property({
                    name: 'nodeInfo',
                    getter: 'admin_nodeInfo',
                    outputFormatter: this.web3Instance._extend.formatters.formatOutputString
                }),

                new this.web3Instance._extend.Property({
                    name: 'peers',
                    getter: 'admin_peers',
                    outputFormatter: (obj: any) => obj
                }),

                new this.web3Instance._extend.Property({
                    name: 'datadir',
                    getter: 'admin_datadir',
                    outputFormatter: this.web3Instance._extend.formatters.formatOutputString
                }),

                new this.web3Instance._extend.Property({
                    name: 'chainSyncStatus',
                    getter: 'admin_chainSyncStatus',
                    outputFormatter: (obj: any) => obj
                })
            ]
        };
    }
}