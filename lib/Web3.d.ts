/// <reference types="node" />
import { Socket } from 'net';

export declare class Web3 {
  web3Instance: any;
  readonly web3: any;

  constructor();

  setProvider(gethIpc: string, socket: Socket): any;

  _adminProps(): {
    methods: any[];
    properties: any[];
  };
}
