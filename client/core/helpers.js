'use strict';

angular.module('TarmansOBKPlugin').service('helpers', [
    'cache', 'config', '$injector',
    function (cache, config, $injector) {
        var helpers = {};
        /**
         * {@link XMLHttpRequest}, конструктор запросов
         * @param {{
             *      url: String,
             *      [method]: String,
             *      [type]: String,
             *      [contentType]: String,
             *      [data]: (String|Object),
             *      [query]: (String|Object),
             * }} options Объект запроса
         * @param {Function} [callback] колбэк
         * @returns {XMLHttpRequest} возвращает xhr объект, для возможных дальнейших манипуляций
         */
        helpers.request = function request(options, callback) {
            callback = callback || angular.noop;
            function query(object) {
                object = object || {};
                if (typeof object === 'string') {
                    return object;
                }

                return Object.keys(object).map(function (key) {
                    return key + '=' + object[key];
                }).join('&');
            }

            var xhr = new XMLHttpRequest(),
                method = options.method || 'GET',
                url = options.url,
                type = options.type || 'html',
                contentType = options.contentType || 'application/x-www-form-urlencoded; charset=UTF-8',
                data = query(options.data);

            if (options.query) {
                url += '?' + query(options.query);
            }

            if (type === 'json') {
                contentType = 'application/json';
                data = typeof options.data === 'string' ? options.data : JSON.stringify(options.data);
            }

            if (method !== 'POST' && method !== 'PUT') {
                data = undefined;
            }

            xhr.open(method, url, true);

            xhr.setRequestHeader('Content-Type', contentType);
            xhr.onload = function () {
                var result = xhr.response,
                    status = xhr.status,
                    error = null;

                if (!status || status >= 400) {
                    error = new Error(xhr.statusText);
                    error.statusCode = status;
                    return callback(error, xhr.responseText);
                }

                if (type === 'text') {
                    result = xhr.responseText;
                } else if (type === 'html' || type === 'xml') {
                    var parser = new DOMParser();
                    result = parser.parseFromString(xhr.responseText, 'text/html');
                } else if (type === 'json') {
                    try {
                        result = JSON.parse(xhr.responseText);
                    } catch (e) {
                        error = e;
                    }
                }

                callback(error, result);
            };
            xhr.onerror = function (error) {
                error = new Error('Connection error');
                error.statusCode = 500;
                callback(error);
            };

            xhr.send(/** @type {string}*/ data);
            xhr.requestURL = url;
            return xhr;
        };

        /**
         * конвертирует кирилическую строку:
         * convert('Привет') => "%CF%F0%E8%E2%E5%F2"
         * @copyright спизжено с просторов интернета
         * @param {String} string строка
         * @returns {string|*} строка
         */
        helpers.convert = function (string) {
            var originalEscape = window.escape,
                ret = [],
                trans = [],
                i;

            for (i = 0x410; i <= 0x44F; i++) {
                trans[i] = i - 0x350; // А-Яа-я
            }
            trans[0x401] = 0xA8;    // Ё
            trans[0x451] = 0xB8;    // ё

            for (i = 0; i < string.length; i++) {
                var n = string.charCodeAt(i);
                if (typeof trans[n] != 'undefined') {
                    n = trans[n];
                }
                if (n <= 0xFF) {
                    ret.push(n);
                }
            }

            return originalEscape(String.fromCharCode.apply(null, ret));
        };

        /**
         * Ищет в документе сообщение об ошибке... сложно найти
         * ибо ошибкой считаются все что написано красным цветом
         * нужно бы как-то допилить... но хз... ошибкой даже считается
         * необходимые статы какой-нить шмотки, которые указаны красным цветом

         * @param {Element} dom документ
         * @returns {String} предполагаемая ошибка
         */
        helpers.getErrorMessage = function (dom) {
            if (!dom) {
                return '';
            }
            var element = dom.querySelector('fieldset:nth-child(1)'),
                warLink = dom.querySelector('a[href^="towerlog.php?war="]'),
                message;

            if (warLink) {
                message = warLink.previousElementSibling.innerText;
                if (message && message.indexOf('Воинственность в войне') !== -1) {
                    message = '';
                }
            } else if (element && element.nextSibling && element.nextSibling.nodeName === 'B') {
                message = element.nextSibling;
            } else {
                message = dom.querySelector('hr ~ font[color="red"]') || dom.querySelector('font[color="red"]');
            }

            return message && message.innerText || '';
        };

        helpers.execScript = function (code) {
            document.dispatchEvent(new CustomEvent('plugin-message', {detail: code}));
        };

        helpers.formatMessage = function () {
            var args = angular.toArray(arguments),
                template = args.shift();

            return String(template).replace(/(%d|%s)/g, function (str, type) {
                if (!args.length) {
                    return str;
                } else if (type === '%d') {
                    return Number(args.shift());
                } else if (type === '%s') {
                    return String(args.shift());
                } else {
                    return str;
                }
            });
        };

        helpers.reloadMain = function (url) {
            var main = document.querySelector('frame[name="main"]');
            if (main) {
                var location = main.contentWindow.location;
                location.href = url || location.href;
            }
        };

        helpers.message = function (text) {
            function twoDigit(num) {
                return ('00' + num).substr(-2);
            }

            function date(date) {
                date = date || new Date();
                var hours = date.getHours(),
                    minutes = date.getMinutes(),
                    seconds = date.getSeconds();

                return twoDigit(hours) + ':' + twoDigit(minutes) + ':' + twoDigit(seconds);
            }

            function prepareMessage(text, withPadding) {
                text = text.replace(/\n/g, '<br>');
                var message = '<font style="font-style:italic;color: #A51818;">' + text.replace(/'/, '\'') + '</font>';

                if (withPadding) {
                    message = '<span style="padding-left: 55px;font-weight: normal;">' + message + '</span>';
                }

                return message;
            }

            if (config.get('flags.mute')) {
                return;
            }

            var message = '<span class="date" style="margin-right: 4px;"><b>' +
                date(new Date()) + '</b></span>';

            if (Array.isArray(text)) {
                text.forEach(function (text, index) {
                    message += prepareMessage(text, index);
                    if (index !== text.length - 1) {
                        message += '<br>';
                    }
                });
            } else {
                message += prepareMessage(text);
            }

            helpers.execScript('p(\'' + message + '\', 1);top.srld();');
        };

        helpers.calcStatistics = function calcStatistics() {
            var oldStatistics = cache.get('user.oldStatistics'),
                statistics = cache.get('user.statistics'),
                diffs = {},
                newValues = {};

            Object.keys(oldStatistics).forEach(function (key) {
                if (oldStatistics[key] !== statistics[key]) {
                    diffs[key] = [oldStatistics[key], statistics[key]];
                }
            });

            if (!angular.isEmpty(diffs)) {
                var message = ['Произошло изменение статистики:'];

                Object.keys(diffs).forEach(function (key) {
                    var diff = diffs[key],
                        difference = diff[1] - diff[0];
                    newValues[key] = diff[1];
                    message.push('Изменение в "' + key + '" c <b>' + diff[0] + '</b> на <b>' + diff[1] +
                        '</b>: <b>' + (difference > 0 ? '+' : '') + (difference) + '</b>');
                });

                if (config.get('flags.showStatistics')) {
                    helpers.message(message);
                }
            }

            return newValues;
        };

        helpers.launch = function launch(method) {
            var args = angular.toArray(arguments, 1),
                parsed = method.split('::'),
                service = $injector.get(parsed[0]);

            method = service && service[parsed[1]];
            if (method) {
                return method.apply(method, args);
            }
        };

        helpers.getDefaultPlaces = function () {
            return {
                inventory: {
                    name: 'inventory',
                    displayName: 'Инвентарь',
                    list: cache.get('user.scrolls') || {},
                    data: function (scroll, user) {
                        return {
                            method: user ? 'POST' : 'GET',
                            url: 'http://capitalcity.oldbk.com/main.php',
                            query: {edit: 1, use: scroll.id},
                            data: {
                                sd4: cache.get('user.id'),
                                target: user ? helpers.convert(user.login) : ''
                            }
                        };
                    }
                },
                ability: {
                    name: 'ability',
                    displayName: 'Абилки',
                    list: cache.get('user.abilities') || {},
                    data: function (scroll, user) {
                        return {
                            method: 'POST',
                            url: 'http://capitalcity.oldbk.com/myabil.php',
                            data: {
                                abit: 'undefined',
                                sd4: cache.get('user.id'),
                                use: scroll.id,
                                target: user ? helpers.convert(user.login) : ''
                            }
                        };
                    }
                },
                relict: {
                    name: 'relict',
                    displayName: 'Реликты',
                    list: cache.get('user.relicts') || {},
                    data: function (scroll, user) {
                        return {
                            method: 'POST',
                            url: 'http://capitalcity.oldbk.com/klan.php',
                            query: {
                                razdel: 'main'
                            },
                            data: {
                                abit: 'undefined',
                                sd4: cache.get('user.id'),
                                use: scroll.id,
                                target: user ? helpers.convert(user.login) : ''
                            }
                        };
                    }
                },
                klan: {
                    name: 'klan',
                    displayName: 'Клановые боевые абилки',
                    list: cache.get('klan.war.actions') || {},
                    data: function (scroll, user) {
                        return {
                            url: 'http://capitalcity.oldbk.com/klan.php',
                            query: {
                                razdel: 'wars',
                                'post_attack': user.id
                            }
                        };
                    }
                }
            };
        };

        function displayNotification(opts) {
            var n = new Notification(opts.message || 'Notification', {
                tag: Math.random(),
                icon: chrome.extension.getURL('/assets/icons/Tarmans_128.png'),
                sound: opts.audio && chrome.extension.getURL('/assets/sounds/' + opts.audio + '_notify.mp3'),
                renotify: true,
                title: opts.title || 'OBK Tarman\'s plugin'
            });
            setTimeout(n.close.bind(n), 5000);
            return n;
        }

        /**
         * проигрывает звуковой сигнал
         * @param {{
         *      [audio]: String,
         *      [title]: String,
         *      [message]: (Object|String)
         * }} opts опции проигрывания и нотификации
         * @param {Function} [callback] калбэк
         * @returns {undefined} ничего не возвращает
         */
        helpers.notify = function notify(opts, callback) {
            callback = callback || angular.noop;
            if (!config.get('flags.enableNotify')) {
                return callback();
            }

            if (Notification.permission === 'granted') {
                displayNotification(opts);
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission(function (permission) {
                    if (permission === 'granted') {
                        displayNotification(opts);
                    }
                });
            }
        };

        helpers.sort = function sort(field) {
            return function (a, b) {
                var x = b[field],
                    y = a[field];

                if (x < y) {
                    return -1;
                } else {
                    return x > y ? 1 : 0;
                }
            };
        };

        function RNG(seed) {
            if (!(this instanceof RNG)) {
                return new RNG(seed);
            }
            // LCG using GCC's constants
            this.m = 0x80000000; // 2**31;
            this.a = 1103515245;
            this.c = 12345;

            this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
        }

        RNG.prototype.nextInt = function() {
            this.state = (this.a * this.state + this.c) % this.m;
            return this.state;
        };

        RNG.prototype.nextFloat = function() {
            // returns in range [0,1]
            return this.nextInt() / (this.m - 1);
        };

        RNG.prototype.nextRange = function(start, end) {
            // returns in range [start, end): including start, excluding end
            // can't modulu nextInt because of weak randomness in lower bits
            var rangeSize = 1 + end - start;
            var randomUnder1 = this.nextInt() / this.m;
            return start + Math.floor(randomUnder1 * rangeSize);
        };

        RNG.prototype.choice = function(array) {
            return array[this.nextRange(0, array.length)];
        };

        helpers.RNG = RNG;

        return helpers;
    }
]);
