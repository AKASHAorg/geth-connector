/// <reference path="../typings/main.d.ts" />
export declare class GethBin {
    wrapper: any;
    constructor(target?: string);
    static requiredVersion(): string;
    getPath(): any;
    check(cb: any): void;
    deleteBin(): any;
}
