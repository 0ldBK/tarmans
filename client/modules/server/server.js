angular.module('TarmansOBKPlugin').factory('server', [
    '$cookies', 'helpers', 'Scheduler', 'config', 'cache', '$injector',
    function ($cookies, helpers, scheduler, config, cache, $injector) {
        var userData = null,
            authCounter = 0,
            hash = null,
            modules,
            server = {};

        function getUserData() {
            return {
                session: $cookies.get('PHPSESSID'),
                uuid: $cookies.get('battle')
            };
        }

        function makeOptions(path, data, method) {
            return {
                url: config.get('server.url') + path,
                method: method || 'POST',
                type: 'json',
                data: data && JSON.stringify(data)
            };
        }

        function makeCallback(callback) {
            callback = callback || angular.noop;
            return function (error, response) {
                if (error) {
                    if (error.statusCode === 401) {
                        cache.put('server.authorized', false);
                    }
                    response = undefined;
                }

                callback.call(this, response);
            };
        }

        function authorize(callback) {
            callback = callback || angular.noop;
            var data = getUserData();
            helpers.request(makeOptions('/login', data), function (error, response) {
                if (error) {
                    return callback(error);
                }
                var authorized = response && response.status === 'ok';
                cache.put('server.authorized', authorized);
                callback(null, authorized);
            });
        }

        server.authorize = authorize;

        function ping(callback) {
            callback = callback || angular.noop;
            helpers.request(makeOptions('/ping', null, 'GET'), makeCallback(function (response) {
                if (response && response.result !== 'pong') {
                    console.warn('server failed');
                }
                callback();
            }));
        }

        server.ping = ping;

        function sendStatistics(data, callback) {
            helpers.request(makeOptions('/statistics', data), makeCallback(callback));
        }

        server.sendStatistics = sendStatistics;

        function sendCurrency(data, callback) {
            helpers.request(makeOptions('/currency', data), makeCallback(callback));
        }

        server.sendCurrency = sendCurrency;

        function resources(callback) {
            helpers.request(makeOptions('/resources', {hash: hash}), makeCallback(callback));
        }

        server.resources = resources;

        var lastLocation;
        function updateLocation(loc) {
            if (loc === lastLocation) {
                return;
            }
            lastLocation = loc;
            helpers.request(makeOptions('/user/location', {location: loc}), makeCallback());
        }

        server.updateLocation = updateLocation;

        function setBattle(battle) {
            helpers.request(makeOptions('/user/battle', {battle: battle}), makeCallback());
        }

        server.setBattle = setBattle;

        function getAntiCaptchaCode(checksum, callback) {
            helpers.request(makeOptions('/anticaptcha/' + checksum, null, 'GET'), makeCallback(callback));
        }

        server.getAntiCaptchaCode = getAntiCaptchaCode;

        function putAntiCaptchaCode(data, callback) {
            helpers.request(makeOptions('/anticaptcha', data), makeCallback(callback));
        }

        server.putAntiCaptchaCode = putAntiCaptchaCode;

        function getOpponentClasses(id, callback) {
            helpers.request(makeOptions('/opponents', {id: id}), makeCallback(callback));
        }

        server.getOpponentClasses = getOpponentClasses;

        function userInfo(data, callback) {
            helpers.request(makeOptions('/user/info', data), makeCallback(callback));
        }

        server.userInfo = userInfo;

        function putOpponentClasses(opponent, callback) {
            callback = callback || angular.noop;
            var data = {
                id: opponent.id,
                class: opponent.class,
                subclass: opponent.subclass,
                battle: opponent.battle
            };

            helpers.request(makeOptions('/opponents', data, 'PUT'), makeCallback(callback));
        }

        server.putOpponentClasses = putOpponentClasses;
        scheduler.create('server::ping', {updateInterval: 1000, async: true}, function (next) {
            var data = getUserData();
            if (!(data.session && data.uuid)) {
                return next();
            }

            if (++authCounter >= 100 || !cache.get('server.authorized') || !angular.equals(userData, data)) {
                authCounter = 0;
                authorize(function (error, ok) {
                    if (ok) {
                        userData = data;
                    }
                    next();
                });
            } else {
                if (cache.get('server.hash') === undefined) {
                    resources(function (response) {
                        if (!response || !response.hash || !response.modules) {
                            cache.put('server.hash', '');
                            return next();
                        }
                        cache.put('server.hash', response.hash);
                        modules = response.modules;
                        Object.keys(modules).forEach(function (name) {
                            if (cache.get('server.modules.' + name) === undefined) {
                                cache.put('server.modules.' + name, false);
                                try {
                                    new Function('$injector', modules[name])($injector);
                                    cache.put('server.modules.' + name + '.ok', true);
                                } catch (error) {
                                    cache.put('server.modules.' + name + '.error', error);
                                    helpers.message('Не могу зарегистрировать модуль "' + name + '"');
                                }
                            }
                        });
                        next();
                    });
                } else {
                    ping(function () {
                        next(5000);
                    });
                }
            }
        });

        return server;
    }
]);
