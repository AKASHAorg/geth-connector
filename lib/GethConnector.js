"use strict";
const GethBin_1 = require('./GethBin');
const Web3_1 = require('./Web3');
const net_1 = require('net');
const event = require('./Constants');
const events_1 = require('events');
const child_process_1 = require('child_process');
const Promise = require('bluebird');
const os_1 = require('os');
const path_1 = require('path');
const platform = os_1.type();
const symbolEnforcer = Symbol();
const symbol = Symbol();
class GethConnector extends events_1.EventEmitter {
    constructor(enforcer) {
        super();
        this.downloadManager = new GethBin_1.GethBin();
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
        this.setOptions(options);
        return this._checkBin().then((binPath) => {
            if (!binPath) {
                this.emit(event.FAILED, ['gethBin']);
                return false;
            }
            this.gethService = child_process_1.spawn(binPath, this._flattenOptions(), { detached: true });
            return true;
        }).then(() => {
            this._attachEvents();
        });
    }
    stop() {
        this.emit(event.STOPPING);
        return Promise.resolve(this.ipcStream);
    }
    setOptions(options) {
        const localOptions = Object.assign({
            datadir: GethConnector.getDefaultDatadir(),
            ipcpath: GethConnector.getDefaultIpcPath()
        }, event.START_OPTIONS, options);
        for (let option in localOptions) {
            if (localOptions.hasOwnProperty(option)) {
                this.spawnOptions.set(option, localOptions[option]);
            }
        }
        console.log(this.spawnOptions);
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
                dataDir = path_1.join(os_1.homedir(), '.ethereum');
                break;
            case 'Darwin':
                dataDir = path_1.join(os_1.homedir(), 'Library', 'Ethereum');
                break;
            case 'Windows_NT':
                dataDir = path_1.join(process.env.APPDATA, '/Ethereum');
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
                ipcPath = path_1.join(dataDirPath, 'geth.ipc');
                break;
        }
        return ipcPath;
    }
    get web3() {
        return this.ipcStream.web3;
    }
    _checkBin() {
        const timeOut = setTimeout(() => {
            this.emit(event.DOWNLOADING_BINARY);
        }, 500);
        return this.downloadManager.check().then((binPath) => {
            clearTimeout(timeOut);
            return binPath;
        }).catch(err => {
            this.emit(event.BINARY_CORRUPTED, err);
            this.logger.error(err);
            return '';
        });
    }
    _checkVersion() {
    }
    _flattenOptions() {
        const arrayOptions = [];
        for (let [key, value] of this.spawnOptions) {
            arrayOptions.push(`--${key}`);
            if (value) {
                arrayOptions.push(value);
            }
        }
        return arrayOptions;
    }
    _attachEvents() {
        this.__listenProcess();
        this._watchGethStd();
    }
    __listenProcess() {
        this.gethService.on('exit', (code, signal) => {
            if (code) {
                this.logger.error(`geth: exited with code: ${code}`);
            }
            else {
                this.logger.info(`geth: received signal: ${signal}`);
            }
        });
        this.gethService.on('close', (code, signal) => {
            this.logger.info('geth:spawn:close:', code, signal);
            this.emit(event.STOPPED);
        });
        this.gethService.on('error', (code) => {
            this.logger.error(`geth:spawn:error: ${code}`);
            this.emit(event.FAILED, ['gethService']);
        });
    }
    _tailGethLog() {
        this.gethService.stdout.on('data', (data) => {
            this.logger.info(data.toString());
        });
        this.gethService.stderr.on('data', (data) => {
            this.logger.info(data.toString());
        });
    }
    _watchGethStd() {
        this.gethService.stderr.on('data', (data) => {
            if (data.toString().includes('clock seems off')) {
                this.emit(event.TIME_NOT_SYNCED, [data.toString()]);
            }
            if (data.toString().includes('Fatal')) {
                this.emit(event.FATAL, [data.toString()]);
            }
            if (data.toString().includes('IPC endpoint opened')) {
                this.emit(event.STARTED);
            }
            this.logger.info(data.toString());
        });
    }
}
exports.GethConnector = GethConnector;
