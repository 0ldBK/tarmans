'use strict';
const route = require('koa-route');

module.exports = function ping(app) {
    app.use(route.get('/ping', function* () {
        this.body = {status: 'ok', result: 'pong'};
    }));
};
