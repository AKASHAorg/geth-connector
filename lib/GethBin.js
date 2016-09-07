"use strict";
const Promise = require('bluebird');
const Wrapper = require('bin-wrapper');
const path = require('path');
const url = require('url');
const defaultTarget = path.join(__dirname, 'bin');
const repo = 'https://github.com/ethereum/go-ethereum/releases/download/';
const gethVersion = 'v1.4.11/';
const baseUrl = url.resolve(repo, gethVersion);
const source = {
    linux: 'geth-Linux64-20160819135300-1.4.11-fed692f.tar.bz2',
    win: 'Geth-Win64-20160818153642-1.4.11-fed692f.zip',
    osx: 'geth-OSX-20160818153612-1.4.11-fed692f.zip'
};
const getDownloadUrl = (archive) => {
    return url.resolve(baseUrl, archive);
};
class GethBin {
    constructor(target = defaultTarget) {
        this.wrapper = new Wrapper()
            .src(getDownloadUrl(source.linux), 'linux', 'x64')
            .src(getDownloadUrl(source.win), 'win32', 'x64')
            .src(getDownloadUrl(source.osx), 'darwin', 'x64')
            .dest(target)
            .use(process.platform === 'win32' ? 'geth.exe' : 'geth');
    }
    static requiredVersion() {
        return gethVersion.slice(0, -1);
    }
    getPath() {
        return this.wrapper.path();
    }
    check() {
        return new Promise((resolve, reject) => {
            this.wrapper.run(['version'], (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(this.getPath());
            });
        });
    }
}
exports.GethBin = GethBin;
