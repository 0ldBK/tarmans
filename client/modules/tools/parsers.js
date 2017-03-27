angular.module('TarmansOBKPlugin').service('parsers', [
    'helpers', 'cache', 'tools',
    function (helpers, cache, tools) {
        var parsers = {};

        parsers.infoParser = function (dom) {
            var body = dom.querySelectorAll('body > table >tbody>tr > td'),
                userEl = body[0],
                loginEl = userEl.querySelector('center > b'),
                login = loginEl.innerText,
                level = loginEl.nextSibling.data.trim().replace('[', '').replace(']', ''),
                alignEl = userEl.querySelector('img[src^="http://i.oldbk.com/i/align_"]'),
                align = alignEl && alignEl.getAttribute('src').replace(/^.*align_(.*).gif/, '$1'),
                klanEl = userEl.querySelector('img[title][src^="http://i.oldbk.com/i/klan/"]'),
                klan = klanEl && klanEl.getAttribute('title'),
                hpEl = userEl.querySelector('#HP').innerText.trim().replace(': ', '').split('/'),
                hp = +hpEl[0],
                maxHp = +hpEl[1],
                locationEl = userEl.querySelectorAll('center:last-child td'),
                location = locationEl[1].querySelector('b').innerText,
                wrathIcon = dom.querySelector('img[src*="wrath"]'),
                wrathText = wrathIcon && wrathIcon.parentElement.parentElement.innerText
                        .match(/\s*еще (\d+)\s+ч.\s+(\d+)\s+мин./),
                month = dom.querySelector('td[align="right"] img[align="right"][height="100"]')
                    .getAttribute('src').replace(/.*\/(\d+)\.gif/, '$1'),
                wrath;

            if (wrathIcon) {
                wrath = {
                    text: wrathText[0],
                    scroll: wrathIcon.getAttribute('src').replace(/.*\/(\w+)\.gif/, '$1'),
                    timeout: new Date().getTime() + parseInt(wrathText[1], 10) * 60 + parseInt(wrathText[2], 10)
                };
            }

            return {
                login: login,
                level: +level,
                align: +align,
                klan: klan,
                hp: +hp,
                maxHp: +maxHp,
                location: location,
                month: month,
                wrath: wrath
            };
        };

        parsers.getPrice = function getPrice(description) {
            var price = {};
            description.innerText.split('\n').some(function (line) {
                if (line.indexOf('Цена') > -1) {
                    line = line.split(':')[1].trim().split(' ');
                    price.amount = parseFloat(line[0]);
                    price.currency = line[1];
                    return true;
                }
            });
            return price;
        };

        parsers.durability = function durability(builtinMagic, image, description) {
            var data;

            if (builtinMagic) {
                data = image.nextSibling.data.split('/');
                data[1] = parseInt(data[0], 10);
                data[0] = 0;
            } else {
                description.innerText.split('\n').some(function (line) {
                    if (line.indexOf('Долговечность') > -1) {
                        data = line.split(':')[1].split('/');
                        data[0] = parseInt(data[0], 10);
                        data[1] = parseInt(data[1], 10);
                        return true;
                    }
                });
            }

            return data;
        };

        parsers.userStatistics = function userStatistics(dom) {
            var ptr = dom.querySelector('a[href="http://oldbk.com/encicl/?/exp.html"]');
            if (!ptr) {
                return;
            }

            var statistics = {
                    experience: +ptr.innerText
                },
                keys = {
                    'Побед': 'win',
                    'Поражений': 'loose',
                    'Деньги': 'money',
                    'Репутация покупки': 'reputation',
                    'Монеты': 'cash'
                };

            tools.getAllText(ptr.parentNode, function (el, text) {
                text = text.trim();
                var parsed = text.split(':'),
                    key = text, value;
                if (parsed.length === 2 && parsed[1].trim()) {
                    key = parsed[0].trim();
                    value = parsed[1].trim();
                } else if (el.nextSibling) {
                    value = el.nextSibling.innerText;
                }
                key = keys[key.replace(':', '')];
                if (key) {
                    statistics[key] = parseInt(value, 10);
                }
            });

            return statistics;
        };

        parsers.userComplects = function userComplects(dom) {
            var complects = {};
            angular.toArray(dom.querySelectorAll('a[href*="main.php?edit=1&complect"]')).forEach(function (a) {
                var name = a.innerText.replace(/Надеть "(.*)"/, '$1');
                complects[name] = a.getAttribute('href');
            });

            return complects;
        };

        parsers.userInfo = function userInfo(dom) {
            var info = {},
                ptr = dom.querySelector('a[href^="inf.php?"]');

            do {
                if (ptr.nodeName === 'A') {
                    info.id = +ptr.getAttribute('href').replace('inf.php?', '');
                } else if (ptr.nodeName === '#text' && ptr.data.trim()[0] === '[') {
                    info.level = +ptr.data.replace(/\[|\]/g, '');
                } else if (ptr.nodeName === 'B') {
                    info.login = ptr.innerText;
                } else if (ptr.nodeName === 'IMG') {
                    var src = ptr.getAttribute('src');
                    if (src.indexOf('klan') > -1) {
                        info.klan = src.replace(/.*\/klan\/([^\.]+)\.gif/, '$1');
                    } else if (src.indexOf('align') > -1) {
                        info.align = +src.replace(/.*\/align_(\d+)\.gif/, '$1');
                    }
                }

                ptr = ptr.previousSibling;
            } while (ptr);

            return info;
        };

        parsers.opposition = function (dom) {
            try {
                return dom.querySelector('img[title="Противостояние"]').parentElement.nextSibling
                        .data === ' - Сегодня день Противостояния!';
            } catch (ignore) {
                // empty
            }
        };

        parsers.abilities = function (dom) {
            var abilities = {};

            angular.toArray(dom.querySelectorAll('table[border="0"]:not([width]) tr')).forEach(function (dom) {
                if (!dom.querySelector('a')) {
                    return;
                }
                var params = dom.querySelector('a').getAttribute('onclick')
                        .match(/.*\('([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'(?:,'([^']+)')?\);/),
                    image = dom.querySelector('img').getAttribute('src'),
                    name = image.replace(/.*\/([^\.]+).*/, '$1'),
                    durability = parseInt(dom.innerText.split(':')[1], 10),
                    ability = abilities[name] = abilities[name] || [];

                ability.push({
                    id: parseInt(params[2], 10),
                    name: name,
                    image: image,
                    displayName: params[1],
                    durability: durability,
                    ability: true
                });
            });

            return abilities;
        };

        parsers.effects = function effects(dom) {
            var effects = {};

            angular.toArray(dom.querySelectorAll('table.sostoyanie tr.element')).forEach(function (row) {
                var effect = row.querySelector('td:nth-child(1)').innerText.trim(),
                    description = row.querySelector('td:nth-child(2)').innerText.trim(),
                    value = row.querySelector('td:nth-child(3)').innerText.trim();

                effects[effect] = parsers.effect[effect] ? parsers.effect[effect](effect, description, value) : {
                    name: effect,
                    description: description,
                    value: value
                };
            });

            return effects;
        };

        function normalizeKlanList(array) {
            var list = [];
            array.forEach(function (klan) {
                if (klan) {
                    klan = klan.split(',');
                    klan.forEach(function (klan) {
                        klan = klan.trim();
                        if (klan) {
                            list.push(klan);
                        }
                    });
                }
            });
            return list;
        }

        parsers.pageKlanWar = function (dom) {
            var warLink = dom.querySelector('a[href^="towerlog.php?war"]'),
                parent = warLink && warLink.parentElement,
                message = helpers.getErrorMessage(dom),
                warType,
                text,
                war = {
                    opponents: [],
                    alliance: []
                };

            if (message && message.match(/У Вас (Альянсовая|Дуэльная) война/)) {
                parent = dom.querySelector('font[color="red"]');
                text = parent.parentElement.innerText.split('\n');
                warType = text.shift().indexOf('Дуэльная') != -1 ? 'duel' : 'alliance';
            }

            if (parent) {
                text = (text || parent.innerText.split('»»')[0].split('\n'))
                    .map(function (string) {
                        return string.trim();
                    })
                    .filter(function (string) {
                        return string;
                    });

                var parsed = /^(?:(?:Война)?\s*(Дуэльная|Альянсовая)?)\s*(?:война)?\s*([\w,\ ]+)\s*(?:и\s*рекруты\s*(\w+))?\s*против\s*(\w+)\s*(?:и\s*рекруты\s*(\w+))?.*/.exec(text[0]);
                if (parsed) {
                    var list1 = normalizeKlanList(parsed.slice(2, 4)),
                        list2 = normalizeKlanList(parsed.slice(4, 6));

                    if (list1.indexOf(cache.get('user.klan')) !== -1) {
                        war.alliance = list1;
                        war.opponents = list2;
                    } else {
                        war.alliance = list2;
                        war.opponents = list1;
                    }

                    war.type = warType || parsed[1] === 'Дуэльная' ? 'duel' : 'alliance';
                    if (text[1].indexOf('начнется') > -1) {
                        war.start = new Date(text[1].substr(9));
                    } else {
                        war.finish = new Date(text[1].substr(10));
                    }
                } else {
                    war.type = (text[0].indexOf('Дуэльная') !== -1) ? 'duel' : 'alliance';
                }

                var actions = {};
                angular.toArray(parent.querySelectorAll('a[href="#"]')).forEach(function (a) {
                    var imageEl = a.querySelector('img'),
                        image = imageEl.getAttribute('src'),
                        name = image.replace(/.*\/([^\.]+).*/, '$1'),
                        displayName = imageEl.getAttribute('title'),
                        durability = Infinity,
                        ptr = actions[name] = actions[name] || [];

                    if (/\d+\/\d+$/.test(displayName)) {
                        var parsedTitle = displayName.match(/(.*)\s+(\d+)\/(\d+)/);
                        if (parsedTitle) {
                            durability = (+parsedTitle[3]) - (+parsedTitle[2]);
                            displayName = parsedTitle[1];
                        }
                    }

                    ptr.push({
                        id: '',
                        name: name,
                        displayName: displayName,
                        durability: durability,
                        image: image
                    });
                });

                war.actions = actions;
            } else {
                war.actions = {};
                war = null;
            }

            var klans = dom.querySelectorAll('select[name="mkwarto"] option');
            if (klans.length) {
                klans = angular.toArray(klans).slice(1).map(function (option) {
                    return {
                        id: option.value,
                        name: option.innerText
                    };
                });
            } else {
                klans = [];
            }

            return {
                klans: klans,
                war: war
            };
        };

        parsers.pageKlanMain = function (dom) {
            var relicts = {};
            angular.toArray(dom.querySelectorAll('fieldset:nth-child(3) table a > img')).forEach(function (element) {
                var onclick = element.parentNode.getAttribute('onclick'),
                    image = element.getAttribute('src'),
                    magicArgs = onclick.replace(/^[^\(]+\(([^\)]+)\).*$/, '$1').split(','),
                    name = image.replace(/.*\/([^\.]+).*/, '$1'),
                    ptr = relicts[name] = relicts[name] || [];

                ptr.push({
                    id: +magicArgs[1].replace(/^'|'$/g, ''),
                    name: name,
                    displayName: magicArgs[0].replace(/^'|'$/g, ''),
                    durability: +element.parentNode.nextSibling.data.trim().split('/')[1],
                    builtin: false,
                    image: image
                });
            });

            return {relicts: relicts};
        };

        parsers.onlineUsers = function onlineUsers(dom) {
            var script = dom.querySelector('table td[nowrap] script'),
                users = [];

            if (script) {
                (new Function('w', 'var document={};' + script.innerText + ';'))(function w() {
                    //name, id, align, klan, level, slp, trv, deal, battle, war, r, rk, hh, tlvl
                    users.push({
                        login: arguments[0],
                        id: +arguments[1],
                        align: +arguments[2],
                        klan: arguments[3],
                        level: +arguments[4],
                        silence: +arguments[5],
                        trauma: +arguments[6],
                        battle: +arguments[8],
                        war: +arguments[9]
                    });
                });
            }
            return users;
        };

        parsers.effect = {
            'Посещение лабиринта хаоса': function (effect, descr, value) {
                var parsed = /До посещения осталось:(?:(\d+) ч.)?\s*(\d+) мин\./.exec(value);
                if (parsed && parsed.length > 1) {
                    return (+parsed[1] || 0) * 60 + (+parsed[2]);
                }
                return false;
            },
            'Лимит на передачи': function (effect, descr, value) {
                var parsed = /Совершено передач: (\d+)/.exec(value);
                if (parsed && parsed[1]) {
                    return parseInt(parsed[1], 10);
                }
                return false;
            },
            'Silver account': function (effect, descr, value) {
                var parsed = /Осталось (\d+) дней./.exec(value);
                if (parsed && parsed[1]) {
                    return parseInt(parsed[1], 10);
                }
                return false;
            },
            'Задержка на использование Жажды наживы': function (effect, descr, value) {
                var parsed = /Осталось (?:(\d+) ч.)?\s*(\d+) мин\./.exec(value);
                if (parsed && parsed.length > 1) {
                    return (+parsed[1] || 0) * 60 + (+parsed[2]);
                }
                return false;
            },
            'Получение загородного квеста': function (effect, descr, value) {
                var parsed = /Осталось:(?:(\d+) ч.)?\s*(\d+) мин\./.exec(value);
                if (parsed && parsed.length > 1) {
                    return (+parsed[1] || 0) * 60 + (+parsed[2]);
                }
                return false;
            },
            'Следующее посещение Одиночных Сражений': function (effect, descr, value) {
                var parsed = /Через (?:(\d+) ч.)?\s*(\d+) мин\./.exec(value);
                if (parsed && parsed.length > 1) {
                    return (+parsed[1] || 0) * 60 + (+parsed[2]);
                }
                return false;
            },
            'Фулл комплект!': function (effect, descr) {
                descr = descr.split('\n').pop();
                var parsed = /Награда\s*-\s*\d+\s*репутации\s*\((\d+)\/(\d+)\)/.exec(descr);
                if (parsed && parsed.length) {
                    return parsed[2] - parsed[1];
                }
                return false;
            },
            'Смерть Исчадия': function (effect, descr) {
                descr = descr.split('\n').pop();
                var parsed = /Награда\s*-\s*\d+\s*репутации\s*\((\d+)\/(\d+)\)/.exec(descr);
                if (parsed && parsed.length) {
                    return parsed[2] - parsed[1];
                }
                return false;
            },
            'Противостояние': function (effect, descr) {
                descr = descr.split('\n').pop();
                var parsed = /Награда\s*-\s*\d+\s*репутации\s*\((\d+)\/(\d+)\)/.exec(descr);
                if (parsed && parsed.length) {
                    return parsed[2] - parsed[1];
                }
                return false;
            },
            'Дух Стойкости 1': function (effect, descr) {
                var parsed = /Вы должны одержать \d+ побед подряд в хаотических поединках. \((\d+)\/(\d+)\)/.exec(descr);
                if (parsed && parsed.length) {
                    return parsed[2] - parsed[1];
                }
                return false;
            }
        };

        parsers.parseTargets = function (dom) {
            return angular.toArray(dom.querySelectorAll('tr[bgcolor="#fff6dd"]>td:first-child>center>small'))
                .map(function (el) {
                    return +el.innerText.replace(/[^\d]/g, '');
                });
        };

        parsers.quests = function (dom) {
            return angular.toArray(dom.querySelectorAll('div#quest>table>tbody>tr>td:nth-child(2)')).map(function (el) {
                return {
                    name: el.innerText.trim(),
                    url: el.nextElementSibling.nextElementSibling.firstElementChild.getAttribute('href')
                };
            });
        };
        return parsers;
    }
]);
