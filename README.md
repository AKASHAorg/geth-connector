# geth-connector

[![Build Status](https://travis-ci.org/AkashaProject/geth-connector.svg?branch=master)](https://travis-ci.org/AkashaProject/geth-connector)
[![Coverage Status](https://coveralls.io/repos/github/AkashaProject/geth-connector/badge.svg?branch=master)](https://coveralls.io/github/AkashaProject/geth-connector?branch=master)
[![npm](https://img.shields.io/npm/dm/@akashaproject/geth-connector.svg)](https://www.npmjs.com/package/@akashaproject/geth-connector)
[![Known Vulnerabilities](https://snyk.io/test/github/akashaproject/geth-connector/badge.svg)](https://snyk.io/test/github/akashaproject/geth-connector)

### Description
This is a package created and used by [AKASHA](http://akasha.world/) to manage [geth](http://ethereum.github.io/go-ethereum/)/[web3.js](https://github.com/ethereum/web3.js).

### Docs

The API docs can be found [here](http://docs.akasha.world/geth-connector/).

### Installation

```sh
npm install @akashaproject/geth-connector --save
```

### Usage

```js
import {gethHelper, GethConnector} from '@akashaproject/geth-connector'
const instance = GethConnector.getInstance(); // get the Singleton Service
/**
* {status}
* [] => synced
* [x] => finding peers
* [x, y] => synchronizing
*/
gethHelper.inSync().then(status =>  console.log(status))
```