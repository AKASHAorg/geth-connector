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
        this.serviceStatus = { process: false, api: false };
        this.socket = new net_1.Socket();
        this.connectedToLocal = false;
        this.watchers = new Map();
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
                this.serviceStatus.process = false;
                return false;
            }
            if (this.connectedToLocal) {
                return false;
            }
            this.gethService = child_process_1.spawn(binPath, this._flattenOptions(), { detached: true });
            return true;
        }).then((passed) => {
            if (passed) {
                this._attachEvents();
            }
            return passed;
        });
    }
    stop(signal) {
        this.emit(event.STOPPING);
        this._flushEvents();
        const killProcess = (this.gethService) ? this.gethService.kill(signal) : true;
        return Promise.resolve(killProcess)
            .then(() => {
            this.emit(event.STOPPED);
        });
    }
    getChainFolder() {
        return this.web3.admin.getDatadir().then((datadir) => {
            return path_1.join(datadir, 'chaindata');
        });
    }
    connectToLocal() {
        this._connectToIPC();
        this.connectedToLocal = true;
    }
    _flushEvents() {
        this.web3.reset();
        this.socket.removeAllListeners();
        if (!this.connectedToLocal) {
            if (this.watchers.get(event.START_FILTER)) {
                this.gethService
                    .stderr
                    .removeListener('data', this.watchers.get(event.START_FILTER));
                this.watchers
                    .delete(event.START_FILTER);
            }
            if (this.watchers.get(event.INFO_FILTER)) {
                this.gethService
                    .stdout
                    .removeListener('data', this.watchers.get(event.INFO_FILTER));
                this.gethService
                    .stderr
                    .removeListener('data', this.watchers.get(event.INFO_FILTER));
                this.watchers
                    .delete(event.INFO_FILTER);
            }
        }
        return this.socket.end();
    }
    setOptions(options) {
        let localOptions;
        if (this.spawnOptions.size) {
            if (!options) {
                return this.spawnOptions;
            }
            localOptions = options;
        }
        else {
            localOptions = Object.assign({
                datadir: GethConnector.getDefaultDatadir(),
                ipcpath: GethConnector.getDefaultIpcPath()
            }, event.START_OPTIONS, options);
        }
        for (let option in localOptions) {
            if (localOptions.hasOwnProperty(option)) {
                this.spawnOptions.set(option, localOptions[option]);
            }
        }
        if (this.spawnOptions.get(event.BIN_PATH)) {
            this.setBinPath(this.spawnOptions.get(event.BIN_PATH));
            this.spawnOptions.delete(event.BIN_PATH);
        }
        return this.spawnOptions;
    }
    restart(waitTime = 5000) {
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
        this._attachListeners();
    }
    __listenProcess() {
        this.gethService.once('exit', (code, signal) => {
            let message;
            if (code) {
                message = `geth: exited with code: ${code}`;
                this.logger.error(message);
                this.emit(event.ERROR, [message]);
            }
            else {
                message = `geth: received signal: ${signal}`;
                this.logger.info(message);
            }
            this.serviceStatus.process = false;
        });
        this.gethService.once('close', (code, signal) => {
            this.logger.info('geth:spawn:close:', code, signal);
            this.emit(event.STOPPED);
        });
        this.gethService.once('error', (code) => {
            this.logger.error(`geth:spawn:error: ${code}`);
            this.serviceStatus.process = false;
            this.emit(event.FAILED, ['gethService']);
        });
    }
    _tailGethLog() {
        if (this.watchers.get(event.START_FILTER)) {
            this.gethService.stderr.removeListener('data', this.watchers.get(event.START_FILTER));
            this.watchers.delete(event.START_FILTER);
        }
        const infoFilter = (data) => {
            this.logger.info(data.toString());
        };
        this.watchers.set(event.INFO_FILTER, infoFilter);
        this.gethService.stdout.on('data', this.watchers.get(event.INFO_FILTER));
        this.gethService.stderr.on('data', this.watchers.get(event.INFO_FILTER));
    }
    _watchGethStd() {
        this.serviceStatus.process = false;
        const timeout = setTimeout(() => {
            this.gethService.stderr.removeAllListeners('data');
            this.emit(event.ERROR, ['geth connection timeout']);
        }, 20000);
        const startFilter = (data) => {
            if (data.toString().includes('clock seems off')) {
                this.emit(event.TIME_NOT_SYNCED, [data.toString()]);
            }
            if (data.toString().includes('Fatal') ||
                data.toString().includes('Synchronisation failed')) {
                this.emit(event.FATAL, [data.toString()]);
                clearTimeout(timeout);
            }
            if (data.toString().includes('IPC endpoint opened')) {
                this.serviceStatus.process = true;
                this.emit(event.STARTED);
                clearTimeout(timeout);
            }
            this.logger.info(data.toString());
        };
        this.watchers.set(event.START_FILTER, startFilter);
        this.gethService.stderr.on('data', this.watchers.get(event.START_FILTER));
    }
    _attachListeners() {
        this.once(event.STARTED, () => {
            this._tailGethLog();
            this._connectToIPC();
        });
    }
    _connectToIPC() {
        this.ipcStream.setProvider(this.spawnOptions.get('ipcpath'), this.socket);
        this.socket.once('connect', () => {
            this.logger.info('connection to ipc Established!');
            this._checkRunningSevice().then((status) => {
                if (status) {
                    this.serviceStatus.api = true;
                }
            });
            this.emit(event.IPC_CONNECTED);
        });
        this.socket.once('error', (error) => {
            this.web3.reset();
            this.logger.error(error.message);
            this.serviceStatus.api = false;
            this.emit(event.IPC_DISCONNECTED);
        });
    }
    _checkRunningSevice() {
        const requiredVersion = GethBin_1.GethBin.requiredVersion();
        const runningServiceProps = [
            this.web3.version.getNodeAsync(),
            this.web3.version.getNetworkAsync()
        ];
        return Promise.all(runningServiceProps).then(([buildVersion, networkId]) => {
            let message;
            if (!buildVersion.includes(requiredVersion)) {
                message = `required geth version: ${requiredVersion}, found: ${buildVersion}`;
                this.logger.warn(message);
                this.emit(event.ERROR, message);
            }
            if (networkId !== event.ETH_NETWORK_ID) {
                message = `required ethereum network: ${event.ETH_NETWORK_ID}, found: ${networkId}`;
                this.logger.error(message);
                this.emit(event.FATAL, message);
                return false;
            }
            this.emit(event.ETH_NODE_OK);
            return true;
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GethConnector;
