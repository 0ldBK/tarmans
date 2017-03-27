angular.module('TarmansOBKPlugin').service('klan::parsers', [
    'helpers', 'Queue', 'cache', 'config', 'parsers',
    function (helper, Queue, cache, config, parsers) {
        var service = {};

        service.war = function (next) {
            helper.request({url: 'http://capitalcity.oldbk.com/klan.php?razdel=wars'}, function (error, dom) {
                if (error) {
                    return next(1000);
                }
                var parsed = parsers.pageKlanWar(dom);
                if (parsed.klans && parsed.klans.length) {
                    cache.put('klans', parsed.klans);
                }
                cache.put('klan.war', parsed.war);
                next();
            });
        };

        service.main = function (next) {
            helper.request({url: 'http://capitalcity.oldbk.com/klan.php?razdel=main'}, function (error, dom) {
                if (error) {
                    return next(error);
                }
                var parsed = parsers.pageKlanMain(dom);
                if (parsed.relicts) {
                    cache.put('user.relicts', parsed.relicts);
                }
                next();
            });
        };

        return service;
    }
]);
