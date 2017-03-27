'use strict';

window.$injector.invoke([
    'helpers', 'actions', 'Scheduler', 'cache',
    function (helpers, actions, Scheduler, cache) {
        actions.declareWar = function (options) {
            var sOpts = {async: true};
            if (options.startAt) {
                sOpts.when = new Date(options.startAt);
                helpers.message('Атакуем клан "' + options.klan.name + '"[' + options.klan.id + '] в ' + sOpts.when);
            }

            sOpts.updateInterval = options.interval || 100;

            Scheduler.create('klan::declareWar', sOpts, function (next, task) {
                var requestOptions = {
                    method: 'POST',
                    url: 'http://capitalcity.oldbk.com/klan.php?razdel=wars',
                    data: 'mkwarto=' + options.id + '&wt=' + options.type + '&addwar=%CE%E1%FA%FF%E2%E8%F2%FC'
                };

                helpers.request(requestOptions, function (error, dom) {
                    var message = dom.querySelector('font[color="red"]'),
                        timeout;

                    if (message) {
                        message = message.innerText;
                        message = message.replace(/\n/g, '');
                    }
                    if (!message) {
                        helpers.message('Атакуем клан "' + options.name + '"[' + options.id + ']' +
                            ', результат: Что-то пошло не так... не получилось получить результат. Пробуем еще раз');
                        return next();
                    }
                    /*eslint no-fallthrough: 0*/
                    switch (!!message) {
                        case message.indexOf('Вы объявили войну клану') !== -1:
                        case message.indexOf('У Вас ') !== -1:
                            Scheduler.clear('klan::declareWar');
                            break;
                        case message.indexOf('Альянсовая война') !== -1:
                        case message.indexOf('Дуэльная война') !== -1:
                            message = 'Вы уже воюете! Война клану "' +
                                options.name + '"[' + options.id + '] ' +
                                'будет объявлена после ' + cache.get('klan.war.finish');
                            timeout = (cache.get('klan.war.finish') - new Date()) - 60000;
                        case message.indexOf('Ваш клан не может нападать до:') !== -1:
                            timeout = timeout || (new Date(message.split(':').slice(1).join(':')) - new Date()) - 60000;
                            clearInterval(task.timeout);
                            if (timeout > 60000) {
                                task.timeout = setTimeout(next, timeout);
                            } else {
                                next();
                            }
                            break;
                        default:
                            next();
                    }

                    helpers.message('Атакуем клан "' + options.name + '"[' + options.id + ']' +
                        ', результат: ' + message);
                });
            });
        };
    }
]);
