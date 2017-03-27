'use strict';

const co = require('co'),
    cache = require('lru-cache')(),
    Queue = require('promise-queue'),
    helpers = require('../libs/helpers'),
    request = helpers.request,
    parseXML = helpers.parseXML,
    Model = require('mongorito').Model,
    playerIds = {},
    events = {
        diff: 1,
        newUser: 2,
        delUser: 3
    };

class Player extends Model {}
class Hronos extends Model {}

function *clansList() {
    let response = yield request({
        host: 'oldbk.com',
        path: '/encicl/klani/clans.php'
    });

    if (response.error) {
        throw response.error;
    }

    let re = new RegExp('(?:( - ))?<strong>' +
            '<img src=\'http://i\\.oldbk\\.com/i/align_(\\d(?:\\.\\d+)?)\\.gif\' border=\'0\'>' +
            '(?:<img src=\'http://i\\.oldbk.com/i/klan/(\\w+)\\.gif\' border=\'0\'>)?' +
            '<a href=\'clans\\.php\\?clan=(\\w+)\'>\\s*(\\4)</a>', 'g'),
        lines = response.body.match(re);

    if (!lines) {
        throw new Error('Failed to parse clans');
    }

    let previousClan = null;
    return lines.map(line => {
        let parsed = line.match(re) && re.exec(line);
        if (!parsed) {
            throw new Error(`Failed to parse line: "${line}"`);
        }

        let result = {
            name: parsed.slice(-1)[0],
            align: parseFloat(parsed[2])
        };

        if (parsed[1] && previousClan) {
            previousClan.recrut = result;
        }

        previousClan = result;
        return result;
    });
}

function extractFields(xmlJson, container) {
    container = container || {};
    Object.keys(xmlJson).forEach(key => {
        if (key === '$') {
            return extractFields(xmlJson[key], container);
        }

        container[key] = xmlJson[key];
        if (Array.isArray(xmlJson[key])) {
            container[key] = {};
            xmlJson[key].forEach(item => {
                if (typeof item === 'object') {
                    extractFields(item, container[key]);
                } else {
                    container[key] = item;
                }
            });
        }
    });

    return container;
}

function *clanPlayers(clan = '+') {
    let response = yield request({
        host: 'oldbk.com',
        path: `/api/clans_xml.php?clan=${clan}`
    });

    if (response.error) {
        throw response.error;
    }

    if (!response.body.length || response.body.toString().toLowerCase() === 'false') {
        throw new Error(`Failed to load clan "${clan}": Empty response.`);
    }

    let json = yield parseXML(response.body);
    if (json) {
        json = json['clans_users'];
    } else {
        throw new Error('XML format error.');
    }

    let result = {
        refresh: json.$.refresh,
        players: []
    };

    json.user.forEach(user => {
        user = extractFields(user);
        user.clan = clan;
        ['level', 'align', 'id', 'battle'].forEach(key => user[key] |= 0);
        result.players.push(user);
    });

    return result;
}

function *getAllPlayers() {
    let response = yield request({
        host: 'oldbk.com',
        path: '/api/api.xml',
        headers: {
            Accept: '*/*'
        },
        encoding: 'win1251'
    });

    if (response.error) {
        throw response.error;
    }

    if (!response.body.length) {
        throw new Error('Empty response.');
    }

    let players = yield parseXML(response.body.toString());
    try {
        players = players.online.user;
    } catch (error) {
        throw new Error('XML format error.');
    }

    return players.map(player => extractFields(player));
}

function *makeDiff(players, ids) {
    var queue = new Queue(10, Infinity);

    yield Promise.all(players.map(function (player) {
        return queue.add(function () {
            return co(function* () {
                delete ids[player.id];

                let record = cache.get(player.id),
                    hrono;

                if (!record) {
                    hrono = new Hronos({
                        player: player,
                        event: {
                            name: events.newUser
                        }
                    });
                    record = new Player(player);
                    cache.set(player.id, record);
                }


                let recordTmp = Object.assign({}, record.get()),
                    playerTmp = Object.assign({}, player),
                    diff = {};

                Object.keys(playerTmp).forEach(function (key) {
                    record.set(key, playerTmp[key]);
                });

                Object.keys(recordTmp).forEach(function (key) {
                    if (['_id', 'created_at', 'lasttime', 'updated_at', 'battle', 'ingame', 'room'].indexOf(key) !== -1) {
                        return;
                    }
                    if (!recordTmp[key] && playerTmp[key]) {
                        diff[key] = [recordTmp[key], playerTmp[key]];
                    } else if (!playerTmp.hasOwnProperty(key) && recordTmp[key]) {
                        diff[key] = [recordTmp[key], ''];
                    } else if (playerTmp[key] && recordTmp[key] && playerTmp[key] !== recordTmp[key]) {
                        diff[key] = [recordTmp[key], playerTmp[key]];
                    }
                });

                if (Object.keys(diff).length > 0) {
                    hrono = new Hronos({
                        player: player,
                        event: {
                            name: events.diff,
                            diff: diff
                        }
                    });
                }

                if (hrono) {
                    yield hrono.save();
                }

                yield record.save();
            });
        });
    }));
}

function *updateAllPlayers(log) {
    let queue = new Queue(1, Infinity),
        clans = cache.get('+clans'),
        requests = cache.get('+requests');

    if (!clans) {
        clans = yield clansList();
        cache.set('+clans', clans);
    }

    if (!requests) {
        cache.set('+requests', requests);
        let players = yield Player.find();
        if (Array.isArray(players)) {
            players.forEach(player => {
                playerIds[player.get('id')] = true;
                cache.set(player.get('id'), player);
            });
        }
    }

    let ids = Object.assign({}, playerIds),
        noErrors = true,
        updater = Promise.all([].concat(clans, {name: '+'}).map(function (clan) {
            return queue.add(function () {
                return co(function *() {
                    return yield clanPlayers(clan.name);
                }).catch(function (error) {
                    log.error(error);
                    return Promise.reject(error);
                });
            }).then(function (result) {
                if (result && Array.isArray(result.players)) {
                    co(function *() {
                        yield makeDiff(result.players, ids);
                    }).catch(function (error) {
                        log.error(error);
                        return Promise.reject(new Error(`Failed to create diff for clan ${clan.name} players.`));
                    });
                } else {
                    noErrors = false;
                    return Promise.reject(new Error(`Failed to get clan ${clan.name} players.`));
                }
            }).catch(function (error) {
                noErrors = false;
                log.error(error);
                return {};
            });
        }));

    updater.then(function () {
        if (noErrors) {
            Object.keys(ids).forEach(function (id) {
                let hrono = new Hronos({
                    player: cache.get(id),
                    event: {
                        name: events.delUser
                    }
                });

                cache.del(id);
                delete playerIds[id];
                hrono.save();
            });
        }
    });

    return yield updater;
}

module.exports.updateAllPlayers = updateAllPlayers;
module.exports.getAllPlayers = getAllPlayers;

/*
co(function *() {
    let players = yield getAllPlayers();
    console.log(players);
}).catch(function (error) {
    console.log(error);
});
*/
