'use strict';

const
    Antigate = require('antigate'),
    route = require('koa-route'),
    Model = require('mongorito').Model,
    cache = require('lru-cache')({
        maxAge: 5 * 60 * 1000
    });

class AntiCaptcha extends Model {}

module.exports = function anticaptcha(app, logger) {
    app.use(route.get('/anticaptcha/:hash', function* (hash) {
        this.assert(hash, 400, 'bad request');
        let captcha = yield AntiCaptcha.findOne({hash: +hash});
        this.assert(captcha, 404, 'Not found');
        this.body = captcha.get('code');
    }));

    app.use(route.post('/anticaptcha', function* () {
        let record = yield AntiCaptcha.findOne({hash: +this.request.body.hash}),
            hash = this.request.body.hash,
            code = this.request.body.code;

        if (!record || code !== record.get('code')) {
            yield new AntiCaptcha({
                hash: hash,
                code: code,
                base64: this.request.body.base64
            }).save();
        }

        this.body = {status: 'ok'};
    }));

    app.use(route.post('/anticaptcha/recognize', function* () {
        let key = this.request.body.key,
            image = this.request.body.image;

        this.assert(key, 400, 'Key required');
        this.assert(image, 400, 'Image required');

        let promise = cache.get(image);
        if (!promise) {
            promise = new Promise(function (resolve) {
                new Antigate(key).process(image, function (error, text) {
                    resolve({error: error && error.message, code: text, status: error ? 'fail' : 'ok'});
                    if (!error) {
                        new AntiCaptcha({
                            hash: new Date().getTime().toString(32),
                            code: text,
                            base64: image
                        }).save();
                    }
                });
            });
            cache.set(image, promise);
        }

        this.body = yield promise;
    }));
};
