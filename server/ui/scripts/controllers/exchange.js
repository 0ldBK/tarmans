'use strict';

/**
 * @ngdoc function
 * @name uiApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the uiApp
 */

angular.module('uiApp')
    .controller('ExchangeCtrl', ['$scope', '$http', function ($scope, $http) {
        function twoDigit(num) {
            return (num).toString().length < 2 ? '0' + num : num;
        }

        $http.get('/currency').then(function (response) {
            $scope.labels = [];
            $scope.data = [];
            $scope.series = ['Курс екров'];
            response.data.reverse().forEach(function (record) {
                var date = new Date(record.created_at);
                $scope.labels.push(date.toDateString() + ' ' + twoDigit(date.getHours()) + ':' +
                    twoDigit(date.getMinutes()) + ':' +
                    twoDigit(date.getSeconds())
                );
                $scope.data.push(record.offer);
            });
            $scope.data = [$scope.data];
        });
    }]);
