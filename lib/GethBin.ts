/// <reference path="../typings/main.d.ts"/>
import Promise = require('bluebird');
import Wrapper = require('bin-wrapper');
import path = require('path');
import url = require('url');

const defaultTarget = path.join(__dirname, 'bin');

const repo = 'https://github.com/ethereum/go-ethereum/releases/download/';
const gethVersion = 'v1.4.7';

const baseUrl = url.resolve(repo, gethVersion);

const source = {
    linux: 'geth-Linux64-20160615125500-1.4.7-667a386.tar.bz2',
    win: 'Geth-Win64-20160615094032-1.4.7-667a386.zip',
    osx: 'geth-OSX-2016061509421-1.4.7-667a386.zip'
};

const getDownloadUrl = (archive: string): string => {
    return url.resolve(baseUrl, archive);
};

export class GethBin {
    public wrapper: Wrapper;

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
     * Check if binary is ok
     * @returns {Bluebird}
     */
    check(): Promise<{}> {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err: any) => {
                if (err) {
                    return reject(err);
                }
                return resolve('geth-bin: executable is ok');
            });
        });
    }
}