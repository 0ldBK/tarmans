angular.module('TarmansOBKPlugin').run([
    'helpers', 'cache', 'Scheduler',
    function (helpers, cache, Scheduler) {
        ['klans', 'weapons'].forEach(function (name) {
            var opts = {
                url: chrome.extension.getURL('/assets/' + name + '.json'),
                method: 'GET',
                type: 'json'
            };
            helpers.request(opts, function (error, response) {
                if (!error) {
                    cache.put(name, response);
                }
            });
        });

        /*
        Scheduler.create('updateUserDatabase', {updateInterval: 15 * 60 * 60 * 1000, async: true}, function (next) {
            helpers.request({url: 'http://oldbk.com/api/api.xml', type: 'xml'}, function (error, xml) {
                
            });
        });
        */
    }
]);
