'use strict';

window.$injector.invoke([
    'helpers', 'config', 'cache', 'location', 'Scheduler', 'server', '$rootScope', 'tools',
    function (helpers, config, cache, location, Scheduler, server, $rootScope, tools) {
        function bankLogin(callback) {
            var opts = {
                url: 'http://capitalcity.oldbk.com/exchange.php?view=bankenter',
                method: 'POST',
                data: 'id=' + config.get('exchange.bank.id') +
                '&pass=' + config.get('exchange.bank.password') +
                '&enter=%C2%EE%E9%F2%E8'
            };

            helpers.request(opts, function (error, dom) {
                if (!error) {
                    var errorMessage = helpers.getErrorMessage(dom);
                    if (errorMessage && errorMessage.indexOf('Ошибка входа.') !== -1) {
                        error = new Error(errorMessage);
                    }
                }

                callback(error);
            });
        }

        function getAmount(form) {
            var goodPrice = config.get('exchange.minimalOffer'),
                amount = 0;
            tools.getAllText(form, function (element, text) {
                var parsed = /^(\d+) екр\. по (\d+) кр. = (\d+) кр.$/.exec(text.trim());
                if (!parsed) {
                    return;
                }
                var ekr = parseInt(parsed[1], 10),
                    kr = parseInt(parsed[2], 10);

                if (kr <= goodPrice) {
                    amount += ekr;
                }
            });

            return amount;
        }

        function submitOffer(bid, code, callback) {
            var opts = {
                url: 'http://capitalcity.oldbk.com/exchange.php',
                method: 'POST',
                data: 'sumbyekr=' + bid
            };
            if (code) {
                opts.data += '&EsecurityCode=' + code +
                    '&byekryes=%CF%EE%E4%F2%E2%E5%F0%E6%E4%E0%FE+%EF%EE%EA%F3%EF%EA%F3';
            } else {
                opts.data += '&byekr=%D0%E0%F1%F1%F7%E8%F2%E0%F2%FC';
            }

            helpers.request(opts, function (error, dom) {
                var form = dom.querySelector('form[method="POST"]'),
                    captcha = form.querySelector('img[src^="exsec.php?tm="]'),
                    message = helpers.getErrorMessage(dom),
                    amount = getAmount(form);

                if (amount !== bid) {
                    helpers.message('Изменилась цена на екры, не успели..., попробуем пересчитать...');
                    return callback();
                }

                if (message.indexOf('Неверный защитный код') !== -1) {
                    helpers.message('Ошибка покупки екров: ' + message);
                }

                if (captcha) {
                    var src = captcha.getAttribute('src');
                    $rootScope.$emit('anti-captcha', 'http://capitalcity.oldbk.com/' + src, function (error, code) {
                        if (error) {
                            return helpers.message('Не удалось распознать капчу, ошибка: ' + error);
                        }

                        submitOffer(bid, code, callback);
                    });
                } else {
                    callback();
                }
            });
        }

        Scheduler.create('exchange', {updateInterval: 1000, async: true}, function (next) {
            if (!config.get('exchange.enabled')) {
                return next();
            }

            var opts = {
                url: 'http://capitalcity.oldbk.com/exchange.php',
                query: {view: 'byekr'}
            };
            helpers.request(opts, function (error, dom) {
                if (error || !dom) {
                    return next();
                }
                var enterLink = dom.querySelector('a[href="?view=bankenter"]');
                if (enterLink) {
                    helpers.message('Не залогинен в банк! пробуем залогиниться...');
                    return bankLogin(next);
                }

                var rows = dom.querySelectorAll('td>h4+table tr'),
                    spravkaImg = dom.querySelector('img[src="http://i.oldbk.com/i/bank/spravka.gif"]');
                if (!spravkaImg) {
                    return next();
                }

                var limit = parseInt(spravkaImg.previousElementSibling.innerText, 10),
                    money = parseFloat(dom.querySelector('center a[href="?view=chbank"] + font').innerText);

                if (!limit || !rows || rows.length < 2) {
                    return next();
                }

                var row = rows[1],
                    tds = row.querySelectorAll('td'),
                    amount = parseInt(tds[0].innerText, 10),
                    offer = parseInt(tds[1].innerText.split('=')[1], 10),
                    bid = (money - (money % offer)) / offer,
                    minimalOffer = cache.get('exchange.minimalOffer');

                if (minimalOffer !== undefined && minimalOffer !== offer) {
                    helpers.message('На бирже изменилась цена екра, за 1 екр. дают <b>' + offer + '</b> кр., было <b>' +
                        minimalOffer + '</b> кр.');
                    server.sendCurrency({
                        offer: offer,
                        amount: amount
                    });
                }
                if (config.get('exchange.minimalOffer') >= offer && bid > 0) {
                    helpers.message('На бирже продается <b>' + amount + '</b> екр(ов) по цене <b>' + offer +
                        '</b>, пробуем купить...');
                    if (bid > amount) {
                        bid = amount;
                    }
                    if (bid > limit) {
                        bid = limit;
                    }

                    submitOffer(bid, null, next);
                } else {
                    next();
                }

                cache.put('exchange.minimalOffer', offer);
            });
        });
    }
]);
