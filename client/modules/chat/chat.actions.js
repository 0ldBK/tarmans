'use strict';

angular.module('TarmansOBKPlugin').service('chat::actions', [
    'helpers', 'cache', 'config',
    function (helpers, cache, config) {
        var actions = {};

        actions.wrapMessage = function (data, callback) {
            var text = data.text || '',
                stopWords = config.get('stopWords');

            if (!text || data.from === cache.get('user.login')) {
                return;
            }

            Object.keys(stopWords).some(function (action) {
                if (!stopWords[action].enabled || stopWords[action].channels.indexOf(data.channel) === -1) {
                    return;
                }
                return stopWords[action].words.some(function (word) {
                    var r = new RegExp(word, 'i');
                    if (r.test(text)) {
                        var options = new Function ('return ' + stopWords[action].convert).apply(data);

                        helpers.launch(action, options, callback);
                        return true;
                    }
                });
            });
        };

        return actions;
    }
]);
