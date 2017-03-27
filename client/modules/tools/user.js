angular.module('TarmansOBKPlugin').service('user::parsers', [
    'helpers', 'Queue', 'cache', 'config', 'parsers', 'tools', 'location', 'server',
    function (helper, Queue, cache, config, parsers, tools, location, server) {
        var service = {};

        service.inventory = function (next) {
            next = next || angular.noop;
            if (cache.get('battle')) {
                return next(10000);
            }

            var params = [
                    '?edit=1&razdel=0&all=1', // оружие
                    '?edit=1&razdel=1&all=1', // магия
                    '?edit=1&razdel=2&all=1'  // прочее
                ],
                scrolls = {},
                items = [];

            function loadAndParse(param, callback) {
                helper.request({url: 'http://capitalcity.oldbk.com/main.php' + param}, function (error, dom) {
                    if (error) {
                        return callback(error);
                    }

                    var complects = parsers.userComplects(dom),
                        statistics = parsers.userStatistics(dom);

                    if (!angular.isEmpty(complects)) {
                        cache.put('user.complects', complects);
                    }
                    if (!angular.isEmpty(statistics)) {
                        cache.put('user.oldStatistics', cache.get('user.statistics') || {});
                        cache.put('user.statistics', statistics);
                        var diff = helper.calcStatistics();
                        if (!angular.isEmpty(diff)) {
                            server.sendStatistics(diff);
                        }
                    }

                    var additional = param.indexOf('?invload') === 0,
                        query = additional ? 'tr' : ('a[href="' + param.replace('&all=1', '&all=0') + '"] ~ table tr'),
                        inventory = dom.querySelectorAll(query);

                    angular.toArray(inventory).forEach(function (row) {
                        var actions = row.firstChild,
                            description = row.lastChild;

                        if (!actions || actions.nodeName === '#text') {
                            return;
                        }

                        if (actions === description) {
                            var subItemAttrs = actions.querySelector('a[onclick*="showhiddeninv"]');
                            if (subItemAttrs) {
                                subItemAttrs = subItemAttrs.getAttribute('onclick')
                                    .replace(/showhiddeninv\(([^\)]+)\);/, '$1').split(',');
                            } else {
                                return;
                            }

                            params.push('?invload2=1&prototype=' + subItemAttrs[0] +
                                '&id=' + subItemAttrs[1] + '&otdel=' + subItemAttrs[2] + '&_=' + new Date());
                            return;
                        }

                        var image = actions.firstChild;
                        if (!image) {
                            return;
                        }

                        var idEl = actions.querySelector('center > small'),
                            id = idEl && idEl.innerText.replace(/^[^\d]+(\d+)[^\d]+$/, '$1');

                        if (!id) {
                            return;
                        }

                        var displayName = description.firstChild.innerText,
                            parsed,
                            item = {
                                id: +id,
                                displayName: displayName,
                                image: image.getAttribute('src'),
                                name: image.getAttribute('src').replace(/.*\/([^\.]+).*/, '$1'),
                                type: 'item'
                            };

                        tools.getAllText(description, function (element, text) {
                            if (text.indexOf('Цена') > -1) {
                                parsed = text.split(':')[1].trim().split(' ');
                                item.price = {
                                    amount: parseFloat(parsed[0]),
                                    currency: parsed[1]
                                };
                            } else if (text.indexOf('Долговечность') > -1) {
                                parsed = text.split(':')[1].trim().split('/');
                                item.durability = parseInt(parsed[1], 10) - parseInt(parsed[0], 10);
                            } else if (text.indexOf('Свойства') > -1) {
                                item.type = 'magic';
                            } else if (text.indexOf('Срок годности') > -1) {
                                // Срок годности: 1 дн. (до 31.12.2015 12:09)
                                parsed = /^Срок годности: \d+ дн. \(до\s+(\d+)\.(\d+)\.(\d+) (\d+):(\d+).*$/.exec(text);
                                if (parsed) {
                                    // ["Срок годности: 1 дн. (до 31.12.2015 12:09)", "31", "12", "2015", "12", "09"]
                                    item.expired = new Date(parsed[3], parsed[2] - 1, parsed[1], parsed[4], parsed[5]);
                                }
                            } else if (text.indexOf('Встроено заклятие') > -1) {
                                image = element.nextElementSibling;
                                items.push({
                                    id: +id,
                                    price: {amount: 0, currency: ''},
                                    displayName: image.getAttribute('title'),
                                    name: image.getAttribute('src').replace(/.*\/([^\.]+).*/, '$1'),
                                    durability: parseInt(image.nextSibling.data.trim().split('/')[0], 10),
                                    image: image.getAttribute('src'),
                                    type: 'magic',
                                    builtin: true
                                });
                            }
                        });
                        items.push(item);
                    });
                    callback();
                });
            }

            var excludedRooms = [
                'замки', 'руины старого замка', 'башня смерти',
                'вход в одиночные сражения', 'одиночные сражения',
                'вход в групповые сражения', 'групповые сражения'
            ];

            location.get(function (error, loc) {
                if (error || excludedRooms.indexOf(loc.name) > -1) {
                    return next();
                }

                Queue.forEach(params, loadAndParse, function () {
                    cache.put('user.items', items);
                    items.filter(function (item) {
                        return item.type === 'magic';
                    }).forEach(function (item) {
                        scrolls[item.name] = scrolls[item.name] || [];
                        scrolls[item.name].push(item);
                    });
                    cache.put('user.scrolls', scrolls);
                    next();
                });
            });
        };

        service.abilities = function (next) {
            helper.request({url: 'http://capitalcity.oldbk.com/myabil.php'}, function (error, dom) {
                if (error) {
                    return next(error);
                }

                var opposition = parsers.opposition(dom),
                    abilities = parsers.abilities(dom);

                if (opposition) {
                    abilities.opposition = [{
                        name: 'opposition',
                        displayName: 'Противостояние',
                        image: 'http://i.oldbk.com/i/magic/opposition.gif',
                        id: 'opposition',
                        durability: 999
                    }];
                }

                cache.put('user.opposition', opposition);
                cache.put('user.abilities', abilities);
            });
        };

        service.effects = function (next) {
            if (cache.get('battle')) {
                return next(10000);
            }
            helper.request({url: 'http://capitalcity.oldbk.com/main.php?effects=1'}, function (error, dom) {
                if (error) {
                    return next();
                }
                var effects = parsers.effects(dom);
                cache.put('user.effects', effects);
                next();
            });
        };

        return service;
    }
]);
