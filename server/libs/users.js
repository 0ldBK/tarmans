'use strict';

const route = require('koa-route'),
    Model = require('mongorito').Model,
    helpers = require('./helpers');

class Users extends Model {}
class Sessions extends Model {}

module.exports = function currency(app) {
    app.use(route.post('/user/info', function* () {
        let uuid = this.request.body.uuid,
            login = this.request.body.login,
            data = login ? `login=${login}` : uuid;

        this.assert(data, 400, 'Bad request');

        let info = yield helpers.userInfo(data);
        this.body = {status: 'ok', info: info};
    }));

    app.use(route.post('/user/location', function* () {
        this.assert(this.request.body.location, 400, 'Bad request');
        this.userData.user.set('location', this.request.body.location);
        yield this.userData.user.save();
        this.body = {status: 'ok'};
    }));

    app.use(route.post('/user/battle', function* () {
        let battle = this.request.body.battle;
        this.userData.user.set('battle', battle);
        yield this.userData.user.save();
        this.body = {status: 'ok'};
    }));

    app.use(route.get('/users', function* (next) {
        let self = this,
            user = this.userData.user,
            resources = this.userData.resources,
            query = {},
            users = [user];

        if (resources && !resources.get('ui')) {
            return yield* next;
        }

        if (!resources.get('admin')) {
            this.body = users;
            return;
        }

        ['id', 'level', 'align', 'klan', 'name'].forEach(function (field) {
            if (self.query[field]) {
                query[field] = isNaN(+self.query[field]) ? self.query[field] : +self.query[field];
            }
        });

        // users = Users.populate('session', Sessions);
        users = yield Users.find(query);
        this.body = users;
    }));

    app.use(route.get('/users/database', function* (next) {
        next();
    }));

    app.use(route.get('/whoIAm', function* () {
        let user = this.userData.user,
            resources = this.userData.resources;

        this.body = {
            info: user,
            resources: resources
        };
    }));
};
