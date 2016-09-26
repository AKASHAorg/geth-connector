declare class Web3 {
    public currentProvider: any;
    public admin: any;
    public eth: any;
    public db: any;
    public shh: any;
    public net: any;
    public personal: any;
    public version: any;
    public settings: any;
    public providers: any;
    constructor(provider?: any);
    setProvider(provider: any): void;
    reset(keepSync?: boolean): void;
    filter(data: any): any;
    toHex(data: any): string;
    toAscii(data: any): string;
    toUtf8(data: any): string;
    fromAscii(data: any): string;
    fromUtf8(data: any): string;
    toDecimal(data: any): any;
    fromDecimal(data: any): any;
    toBigNumber(data: any): any;
    toWei(data: any): any;
    fromWei(data: any): any;
    isAddress(data: any): any;
    isChecksumAddress(data: any): any;
    toChecksumAddress(data: any): any;
    isIBAN(data: any): any;
    sha3(data: string, options: any): string;
    isConnected(): boolean;
    createBatch(): any;
    fromICAP(data: string): string;
    _extend: any;
}

declare module 'web3' {
    export default Web3;
}

declare module 'ethereumjs-testrpc' {
    class TestRpc extends Web3 {
        static provider(): any;
    }
    export default TestRpc;
}