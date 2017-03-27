'use strict';

/**
 * @ngdoc function
 * @name uiApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the uiApp
 */
angular.module('uiApp')
    .controller('UsersCtrl', ['$scope', '$http', '$parse', function ($scope, $http, $parse) {
        $scope.active = {};
        $scope.users = [];
        $scope.statistics = [];
        $scope.graphs = [];
        $http.get('/users').then(function (response) {
            $scope.users = Array.isArray(response.data) ? response.data : [response.data];
        });
        $http.get('/resources/modules').then(function (response) {
            $scope.modules = response.data;
        });

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

        $scope.updateResources = function () {
            var user = $scope.active._id,
                modules = angular.copy($scope.active.resources.modules),
                ui = $scope.active.resources.ui;

            $http.patch('/resources', {user: user, modules: modules, ui: ui}).then(function (response) {
                $scope.active.resources = response.data;
            });
        };

        var series = {
            money: 'Креды',
            win: 'Победы',
            loose: 'Поражения',
            experience: 'Опыт',
            reputation: 'Репутация'
        };

        function getDates(days) {
            let out = [],
                date = new Date(),
                n;

            for (n = 0; n < days; n += 1) {
                out.push(new Date(date - n * 24 * 60 * 60 * 1000));
            }

            return out.reverse();
        }

        function createGraphs() {
            $http.get('/statistics?id=' + $scope.active.id).then(function (response) {
                var data = response.data;
                Object.keys(data).forEach(function (name) {
                    var graph = {
                            name: name,
                            series: [series[name]],
                            data: [],
                            labels: []
                        },
                        aggregate = {}, previousRecord,
                        days = getDates(30);

                    data[name].forEach(function (record, index) {
                        var date = new Date(record.date).toDateString(),
                            data = record.data,
                            delta = data;
                        if (['money'].indexOf(name) !== -1) {
                            aggregate[date] = data;
                        } else if (index) {
                            if (data < previousRecord) {
                                previousRecord = data;
                                return;
                            }
                            delta = data - previousRecord;
                            if (delta < 0) {
                                delta = 0;
                            }
                            aggregate[date] = aggregate[date] || 0;
                            aggregate[date] += delta;
                        }
                        previousRecord = data;
                    });
                    days.forEach(function (date) {
                        date = date.toDateString();
                        graph.labels.push(date);
                        graph.data.push(aggregate[date] || 0);
                    });

                    graph.data = [graph.data];
                    $scope.graphs.push(graph);
                });

                $scope.statistics = response.data;
            });
        }

        function getResources() {
            var activeId = $scope.active.id;
            $http.get('/resources?id=' + activeId).then(function (response) {
                if (activeId !== $scope.active.id) {
                    return;
                }

                $scope.active.resources = response.data || {modules: []};
            });
        }

        $scope.$watch('active.id', function () {
            if (!$scope.active.id && Array.isArray($scope.users) && $scope.users.length) {
                $scope.active = $scope.users[0] || {};
            }

            if (!$scope.active.id) {
                return;
            }

            $scope.graphs = [];
            createGraphs();
            getResources();
        });
    }]);
