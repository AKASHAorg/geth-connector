/// <reference types="bluebird" />
/// <reference types="node" />
import * as Promise from 'bluebird';
export declare class GethHelper {
    watcher: any;
    txQueue: Map<any, any>;
    syncing: boolean;
    watching: boolean;
    inSync(): Promise<any>;
    startTxWatch(): any;
    hasKey(address: string): any;
    stopTxWatch(): any;
    addTxToWatch(tx: string, autoWatch?: boolean): this;
    getCurrentTxQueue(): IterableIterator<any>;
}
declare const helper: GethHelper;
export default helper;
