import {GethBin} from './GethBin';
import {Web3} from './Web3';
import {Socket} from 'net';
import * as event from './Constants';
import { EventEmitter } from 'events';

import childProcess = require('child_process');
import Promise = require('bluebird');
import net = require('net');
import os = require('os');
import path = require('path');

const platform = os.type();
const symbolEnforcer = Symbol();
const symbol = Symbol();

export class GethConnector extends EventEmitter {
    public downloadManager: GethBin;
    public ipcStream = new Web3();
    public logger: any = console;
    public spawnOptions = new Map();
    public gethService: childProcess.ChildProcess;
    private socket: Socket = new Socket();

    /**
     * @param enforcer
     */
    constructor(enforcer: Symbol) {
        super();
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of new constructor');
        }
    }

    /**
     * @returns {GethConnector}
     */
    public static getInstance(): GethConnector {
        if (!this[symbol]) {
            this[symbol] = new GethConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     * Set logging
     * @param logger
     */
    public setLogger(logger: {}): void {
        this.logger = logger;
    }

    /**
     * Set folder path for geth binary
     * @param path
     */
    public setBinPath(path: string): void {
        this.downloadManager = new GethBin(path);
    }

    /**
     * 
     * @param options
     */
    public start(options?: Object) {
        this.emit(event.STARTING);
    }

    /**
     *
     * @returns {Bluebird<Web3>}
     */
    public stop() {
        this.emit(event.STOPPING);
        return Promise.resolve(this.ipcStream);
    }

    /**
     * Set geth spawn options
     * Requires `this.restart()` when geth is already running
     * @param options
     * @returns {Map<any, any>}
     */
    public setOptions(options?: Object) {
        const localOptions = Object.assign({}, event.START_OPTIONS, options);
        for (let option in localOptions) {
            if (localOptions.hasOwnProperty(option)) {
                this.spawnOptions.set(localOptions, localOptions[option]);
            }
        }
        return this.spawnOptions;
    }

    /**
     *
     * @param waitTime
     * @returns {Bluebird<U>}
     */
    public restart(waitTime = 7000) {
        return Promise
            .resolve(this.stop())
            .delay(waitTime)
            .then(() => this.start());
    }

    /**
     * Get geth default datadir path
     * @returns {String}
     */
    static getDefaultDatadir() {
        let dataDir: String;
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

    /**
     * Path for web3 ipc provider
     * @returns {String}
     */
    static getDefaultIpcPath() {
        const dataDirPath = GethConnector.getDefaultDatadir();
        let ipcPath: String;
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

    /**
     * Access web3 object
     * @returns {Web3Factory}
     */
    get web3() {
        return this.ipcStream.web3;
    }
}