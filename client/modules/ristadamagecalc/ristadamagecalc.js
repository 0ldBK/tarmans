'use strict';

window.$injector.invoke([
    'helpers', 'tools',
    function (helpers, tools) {
        tools.calculateDamage = function (battleId, callback) {
            callback = callback || angular.noop;
            helpers.request({
                url: 'http://capitalcity.oldbk.com/logs.php',
                query: {
                    page: 1,
                    log: battleId,
                    flogin: '+',
                    filt: '%CF%EE%EA%E0%E7%E0%F2%FC'
                }
            }, function (error, dom) {
                var users = dom.querySelectorAll('.B1'),
                    magic = dom.querySelectorAll('b>font[color="red"]'),
                    attackers = {},
                    magicDamage = 0,
                    damage = 0,
                    allDamage = 0,
                    i;

                for (i = 0; i < users.length; i += 1) {
                    var user = users[i];
                    attackers[user.innerText] = attackers[user.innerText] || 0;
                    damage = parseInt(user.nextElementSibling.innerText, 10);
                    if (user.nextElementSibling.nodeName === 'B' && damage && damage < 0) {
                        attackers[user.innerText] += damage;
                        allDamage += damage;
                    }
                    damage = 0;
                }

                for (i = 0; i < magic.length; i += 1) {
                    var prevMessage = magic[i].parentElement.previousSibling &&
                        magic[i].parentElement.previousSibling.data.trim();
                    if (prevMessage.indexOf('магии') > -1 ||
                        prevMessage.indexOf('отравление') > -1 ||
                        prevMessage.indexOf('потрясение') > -1 ||
                        prevMessage.indexOf('ожог') > -1) {
                        damage = parseInt(magic[i].innerText, 10) || 0;
                        if (damage < 0) {
                            magicDamage += damage;
                            allDamage += damage;
                        }
                    }
                    damage = 0;
                }
                attackers.magicDamage = magicDamage;
                attackers.allDamage = allDamage;
                helpers.message('Общий Урон <a href="http://capitalcity.oldbk.com/logs.php?log=' +
                    battleId + '" target="_blank">В бою</a>: ' + attackers.allDamage);
                callback(attackers);
            });
        };

    }
]);
