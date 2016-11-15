/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import Wrapper = require('bin-wrapper');
import * as path from 'path';
import * as url from 'url';

const defaultTarget = path.join(__dirname, 'bin');

const repo = 'https://github.com/ethereum/go-ethereum/releases/download/';
const gethVersion = 'v1.5.0/';

const baseUrl = url.resolve(repo, gethVersion);

const source = {
    linux: baseUrl + 'geth-linux-amd64-1.5.0-c3c58eb6.tar.gz',
    win: 'https://gethstore.blob.core.windows.net/builds/geth-windows-amd64-1.5.0-c3c58eb6.zip',
    osx: baseUrl + 'geth-darwin-amd64-1.5.0-c3c58eb6.tar.gz'
};

export class GethBin {
    public wrapper: any;

    /**
     * @param target    Folder path for `target` geth executable
     */
    constructor(target: string = defaultTarget) {
        this.wrapper = new Wrapper()
            .src(source.linux, 'linux', 'x64')
            .src(source.win, 'win32', 'x64')
            .src(source.osx, 'darwin', 'x64')
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
     * Start download and check the geth executable
     * @param cb
     */
    check(cb: any) {
        let downloading = false;
        const timeOut = setTimeout(() => {
            downloading = true;
            cb('', { downloading })
        }, 600);
        this.wrapper.run(['version'], (err: any) => {
            clearTimeout(timeOut);
            if (err) {
                return cb(err);
            }
            const response = { binPath: this.getPath() };

            if(!downloading){
                return cb('', response);
            }

            setTimeout(()=> cb('', response), 300);
        });
    }
}