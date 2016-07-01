import {GethConnector, gethHelper} from '../index';
import * as events from '../lib/Constants';


describe('GethConnector', function () {
    before(function () {
        [
            '0x8ed40509ad7087b45190488fcee0a8ff96c9349a9c99d6c0cc7f419f05204ace',
            '0x5f66db0283e5a155b10fa7744c776db395e3a2d5963b133b7968d5078045b51f',
            '0x0c7b697e3dcd0bc1ceacdf004f1402e87ddb66eca7a0b559228c013699b71f47',
            '0x64f95b53c085b3f860b74fedcf60758fe6d9ace45978571bb8d93ebbdbd7893f'
        ].forEach(
            function (hash) {
                gethHelper.addTxToWatch(hash);
            }
        );
        GethConnector.getInstance().setLogger({
            info: function () {
            },
            error: function () {
            },
            warn: function () {
            }
        });
    });
    it('can #start geth process', function (done) {
        GethConnector.getInstance().on(events.STARTED, function () {
            done();
        });
        GethConnector.getInstance().start();
    });

    it('can #stop geth process', function (done) {
        this.timeout(20000);
        GethConnector.getInstance().stop().then(() => done());
    });


});