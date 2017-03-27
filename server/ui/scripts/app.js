'use strict';

/**
 * @ngdoc overview
 * @name uiApp
 * @description
 * # uiApp
 *
 * Main module of the application.
 */
angular
    .module('uiApp', [
        'ngAnimate', 'ngAria', 'ngCookies', 'ngMessages', 'ngResource', 'ngRoute', 'ngSanitize', 'chart.js',
        'ui.bootstrap', 'ui.select'
    ])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/exchange.html',
                controller: 'ExchangeCtrl'
            })
            .when('/users', {
                templateUrl: 'views/users.html',
                controller: 'UsersCtrl'
            })
            .when('/players', {
                templateUrl: 'views/players.html',
                controller: 'PlayersCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    }])
    .run(['$rootScope', '$location', '$http', function ($rootScope, $location, $http) {
        $rootScope.location = $location;
        $rootScope.clans = [];
        $http.get('/whoIAm').then(function (result) {
            $rootScope.iam = result.data;
        });
        $http.get('/clans').then(function (result) {
            result.data.clans.unshift({displayName: 'Невидимки', name: '+invisible+'});
            // result.data.clans.unshift({displayName: 'Безклановые', name: '+'});
            $rootScope.clans.splice(0);
            $rootScope.clans.push.apply($rootScope.clans, result.data.clans);
        });
    }]);
