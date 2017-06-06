/// <reference path="../typings/main.d.ts"/>
import Wrapper = require('bin-wrapper');
import * as path from 'path';
import * as Promise from 'bluebird';
import { unlink } from 'fs';
// import * as url from 'url';

const defaultTarget = path.join(__dirname, 'bin');

const repo = 'https://gethstore.blob.core.windows.net/builds/';
const gethVersion = '1.6.5';
const gethCommit = 'cf87713d';
const unlinkAsync = Promise.promisify(unlink);
// const baseUrl = url.resolve(repo, gethVersion);

const source = {
    linux: `${repo}geth-linux-amd64-${gethVersion}-${gethCommit}.tar.gz`,
    win: `${repo}geth-windows-amd64-${gethVersion}-${gethCommit}.zip`,
    osx: `${repo}geth-darwin-amd64-${gethVersion}-${gethCommit}.tar.gz`
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
        return `v${gethVersion}`;
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
            cb('', { downloading });
        }, 2000);
        this.wrapper.run(['version'], (err: any) => {
            clearTimeout(timeOut);
            if (err) {
                return cb(err);
            }
            const response = { binPath: this.getPath() };

            if (!downloading) {
                return cb('', response);
            }

            setTimeout(() => cb('', response), 300);
        });
    }

    /**
     * @returns {Bluebird<T>}
     */
    deleteBin() {
        const path = this.getPath();
        return unlinkAsync(path);
    }
}