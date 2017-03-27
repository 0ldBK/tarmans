angular.module('TarmansOBKPlugin').run([
    'helpers', '$rootScope', '$injector', 'config', 'cache', 'Scroll',
    function (helpers, $rootScope, $injector, config, cache, Scroll) {
        $rootScope.$on('battle::end', function () {
            $injector.get('user::parsers').inventory();
        });

        $rootScope.$on('frame::end::capitalcity.oldbk.com/startlab.php', function () {
            if (!config.get('flags.useLabTicket')) {
                return;
            }

            var timeout = config.get('config.useLabTicketTimeout') || 120;
            if (cache.get('user.effects["Посещение лабиринта хаоса"]') > timeout) {
                Scroll('labticket', ['inventory']).use(null, function () {
                    $injector.get('user::parsers').effects();
                });
            }
        });
    }
]);
