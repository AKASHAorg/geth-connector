"use strict";
const GethBin_1 = require('./GethBin');
const Web3_1 = require('./Web3');
const symbolEnforcer = Symbol();
const symbol = Symbol();
class GethConnector {
    constructor(enforcer) {
        this.web3 = new Web3_1.Web3();
        this.logger = console;
        if (enforcer !== symbolEnforcer) {
            throw new Error('Use .getInstance() instead of new constructor');
        }
    }
    static getInstance() {
        if (!this[symbol]) {
            this[symbol] = new GethConnector(symbolEnforcer);
        }
        return this[symbol];
    }
    setLogger(logger) {
        this.logger = logger;
    }
    setBinPath(path) {
        this.downloadManager = new GethBin_1.GethBin(path);
    }
}
exports.GethConnector = GethConnector;
