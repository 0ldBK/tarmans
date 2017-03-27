'use strict';

const route = require('koa-route'),
    Model = require('mongorito').Model;

class Clans extends Model {}
class Player extends Model {}

module.exports = function clans (app) {
    app.use(route.get('/clans', function* () {
        let clans = yield Clans.find({});
        if (!clans) {
            clans = [];
        }

        clans = clans.map(clan => {
            clan = clan.get();
            clan.name = clan._id;
            delete clan._id;
            return clan;
        });

        this.body = {status: 'ok', clans: clans};
    }));

    app.use(route.get('/clans/:clan/players', function* (clan) {
        let players = yield Player.find({clan: clan});

        this.body = {status: 'ok', players: players};
    }));

    app.use(route.post('/invisible', function* () {
        let query = Object.assign({'lasttime': '1 мин. '}, this.request.body || {});
        let players = yield Player.limit(100).find(query);
        if (!players) {
            players = [];
        }

        players = players.map(player => {
            player = player.get();
            return {
                login: player.login,
                id: player._id,
                align: player.align,
                level: player.level,
                clan: player.clan === '+' ? '' : player.clan,
                room: player.room,
                status: player.status,
                lasttime: '<b><i>Невидимка</i></b>'
            };
        });

        this.body = {status: 'ok', players: players};
    }));
};
