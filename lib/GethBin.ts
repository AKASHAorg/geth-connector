/// <reference path="../typings/main.d.ts"/>
import * as Promise from 'bluebird';
import Wrapper = require('bin-wrapper');
import * as path from 'path';
import * as url from 'url';

const defaultTarget = path.join(__dirname, 'bin');

const repo = 'https://github.com/ethereum/go-ethereum/releases/download/';
const gethVersion = 'v1.4.18/';

const baseUrl = url.resolve(repo, gethVersion);

const source = {
    linux: 'geth-linux-amd64-1.4.18-ef9265d0.tar.gz',
    win: 'geth-windows-amd64-1.4.18-ef9265d0.zip',
    osx: 'geth-darwin-amd64-1.4.18-ef9265d0.tar.gz'
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