'use strict';

const route = require('koa-route'),
    Model = require('mongorito').Model;

class Opponent extends Model {}

module.exports = function currency(app) {
    app.use(route.put('/opponents', function* () {
        let body = this.request.body;
        this.assert(body, 400, 'Bad request');
        let opponent = yield Opponent.findOne({id: body.id});
        if (opponent) {
            opponent.set(body);
        } else {
            opponent = new Opponent(body);
        }
        yield opponent.save();
        this.body = {status: 'ok'};
    }));

    app.use(route.post('/opponents', function* () {
        let id = this.request.body.id;
        this.assert(id, 400, 'Bad request');
        this.body = yield Opponent.findOne({id: id});
    }));
};
