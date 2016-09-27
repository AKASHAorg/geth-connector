/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import Wrapper = require('bin-wrapper');
import * as path from 'path';
import * as url from 'url';

const defaultTarget = path.join(__dirname, 'bin');

const repo = 'https://github.com/ethereum/go-ethereum/releases/download/';
const gethVersion = 'v1.4.13/';

const baseUrl = url.resolve(repo, gethVersion);

const source = {
    linux: 'geth-Linux64-20160926125500-1.4.13-8f0db697.tar.bz2',
    win: 'geth-windows-amd64-1.4.13-8f0db697.zip',
    osx: 'geth-OSX-20160926130115-1.4.13-8f0db697.zip'
};

const getDownloadUrl = (archive: string): string => {
    return url.resolve(baseUrl, archive);
};

export class GethBin {
    public wrapper: any;

    /**
     * @param target    Folder path for `target` geth executable
     */
    constructor(target: string = defaultTarget) {
        this.wrapper = new Wrapper()
            .src(getDownloadUrl(source.linux), 'linux', 'x64')
            .src(getDownloadUrl(source.win), 'win32', 'x64')
            .src(getDownloadUrl(source.osx), 'darwin', 'x64')
            .dest(target)
            .use(process.platform === 'win32' ? 'geth.exe' : 'geth');
    }
    /**
     * Required geth version for this app
     * @returns {string}
     */
    static requiredVersion() {
        return gethVersion.slice(0, -1);
    }

    /**
     * Get exec path for geth
     * @returns {string}
     */
    getPath() {
        return this.wrapper.path();
    }

    /**
     * Check if binary is ok
     * @returns {Bluebird}
     */
    check(): Promise<{}> {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve(this.getPath());
            });
        });
    }
}