'use strict';

/**
 * @ngdoc function
 * @name uiApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the uiApp
 */
angular.module('uiApp')
    .controller('PlayersCtrl', ['$scope', '$http', '$parse', function ($scope, $http, $parse) {
        $scope.filter = {
            clan: ''
        };
        $scope.players = [];
        function updatePlayers() {
            if (!$scope.filter.clan) {
                return;
            }
            var url = '/clans/' + $scope.filter.clan + '/players';
            var method = 'get';
            var data;
            var levels = [];
            if ($scope.filter.clan === '+invisible+') {
                url = '/invisible';
                method = 'post';
                let align = [];
                data = {
                    level: {$in: levels},
                    login: {$regex: $scope.filter.login, $option: 'i'},
                    align: {$in: align}
                };

                if (!$scope.filter.login) {
                    delete data.login;
                }
                if (!$scope.filter.levels || !$scope.filter.levels.length) {
                    delete data.level;
                } else {
                    levels.slice(0);
                    $scope.filter.levels.forEach(function (level) {
                        level |= 0;
                        if (level > -1) {
                            levels.push(level);
                        }
                    });
                    data.level = {$in: levels};
                }

                if ($scope.filter.align) {
                    if ($scope.filter.align['2']) {
                        align.push(2);
                    }
                    if ($scope.filter.align['3']) {
                        align.push(3);
                    }
                    if ($scope.filter.align['6']) {
                        align.push(6);
                    }
                    data.align = {$in: align};
                    if (!align.length) {
                        delete data.align;
                    }
                } else {
                    delete data.align;
                }
            }

            $http[method](url, data).then(function (players) {
                $scope.players.splice(0);
                $scope.players.push.apply($scope.players, players.data.players);
            });
        }

        $scope.$watch('filter.clan', function (value) {
            if (!value) {
                return;
            }
            updatePlayers();
        });

        $scope.$watch('filter.align["2"]', updatePlayers);
        $scope.$watch('filter.align["3"]', updatePlayers);
        $scope.$watch('filter.align["6"]', updatePlayers);
        $scope.$watchCollection('filter.levels', updatePlayers);
        $scope.refresh = updatePlayers;
    }]);
