'use strict';
angular.module('TarmansOBKPlugin').controller('AutoBattleCtrl', [
    '$scope',
    function ($scope) {
        $scope.hello = 'world';
    }
]);

window.$injector.invoke([
    'helpers', 'config', 'cache', 'location', 'Scheduler', 'Scroll', '$rootScope', 'actions', 'tools', 'Queue',
    function (helpers, config, cache, location, Scheduler, Scroll, $rootScope, actions, tools, Queue) {
        var freeFromAttackRooms = [
            'замки', 'загород', 'комната знахаря', 'арена богов', 'руины старого замка',
            'вход в руины', 'вход в лабиринт хаоса', 'лабиринт хаоса', 'башня смерти',
            'ристалище', 'вход в одиночные сражения', 'вход в групповые сражения'
        ];

        function max(array) {
            array = array.filter(function (number) {
                return typeof number === 'number';
            });

            return Math.max.apply(Math.max, array);
        }

        function interceptEnemy(intercept, user, callback) {
            if (typeof user === 'function') {
                callback = user;
                user = null;
            }

            callback = callback || angular.noop;
            user = user || intercept.enemy;
            if (cache.get('intercept.DPUser["' + user.id + '"]')) {
                callback();
                return false;
            }
            if ((config.get('intercept.doNotIntercept') || []).indexOf(user.login) > -1) {
                callback(new Error('Пользователь в списке ненападения'));
                return false;
            }

            helpers.message('Перехватываем "' + user.login + '"[' +
                user.level + '](' + (user.class || '<class>') + ')');
            actions.combo({
                user: user,
                operations: intercept.actions.map(function (action) {
                    return {
                        scroll: action.scroll.name,
                        action: action.scroll.name,
                        options: [action.scroll.options],
                        durability: action.durability,
                        breakOnFail: action.breakOnFail
                    };
                })
            }, function (error) {
                if (error && error.message &&
                    /Не так быстро|слаба|травмирован|не работает|Нельзя участвовать в бою/i.test(error.message.toLowerCase())) {
                    cache.put('intercept.DPUser["' + user.id + '"]', true, 4000);
                }
                callback.apply(this, arguments);
            });
            return true;
        }
        actions.interceptEnemy = interceptEnemy;

        function getValidators(onlineList) {
            return {
                user: function (user) {
                    return onlineList.user && onlineList.user[user.login];
                },
                klan: function (user) {
                    var intercept = onlineList.klan && onlineList.klan[(user.klan || '').toLowerCase()];
                    return intercept && +user.level <= max(intercept.levels) && intercept;
                },
                war: function (user) {
                    var intercept = onlineList.war;
                    return +user.war && +user.level <= max(intercept.levels) && intercept;
                },
                opposition: function (user) {
                    var opposition = onlineList.opposition,
                        myUser = cache.get('user');

                    return myUser.opposition &&
                        myUser.align !== +user.align &&
                        opposition.levels.indexOf(+user.level) > -1 &&
                        [2, 3, 6].indexOf(+user.align) !== -1 &&
                        onlineList.opposition;
                },
                align: function (user) {
                    return onlineList.align && onlineList.align.indexOf(+user.align) !== -1 &&
                        onlineList.align;
                },
                outOfTown: function (user) {
                    var opts = onlineList.outOfTown,
                        result = true;

                    if (Array.isArray(opts.aligns) && opts.aligns.indexOf(+user.align) === -1) {
                        result = false;
                    }
                    if (+opts.level >= 0 && +opts.level < +user.level) {
                        result = false;
                    }
                    return result;
                }
            };
        }

        function doIntercept(users, next) {
            var interceptList = config.get('intercept.list') || [],
                listIsEmpty = !interceptList.some(function (entry) {
                    return entry.enabled;
                }),
                onlineList = {},
                validate = getValidators(onlineList);

            if (listIsEmpty) {
                return next(5000);
            }

            interceptList.forEach(function (intercept) {
                if (!intercept.enabled || intercept.offline) {
                    return;
                }

                if (intercept.type === 'user') {
                    onlineList.user = onlineList.user || {};
                    onlineList.user[intercept.enemy.login] = intercept;
                } else if (intercept.type === 'klan') {
                    onlineList.klan = onlineList.klan || {};
                    intercept.enemy.name.split('-').forEach(function (name) {
                        name = name.trim().toLowerCase();
                        onlineList.klan[name] = intercept;
                    });
                } else if (intercept.type === 'war') {
                    onlineList.war = intercept;
                } else if (intercept.type === 'opposition') {
                    onlineList.opposition = intercept;
                } else if (intercept.type === 'align') {
                    onlineList.align = intercept;
                } else if (intercept.type === 'outOfTown') {
                    onlineList.outOfTown = intercept;
                }
            });

            users.forEach(function (user) {
                Object.keys(onlineList).some(function (type) {
                    var intercept = validate[type](user);
                    if (intercept) {
                        if (!intercept.inBattle && user.battle) {
                            return true;
                        }

                        user.class = cache.get('DPUserClass["' + user.id + '"]');
                        if (cache.get('intercept.DPUser["' + user.id + '"]')) {
                            return false;
                        }
                        if (type !== 'opposition' || user.class && !config.get('intercept.class.' + user.class)) {
                            return interceptEnemy(intercept, user);
                        } else {
                            tools.userInfo(user.login).then(function (info) {
                                if (info.agil > info.int) {
                                    user.class = 'dodge';
                                } else if (info.agil < info.int) {
                                    user.class = 'crit';
                                }
                                if (info.dex > 50) {
                                    user.class = 'tank';
                                }
                                if (info.hp * 100 / info.maxhp < 33) {
                                    cache.put('intercept.DPUser["' + user.id + '"]', true, 5000);
                                    return;
                                }
                                var dress = info.dress ? info.dress.split(',')
                                    .slice(0, -1)
                                    .filter(function (i) {
                                        return i.indexOf('Руна') === -1;
                                    }) : [];
                                if (dress.length <= 10) {
                                    interceptEnemy(intercept, user);
                                    return;
                                }
                                console.log(user.id, info.id, info.agil, info.int, info.dex, user.class);
                                cache.put('DPUserClass["' + user.id + '"]', user.class);
                                if (user.class && !config.get('intercept.class.' + user.class)) {
                                    interceptEnemy(intercept, user);
                                }
                            });
                        }
                        return true;
                    }
                });
            });
            next();
        }

        var offlineInterceptTimer = 10;
        Scheduler.create('intercept', {updateInterval: 1000, async: true}, function (next) {
            if (cache.get('battle')) {
                return next();
            }

            var interceptList = config.get('intercept.list') || [],
                offlineList = interceptList.filter(function (intercept) {
                    return intercept.enabled && intercept.type === 'user' && intercept.offline;
                });

            if (offlineInterceptTimer === 10 || offlineInterceptTimer <= 0) {
                Queue.forEach(offlineList, interceptEnemy, function () {
                    offlineInterceptTimer = 10;
                });
            }
            offlineInterceptTimer -= 1;

            location.get(function (error, loc) {
                if (error) {
                    return next(2000);
                }

                if (freeFromAttackRooms.indexOf(loc.name.toLowerCase()) !== -1) {
                    //return next(5000);
                }

                doIntercept(loc.users || [], next);
            });
        });
    }
]);
