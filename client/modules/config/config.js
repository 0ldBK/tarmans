angular.module('TarmansOBKPlugin')
    .directive('toArray', function () {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function ($scope, el, attrs, ngModel) {
                ngModel.$formatters.unshift(function(value) {
                    return Array.isArray(value) ? value[0] : value;
                });

                ngModel.$parsers.push(function(value) {
                    return [value];
                });
            }
        };
    })
    .directive('showTemplate', ['$compile', '$templateCache',
        function ($compile, $templateCache) {
            return {
                restrict: 'A',
                link: function ($scope, element, attrs) {
                    var templateUrl = $scope.$eval(attrs.showTemplate);
                    element.html($templateCache.get(templateUrl));
                    $compile(element.contents())($scope);
                }
            };
        }
    ])
    .filter('where', [function () {
        return function (array, checker) {
            return (array || []).filter(function (item) {
                return Function('item', 'try {with(item) {return ' + checker + ';}} catch(e) {}')(item);
            });
        };
    }])
    .controller('ConfigCtrl', [
        '$scope', 'config', 'cache', 'Scheduler', 'location', 'actions', 'tools', 'helpers', '$parse',
        function ($scope, config, cache, Scheduler, location, actions, tools, helpers, $parse) {
            $scope.config = config.get();
            $scope.cache = cache.get();
            $scope.location = location;
            $scope.scheduler = Scheduler;
            $scope.actions = actions;
            $scope.tools = tools;

            $scope.tmp = {};
            $scope.magic = [];

            $scope.toggle = function (array, value) {
                if (typeof array === 'string') {
                    if (!Array.isArray($parse(array)($scope))) {
                        array = $parse(array).assign($scope, []);
                    } else {
                        array = $parse(array)($scope);
                    }
                }

                var index = array.indexOf(value);
                if (index === -1) {
                    array.push(value);
                } else {
                    array.splice(index, 1);
                }
            };

            $scope.toArray = function (param) {
                var value = $parse(param)($scope);
                if (!Array.isArray(value)) {
                    $parse(param).assign($scope, []);
                }
            };

            $scope.saveConfig = function (save) {
                if (save) {
                    chrome.storage.sync.set({config: config.get()}, function (error) {
                        console.log('After save error', error, arguments);
                    });
                }
            };
            $scope.loadUser = function (login, distination) {
                if (login) {
                    tools.userInfo(login, function (error, info) {
                        $parse(distination).assign($scope, info);
                        $scope.$apply();
                    });
                }
            };
            $scope.reloadMagic = function reloadMagic() {
                var magic = [{
                        action: 'cure',
                        name: 'cure',
                        displayName: 'Лечить травму(любую)',
                        placeName: 'Мета',
                        image: 'http://i.oldbk.com/i/travma.gif'
                    }],
                    defaultPlaces = helpers.getDefaultPlaces();
                Object.keys(defaultPlaces).forEach(function (place) {
                    var list = defaultPlaces[place].list;
                    Object.keys(list).forEach(function (name) {
                        magic.push({
                            name: name,
                            displayName: list[name][0].displayName || name,
                            options: [place],
                            placeName: defaultPlaces[place].displayName,
                            image: list[name][0].image
                        });
                    });
                });
                $scope.magic = magic;
            };

            $scope.changeInterceptType = function (type) {
                $scope.tmp.intercept = {type: type};
                if (['user', 'klan'].indexOf(type) === -1) {
                    $scope.tmp.intercept.enemy = type;
                }
                $scope.reloadMagic();
            };

            $scope.interceptAddAction = function () {
                var action = $scope.tmp.intercept.action;
                $scope.tmp.intercept.action = {};
                $scope.tmp.intercept.actions = $scope.tmp.intercept.actions || [];
                $scope.tmp.intercept.actions.push(angular.copy(action));
            };

            $scope.interceptAdd = function () {
                config.push('intercept.list', angular.copy($scope.tmp.intercept));
                $scope.interceptReset();
            };
            $scope.interceptReset = function () {
                $scope.changeInterceptType($scope.tmp.intercept.type);
            };

            $scope.interceptRemove = function (intercept) {
                config.unset('intercept.list', intercept);
            };

            $scope.abGroupName = function (type) {
                return {
                    killall: 'Бъем всех',
                    haot: 'Хаоты',
                    manual: 'Ручной',
                    rista: 'Ристалище'
                }[type] || 'Другие';
            };

            $scope.abCreateConfig = function (abConfig) {
                var newConfig = {};
                var name = prompt('Название конфигурации', abConfig && abConfig.name || '');

                if (!name) {
                    return;
                }
                newConfig.name = name;
                newConfig.type = 'killall';
                var index = config.push('autobattle.configs', newConfig);
                config.put('autobattle.current', '' + index);
                return newConfig;
            };

            $scope.abCurrent = function () {
                return config.get('autobattle.current');
            };

            $scope.abRemoveConfig = function (abConfig) {
                var configs = config.get('autobattle.configs'),
                    index = configs.indexOf(abConfig);

                if (index > -1) {
                    configs.splice(index, 1);
                }
            };
            $scope.abSetPriority = function (priority) {
                var opponents = cache.get('battle.opponents') || [];
                opponents.forEach(function (opponent) {
                    if (opponent.active) {
                        opponent.priority = priority;
                        opponent.active = false;
                    }
                });
            };
        }
    ])
    .run(['$injector', function ($injector) {
        var style = document.createElement('link');
        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('href', chrome.runtime.getURL('modules/config/config.css'));

        var template = document.createElement('link');
        template.setAttribute('rel', 'import');
        template.setAttribute('href', chrome.runtime.getURL('modules/config/config.html'));
        document.documentElement.appendChild(style);
        document.documentElement.appendChild(template);
        template.addEventListener('load', function () {
            var container = template.import.documentElement.querySelector('body>div');
            $injector.get('$compile')(container)($injector.get('$rootScope'));
            document.documentElement.appendChild(container);
        });
    }]);

window.$injector = angular.injector(['TarmansOBKPlugin']);
