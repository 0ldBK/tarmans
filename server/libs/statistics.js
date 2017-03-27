'use strict';

const route = require('koa-route'),
    Model = require('mongorito').Model;

class Statistics extends Model {}
class Resources extends Model {}
class Users extends Model {}

module.exports = function statistics(app) {

    app.use(route.post('/statistics', function* () {
        let data = this.request.body;
        if (data) {
            data.user = this.userData.user.get('_id');
            let record = new Statistics(data);
            yield record.save();
        }
        this.body = {status: 'ok'};
    }));

    app.use(route.get('/statistics', function* (next) {
        let resources = yield Resources.findOne({user: this.userData.user.get('_id')}),
            query = {};

        if (!resources || !resources.get('ui')) {
            return yield* next;
        }

        resources = resources.get();
        if (!resources.admin) {
            query.user = this.userData.user.get('_id');
        } else if (this.query.id) {
            let user = yield Users.findOne({id: +this.query.id});
            query.user = user.get('_id');
        }

        let maxDays = 30;
        if (this.query.days) {
            maxDays += parseInt(this.query.days, 10);
        }

        let date = new Date() - (maxDays * 24 * 60 * 60 * 1000);

        query['created_at'] = {$gt: new Date(date)};

        let records =  yield Statistics.find(query),
            output = {};

        records.forEach(function (data) {
            data = data.get();
            ['money', 'win', 'loose', 'experience', 'reputation'].forEach(function (key) {
                if (data[key]) {
                    output[key] = output[key] || [];
                    output[key].push({data: data[key], date: data['created_at']});
                }
            });
        });
        this.body = output;
    }));
};
