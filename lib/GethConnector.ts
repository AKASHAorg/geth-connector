import {GethBin} from './GethBin';
import {Web3} from './Web3';
import {Socket} from 'net';
import * as event from './Constants';
import {EventEmitter} from 'events';
import {spawn, ChildProcess} from 'child_process';
import * as Promise from 'bluebird';
import {type as osType, homedir} from 'os';
import {join as pathJoin} from 'path';

const platform = osType();
const symbolEnforcer = Symbol();
const symbol = Symbol();

export class GethConnector extends EventEmitter {
    public downloadManager = new GethBin();
    public ipcStream = new Web3();
    public logger: any = console;
    public spawnOptions = new Map();
    public gethService: ChildProcess;
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
     * @fires GethConnector#STARTING
     * @param options
     */
    public start(options?: Object) {
        /**
         * @event GethConnector#STARTING
         */
        this.emit(event.STARTING);
        this.setOptions(options);
        return this._checkBin().then((binPath: string) => {
            if (!binPath) {
                /**
                 * @event GethConnector#FAILED
                 */
                this.emit(event.FAILED, ['gethBin']);
                return false;
            }
            this.gethService = spawn(binPath, this._flattenOptions(), {detached: true});
            return true;
        }).then(() => {
            this._attachEvents();
        });
    }

    /**
     * @fires GethConnector#STOPPING
     * @returns {Bluebird<Web3>}
     */
    public stop() {
        /**
         * @event GethConnector#STOPPING
         */
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
        const localOptions = Object.assign(
            {
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
                dataDir = pathJoin(homedir(), '.ethereum');
                break;
            case 'Darwin':
                dataDir = pathJoin(homedir(), 'Library', 'Ethereum');
                break;
            case 'Windows_NT':
                dataDir = pathJoin(process.env.APPDATA, '/Ethereum');
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
                ipcPath = pathJoin(dataDirPath, 'geth.ipc');
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

    /**
     * @fires GethConnector#DOWNLOADING_BINARY
     * @fires GethConnector#BINARY_CORRUPTED
     * @returns {Bluebird<U>}
     * @private
     */
    private _checkBin() {
        const timeOut = setTimeout(() => {
            /**
             * @event GethConnector#DOWNLOADING_BINARY
             */
            this.emit(event.DOWNLOADING_BINARY);
        }, 500);
        return this.downloadManager.check().then((binPath) => {
            clearTimeout(timeOut);
            return binPath;
        }).catch(err => {
            /**
             * @event GethConnector#BINARY_CORRUPTED
             */
            this.emit(event.BINARY_CORRUPTED, err);
            this.logger.error(err);
            return '';
        });
    }

    private _checkVersion() {

    }

    /**
     * Transform `spawnOptions` mapping to array
     * @returns {any[]}
     * @private
     */
    private _flattenOptions() {
        const arrayOptions: any[] = [];
        for (let [key, value] of this.spawnOptions) {
            arrayOptions.push(`--${key}`);
            if (value) {
                arrayOptions.push(value);
            }
        }
        return arrayOptions;
    }

    private _attachEvents() {
        this.__listenProcess();
        this._watchGethStd();
    }

    /**
     * @fires GethConnector#STOPPED
     * @fires GethConnector#FAILED
     * @private
     */
    private __listenProcess() {
        this.gethService.on('exit', (code: number, signal: string) => {
            if (code) {
                this.logger.error(`geth: exited with code: ${code}`);
            } else {
                this.logger.info(`geth: received signal: ${signal}`);
            }
        });

        this.gethService.on('close', (code: number, signal: string) => {
            this.logger.info('geth:spawn:close:', code, signal);
            /**
             * @event GethConnector#STOPPED
             */
            this.emit(event.STOPPED);
        });

        this.gethService.on('error', (code: string) => {
            this.logger.error(`geth:spawn:error: ${code}`);
            /**
             * @event GethConnector#FAILED
             */
            this.emit(event.FAILED, ['gethService']);
        });
    }

    public _tailGethLog() {
        this.gethService.stdout.on('data', (data: Buffer) => {
            this.logger.info(data.toString());
        });
        this.gethService.stderr.on('data', (data: Buffer) => {
            this.logger.info(data.toString());
        });
    }

    /**
     * @fires GethConnector#FATAL
     * @fires GethConnector#STARTED
     * @private
     */
    private _watchGethStd() {
        this.gethService.stderr.on('data', (data: Buffer) => {
            if (data.toString().includes('clock seems off')) {
                this.emit(event.TIME_NOT_SYNCED, [data.toString()]);
            }
            if (data.toString().includes('Fatal')) {
                /**
                 * @event GethConnector#FATAL
                 */
                this.emit(event.FATAL, [data.toString()]);
            }
            if (data.toString().includes('IPC endpoint opened')) {
                /**
                 * @event GethConnector#STARTED
                 */
                this.emit(event.STARTED);
            }
            this.logger.info(data.toString());
        });
    }
}