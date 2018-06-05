export declare const DOWNLOAD_STARTED: string, DOWNLOAD_ERROR: string, DOWNLOAD_PROGRESS: string;
export declare const STARTING = "GETH_STARTING";
export declare const STARTED = "GETH_STARTED";
export declare const FAILED = "GETH_START_FAILED";
export declare const BINARY_CORRUPTED = "GETH_BINARY_CORRUPTED";
export declare const STOPPING = "GETH_STOPPING";
export declare const STOPPED = "GETH_STOPPED";
export declare const ERROR = "GETH_ERROR";
export declare const TIME_NOT_SYNCED = "GETH_TIME_NOT_SYNCED";
export declare const FATAL = "GETH_CRASHED";
export declare const IPC_CONNECTED = "GETH_IPC_CONNECTED";
export declare const IPC_DISCONNECTED = "GETH_IPC_DISCONNECTED";
export declare const ETH_NODE_OK = "ETH_NODE_OK";
export declare const TX_MINED = "TX_MINED";
export declare const UPDATING_BINARY = "UPDATING_BINARY";
export declare const START_OPTIONS: {
    cache: number;
};
export declare const BIN_PATH = "binPath";
export declare const START_FILTER = "START_FILTER";
export declare const INFO_FILTER = "INFO_FILTER";
export declare enum PriorityCode {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3
}
