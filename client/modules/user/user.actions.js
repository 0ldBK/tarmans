'use strict';

angular.module('TarmansOBKPlugin').run(['actions',
    'helpers', 'config', 'cache', 'location', 'Scheduler', 'Queue', 'Scroll', 'tools', '$rootScope', 'server',
    function (actions, helpers, config, cache, location, Scheduler, Queue, Scroll, tools, $rootScope, server) {
        actions.attack = function (options, callback) {
            actions.combo({
                operations: [options],
                user: options.user
            }, callback);
        };

        actions.combo = function (options, callback) {
            Queue.forEach(options.operations, function (operation, callback) {
                var action = actions[operation.action];

                if (typeof action === 'function') {
                    operation.user = options.user;
                    return action(operation, callback);
                }

                var scroll = Scroll(operation.scroll, operation.options);
                scroll.use(options.user, function (error) {
                    if (operation.breakOnFail && error) {
                        return callback(error);
                    }
                    callback();
                });
            }, callback);
        };

        actions.cure = function (options, callback) {
            callback = callback || angular.noop;
            if (options.scroll && options.scroll !== 'cure') {
                Scroll(options.scroll, ['inventory', 'ability', 'relict'])
                    .use(options.user, callback);
                return;
            }

            tools.userInfo(options.user.login, function (error, info) {
                if (error) {
                    return callback(error);
                }

                if (info.travma === 0 || info.travma === 14) {
                    return callback(null);
                }

                var queue = Queue(1),
                    startLocation,
                    complect = config.get('doc.complect');
                queue.drain = callback;

                if (complect) {
                    queue.push(function (callback) {
                        actions.changeComplect(complect, callback);
                    });
                }

                if (config.get('doc.moveBack')) {
                    queue.push(function (callback) {
                        location.get(function (error, loc) {
                            startLocation = loc.name;
                            callback(error);
                        });
                    });
                }

                if (config.get('doc.moveToUser')) {
                    queue.push(function (callback) {
                        location.go(info.loc, callback);
                    });
                }

                queue.push(function (callback) {
                    Scroll('cure' + info.travma, options.place || ['inventory', 'ability', 'relict'])
                        .use(options.user, callback);
                });

                if (config.get('doc.moveToReload')) {
                    queue.push(window.$injector.get('user::parsers').inventory);
                    queue.push(function (callback) {
                        var scrolls = [].concat.apply([],[cache.get('user.scrolls.cure1'),
                            cache.get('user.scrolls.cure2'), cache.get('user.scrolls.cure3')])
                            .filter(function (scroll) {
                                return scroll && scroll.builtin && scroll.durability === 0;
                            });

                        if (scrolls.length) {
                            actions.reload(scrolls, function () {
                                window.$injector.get('user::parsers').inventory(callback);
                            });
                        } else {
                            callback();
                        }
                    });
                }

                if (config.get('doc.moveBack')) {
                    queue.push(function (callback) {
                        location.go(startLocation, callback);
                    });
                }
            });
        };

        actions.changeComplect = function (complect, callback) {
            var complects = cache.get('user.complects'),
                complectUrl = complects && complects[complect];

            if (complect === 'undress') {
                complectUrl = 'main.php?edit=1&undress=all';
            } else if (!complectUrl) {
                return callback(new Error('Комплект "' + complect + '" не найден!'));
            }

            helpers.request({url: 'http://capitalcity.oldbk.com/' + complectUrl, type: 'text'}, callback);
        };

        actions.storeComplect = function (name, callback) {
            var data = {
                method: 'POST',
                url: 'http://capitalcity.oldbk.com/main.php?edit=1',
                data: 'sd4=' + cache.get('user.id') + '&savecomplect=' + helpers.convert(name)
            };
            helpers.request(data, callback);
        };

        actions.enableRedHP = function () {
            actions.storeComplect('plugin-tmp', function () {
                Scheduler.create('user::redHP', {updateInterval: 90000, async: true}, function (next) {
                    if (cache.get('battle')) {
                        return next(10000);
                    }
                    actions.changeComplect('undress', function () {
                        actions.changeComplect('plugin-tmp', function () {
                            next();
                        });
                    });
                });
            });
        };

        actions.reload = function (items, callback) {
            location.go('ремонтная мастерская', function (error) {
                if (error) {
                    return callback(error);
                }
                Queue.forEach(items, function (item, next) {
                    helpers.request({url: 'http://capitalcity.oldbk.com/repair.php', type: 'text', query: {
                        razdel: 2,
                        recharge: item.id
                    }}, next);
                }, callback);
            });
        };

        actions.battle = function (battle) {
            var currentBattle = cache.get('battle');
            cache.put('battle', battle);

            if (!battle && currentBattle) {
                $rootScope.$emit('battle::end', battle);
                helpers.notify({audio: 'trap', title: 'Tarman\'s plugin', message: 'Закончился поединок'});
            } else if (battle && !currentBattle) {
                $rootScope.$emit('battle::start', battle);
                helpers.notify({audio: 'trap', title: 'Tarman\'s plugin', message: 'Начался поединок'});
            }

            server.setBattle(battle);
        };

    }
]);

