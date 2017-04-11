export const STARTING = 'GETH_STARTING';
export const STARTED = 'GETH_STARTED';
export const FAILED = 'GETH_START_FAILED';
export const DOWNLOADING_BINARY = 'GETH_DOWNLOADING_BINARY';
export const BINARY_CORRUPTED = 'GETH_BINARY_CORRUPTED';
export const STOPPING = 'GETH_STOPPING';
export const STOPPED = 'GETH_STOPPED';
export const ERROR = 'GETH_ERROR';
export const TIME_NOT_SYNCED = 'GETH_TIME_NOT_SYNCED';
export const FATAL = 'GETH_CRASHED';
export const IPC_CONNECTED = 'GETH_IPC_CONNECTED';
export const IPC_DISCONNECTED = 'GETH_IPC_DISCONNECTED';
export const ETH_NODE_OK = 'ETH_NODE_OK';
export const TX_MINED = 'TX_MINED';
export const UPDATING_BINARY = 'UPDATING_BINARY';

export const START_OPTIONS = {cache: 512, fast: ''};
export const BIN_PATH = 'binPath';
export const START_FILTER = 'START_FILTER';
export const INFO_FILTER = 'INFO_FILTER';

export enum PriorityCode {
    LOW = 1, //1
    NORMAL, //2
    HIGH //3
}