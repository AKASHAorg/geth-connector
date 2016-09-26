/// <reference types="node" />
import { Socket } from 'net';
export declare class Web3 {
    web3Instance: any;
    constructor();
    readonly web3: any;
    setProvider(gethIpc: string, socket: Socket): any;
    _adminProps(): {
        methods: any[];
        properties: any[];
    };
}
