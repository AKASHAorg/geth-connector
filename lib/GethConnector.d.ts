/// <reference types="node" />
/// <reference types="chai" />
/// <reference types="bluebird" />
import { GethBin } from './GethBin';
import { Web3 } from './Web3';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import * as Promise from 'bluebird';
export default class GethConnector extends EventEmitter {
    downloadManager: GethBin;
    ipcStream: Web3;
    logger: any;
    spawnOptions: Map<any, any>;
    gethService: ChildProcess;
    serviceStatus: {
        process: boolean;
        api: boolean;
    };
    private socket;
    private connectedToLocal;
    watchers: Map<any, any>;
    constructor(enforcer: Symbol);
    static getInstance(): GethConnector;
    setLogger(logger: {}): void;
    setBinPath(path: string): void;
    start(options?: Object): Promise<boolean>;
    stop(signal?: string): Promise<void>;
    getChainFolder(): any;
    connectToLocal(): void;
    private _flushEvents();
    setOptions(options?: Object): Map<any, any>;
    restart(waitTime?: number): Promise<boolean>;
    writeGenesis(genesisPath: string, cb: any): void;
    static getDefaultDatadir(): String;
    static getDefaultIpcPath(): String;
    readonly web3: any;
    private _checkBin();
    private _flattenOptions();
    private _attachEvents();
    private __listenProcess();
    private _tailGethLog();
    private _watchGethStd();
    private _attachListeners();
    private _connectToIPC();
    private _checkRunningSevice();
}
