'use strict';

const route = require('koa-route'),
    Model = require('mongorito').Model;

class Currency extends Model {}
class Resources extends Model {}

module.exports = function currency(app) {
    let lastOffer = 0;
    app.use(route.post('/currency', function* () {
        var data = this.request.body;
        if (data.offer !== lastOffer) {
            lastOffer = data.offer;
            var currency = new Currency(data);
            yield currency.save();
        }
        this.body = {status: 'ok'};
    }));

    app.use(route.get('/currency', function* (next) {
        let resources = yield Resources.findOne({user: this.userData.user.get('_id')});
        if (!resources || !resources.get('ui')) {
            return yield* next;
        }

        this.body = yield Currency.sort({$natural: -1})
            .limit(25)
            .find({}, {amount: 1, offer: 1, 'created_at': 1, _id: 0});
    }));
};
