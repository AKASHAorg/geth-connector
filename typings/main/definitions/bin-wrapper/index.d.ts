declare module 'bin-wrapper' {
    export default class BinWrapperGeth {
        constructor(options?: any);
        src(path: string, platform: string, arch: string): BinWrapperGeth;
        dest(path: string): BinWrapperGeth;
        use(path: string): BinWrapperGeth;
        run(command: Array<string>, callback: any): any;
        path: () => string;
        version(range: string): BinWrapperGeth;
    }
}