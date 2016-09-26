/// <reference path="../typings/main.d.ts" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import Wrapper = require('bin-wrapper');
export declare class GethBin {
    wrapper: Wrapper;
    constructor(target?: string);
    static requiredVersion(): string;
    getPath(): string;
    check(): Promise<{}>;
}
