# geth-connector

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