'use strict';

window.$injector.invoke([
    'helpers', 'config', 'cache', 'location', 'Scheduler', 'Scroll', 'actions', '$rootScope', 'parsers', 'tools',
    function (helpers, config, cache, location, Scheduler, Scroll, actions, $rootScope, parsers, tools) {
        if (!config.get('autohaot')) {
            config.put('autohaot', {
                enabled: false,
                minHP: 500,
                percentHP: 70,
                maxLength: 150,
                minimalUsers: 99,
                useSandwich: false,
                useSandwichMinHP: 100
            });
        }

        function inClub() {
            var currentLocation = location.point(cache.get('location').name);
            return currentLocation.group === 'bk' || currentLocation.name === 'секретная комната';
        }

        Scheduler.create('battle::haot', {updateInterval: 1000, async: true}, function (next) {
            if (!config.get('autohaot.enabled')) {
                return next(5000);
            }
            if (cache.get('user.effects["тяжелая травма"]') ||
                cache.get('user.effects["средняя травма"]') ||
                cache.get('user.effects["неизлечимая травма"]')) {
                return next(5000);
            }
            if (!cache.get('location')) {
                return next(2000);
            }
            if (!inClub()) {
                return next(2000);
            }
            if (cache.get('battle')) {
                return next(2000);
            }

            function getUrl() {
                return 'http://capitalcity.oldbk.com/zayavka.php?level=haos&' + Math.ceil(Math.random() * 1000000);
            }

            function enterHaot(combat, code, callback) {
                var data = {
                    starttime2: 300,
                    timeout: 3,
                    levellogin1: 6,
                    cmt: '',
                    view: cache.get('user.level') || 14,
                    level: 'haos',
                    confirm2: 1,
                    gocombat: combat
                };
                if (code) {
                    data.securityCode = '';
                    data.securityCode1 = code;
                }
                helpers.request({url: getUrl(), method: 'POST', data: data}, callback);
            }

            function getHP(dom) {
                var min = 0, max = 0;
                try {
                    var parsed = dom.querySelector('#HP').innerText.trim().replace(': ', '').split('/');

                    min = parseInt(parsed[0], 10);
                    max = parseInt(parsed[1], 10);
                } catch (e) {
                    // ignore
                }
                return {
                    min: min,
                    max: max,
                    percent: (max && min * 100 / max) || 0
                };
            }

            function getCombat(dom) {
                var combat = null,
                    el = dom.querySelector('input[type="hidden"][name="level"][value="haos"]').parentNode,
                    haots = {}, ptr;

                tools.getAllText(el, function (element, text) {
                    if (/\d+:\d+/.test(text) && !ptr) {
                        var input = element.parentNode.previousElementSibling;
                        if (input.getAttribute('id') === 'gocombat') {
                            ptr = haots[input.value] = {id: input.value};
                        }
                        return;
                    }
                    if (!ptr) {
                        return;
                    }
                    var match = text.match(/\) \((\d+)-(\d+)\)\s+тип боя:/);
                    if (match) {
                        ptr.minLevel = parseInt(match[1], 10);
                        ptr.maxLevel = parseInt(match[2], 10);
                        var next = element.nextSibling;
                        while (next && next.nodeName === 'IMG') {
                            var alt = next.getAttribute('alt').toLocaleLowerCase();
                            if (alt === 'бой на букетах' || alt === 'бой на елках') {
                                ptr.flowers = true;
                            } else if (alt === 'бой с автоударом') {
                                ptr.autoudar = true;
                            } else if (alt === 'кровавый поединок') {
                                ptr.blood = true;
                            } else {
                                ptr.type = alt;
                            }
                            next = next.nextSibling;
                        }
                    }
                    match = text.match(/\(таймаут (\d+) мин.\)/);
                    if (match) {
                        ptr.timeout = parseFloat(match[1]);
                        return;
                    }
                    match = text.match(/бой начнется через ([0-9\.]+) мин. /);
                    if (match) {
                        ptr.startAt = parseFloat(match[1]);
                        return;
                    }
                    if (text === 'Автозаявка') {
                        ptr.autozayavka = true;
                        return;
                    }
                    if (text === 'случайно') {
                        ptr.random = true;
                        return;
                    }
                    match = text.match(/\(в заявке (\d+)\/(\d+) чел\.\)/);
                    if (match) {
                        ptr.users = parseInt(match[1], 10);
                        ptr.max = parseInt(match[2], 10);
                        ptr = null;
                    }
                });
                var maxUsers = config.get('autohaot.maxUsers') || Infinity,
                    minUsers = config.get('autohaot.minUsers') || -Infinity,
                    minLevel = config.get('autohaot.minLevel') || 1,
                    maxLevel = config.get('autohaot.maxLevel') || 21,
                    random = !!config.get('autohaot.random'),
                    blood = !!config.get('autohaot.blood'),
                    autozayavka = !!config.get('autohaot.autozayavka'),
                    flowers = !!config.get('autohaot.flowers'),
                    timeout = config.get('autohaot.timeout') || 3;

                combat = Object.keys(haots).find(function (id) {
                    var haot = haots[id],
                        ok = haot.users <= maxUsers && haot.users >= minUsers;
                    if (ok && haot.minLevel < minLevel) {
                        ok = false;
                    }
                    if (ok && haot.maxLevel > maxLevel) {
                        ok = false;
                    }
                    if (ok && random && !haot.random) {
                        ok = false;
                    }
                    if (ok && blood && !haot.blood) {
                        ok = false;
                    }
                    if (ok && autozayavka && !haot.autozayavka) {
                        ok = false;
                    }
                    if (ok && flowers && !haot.flowers) {
                        ok = false;
                    }
                    if (ok && timeout < haot.timeout) {
                        ok = false;
                    }
                    if (ok && haot.startAt <= 0.2) {
                        ok = false;
                    }
                    return ok;
                });

                return combat;
            }

            var zUrl = getUrl(),
                xhr = helpers.request({url: zUrl}, function (error, dom) {
                    if (xhr.responseURL !== zUrl) {
                        return next();
                    }

                    var status = dom.querySelector('body table:nth-child(5) tr:first-child b');
                    if (status && status.innerText.indexOf('Ожидаем начала группового боя') > -1) {
                        return next(20000);
                    }

                    var combat = getCombat(dom);
                    if (!combat) {
                        return next(5000);
                    }

                    var hp = getHP(dom);
                    if (config.get('autohaot.minHP') > hp.max) {
                        if (config.get('autohaot.complect')) {
                            return actions.changeComplect(config.get('autohaot.complect'), next);
                        }
                        return next(20000);
                    }

                    if (config.get('autohaot.percentHP') > hp.percent) {
                        if (config.get('autohaot.useSandwich') && config.get('autohaot.useSandwichMinHP') > hp.min) {
                            Scroll('food', ['inventory'])
                                .find(function (scroll) {
                                    return scroll.durability !== 1 || scroll.durability === 1 &&
                                        scroll.price && scroll.price.amount !== 27;
                                })
                                .use(null, next);

                        }
                        return next();
                    }

                    function completeEnter(error, dom) {
                        var errorMessage = helpers.getErrorMessage(dom);
                        if (errorMessage.indexOf('слишком тяжелы для вас') > -1) {
                            helpers.message(errorMessage);
                            return next(10000);
                        }
                        next();
                        helpers.reloadMain(getUrl());
                    }

                    var img = dom.querySelector('img[src^="sec1.php"]');
                    if (img) {
                        var src = img.getAttribute('src');
                        $rootScope.$emit('anti-captcha', 'http://capitalcity.oldbk.com/' + src, function (error, code) {
                            if (error) {

                                helpers.message('Не удалось распознать капчу, ошибка: ' + error);
                                return next();
                            }
                            if (!code) {
                                helpers.reloadMain(getUrl());
                                return next();
                            }
                            enterHaot(combat, code, completeEnter);
                        });
                        return;
                    }
                    var price = dom.querySelector('input[name="price' + combat + '"]');
                    if (price) {
                        enterHaot(combat, null, completeEnter);
                    }
                });
        });

        $rootScope.$on('battle::end', function () {
            if (!inClub()) {
                return;
            }

            var lastLocation = cache.get('location').name;
            window.$injector.get('user::parsers').effects(function () {
                var quest = config.get('autohaot.quest');
                if (!quest) {
                    return;
                }

                quest = quest.trim();
                if (cache.get('user.effects["' + quest + '"].description') !== 'Завершен' &&
                    cache.get('user.effects["' + quest + '"].description') !== 'Задание "' + quest + '" - выполнено!'
                ) {
                    return;
                }
                location.go('храм древних', function (error) {
                    if (error) {
                        return;
                    }
                    helpers.request({
                        url: 'http://capitalcity.oldbk.com/itemschoice.php?get=1&svecha=qq&al=3'
                    }, function (error, dom) {
                        var targets = parsers.parseTargets(dom);
                        if (!targets.length) {
                            helpers.message('Не найдены свечки!!!!!Все пропало!стоим, ждем дальнейших указаний');
                            return;
                        }
                        helpers.request({
                            url: 'http://capitalcity.oldbk.com/church.php?put=1',
                            method: 'POST',
                            data: {target: targets[0]}
                        }, function (error, dom) {
                            var quests = parsers.quests(dom),
                                found = quests.some(function (q) {
                                    if (q.name.toLowerCase() === quest.toLowerCase()) {
                                        helpers.request({
                                            url: 'http://capitalcity.oldbk.com/church.php' + q.url
                                        }, function () {
                                            location.go(lastLocation);
                                        });
                                        return true;
                                    }
                                });
                            if (!found) {
                                helpers.message('Не найден подходящий квест... зря только свечку спалили...');
                            }
                        });
                    });
                });
            });
            //document.querySelectorAll('#MP+table img[onmouseover]')
        });
    }
]);
