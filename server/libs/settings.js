'use strict';


const
    co = require('co'),
    helpers = require('./helpers'),
    route = require('koa-route'),
    Model = require('mongorito').Model,
    xml2json = require('xml2js'),
    defaultSettings = require('./default-settings.json');

class Settings extends Model {}
module.exports = function settings(app, logger) {
    let events = {};
    function* updateEvents() {
        let result = yield helpers.request({
            host: 'oldbk.com',
            path: '/api/doska_xml.php',
            method: 'GET'
        });

        if (result.error || !result.body) {
            setTimeout(co.wrap(updateEvents), 60000);
            return;
        }
        // var z = {
        //     "refresh": 1467284819,
        //     "arena10": ["10", 1452171600],
        //     "arena11": ["11", 1454850000],
        //     "arena12": ["12", 1457355600],
        //     "arena7-21": ["7-21", 1467896400],
        //     "arena7": ["7", 1473253200],
        //     "haos": ["12", 1467288113],
        //     "attack": ["cap", 1467294173]
        // };

        function parseEvents(data) {
            let result = {};
            result.refresh = data.message && data.message.$ && +data.message.$.refresh;
            data.message && Array.isArray(data.message.event) && data.message.event.forEach(function (event) {
                event = event && event.$;
                if (event.name === 'Лотерея ОлдБк') {
                    let descr = event.description
                        .match(/Следующий тираж № (\d+) состоится (\d+)-(\d+)-(\d+) (\d+):(\d+)/);
                    if (descr) {
                        result.loto = [
                            descr[1],
                            Math.floor(new Date(descr[4], descr[3] - 1, descr[2], descr[5], descr[6]) / 1000)
                        ];
                    }
                } else if (event.name === 'Ближайшие бои на Арене Богов СВЕТ VS TЬМА - CapitalCity') {
                    let descr = event.description
                        .match(/Уровень (\d+(?:-\d+)?): (\d+)-(\d+)-(\d+) в (\d+):(\d+):(\d+).*/);
                    if (descr) {
                        result['arena' + descr[1]] = [
                            descr[1],
                            Math.floor(new Date(descr[4], descr[3] - 1, descr[2], descr[5], descr[6], descr[7]) / 1000)
                        ];
                    }
                } else if (event.name === 'Исчадие Хаоса') {
                    let descr = event.description
                        .match(/Исчадие Хаоса \((\d+)\) - вырвусь на свободу через:(\d+) ч. (\d+) мин./),
                        onlineDescr = event.description.match(/Исчадие Хаоса \((\d+)\)- Онлайн/);
                    if (descr) {
                        result.haos = [
                            descr[1],
                            Math.floor(new Date() / 1000 + (descr[2] * 60 * 60) + (descr[3] * 60))
                        ];
                    } else if (onlineDescr) {
                        result.haos = [
                            onlineDescr[1],
                            Math.floor(new Date() / 1000)
                        ];
                    }
                } else if (event.name === 'Атака на CapitalCity') {
                    let descr = event.description.match(/через:(\d+) ч. (\d+) мин./),
                        date = Math.floor(new Date() / 1000);
                    if (descr) {
                        date = Math.floor(new Date() / 1000 + (descr[1] * 60 * 60) + (descr[2] * 60));
                    }
                    result.attack = [event['id_city'], date];
                }
            });
            return result;
        }

        xml2json.parseString(result.body, function (error, result) {
            if (!error && result) {
                try {
                    events = parseEvents(result);
                } catch (error) {
                    logger.error({error: error, events: result}, 'Failed to parse events');
                }
            }
            setTimeout(co.wrap(updateEvents), 120000);
        });
    }

    function doUpdateEvents() {
        co(updateEvents).catch(function (error) {
            logger.error({error: error}, 'Failed to update events');
            setImmediate(doUpdateEvents);
        });
    }

    doUpdateEvents();

    app.use(route.post('/settings', function* () {
        let data = this.request.body;

        this.assert(data, 400, 'Bad request');
        let settings = yield Settings.findOne({user: this.userData.user.get('_id')});
        if (!settings) {
            settings = new Settings({user: this.userData.user.get('_id')});
        }
        settings.set('config', JSON.stringify(data));
        yield settings.save();

        this.body = {status: 'ok'};
    }));

    app.use(route.get('/settings', function* () {
        let settings = yield Settings.findOne({user: this.userData.user.get('_id')});
        if (!settings) {
            settings = new Settings({
                user: this.userData.user.get('_id'),
                config: JSON.stringify({settings: defaultSettings})
            });
            yield settings.save();
        }

        settings = settings.get();
        this.body = {
            data: typeof settings.config === 'string' ? JSON.parse(settings.config) : settings.config,
            saved: new Date(settings['updated_at']).getTime() / 1000
        };
    }));

    app.use(route.delete('/settings', function* () {
        let settings = yield Settings.findOne({user: this.userData.user.get('_id')});
        if (!settings) {
            settings = new Settings({user: this.userData.user.get('_id')});
        }
        settings.set('config', JSON.stringify({settings: defaultSettings}));
        yield settings.save();
        this.body = 'ok';
    }));

    app.use(route.get('/timers', function* () {
        this.body = events;
    }));

    app.use(route.get('/news', function* () {
        this.body = [];
    }));
};
