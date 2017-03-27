'use strict';

window.$injector.invoke([
    'helpers', 'Scheduler', 'Scroll', 'actions',
    function (helpers, Scheduler, Scroll, actions) {
        actions.magicFlood = function (options) {
            options = angular.copy(options);
            Scheduler.clear('magicflood');
            Scheduler.create('magicflood', {updateInterval: 150, async: false}, function () {
                actions.combo({
                    user: options.enemy,
                    operations: [{
                        scroll: options.action.scroll.name,
                        action: options.action.scroll.name,
                        options: [options.action.scroll.options]
                    }]
                });
            });
        };
    }
]);
