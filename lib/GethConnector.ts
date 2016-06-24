import {GethBin} from './GethBin';
import {Web3} from './Web3';

import childProcess = require('child_process');
import net = require('net');
import os = require('os');
import path = require('path');

const symbolEnforcer = Symbol();
const symbol = Symbol();

export class GethConnector {
    public downloadManager: GethBin;
    public web3 = new Web3();
    public logger: any = console;
    public process: childProcess.ChildProcess;

    /**
     * @param enforcer
     */
    constructor (enforcer: Symbol) {
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of new constructor');
        }
    }

    /**
     * @returns {GethConnector}
     */
    public static getInstance (): GethConnector {
        if (!this[symbol]) {
            this[symbol] = new GethConnector(symbolEnforcer);
        }
        return this[symbol];
    }

    /**
     * Set logging 
     * @param logger
     */
    public setLogger (logger: {}): void {
        this.logger = logger;
    }

    /**
     * Set folder path for geth binary
     * @param path
     */
    public setBinPath (path: string): void {
        this.downloadManager = new GethBin(path);
    }
}