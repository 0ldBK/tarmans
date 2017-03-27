angular.module('TarmansOBKPlugin').service('tools', [
    'helpers', 'cache', 'config', '$q', 'server',
    function (helpers, cache, config, $q, server) {
        var tools = {};
        /**
         * получает короткую инфо персонажа по ссылке {@link http://capitalcity.oldbk.com/inf.php?login=Crimea&short=1}
         * @param {String|{id: (Number|String), [login]: String}} options опции
         * @param {Function} [callback] калбэк
         * @returns {Undefined} ничего не возвращает
         */
        tools.userInfo = function userInfo(options, callback, retriesLeft) {
            callback = callback || angular.noop;
            if (typeof retriesLeft === 'undefined') {
                retriesLeft = options.retries || 5;
            }

            if (retriesLeft <= 0) {
                return callback();
            }

            var defer = $q.defer(),
                req = {
                    url: 'http://capitalcity.oldbk.com/inf.php',
                    query: {short: 1},
                    type: 'text',
                    headers: 'plain/text'
                };
            if (typeof options === 'string') {
                req.query.login = options;
            } else if (options.login) {
                req.query.login = options.login;
            } else if (options.id) {
                req.query = options.id + '&short=1';
            }

            var data = {
                uuid: !req.query.login && options.id,
                login: req.query.login
            };

            server.userInfo(data, function (response) {
                if (response) {
                    defer.resolve(response.info);
                    callback(null, response.info);
                } else {
                    defer.reject();
                }
            });

            /*

            function tryAgain() {
                setTimeout(function () {
                    tools.userInfo(options, callback, --retriesLeft);
                }, 2000);
            }

            helpers.request(req, function (error, info) {
                if (error) {
                    return tryAgain();
                }

                var user = {};

                if (info && info.indexOf('AntiDDOS') === 0 || error && error.statusCode >= 500) {
                    return tryAgain();
                } else if (info.indexOf('Произошла ошибка:') !== -1 && info.indexOf('не найден...') !== -1) {
                    return callback(new Error('Персонаж "' + (options.login || options.id) + '" не найден'));
                }

                info.split('\n').forEach(function (str) {
                    var parsed = str.split('='),
                        key = parsed[0],
                        value = parsed[1];

                    if (key) {
                        if (+value == Number(value)) {
                            value = +value;
                        }
                        user[key] = value;
                    }
                });

                callback(null, user);
                defer.resolve(user);
            });
             */

            return defer.promise;
        };

        tools.getAllText = function getAllText(dom, iterator) {
            var node,
                ni = document.createNodeIterator(
                    dom,
                    NodeFilter.SHOW_TEXT,
                    function () {
                        return NodeFilter.FILTER_ACCEPT;
                    },
                    false
                );

            while (ni.nextNode()) {
                node = ni.referenceNode;
                iterator(node, node.data);
            }
        };

        return tools;
    }
]);
