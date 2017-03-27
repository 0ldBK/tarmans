'use strict';

function makeCacheObject(name) {
    return function (object, $parse, $rootScope) {
        var defaultConfig = angular.copy(object);
        return {
            _timeouts: {},
            _removeTimeout: function (path) {
                if (this._timeouts[path]) {
                    clearTimeout(this._timeouts[path]);
                    delete this._timeouts[path];
                }
            },
            get: function (path) {
                return path ? $parse(path)(object) : object;
            },
            put: function (path, value, ttl) {
                var self = this,
                    result = $parse(path).assign(object, value);
                $rootScope.$safeApply();

                this._removeTimeout(path);
                if (ttl) {
                    setTimeout(function () {
                        self.remove(path);
                        self._removeTimeout(path);
                    }, ttl);
                }
                return result;
            },
            push: function (path, value) {
                var index = 0;
                if (Array.isArray(this.get(path))) {
                    index = this.get(path).push(value);
                    $rootScope.$safeApply();
                } else {
                    this.put(path, [value]);
                }
                return index;
            },
            unset: function (path, value) {
                var list = this.get(path);
                if (Array.isArray(list)) {
                    var index = list.indexOf(value);
                    if (index > -1) {
                        list.splice(index, 1);
                        $rootScope.$safeApply();
                    }
                    if (!list.length) {
                        this.put(path, undefined);
                    }
                }
            },
            extend: function (path, value) {
                var ptr = object;
                if (!value) {
                    value = path;
                    path = undefined;
                } else {
                    ptr = this.get(path);
                }
                if (!ptr && path) {
                    this.put(path, value);
                } else {
                    angular.merge(ptr, value);
                    $rootScope.$safeApply();
                }
            },
            info: function () {
                return {id: name, size: Object.keys(object).length};
            },
            remove: function (path) {
                this._removeTimeout(path);
                this.put(path, undefined);
                $rootScope.$safeApply();
            },
            removeAll: function () {
                var self = this;
                Object.keys(object).forEach(function (key) {
                    if (defaultConfig.hasOwnProperty(key)) {
                        object[key] = defaultConfig[key];
                    } else {
                        delete object[key];
                    }
                    self._removeTimeout(key);
                });
                $rootScope.$safeApply();
            }
        };
    };
}

angular.toArray = function (element, offset) {
    return [].slice.call(element, offset || 0);
};

angular.isEmpty = function (object) {
    return Object.keys(object || {}).length === 0;
};

angular.module('TarmansOBKPlugin', ['ngCookies'])
    .value('Config', {
        server: {url: 'http://DOMAIN:48880'},
        stopWords: {
            'helpers::notify': {
                enabled: true,
                channels: [5],
                words: [
                    'попал в вашу ловушку в локации',
                    'Вы получили турнирное обмундирование'
                ],
                convert: '{"audio": "trap"}'
            }
        }
    })
    .value('Cache', {
        zodiac: [null,
            'wrath_ares', 'wrath_ground_status', 'wrath_air_status', 'wrath_water_status',
            'wrath_ares', 'wrath_ground_status', 'wrath_air_status', 'wrath_water_status',
            'wrath_ares', 'wrath_ground_status', 'wrath_air_status', 'wrath_water_status'
        ],
        aliases: {
            cure11: ['cure1'],
            cure12: ['cure2'],
            cure13: ['cure3'],
            'wrath_ares': ['wrath_ares_90', 'wrath_ares_60', 'wrath_ares_30'],
            'wrath_air_status': ['wrath_air_90', 'wrath_air_60', 'wrath_air_30'],
            'wrath_water_status': ['wrath_water_90', 'wrath_water_60', 'wrath_water_30'],
            'wrath_ground_status': ['wrath_ground_90', 'wrath_ground_60', 'wrath_ground_30'],
            food: [
                'winter_event2016_eda', 'winter_event2016_eda2', 'stol_ny_001', 'stol_ny_002', 'stol_ny_003',
                'stol_ny_004', 'stol_ny_005', 'food_l8', 'zavtrak_2light', 'zavtrak_3average', 'zavtrak_4tost',
                '9may2016_item02'
            ],
            labticket: ['labticket', 'labticket_e', 'labticket1', 'labticket2', 'labticket3']
        }
    })
    .value('tasks', {
        'user::inventory': {async: true, updateInterval: 60000},
        'user::abilities': {updateInterval: 600000},
        'user::effects': {updateInterval: 60000, async: true},
        'klan::main': {updateInterval: 60000},
        'klan::war': {async: true, updateInterval: 600000}
    })
    .value('actions', {})
    .service('config', ['Config', '$parse', '$rootScope', makeCacheObject('config')])
    .service('cache', ['Cache', '$parse', '$rootScope', makeCacheObject('cache')])
    .run([
        'helpers', 'server', 'Scheduler', 'tasks', '$injector', 'cache',
        'config', 'tools', '$cookies', '$rootScope', 'actions',
        function (helpers, server, Scheduler, tasks, $injector, cache, config, tools, $cookies, $rootScope, actions) {
            $rootScope.$safeApply = function(fn) {
                var phase = this.$root.$$phase;
                if (phase == '$apply' || phase == '$digest') {
                    if (fn && typeof(fn) === 'function') {
                        fn();
                    }
                } else {
                    this.$apply(fn);
                }
            };

            chrome.storage.sync.get('config', function (response) {
                config.extend(response.config);
            });
            tools.userInfo({id: $cookies.get('battle')}, function (error, info) {
                if (!error) {
                    cache.extend('user', info);
                }
            });
            function startSchedulers() {
                Object.keys(tasks).forEach(function (taskName) {
                    var parsed = taskName.split('::'),
                        service = $injector.get(parsed[0] + '::parsers'),
                        method = parsed[1];

                    if (service && service[method]) {
                        Scheduler.create(taskName, tasks[taskName], service[method]);
                    }
                });

                Scheduler.create('user::battle', {updateInterval: 30000, async: true}, function (next) {
                    var lastReload = cache.get('battle.lastReload');
                    if (lastReload && (new Date() - lastReload < 10000)) {
                        return next(5000);
                    }
                    var xhr = helpers.request({
                        method: 'HEAD',
                        url: 'http://capitalcity.oldbk.com/fbattle.php'
                    }, function () {
                        var ok = xhr.requestURL === xhr.responseURL && xhr.status === 200;
                        if (ok && !cache.get('battle')) {
                            actions.battle({});
                            helpers.reloadMain('http://capitalcity.oldbk.com/fbattle.php');
                        } else if (!ok && cache.get('battle')) {
                            actions.battle();
                        }
                        next(ok && 5000);
                    });
                });
            }

            var waitAuthInterval = setInterval(function () {
                if (cache.get('server.authorized')) {
                    clearInterval(waitAuthInterval);
                    startSchedulers();
                }
            }, 1000);

            var retries = 3,
                lastReload = null;
            setInterval(function () {
                var main = document.querySelector('frame[name="main"]');
                if (!main) {
                    return;
                }
                try {
                    var questComplete = main.contentDocument.querySelector('#quest a[onclick^="answer"]');
                    main = main.contentWindow.location.pathname;
                    if (questComplete) {
                        questComplete.click();
                    }
                    if (config.get('reloadFrameEvery') > 100 &&
                        new Date() - lastReload > config.get('reloadFrameEvery') * 1000) {
                        helpers.reloadMain();
                        lastReload = new Date();
                    }
                    retries = 3;
                } catch (e) {
                    if (--retries <= 0) {
                        main.setAttribute('src', 'http://capitalcity.oldbk.com/main.php');
                        lastReload = new Date();
                    }
                }
            }, 1000);
        }
    ]
);

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    if (request === 'status') {
        var cache = window.$injector.get('cache'),
            result = {
                authorized: {
                    displayName: 'Авторизация',
                    status: {ok: cache.get('server.authorized')}
                }
            };
        Object.keys(cache.get('server.modules') || {}).forEach(function (module) {
            result[module] = {
                displayName: 'Модуль "' + module + '"',
                status: cache.get('server.modules.' + module)
            };
        });

        callback(result);
    }
    return true;
});
