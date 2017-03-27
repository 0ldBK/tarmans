'use strict';

window.$injector.invoke([
    'helpers', 'Queue', 'config', 'cache', 'tools', 'location',
    'Scheduler', 'Scroll', '$rootScope', 'actions', 'server',
    function (helpers, Queue, config, cache, tools, location, Scheduler, Scroll, $rootScope, actions, server) {
        function returnArgument(number) {
            return function () {
                return arguments[number];
            };
        }

        function updateBattleInfo() {
            helpers.request({url: 'http://capitalcity.oldbk.com/logs.php?log=' + cache.get('battle.id')},
                function (error, dom) {
                    var typeEl = dom.querySelector('img[src^="http://i.oldbk.com/i/fighttype"]'),
                        autoEl = dom.querySelector('img[src^="http://i.oldbk.com/i/achaos.gif"]');

                    if (typeEl) {
                        cache.put('battle.type', typeEl.getAttribute('alt'));
                    }
                    if (autoEl) {
                        cache.put('battle.autoudar', true);
                    }
                }
            );
        }

        function parseOpponents(dom) {
            var opponents = [];
            angular.toArray(dom.querySelectorAll('#mes>span[id],#mes>u')).forEach(function (span) {
                var opponent = {priority: 0};
                if (span.nodeName === 'U') {
                    opponent.kickTime = new Date();
                    span = span.firstChild;
                }
                opponent.id = +span.getAttribute('id');

                if (opponent.id > 710000000 && opponent.id < 730000000) {
                    opponent.bot = true;
                } else if (opponent.id > 730000000) {
                    opponent.illusion = true;
                }
                var onClick = span.getAttribute('onclick'),
                    onContextMenu = span.getAttribute('oncontextmenu');

                if (onClick.indexOf('ChangeEnemy') === -1) {
                    return;
                }

                var loginParser = Function('ChangeEnemy', 'return ' + onClick),
                    levelParser = Function('OpenMenu', onContextMenu);
                opponent.login = loginParser(returnArgument(0));
                opponent.level = +levelParser(returnArgument(1));

                if (!opponent.bot && opponent.login.indexOf('(Клон ') > -1) {
                    opponent.clone = true;
                    var parsedLogin = /(.*)\s+\(kлoн (\d+)\)/.exec(opponent.login);
                    if (parsedLogin) {
                        opponent.login = parsedLogin[1];
                        opponent.cloneNumber = +parsedLogin[2];
                    }
                }

                if (span.firstChild.nodeName === 'B' && span.firstChild.firstChild.nodeName === 'I') {
                    delete opponent.illusion;
                    opponent.invisible = true;
                }

                /*
                if (!opponent.bot && !opponent.invisible) {
                    opponent.illusion = true;
                }
                 */

                opponents.push(opponent);
            });

            return opponents;
        }

        function getOpponentById(id) {
            var result = undefined,
                battle = cache.get('battle');

            if (!battle) {
                return result;
            }

            battle.opponents.some(function (opponent) {
                if (opponent.id === id) {
                    result = opponent;
                    return true;
                }
            });

            return result;
        }

        function mergeOpponents(opponents) {
            var battle = cache.get('battle'),
                iteration = ++battle.iteration;

            opponents.forEach(function (opponent) {
                var storedOpponent = getOpponentById(opponent.id);
                if (!storedOpponent) {
                    battle.opponents.push(opponent);
                    storedOpponent = opponent;
                }
                storedOpponent.iteration = iteration;
                if (!storedOpponent.bot || storedOpponent.clone) {
                    if (storedOpponent.kickTime && !opponent.kickTime) {
                        delete storedOpponent.kickTime;
                    } else if (!storedOpponent.kickTime && opponent.kickTime) {
                        storedOpponent.kickTime = opponent.kickTime;
                    }
                }
            });
            //cache.put('battle.iteration', iteration);
            battle.opponents.forEach(function (opponent, index) {
                if (opponent.iteration !== iteration) {
                    battle.opponents.splice(index, 1);
                }
            });

            //cache.put('battle.opponents', opponents);
            return battle.opponents;
        }

        /*
        function parseShowThing(text) {
            var parser = new Function('ShowThing', 'return ' + text);
            return parser(function (obj, txt) {
                return new DOMParser().parseFromString(txt, 'text/html');
            });
        }
        */

        function getOpponentClasses(dom) {
            var weapons = [];
            angular.toArray(dom.querySelectorAll('#att>table>tbody>tr>td:nth-child(3) center table a[target="_blank"]'))
                .forEach(function (a) {
                    var name = a.getAttribute('href').replace(/.*\/(.*)\.html$/, '$1'),
                        weapon = cache.get('weapons')[name];
                    if (weapon) {
                        weapons.push(weapon);
                    }
                    //var description = parseShowThing(a.getAttribute('onmouseover'));
                });
            var stats = {str: 0, agil: 0, int: 0, dex: 0, intel: 0, wisd: 0};
            var statKeys = {
                'Сила': 'str',
                'Ловкость': 'agil',
                'Интуиция': 'int',
                'Выносливость': 'dex',
                'Интеллект': 'intel',
                'Мудрость': 'wisd'
            };
            var statsEl = dom.querySelector('#att>table>tbody>tr>td:nth-child(3) center>center>:last-child td');
            if (statsEl) {
                statsEl.innerText.split('\n').forEach(function (string) {
                    var splitted = string.split(':');
                    stats[statKeys[splitted[0].trim()]] = parseInt(splitted[1], 10);
                });
            }

            var modificators = {
                crit: stats.int * 5,
                dodge: stats.agil * 5,
                ac: stats.int * 2 + stats.agil * 2,
                ad: stats.agil * 2 + stats.int * 2
            };

            weapons.forEach(function (weapon) {
                modificators.crit += weapon['c'] || 0;
                modificators.dodge += weapon['f'] || 0;
                modificators.ac += weapon['ac'] || 0;
                modificators.ad += weapon['af'] || 0;
            });

            var classes = {
                class: null,
                subclass: null
            };

            if (stats.dex > 50) {
                classes.class = 'tank';
            } else {
                classes.class = modificators.crit > modificators.dodge ? 'crit' : 'dodge';
            }

            classes.subclass = modificators.ac > modificators.ad ? 'ac' : 'ad';

            return classes;
        }

        var queue = new Queue(5);
        function getOpponentInfo(opponent) {
            queue.push(function (callback) {
                server.getOpponentClasses(opponent.id, function (classes) {
                    if (classes) {
                        opponent.class = classes.class;
                        opponent.subclass = classes.subclass;
                        cache.put('userClasses["' + opponent.id + '"]', {
                            class: classes.class,
                            subclass: classes.subclass
                        });
                        opponent.loaded = true;
                        delete opponent.loading;
                        return callback();
                    }

                    helpers.request({
                        url: 'http://capitalcity.oldbk.com/fbattle.php?login_target=' + helpers.convert(opponent.login)
                    }, function (error, dom) {
                        var classes = getOpponentClasses(dom);
                        opponent.class = classes.class;
                        opponent.subclass = classes.subclass;
                        cache.put('userClasses["' + opponent.id + '"]', {
                            class: classes.class,
                            subclass: classes.subclass
                        });
                        opponent.loaded = true;
                        delete opponent.loading;
                        server.putOpponentClasses(opponent);
                        callback();
                    });
                });
            });
        }

        function updateOpponentsInfo(opponents) {
            opponents.forEach(function (opponent) {
                if (opponent.invisible || opponent.clone || opponent.bot || opponent.illusion) {
                    opponent.loaded = true;
                    delete opponent.loading;
                }
                var classes = cache.get('userClasses["' + opponent.id + '"]');
                if (classes) {
                    opponent.class = classes.class;
                    opponent.subclass = classes.subclass;
                    opponent.loaded = true;
                    delete opponent.loading;
                } else if (!opponent.loading && !opponent.loaded) {
                    opponent.loading = true;
                    getOpponentInfo(opponent);
                }
            });
        }

        function opponentWeight(opponent) {
            function getLevels() {
                var levels = [
                    config.get('autobattle.configs[autobattle.current]' +
                        '["' + opponent.class + '"]["' + opponent.subclass + '"].min'),
                    config.get('autobattle.configs[autobattle.current]' +
                        '["' + opponent.class + '"]["' + opponent.subclass + '"].max')
                ].filter(function (level) {
                    return level > 0;
                });

                if (!levels.length) {
                    levels = [21];
                }

                return levels;
            }
            var user = cache.get('user'),
                abConfig = config.get('autobattle.configs[autobattle.current]'),
                whiteList = config.get('autobattle.configs[autobattle.current].whiteList') || [],
                levels = getLevels(),
                order = config.get('autobattle.configs[autobattle.current]' +
                    '["' + opponent.class + '"]["' + opponent.subclass + '"].order'),
                minLevel = Math.min.apply(Math, levels),
                maxLevel = Math.max.apply(Math, levels),
                reasons = opponent.reasons = [],
                autoResponse = abConfig.autoResponse || 50,
                timeout = cache.get('battle.timeout'),
                weight = 0,
                priority = false,
                force = false;

            if (timeout * 60 <= autoResponse) {
                autoResponse = timeout * 60 - 10;
            }

            delete opponent.queue;
            if (opponent.unresponsive) {
                delete opponent.unresponsive;
                weight += -1000;
                reasons.push('Unresponsive: ', weight);
            } else if (opponent.bot) {
                if (opponent.level - user.level <= 2) {
                    opponent.queue = 'bot';
                    weight += 10;
                    reasons.push('fourth queue: bots or unknown: ' + weight);
                    priority = true;
                    if (opponent.invisible || opponent.illusion) {
                        weight += 100;
                        opponent.queue = 'first';
                    }
                } else {
                    weight += 5;
                    reasons.push('fourth queue: top level bots or unknown: ' + weight);
                }
            } else if (Math.abs(opponent.level - user.level) <= 1) {
                weight += 200;
                if (order) {
                    weight += (1 + Math.abs(opponent.level - user.level)) * 50;
                } else {
                    weight += (2 - Math.abs(opponent.level - user.level)) * 50;
                }
                reasons.push('first queue: ' + weight);
                priority = true;
                if (whiteList.indexOf(opponent.login) > -1) {
                    weight = -100;
                    reasons.push('Whitelisted: ' + weight);
                    priority = false;
                    delete opponent.queue;
                } else if (opponent.level <= user.level) {
                    opponent.queue = 'first';
                    if (opponent.kickTime) {
                        force = true;
                        weight += 100;
                        reasons.push('first queue: kickTime: ' + weight);
                    }
                } else {
                    priority = false;
                    weight -= 100;
                    reasons.push('first queue: top level:' + weight);
                    if ((new Date() - opponent.kickTime) >= (autoResponse * 1000)) {
                        force = true;
                        priority = true;
                        weight += 1000;
                        reasons.push('first queue: top level:autoResponse: ' + weight);
                    }
                }
                if (!(minLevel <= opponent.level && opponent.level <= maxLevel)) {
                    priority = false;
                    force = false;
                    delete opponent.queue;
                    if (weight - 500 <= 0) {
                        weight = -1000;
                    } else {
                        priority = true;
                        force = true;
                        weight = 1000;
                    }
                    reasons.push('first queue: out of level: ' + weight);
                }

                if (opponent.lastHit && new Date() - opponent.lastHit < 20000) {
                    weight -= Math.ceil((20000 - (new Date() - opponent.lastHit)) / 300);
                    reasons.push('first queue: last hit < 20 sec: ' + weight);
                }
            } else if (user.level - opponent.level >= 2) {
                priority = true;
                opponent.queue = 'second';
                weight += 100 + Math.ceil(opponent.level * 100 / user.level);
                reasons.push('second queue: low levels: ' + weight);
                if (opponent.kickTime) {
                    weight += 500;
                    reasons.push('second queue: response: ' + weight);
                }
            } else if (opponent.level - user.level >= 2) {
                weight += -1000;
                reasons.push('third queue: top level: ' + weight);
            }
            if (opponent.unselectable) {
                opponent.weight = -1000;
            }

            opponent.weight = weight;
            opponent.force = force;

            return priority;
        }

        function opponentWeightManual(opponent) {
            var abConfig = config.get('autobattle.configs[autobattle.current]') || {},
                reasons = opponent.reasons = [],
                autoResponse = abConfig.autoResponse || 50,
                timeout = cache.get('battle.timeout'),
                weight = opponent.priority || 0,
                priority = !!opponent.priority || false,
                force = false;

            delete opponent.force;
            if (timeout * 60 <= autoResponse) {
                autoResponse = timeout * 60 - 10;
            }

            if (opponent.priority) {
                opponent.queue = 'queue-' + opponent.priority;
            }

            reasons.push('queue: ' + opponent.queue);
            if (!opponent.bot && !opponent.clone && (new Date() - opponent.kickTime) >= (autoResponse * 1000)) {
                force = true;
                priority = true;
                weight += 1000;
                reasons.push('autoResponse: ' + weight);
            }
            /*
            if (opponent.lastHit && new Date() - opponent.lastHit < 20000) {
                weight -= Math.ceil((20000 - (new Date() - opponent.lastHit)) / 300);
                if (weight <= 0) {
                    weight = 1;
                }
                reasons.push('last hit < 20 sec: ' + weight);
            }
            */

            opponent.weight = weight;
            opponent.force = force;

            return priority;
        }

        function opponentWeightRista(opponent) {
            var list = config.get('autobattle.configs[autobattle.current].ristaBots') || [],
                reasons = opponent.reasons = [],
                weight = opponent.priority || 0,
                priority = false,
                force = false;

            if (list.indexOf(opponent.login) > -1) {
                priority = true;
                opponent.queue = 'bot';
                opponent.weight = 100;
                reasons.push('BOT');
            }

            opponent.weight = weight;
            opponent.force = force;

            return priority;
        }

        function useHeal(dom) {
            //Использовать  Восстановление энергии 60HP
            //Прочность 0/1
            if (typeof dom.getElementById !== 'function') {
                dom.getElementById = function (id) {
                    return dom.querySelector('[id="' + id + '"]');
                };
            }

            var userHP = +dom.querySelector('#HP span').innerText.split('/')[0],
                hpToHeal = config.get('autobattle.configs[autobattle.current].minHPToHeal'),
                places = {
                    scrolls: dom.querySelectorAll('img[alt*="Восстановление энергии"]'),
                    inbound: dom.querySelectorAll('img[style*="sh/vstr"]')
                },
                sequence = config.get('autobattle.configs[autobattle.current].healSequence');

            if (!config.get('autobattle.enabled') || !sequence || !hpToHeal || !userHP || userHP > hpToHeal) {
                return;
            }

            sequence = sequence.split(',');
            sequence.some(function (place) {
                var a = places[place] && places[place][0] && places[place][0].parentNode;
                if (a) {
                    var onClick = a.getAttribute('onclick'),
                        win = {location: ''};
                    Function('document', 'window', 'confirm', onClick)(dom, win, function () {
                        return true;
                    });

                    helpers.reloadMain(win.location);
                    return true;
                }
            });
        }

        var timers = [],
            select;
        function parsePageBattle(dom) {
            var errorMessage = helpers.getErrorMessage(dom),
                abConfig = config.get('autobattle.configs[autobattle.current]'),
                delay = abConfig && abConfig.delay || 500;

            if (errorMessage.indexOf('Ожидаем, пока бой закончат другие игроки...') > -1) {
                if (!cache.get('battle.dead')) {
                    cache.put('battle.dead', new Date());
                    helpers.message('<span style="color: green;font-weight: bolder">Complete</span>');
                }

                return timers.push(setTimeout(helpers.reloadMain, 5000));
            }

            var form = dom.querySelector('#att'),
                end = dom.querySelector('input[name="end"]'),
                attack = function (id) {
                    return dom.querySelector('#A' + id) || {click: angular.noop};
                },
                defend = function (id) {
                    return dom.querySelector('#D' + id) || {click: angular.noop};
                },
                go = dom.querySelector('#go'),
                penemy = function (opponent) {
                    var element = dom.querySelector('#penemy');
                    if (opponent && opponent.weight <= 0) {
                        return timers.push(setTimeout(helpers.reloadMain, delay));
                    }
                    if (element && opponent && opponent.id) {
                        if (config.get('autobattle.debug')) {
                            helpers.message('Переключаемся на "' + opponent.login + '"[' + opponent.level + '](' +
                                opponent.class + ':' + opponent.subclass + '):' + opponent.reasons.join(', '));
                        }
                        if (+element.value !== opponent.id) {
                            var span = dom.querySelector('span[id="' + opponent.id + '"]');
                            if (span) {
                                select = opponent;
                                //span.click();
                                helpers.reloadMain('http://capitalcity.oldbk.com/fbattle.php?login_target=' +
                                    helpers.convert(opponent.login) + '&rnd=' + Math.random());
                            } else {
                                timers.push(setTimeout(helpers.reloadMain, delay));
                            }
                        }
                    } else {
                        timers.push(setTimeout(helpers.reloadMain, delay));
                    }
                    return element ? +element.value : 0;
                },
                getHiddenValue = function (name) {
                    return dom.querySelector('input[name="' + name + '"]').getAttribute('value');
                },
                rng = new helpers.RNG(new Date().getTime());

            attack(rng.nextRange(1, 4)).click();
            defend(rng.nextRange(1, 4)).click();

            try {
                useHeal(dom);
            } catch (error) {
                console.warn(error);
            }

            if (errorMessage.indexOf('Ожидаем хода противника...') > -1) {
                return timers.push(setTimeout(helpers.reloadMain, 5000));
            }
            if (select && errorMessage.indexOf('Персонаж не найден') > -1) {
                select.unselectable = true;
                select = null;
            }
            if (select && errorMessage.toLowerCase().indexOf('не ответил') > -1) {
                select.unresponsive = true;
                select.lastHit = new Date();
                select = null;
            }

            function doAttack(opponent) {
                function fire() {
                    opponent = opponent || select;
                    if (opponent) {
                        if (config.get('autobattle.debug')) {
                            helpers.message('Бъем "' + opponent.login + '"[' + opponent.level + '](' +
                                opponent.class + ':' + opponent.subclass + '):' + opponent.reasons.join(', '));
                        }
                        if (opponent.bot || opponent.clone) {
                            opponent.kickTime = new Date();
                        }
                        if (opponent.force) {
                            form.setAttribute('action', '/fbattle.php?login_target=' + helpers.convert(opponent.login) +
                                '&rnd=' + Math.random());
                            dom.querySelector('#penemy').value = opponent.id;
                            dom.querySelector('input[name="enemy"]').value = opponent.id;
                        }
                    }
                    select = opponent = null;
                    go = dom.querySelector('#go');
                    if (go) {
                        //opponent.lastHit = new Date();
                        go.click();
                    } else {
                        helpers.reloadMain();
                    }
                }
                return fire;
            }

            if (!abConfig || !config.get('autobattle.enabled')) {
                return;
            }

            if (end) {
                cache.put('battle.end', new Date());
                actions.battle();
                return end.click();
            }

            var battle = cache.get('battle'),
                battleId = +getHiddenValue('batl'),
                timeoutEl = dom.querySelector('font.dsc');

            if (!battle || battle.id !== battleId) {
                battle = {
                    start: new Date(),
                    iteration: 0,
                    id: battleId,
                    myId: +getHiddenValue('myid'),
                    opponents: [],
                    timeout: timeoutEl && (timeoutEl.innerText.replace(/[^\d]/g, '') * 60 * 1000) || 1
                };
                $rootScope.$emit('battle::start', battle);
                actions.battle(battle);
                updateBattleInfo();
            }

            if (!battle.type) {
                return setTimeout(function () {
                    helpers.reloadMain();
                }, delay);
            }

            if (select && penemy() === select.id || abConfig.type === 'killall') {
                return timers.push(setTimeout(doAttack(), delay));
            }

            var opponents = parseOpponents(dom);
            opponents = mergeOpponents(opponents);
            updateOpponentsInfo(opponents);

            var priority, filter = angular.noop;
            if (abConfig.type === 'haot') {
                filter = opponentWeight;
            } else if (abConfig.type === 'manual') {
                filter = opponentWeightManual;
            } else if (abConfig.type === 'rista') {
                filter = opponentWeightRista;
            }

            priority = opponents.filter(filter);
            if (!priority.length) {
                if (abConfig.type === 'rista' || abConfig.type === 'manual') {
                    return timers.push(setTimeout(helpers.reloadMain, delay * 3));
                } else if (!cache.get('battle.endForMe')) {
                    helpers.message('<span style="color: green;font-weight: bolder">' +
                        'Закончились бойцы, сливаемся</span>');
                    cache.put('battle.endForMe', new Date());
                }
            } else if (priority.length) {
                if (abConfig.type === 'manual' && priority[0].weight === 1 && !priority[0].force) {
                    return timers.push(setTimeout(helpers.reloadMain, delay * 3));
                }
            } else {
                opponents = priority;
            }

            opponents.sort(helpers.sort('weight'));

            var opponent = opponents[0];

            if (!opponents.length || !opponent || cache.get('battle.dead')) {
                if (!cache.get('battle.dead')) {
                    cache.put('battle.dead', new Date());
                    helpers.message('<span style="color: green;font-weight: bolder">Complete</span>');
                }
                return;
            }

            var currentOpponent = getOpponentById(penemy());
            if (currentOpponent) {
                if (currentOpponent.force) {
                    opponent = currentOpponent;
                    opponent.reasons.push('Force');
                } else if (opponent.queue && currentOpponent.queue === opponent.queue) {
                    opponent = currentOpponent;
                    opponent.reasons.push('same queue: ' + opponent.queue);
                } else {
                    return penemy(opponent);
                }
            } else if (opponent.weight >= 0) {
                return penemy(opponent);
            }

            if (opponent.weight <= 0) {
                return timers.push(setTimeout(helpers.reloadMain, delay * 3));
            }

            timers.push(setTimeout(doAttack(opponent), delay));
        }
        var progress = false;
        $rootScope.$on('frame::end::main', function (event, url, win, doc) {
            timers.forEach(function (timer) {
                clearTimeout(timer);
            });

            if (!config.get('autobattle.enabled')) {
                return;
            }

            if (url === 'capitalcity.oldbk.com/fbattle.php') {
                if (progress) {
                    return;
                }
                progress = true;
                if (cache.get('battle')) {
                    cache.put('battle.lastReload', new Date());
                }

                try {
                    parsePageBattle(doc.documentElement);
                } catch (e) {
                    // ignore
                }
                progress = false;
                timers.push(setTimeout(helpers.reloadMain, 5000));
            }
        });

        $rootScope.$on('battle::end', function () {
            if (!cache.get('battle')) {
                return;
            }
            var duration = Math.ceil(((cache.get('battle.end') || new Date()) - cache.get('battle.start')) / 1000),
                minutes,
                seconds = duration % 60,
                timestring = '';

            minutes = (duration - seconds) / 60;
            if (minutes) {
                timestring += minutes + 'мин. ';
            }
            if (seconds) {
                timestring += seconds + 'сек.';
            }
            timestring = timestring.trim();
            helpers.message('Продолжительность боя: ' + timestring);
        });

        console.log('.');
    }
]);
