/// <reference path="../typings/main.d.ts" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
export declare class GethBin {
    wrapper: any;
    constructor(target?: string);
    static requiredVersion(): string;
    getPath(): any;
    check(cb: any): void;
    deleteBin(): Promise<any>;
}
