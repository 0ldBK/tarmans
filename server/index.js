'use strict';

const config = require('./libs/config'),
    bunyan = require('bunyan'),
    logger = bunyan.createLogger({
        name: 'Tarman\'s server',
        logLevel: config.level
    }),
    co = require('co'),
    Koa = require('koa'),
    route = require('koa-route'),
    koaStatic = require('koa-static'),
    koaQS = require('koa-qs'),
    parse = require('co-body'),
    cors = require('koa-cors'),
    keygrip = require('keygrip'),
    Mongorito = require('mongorito'),
    app = Koa(),
    libs = require('./libs'),
    updateAllPlayers = require('./cron/clans').updateAllPlayers;

co(function* () {
    yield Mongorito.connect(config.db.connect);
/*
    (function cron() {
        logger.info('Updating players');
        co(function *() {
            logger.info('Start loading players');
            yield updateAllPlayers(logger);
            logger.info('Finish loading players');
            setTimeout(cron, 120000);
        }).catch(function (error) {
            logger.fatal(error, 'Fatal error, failed to update all users');
        });
    })();
*/
}).catch(function (error) {
    logger.fatal({error: error}, 'Failed to connect to mongodb.');
});

function register(step) {
    libs[step].forEach(function (registrar) {
        registrar(app, logger);
    });
}

koaQS(app);

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(function* (next) {
    let start = new Date();
    this.log = logger;
    yield *next;
    this.set('X-Response-Time', (new Date().getTime() - start).toFixed(0) + 'ms');
});

app.keys = keygrip(['first secret key', 'second secret key'], 'sha256');
app.use(function *(next) {
    this.request.body = yield parse.json(this);
    yield *next;
});

app.use(route.get('/headers', function* () {
    let self = this;
    this.type = 'text/plain';
    this.body = 'ip: ' + this.ip + '\n';
    this.body += Object.keys(this.headers).map(function (header) {
        return header + ' = ' + self.headers[header];
    }).join('\n');
}));

register('auth');

register('other');

app.use(function* (next) {
    this.assert(this.userData.resources, 401, 'Unauthorized');
    this.assert(this.userData.resources.toJSON().ui, 401, 'Unauthorized');
    yield* next;
});

app.use(koaStatic('./ui', {
    index: 'index.html',
    defer: false
}));

app.use(function *() {
    this.status = 404;
    this.body = 'Not found';
});

app.on('error', function (error, ctx) {
    if (error.statusCode === 401 || error.statusCode === 404) {
        return;
    }
    logger.error(error, {ctx: ctx}, 'Server error');
});

app.listen(config.server.port, config.server.host, function () {
    logger.info('Server started on %s:%s', config.server.host, config.server.port);
});
