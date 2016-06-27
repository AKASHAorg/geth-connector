"use strict";
const GethBin_1 = require('./GethBin');
const Web3_1 = require('./Web3');
const net_1 = require('net');
const event = require('./Constants');
const events_1 = require('events');
const Promise = require('bluebird');
const os = require('os');
const path = require('path');
const platform = os.type();
const symbolEnforcer = Symbol();
const symbol = Symbol();
class GethConnector extends events_1.EventEmitter {
    constructor(enforcer) {
        super();
        this.ipcStream = new Web3_1.Web3();
        this.logger = console;
        this.spawnOptions = new Map();
        this.socket = new net_1.Socket();
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of new constructor');
        }
    }
    static getInstance() {
        if (!this[symbol]) {
            this[symbol] = new GethConnector(symbolEnforcer);
        }
        return this[symbol];
    }
    setLogger(logger) {
        this.logger = logger;
    }
    setBinPath(path) {
        this.downloadManager = new GethBin_1.GethBin(path);
    }
    start(options) {
        this.emit(event.STARTING);
    }
    stop() {
        this.emit(event.STOPPING);
        return Promise.resolve(this.ipcStream);
    }
    setOptions(options) {
        const localOptions = Object.assign({}, event.START_OPTIONS, options);
        for (let option in localOptions) {
            if (localOptions.hasOwnProperty(option)) {
                this.spawnOptions.set(localOptions, localOptions[option]);
            }
        }
        return this.spawnOptions;
    }
    restart(waitTime = 7000) {
        return Promise
            .resolve(this.stop())
            .delay(waitTime)
            .then(() => this.start());
    }
    static getDefaultDatadir() {
        let dataDir;
        switch (platform) {
            case 'Linux':
                dataDir = path.join(os.homedir(), '.ethereum');
                break;
            case 'Darwin':
                dataDir = path.join(os.homedir(), 'Library', 'Ethereum');
                break;
            case 'Windows_NT':
                dataDir = path.join(process.env.APPDATA, '/Ethereum');
                break;
            default:
                throw new Error('Platform not supported');
        }
        return dataDir;
    }
    static getDefaultIpcPath() {
        const dataDirPath = GethConnector.getDefaultDatadir();
        let ipcPath;
        switch (platform) {
            case 'Windows_NT':
                ipcPath = '\\\\.\\pipe\\geth.ipc';
                break;
            default:
                ipcPath = path.join(dataDirPath, 'geth.ipc');
                break;
        }
        return ipcPath;
    }
    get web3() {
        return this.ipcStream.web3;
    }
}
exports.GethConnector = GethConnector;
