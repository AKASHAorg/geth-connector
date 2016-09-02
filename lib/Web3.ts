import Web3Factory = require('web3');
import Promise = require('bluebird');
import { Socket } from 'net';

export class Web3 {
    public web3Instance: any;

    constructor() {
        this.web3Instance = new Web3Factory();
        this.web3Instance.eth = Promise.promisifyAll(this.web3Instance.eth);
        this.web3Instance.shh = Promise.promisifyAll(this.web3Instance.shh);
        this.web3Instance.personal = Promise.promisifyAll(this.web3Instance.personal);
        this.web3Instance.net = Promise.promisifyAll(this.web3Instance.net);
        this.web3Instance.version = Promise.promisifyAll(this.web3Instance.version);
        this.web3Instance._extend({
            property: 'admin',
            properties: this._adminProps().properties,
            methods: this._adminProps().methods
        });

        this.web3Instance.admin = Promise.promisifyAll(this.web3Instance.admin);
    }

    /**
     * @returns {Web3Factory}
     */
    public get web3() {
        return this.web3Instance;
    }

    /**
     *
     * @param gethIpc
     * @param socket
     * @returns {boolean}
     */
    setProvider(gethIpc: string, socket: Socket) {
        if (this.web3Instance.currentProvider) {
            this.web3Instance.reset();
        }
        this.web3Instance.setProvider(new this.web3Instance.providers.IpcProvider(gethIpc, socket));
        return this.web3Instance.currentProvider.isConnected();
    }

    /**
     *
     * @returns {{properties: ts.SymbolFlags[]}}
     * @private
     */
    _adminProps() {
        return {
            methods: [
                new this.web3Instance._extend.Method({
                    name: 'addPeer',
                    call: 'admin_addPeer',
                    params: 1,
                    inputFormatter: [null],
                    outputFormatter: this.web3Instance._extend.formatters.formatOutputBool
                })],
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
