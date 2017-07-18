/// <reference types="node" />
/// <reference types="bluebird" />
import { GethBin } from './GethBin';
import { Web3 } from './Web3';
import * as event from './Constants';
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
        version: string;
    };
    private socket;
    private connectedToLocal;
    private cpuPriority;
    watchers: Map<any, any>;
    private _downloadEventsEnabled;
    constructor(enforcer: symbol);
    static getInstance(): GethConnector;
    setLogger(logger: {}): void;
    setBinPath(path: string): void;
    start(options?: any): Promise<boolean>;
    stop(): Promise<void>;
    getChainFolder(): any;
    connectToLocal(): void;
    setCpuPriority(level: event.PriorityCode, immediate?: boolean): void;
    executeCpuPriority(): void;
    getCpuPriority(): event.PriorityCode;
    private _flushEvents();
    enableDownloadEvents(): void;
    setOptions(options?: any): Map<any, any>;
    restart(waitTime?: number): Promise<boolean>;
    writeGenesis(genesisPath: string, cb: any): void;
    static getDefaultDatadir(): string;
    static getDefaultIpcPath(): string;
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
