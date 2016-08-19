"use strict";
const Promise = require('bluebird');
const Wrapper = require('bin-wrapper');
const path = require('path');
const defaultTarget = path.join(__dirname, 'bin');
const repo = 'https://bintray.com/artifact/download/karalabe/ethereum/geth';
const gethVersion = '1.4.11-stable-fed692f';
const arch32 = ['x86', 'x32', 'ia32'];
const source = {
    darwin386: 'darwin-10.6-386.tar.bz2',
    darwin64: 'darwin-10.6-amd64.tar.bz2',
    linux386: 'linux-386.tar.bz2',
    linux64: 'linux-amd64.tar.bz2',
    win386: 'windows-4.0-386.exe.zip',
    win64: 'windows-4.0-amd64.exe.zip'
};
const getDownloadUrl = (archive) => {
    return [repo, gethVersion, archive].join('-');
};
class GethBin {
    constructor(target = defaultTarget) {
        this._getBinName();
        if (!this.exec) {
            throw new Error(`${process.platform} ${process.arch} not supported`);
        }
        this.exec = ['geth', gethVersion, this.exec].join('-');
        this.wrapper = new Wrapper()
            .src(getDownloadUrl(source.linux64), 'linux', 'x64')
            .src(getDownloadUrl(source.linux386), 'linux', 'x86')
            .src(getDownloadUrl(source.linux386), 'linux', 'ia32')
            .src(getDownloadUrl(source.linux386), 'linux', 'x32')
            .src(getDownloadUrl(source.darwin64), 'darwin', 'x64')
            .src(getDownloadUrl(source.darwin386), 'darwin', 'x86')
            .src(getDownloadUrl(source.win64), 'win32', 'x64')
            .src(getDownloadUrl(source.win386), 'win32', 'x86')
            .src(getDownloadUrl(source.win386), 'win32', 'ia32')
            .src(getDownloadUrl(source.win386), 'win32', 'x32')
            .dest(target)
            .use(process.platform === 'win32' ? `${this.exec}.exe` : this.exec);
    }
    _getBinName() {
        switch (process.platform) {
            case 'linux':
                if (arch32.indexOf(process.arch) !== -1) {
                    this.exec = source.linux386.split('.')[0];
                }
                if (process.arch === 'x64') {
                    this.exec = source.linux64.split('.')[0];
                }
                break;
            case 'darwin':
                if (arch32.indexOf(process.arch) !== -1) {
                    this.exec = source.darwin386.split('.')[0];
                }
                if (process.arch === 'x64') {
                    this.exec = source.darwin64.split('.')[0];
                }
                break;
            case 'win32':
                if (arch32.indexOf(process.arch) !== -1) {
                    this.exec = source.win386.split('.')[0];
                }
                if (process.arch === 'x64') {
                    this.exec = source.win64.split('.')[0];
                }
                break;
            default:
                this.exec = '';
        }
    }
    ;
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
