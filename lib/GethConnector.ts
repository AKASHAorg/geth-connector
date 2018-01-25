import { GethBin } from './GethBin';
import { Web3 } from './Web3';
import { Socket } from 'net';
import * as event from './Constants';
import { EventEmitter } from 'events';
import { ChildProcess, exec, spawn } from 'child_process';
import * as Promise from 'bluebird';
import { homedir, type as osType } from 'os';
import { join as pathJoin } from 'path';

const platform = osType();
const symbolEnforcer = Symbol();
const symbol = Symbol();

const cpuPriority = {
    unix: {
        [event.PriorityCode.HIGH]: '-17',
        [event.PriorityCode.NORMAL]: '0',
        [event.PriorityCode.LOW]: '17'
    },
    win: {
        [event.PriorityCode.HIGH]: 'high',
        [event.PriorityCode.NORMAL]: 'normal',
        [event.PriorityCode.LOW]: 'below normal'
    }
};

export default class GethConnector extends EventEmitter {
    public downloadManager = new GethBin();
    public ipcStream = new Web3();
    public logger: any = console;
    public spawnOptions = new Map();
    public gethService: ChildProcess;
    public serviceStatus: { process: boolean, api: boolean, version: string } = {
        process: false,
        api: false,
        version: ''
    };
    private socket: Socket;
    private connectedToLocal: boolean = false;

    private cpuPriority = event.PriorityCode.LOW;
    public watchers = new Map();
    private _downloadEventsEnabled = false;

    /**
     * @param enforcer
     */
    constructor(enforcer: symbol) {
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
        this._downloadEventsEnabled = false;
    }

    /**
     * @fires GethConnector#STARTING
     * @param options
     */
    public start(options?: any) {
        /**
         * @event GethConnector#STARTING
         */
        this.emit(event.STARTING);

        this.setOptions(options);
        this.socket = new Socket();
        return this._checkBin().then((binPath: string) => {
            if (!binPath) {
                /**
                 * @event GethConnector#FAILED
                 */
                this.emit(event.FAILED, 'gethBin');
                this.serviceStatus.process = false;
                return false;
            }
            if (this.connectedToLocal) {
                return false;
            }

            this.gethService = spawn(binPath, this._flattenOptions(), { detached: true });
            return true;
        }).then((passed: boolean) => {
            if (passed) {
                this._attachEvents();
            }
            return passed;
        });
    }

    /**
     * @fires GethConnector#STOPPING
     * @fires GethConnector#STOPPED
     * @returns {Bluebird<U>}
     */
    public stop() {
        /**
         * @event GethConnector#STOPPING
         */
        this.emit(event.STOPPING);
        this._flushEvents();
        if (!this.gethService) {
            /**
             * @event GethConnector#STOPPED
             */
            this.emit(event.STOPPED);
        }
        const killProcess = (this.gethService) ? this.gethService.kill() : true;
        return Promise.delay(500);

    }

    /**
     * Get path for go-ethereum chaindata folder
     * @returns {any}
     */
    public getChainFolder() {
        return this.web3.admin.getDatadir().then((datadir: string) => {
            return pathJoin(datadir, 'chaindata');
        });
    }


    /**
     * connect to existing geth ipc
     */
    public connectToLocal() {
        this._connectToIPC();
        this.connectedToLocal = true;
    }

    public setCpuPriority(level: event.PriorityCode, immediate?: boolean) {
        if (!event.PriorityCode.hasOwnProperty(level)) {
            throw new Error('Invalid priority level');
        }
        this.cpuPriority = level;
        if (immediate) {
            this.executeCpuPriority();
        }
    }

    public executeCpuPriority() {
        if (!this.gethService.pid) {
            this.logger.warn('cpu:geth process is not started');
            return;
        }

        const command = (process.platform === 'win32') ?
            `wmic process where name="geth.exe" CALL setpriority "${cpuPriority.win[this.cpuPriority]}"` :
            `renice -n ${cpuPriority.unix[this.cpuPriority]} -p ${this.gethService.pid}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                this.logger.error(`cpu:geth:exec error: ${error}`);
                return;
            }
            this.logger.info(`cpu:geth:stdout: ${stdout}`);
            this.logger.info(`cpu:geth:stderr: ${stderr}`);
        });
    }

    public getCpuPriority() {
        return this.cpuPriority;
    }

    /**
     * Remove web3 and logging listeners
     * @private
     */
    private _flushEvents() {
        this.web3.reset();
        this.serviceStatus.api = false;
        this.serviceStatus.process = false;
        this.serviceStatus.version = '';
        if (this.socket) {
            this.socket.removeAllListeners();
        }
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
        if (this.socket) {
            this.socket.end();
        }
        this.socket = null;
        return true;
    }

    public enableDownloadEvents() {
        if (this._downloadEventsEnabled) {
            return;
        }
        this.downloadManager.wrapper.downloadProgress.on(event.DOWNLOAD_STARTED, () => {
            this.emit(event.DOWNLOAD_STARTED);
        });

        this.downloadManager.wrapper.downloadProgress.on(event.DOWNLOAD_PROGRESS, (progress) => {
            this.emit(event.DOWNLOAD_PROGRESS, progress);
        });

        this.downloadManager.wrapper.downloadProgress.on(event.DOWNLOAD_ERROR, (error) => {
            this.emit(event.DOWNLOAD_ERROR, error);
        });
        this._downloadEventsEnabled = true;
    }

    /**
     * Set geth spawn options
     * Requires `this.restart()` when geth is already running
     * @param options
     * @returns {Map<any, any>}
     */
    public setOptions(options?: any) {
        let localOptions: Object;
        if (options) {
            if (options.hasOwnProperty('cpu')) {
                this.setCpuPriority(options.cpu);
                delete options.cpu;
            }

            if (platform === 'Windows_NT' && options.hasOwnProperty('ipcpath')) {
                options.ipcpath = pathJoin('\\\\.\\pipe', options.ipcpath);
            }

            if (platform !== 'Windows_NT' && options.hasOwnProperty('datadir') && !options.hasOwnProperty('ipcpath')) {
                options.ipcpath = pathJoin(options.datadir, 'geth.ipc');
            }
        }

        if (this.spawnOptions.size) {
            if (!options) {
                return this.spawnOptions;
            }
            localOptions = options;
        } else {
            localOptions = Object.assign(
                {
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

    /**
     *
     * @param waitTime
     * @returns {Bluebird<U>}
     */
    public restart(waitTime = 5000) {
        return Promise
            .resolve(this.stop())
            .delay(waitTime)
            .then(() => this.start());
    }

    /**
     *
     * @param genesisPath
     * @param cb
     */
    writeGenesis(genesisPath: string, cb: any) {
        this._checkBin().then((binPath: string) => {
            if (binPath) {
                const dataDir = (this.spawnOptions.get('datadir')) ? this.spawnOptions.get('datadir') : '';
                let command = (dataDir) ? `--datadir "${dataDir}"` : '';
                command += ` init "${genesisPath}"`;
                exec(`"${binPath}" ${command}`, (error, stdout) => {
                    cb(error, stdout);
                });
            }
        });
    }

    /**
     * Get geth default datadir path
     * @returns {string}
     */
    static getDefaultDatadir() {
        let dataDir: string;
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
     * @returns {string}
     */
    static getDefaultIpcPath() {
        const dataDirPath = GethConnector.getDefaultDatadir();
        let ipcPath: string;
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
        return new Promise((resolve, reject) => {
            this.downloadManager.check(
                (err: Error, data: { binPath?: string }) => {
                    if (err) {
                        this.logger.error(err);
                        /**
                         * @event GethConnector#BINARY_CORRUPTED
                         */
                        this.emit(event.BINARY_CORRUPTED, err);
                        this.downloadManager.deleteBin();
                        return reject(err);
                    }

                    if (data.binPath) {
                        return resolve(data.binPath);
                    }
                });
        });
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
        this._attachListeners();
    }

    /**
     * @fires GethConnector#STOPPED
     * @fires GethConnector#FAILED
     * @private
     */
    private __listenProcess() {
        this.gethService.once('exit', (code: number, signal: string) => {
            let message: string;
            if (code) {
                message = `geth: exited with code: ${code}`;
                this.logger.error(message);
                this.emit(event.ERROR, message);
            } else {
                message = `geth: received signal: ${signal}`;
                this.logger.info(message);
            }
            this._flushEvents();
            this.serviceStatus.process = false;
        });

        this.gethService.once('close', (code: number, signal: string) => {
            this.logger.info('geth:spawn:close:', code, signal);
            /**
             * @event GethConnector#STOPPED
             */
            this.emit(event.STOPPED);
        });

        this.gethService.once('error', (code: string) => {
            this.logger.error(`geth:spawn:error: ${code}`);
            this.serviceStatus.process = false;
            /**
             * @event GethConnector#FAILED
             */
            this.emit(event.FAILED, 'gethService');
        });
    }

    /**
     * log geth std
     * @private
     */
    private _tailGethLog() {
        if (this.watchers.get(event.START_FILTER)) {
            this.gethService.stderr.removeListener('data', this.watchers.get(event.START_FILTER));
            this.watchers.delete(event.START_FILTER);
        }
        const infoFilter = (data: Buffer) => {
            this.logger.info(data.toString());
        };
        this.watchers.set(event.INFO_FILTER, infoFilter);
        this.gethService.stdout.on('data', this.watchers.get(event.INFO_FILTER));
        this.gethService.stderr.on('data', this.watchers.get(event.INFO_FILTER));
    }

    /**
     * @fires GethConnector#FATAL
     * @fires GethConnector#STARTED
     * @fires GethConnector#ERROR
     * @fires GethConnector#TIME_NOT_SYNCED
     * @private
     */
    private _watchGethStd() {
        let started = false;
        this.serviceStatus.process = false;
        const timeout = setTimeout(() => {
            this.gethService.stderr.removeAllListeners('data');
            /**
             * @event GethConnector#ERROR
             */
            this.emit(event.ERROR, 'geth connection timeout');
        }, 20000);
        const startFilter = (data: Buffer) => {
            let log = data.toString();
            if (log.includes('clock seems off')) {
                /**
                 * @event GethConnector#TIME_NOT_SYNCED
                 */
                this.emit(event.TIME_NOT_SYNCED, log);
            }
            if (log.includes('Fatal') ||
                log.includes('Synchronisation failed')) {
                /**
                 * @event GethConnector#FATAL
                 */
                this.emit(event.FATAL, log);
                clearTimeout(timeout);
            }
            if (log.includes('IPC endpoint opened')) {
                this.serviceStatus.process = true;
                clearTimeout(timeout);
                this._connectToIPC();
            }
            this.logger.info(log);
        };
        // save a reference for removeListener
        this.watchers.set(event.START_FILTER, startFilter);
        // start listening
        this.gethService.stderr.on('data', this.watchers.get(event.START_FILTER));
    }

    /**
     * @listens GethConnector#STARTED
     * @private
     */
    private _attachListeners() {

        this.removeListener(event.STARTED, this._tailGethLog);
        this.removeListener(event.FATAL, this.socket.end);

        this.once(event.STARTED, this._tailGethLog);
        this.once(event.FATAL, this.socket.end);
    }

    /**
     * @fires GethConnector#IPC_CONNECTED
     * @fires GethConnector#IPC_DISCONNECTED
     * @private
     */
    private _connectToIPC() {
        this.ipcStream.setProvider(this.spawnOptions.get('ipcpath'), this.socket);
        this.socket.once('connect', () => {
            this.logger.info('connection to ipc Established!');
            /**
             * @event GethConnector#IPC_CONNECTED
             */
            this.emit(event.IPC_CONNECTED);
            this._checkRunningSevice().then(
                (status: boolean) => {
                    if (status) {
                        this.serviceStatus.api = true;
                    }
                }
            );
            /**
             * @event GethConnector#STARTED
             */
            this.emit(event.STARTED);
        });
        this.socket.once('error', (error: any) => {
            this.web3.reset();
            this.logger.error(error.message);
            this.serviceStatus.api = false;
            /**
             * @event GethConnector#IPC_DISCONNECTED
             */
            this.emit(event.IPC_DISCONNECTED);
        });
    }

    /**
     * @fires GethConnector#ERROR
     * @fires GethConnector#FATAL
     * @fires GethConnector#ETH_NODE_OK
     * @returns {Bluebird<boolean>}
     * @private
     */
    private _checkRunningSevice() {
        const requiredVersion = GethBin.requiredVersion();

        const runningServiceProps = [
            this.web3.version.getNodeAsync(),
            this.web3.version.getNetworkAsync()
        ];

        return Promise.all(runningServiceProps).then(([buildVersion, networkId]) => {
            let message: string;
            networkId = parseInt(networkId, 10);
            this.serviceStatus.version = buildVersion;
            if (!buildVersion.includes(requiredVersion)) {
                message = `required geth version: ${requiredVersion}, found: ${buildVersion}, updating executable...`;
                this.logger.warn(message);
                this.emit(event.UPDATING_BINARY, message);
                return this.stop()
                    .delay(5000)
                    .then(() => this.downloadManager.deleteBin())
                    .then(() => this.start());
            }
            let netId = this.spawnOptions.get('networkid');
            if (this.spawnOptions.has('testnet')) {
                netId = 2;
            }
            if (netId && networkId !== netId) {
                message = `required ethereum network: ${netId}, found: ${networkId}`;
                this.logger.error(message);
                this.emit(event.FATAL, message);
                return false;
            }
            /**
             * @event GethConnector#ETH_NODE_OK
             */
            this.emit(event.ETH_NODE_OK);
            return true;
        });
    }
}