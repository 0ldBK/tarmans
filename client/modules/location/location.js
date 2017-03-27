angular.module('TarmansOBKPlugin').factory('location', [
    'helpers', 'cache', 'parsers', 'server',
    function (helpers, cache, parsers, server) {
        //noinspection ReservedWordAsName
        var locations = {
            'загород': {
                location: 'outcity.php',
                ways: [
                    {url: 'outcity.php?qaction=1&', name: 'выйти из города'},
                    {url: 'outcity.php?qaction=2&', name: 'парковая улица', link: true, location: 'city.php'},
                    {url: 'outcity.php?qaction=66&', name: 'замки', return: 'castles.php?exit=1'}
                ]
            },
            'парковая улица': {
                location: 'city.php',
                ways: [
                    {
                        url: 'city.php?got=1&level5=1&',
                        name: 'комната знахаря',
                        return: 'city.php?bps=1&',
                        location: 'znahar.php'
                    },
                    {
                        url: 'city.php?got=1&level6=1&',
                        name: 'большая скамейка',
                        return: 'city.php?bps=1&',
                        location: 'bench.php'
                    },
                    {
                        url: 'city.php?got=1&level7=1&',
                        name: 'средняя скамейка',
                        return: 'city.php?bps=1&',
                        location: 'bench.php'
                    },
                    {
                        url: 'city.php?got=1&level8=1&',
                        name: 'маленькая скамейка',
                        return: 'city.php?bps=1&',
                        location: 'bench.php'
                    },
                    {url: 'city.php?got=1&level22=1&', name: 'вокзал', return: 'city.php?bps=1&'},
                    {url: 'city.php?got=1&level10=1&', name: 'загород', link: true, location: 'outcity.php'},
                    {url: 'city.php?got=1&level3=1&', name: 'замковая площадь', link: true, location: 'city.php'},
                    {url: 'city.php?got=1&level4=1&', name: 'центральная площадь', link: true, location: 'city.php'}
                ]
            },
            'замковая площадь': {
                location: 'city.php',
                ways: [
                    {
                        url: 'city.php?got=1&level60=1&',
                        name: 'арена богов',
                        return: 'bplace.php?got=1&level333=1&',
                        location: 'bplace.php'
                    },
                    {
                        url: 'city.php?got=1&level1=1&',
                        name: 'руины старого замка',
                        return: 'ruines_start.php?exit=1&',
                        location: 'ruines_start.php'
                    },
                    {
                        url: 'city.php?got=1&level1=1&',
                        name: 'вход в руины',
                        return: 'ruines_start.php?exit=1&',
                        location: 'ruines_start.php'
                    },
                    {
                        url: 'city.php?got=1&level45=1&',
                        name: 'вход в лабиринт хаоса',
                        return: 'city.php?zp=1&',
                        location: 'startlab.php'
                    },
                    {
                        url: 'city.php?got=1&level45=1&',
                        name: 'лабиринт хаоса',
                        return: 'city.php?zp=1&',
                        location: 'startlab.php'
                    },
                    {
                        url: 'city.php?got=1&level48=1&',
                        name: 'храмовая лавка',
                        return: 'city.php?zp=1&',
                        location: 'cshop.php'
                    },
                    {
                        url: 'city.php?got=1&level49=1&',
                        name: 'храм древних',
                        return: 'city.php?zp=1&',
                        location: 'church.php'
                    },
                    {url: 'city.php?got=1&level4=1&', name: 'парковая улица', link: true, location: 'city.php'}
                ]
            },
            'комната для новичков': {
                location: 'main.php?setch=1&got=1&room1=1&',
                ways: [
                    {
                        url: 'main.php?path=1.100.1.50&',
                        name: 'секретная комната',
                        return: 'main.php?goto=plo&',
                        location: 'main.php',
                        group: 'bk'
                    }
                ],
                return: 'main.php?goto=plo&',
                group: 'bk'
            },
            'центральная площадь': {
                location: 'city.php',
                ways: [
                    {url: 'city.php?got=1&level66=1&', name: 'торговая улица', link: true, location: 'city.php'},
                    {url: 'city.php?got=1&level8=1&', name: 'парковая улица', link: true, location: 'city.php'},
                    {url: 'city.php?got=1&level7=1&', name: 'страшилкина улица', link: true, location: 'city.php'},
                    {
                        url: 'city.php?got=1&level11=1&',
                        name: 'лотерея сталкеров',
                        return: 'city.php?cp=1&',
                        location: 'lotery.php'
                    },
                    {
                        url: 'city.php?got=1&level61=1&',
                        name: 'доска объявлений',
                        return: 'city.php?cp=1&',
                        location: 'doska.php'
                    },
                    {
                        url: 'city.php?got=1&level3=1&',
                        name: 'первый комиссионный магазин',
                        return: 'city.php?cp=1&',
                        location: 'comission.php'
                    },
                    {url: 'city.php?got=1&level2=1&', name: 'магазин', return: 'city.php?cp=1&', location: 'shop.php'},
                    {url: 'city.php?got=1&level6=1&', name: 'почта', return: 'city.php?cp=1&', location: 'post.php'},
                    {
                        url: 'city.php?got=1&level4=1&',
                        name: 'ремонтная мастерская',
                        return: 'city.php?cp=1&',
                        location: 'repair.php'
                    },
                    {url: 'city.php?got=1&level1=1&', name: 'бойцовский клуб', location: 'main.php?setch=1'},
                    {
                        url: 'main.php?setch=1&got=1&room1=1&',
                        name: 'комната для новичков',
                        link: true,
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room2=1&',
                        name: 'комната для новичков 2',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room3=1&',
                        name: 'комната для новичков 3',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room4=1&',
                        name: 'комната для новичков 4',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room5=1&',
                        name: 'зал воинов 1',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room6=1&',
                        name: 'зал воинов 2',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room7=1&',
                        name: 'зал воинов 3',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room8=1&',
                        name: 'зал воинов 4',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room9=1&',
                        name: 'рыцарский зал',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room10=1&',
                        name: 'башня рыцарей-магов',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room11=1&',
                        name: 'колдовской мир',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room12=1&',
                        name: 'этаж духов',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room13=1&',
                        name: 'астральные этажи',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room14=1&',
                        name: 'огненный мир',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room15=1&',
                        name: 'зал паладинов',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room8=1&',
                        name: 'торговый зал',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room16=1&',
                        name: 'совет белого братства',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room17=1&',
                        name: 'зал тьмы',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room36=1&',
                        name: 'зал стихий',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room54=1&',
                        name: 'зал света',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room19=1&',
                        name: 'будуар',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room18=1&',
                        name: 'царство тьмы',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room56=1&',
                        name: 'царство стихий',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room55=1&',
                        name: 'царство света',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    },
                    {
                        url: 'main.php?setch=1&got=1&room57=1&',
                        name: 'зал клановых войн',
                        return: 'main.php?goto=plo&',
                        group: 'bk'
                    }
                ]
            },
            'торговая улица': {
                location: 'city.php',
                ways: [
                    {
                        url: 'city.php?got=1&level88=1&',
                        name: 'прокатная лавка',
                        return: 'prokat.php?exit=1&',
                        location: 'prokat.php'
                    },
                    {
                        url: 'city.php?got=1&level71=1&',
                        name: 'аукцион',
                        return: 'auction.php?exit=1&',
                        location: 'auction.php'
                    },
                    {
                        url: 'city.php?got=1&level70=1&',
                        name: 'ломбард',
                        return: 'pawnbroker.php?exit=1&',
                        location: 'pawnbroker.php'
                    },
                    {
                        url: 'city.php?got=1&level47=1&',
                        name: 'арендная лавка',
                        return: 'rentalshop.php?exit=1&',
                        location: 'rentalshop.php'
                    },
                    {url: 'city.php?got=1&level20=1&', name: 'центральная площадь', link: true, location: 'city.php'},
                    {
                        url: 'city.php?got=1&level67=1&',
                        name: 'фонтан удачи',
                        return: 'city.php?',
                        location: 'fontan.php'
                    }
                ]
            },
            'страшилкина улица': {
                location: 'city.php',
                ways: [
                    {url: 'city.php?got=1&level4=1&', name: 'центральная площадь', link: true, location: 'city.php'},
                    {
                        url: 'city.php?got=1&level2=1&',
                        name: 'регистратура кланов',
                        return: 'city.php?strah=1&',
                        location: 'klanedit.php'
                    },
                    {
                        url: 'city.php?got=1&level77=1&',
                        name: 'башня смерти',
                        return: 'dt_start.php?exit=1&',
                        location: 'dt_start.php'
                    },
                    {url: 'city.php?got=1&level5=1&', name: 'банк', return: 'city.php?strah=1&', location: 'bank.php'},
                    {
                        url: 'city.php?got=1&level6=1&',
                        name: 'цветочный магазин',
                        return: 'city.php?strah=1&',
                        location: 'fshop.php'
                    },
                    {url: 'city.php?got=1&level3200=1&', name: 'ристалище', link: true, location: 'restal.php'}
                ]
            },
            'ристалище': {
                location: 'restal.php',
                ways: [
                    {url: 'restal.php?got=1&level4=1&', name: 'страшилкина улица', link: true, location: 'city.php'},
                    {
                        url: 'restal.php?got=1&level270=1&',
                        name: 'вход в одиночные сражения',
                        return: 'restal270.php?got=1&level200=1&',
                        location: 'restal270.php'
                    },
                    {url: 'restal.php?got=1&level210=1&', name: 'вход в сражение отрядов'},
                    {
                        url: 'restal.php?got=1&level240=1&',
                        name: 'вход в групповые сражения',
                        return: 'restal240.php?exit=1&',
                        location: 'restal240.php'
                    },
                    {
                        url: 'restal.php?got=1&level199=1&',
                        name: 'замок лорда разрушителя',
                        return: 'lord2.php?exit=1&',
                        location: 'lord2.php'
                    }
                ]
            },
            'улица мастеров': {
                location: 'city.php',
                ways: [
                    {url: '/city.php?got=1&level8=1', name: 'парковая улица', link: true, location: 'city.php'},
                    {
                        url: 'city.php?got=1&level91=1',
                        name: 'кузница',
                        return: 'craft.php?exit=1',
                        location: 'craft.php'
                    }
                ]
            }
        };
        /**
         * содержит ссылки на все точки
         * @type {Object}
         */
        var points = {};

        function getLocation(callback) {
            var data = {
                url: 'http://chat.oldbk.com/ch.php',
                query: {
                    online: Math.random(),
                    scan2: 1
                }
            };
            helpers.request(data, function (error, dom) {
                if (error) {
                    return callback(error);
                }
                var location = dom.querySelector('center > div > font'),
                    users = parsers.onlineUsers(dom);

                if (location) {
                    location = location.innerText.trim().match(/^(.*)\s(?:\(\d+\))?/);
                    if (location) {
                        var result = {
                            lastUpdate: new Date(),
                            name: location[1],
                            users: users
                        };
                        cache.put('location', result);
                        server.updateLocation(result.name);
                        callback(null, result);
                    }
                }
            });
        }

        /**
         * функция для нахождения пути от {@link current} до {@link to}
         * @param {Object} current содержит текущую позицию из @points[<имя локации>]
         * @param {String} to та точка, куда должны попасть
         * @param {Array} [breakPoints] массив из проверенных точек,
         *  чтоб не проверять путь, через который уже пытались пройти
         * @returns {Array} Массив точек через которые нужно пройти
         *  чтоб добраться до нужной локации
         */
        function walk(current, to, breakPoints) {
            /**
             * @private path {Array} - массив точек через которые нужно будет пройти
             * @private steps {Array} - дополнительные шаги, тот же {@link path} возвращаемый {@link walk}
             * @type {Array}
             */
            var paths = [],
                steps;
            /**
             * Инициализируем массив пройденых точек
             * @type {Array}
             */
            breakPoints = breakPoints || [];
            /**
             * мы уже проверяли локацию {@link current}?
             * да - выходим, возвращаем пустой {@link path}
             */
            if (breakPoints.indexOf(current) !== -1) {
                return paths;
            }
            /**
             * добавляем текущую локацию к списку пройденых
             */
            breakPoints.push(current);

            /**
             * если текущая локация является нашей конечной точкой - добавляем её в массив {@link path}
             */
            if (current.name === to.toLowerCase()) {
                paths.push({url: current.url, step: current});
            } else
            /**
             * если локация в которую мы направляемся находится в группе локаций
             * (например комнаты в здании бойцовского клуба), и текущая локация тоже
             * находится в этой группе - добавляем в массив {@link path}
             *
             * это нужно для того, чтоб не выходить из здания бойцовского клуба
             * при переходе из комнаты в комнату
             */
            if (current.group && points[to].group === current.group) {
                paths.push({url: points[to].url, step: current});
                return paths;
            } else
            /**
             * если текущая локация не имеет других переходов, кроме как выхода
             * и этот выход не в ту локацию которую мы уже проверяли
             * добавляем выход к в массив {@link path}
             *
             * чаще всего это первая точка, допустим при просчете пути от магазина на ристалище
             * из магазина один единственный выход - на центральную площадь
             */
            if (current.return && breakPoints.indexOf(current.parent) === -1) {
                paths.push({url: current.return, step: current});
                steps = walk(current.parent, to, breakPoints);
            } else
            /**
             * если текущая локация имеет выходы в другие локации - мы должны их все проверить
             * мы должны найти один единственный верный путь
             * {@link Array.some} - позволяет в случае удачи прекратить обход
             */
            if (current.ways) {
                /**
                 * @param {Object} way объект пути
                 * если way не наш путь и не является ссылкой на какую-то локацию
                 * то нам это не подходит
                 */
                current.ways.some(function (way) {
                    if (way.name !== to && !way.link) {
                        return;
                    }
                    steps = walk(way, to, breakPoints);
                    return steps.length;
                });
            } else
            /**
             * в случае если текущая позиция - это линк к какой-нить существующей локации
             * попробуем поискать в этой локации
             * если поиск вернул не пустой массив со списком шагов - мы нашли нужную дорожку
             * добавляем в массив {@link path} выход из текущей локации
             */
            if (current.url && points[current.name] && current.link) {
                steps = walk(points[current.name], to, breakPoints);
                if (steps.length) {
                    paths.push({url: current.url, step: current});
                }
            }

            /**
             * к нашему пути мы добавляем список дополнительных шагов, если мы их нашли
             */
            if (steps) {
                paths = paths.concat(steps);
            }

            return paths;
        }

        /**
         * Предобработчик функции {@link walk}, проверяет на существование локаций
         * чтоб попусту не трать время на поиск перехода
         * @param {string} from Откуда будем идти
         * @param {string} to Куда пойдем
         * @return {Array} массив с точками перехода
         */
        function findWay(from, to) {
            var message = '';

            if (!points[from]) {
                message = 'Не знаю как выйти из "' + from + '"!';
            } else if (!points[to]) {
                message = 'Не знаю как добраться до "' + to + '"!';
            }

            if (message) {
                helpers.message(message);
            }

            if (message || from === to) {
                return [];
            }

            var steps = walk(points[from], to);
            if (!steps.length) {
                helpers.message('Путь от "' + from + '" до "' + to + '" не найден!');
            }

            return steps;
        }

        /**
         * Переход в другую локацию
         * @param {String} to куда будем идти
         * @param {Function} [next] колбэк
         * @returns {undefined} нечего возвращать
         */
        function go(to, next) {
            next = next || angular.noop;
            /**
             * Если некуда идти - то никуда не идем=)
             */
            if (!to) {
                return next();
            }

            /**
             * все локации у нас записаны маленькими буквами, для быстрого сравнения строк
             * @type {string}
             */
            to = to.toLowerCase();
            /**
             * мы не будем менять направление, если уже находимся в пути
             */
            var inTransit = cache.get('location.inTransit');
            if (inTransit) {
                helpers.message('Уже нахожусь в пути к "' + inTransit.to + '" не могу перейти к "' + to + '"...');
                return next();
            }

            /** это тот колбэк, который будет выполнен по приходу на точку или если дойти не удалось
             * при вызове - переход завершается
             * @param {Error} [error] {@link Error}
             * @returns {undefined}
             */
            var callback = function (error) {
                if (error) {
                    helpers.message('Не смог добраться до "' + to + '": ' + error);
                }
                cache.put('location.inTransit', undefined);
                helpers.reloadMain('http://capitalcity.oldbk.com/main.php?' + Math.random());
                next();
            };

            /**
             * Нужно определить текущую локацию
             */
            getLocation(function (error, currentLocation) {
                if (error) {
                    return callback(error);
                }
                currentLocation = currentLocation.name.toLowerCase();

                /**
                 * ищем переход с текущей локации
                 * @type {Array} steps - список шагов
                 */
                var steps = findWay(currentLocation, to),
                    /**
                     * @type {Object|undefined} next следующий шаг
                     */
                    next = steps.shift();

                /**
                 * если нам есть куда шагать - шагаем=)
                 */
                if (next) {
                    /**
                     * если следующий шаг - не наш пункт назначения
                     */
                    if (to !== next.step.name) {
                        helpers.message('Идем к "' + to + '" через "' + next.step.name + '"...');
                    }
                    /**
                     * собсно сам запрос на переход в другую локацию
                     */
                    var url = 'http://capitalcity.oldbk.com/' + next.url + Math.random();
                    helpers.request({url: url}, function (error, dom) {
                        /**
                         * если ошибка - плохо... прекращаем путешевствие
                         */
                        if (error) {
                            return callback(error);
                        }
                        /**
                         * пытаемся найти какую-нить ошибку
                         */
                        var errorMessage = helpers.getErrorMessage(dom);
                        /**
                         * если есть ошибка, и она удовлетворяет этим условиям - прекращаем переход
                         */
                        if (errorMessage) {
                            if (errorMessage.indexOf('Невидимка не может сюда попасть') !== -1 ||
                                errorMessage.indexOf('Вы не можете попасть в эту комнату.') !== -1 ||
                                errorMessage.indexOf('Нет такого перехода!') !== -1) {
                                helpers.message('Не удалось попасть в "' + to + '": ' + errorMessage);
                                callback();
                            } else {
                                /**
                                 * если мы сильно быстро меняем локацию или еще какая ошибка, то нужно
                                 * подождать 1 сек (1000 мс) и попробовать снова
                                 */
                                if (errorMessage.indexOf('Не так быстро!') === -1) {
                                    helpers.message('Не удалось попасть в "' + to + '": ' + errorMessage);
                                }
                                setTimeout(function () {
                                    go(to, callback);
                                }, 1000);
                            }
                            return;
                        }
                        /**
                         * если нам есть еще куда идти - идем дальше
                         */
                        if (steps.length) {
                            /**
                             * если локация в которой мы находимся - это улица - то нужно
                             * сделать задержку, прежде чем куда-то шагнуть дальше
                             * иначе - просто шагаем
                             */
                            if (next.step.location === 'city.php') {
                                setTimeout(function () {
                                    go(to, callback);
                                }, 1000);
                            } else {
                                go(to, callback);
                            }
                        } else {
                            /**
                             * тут мы завершаем наш поход
                             */
                            helpers.message('Пришли к ' + to);
                            callback();
                        }
                    });
                } else {
                    /**
                     * если нету больше шагов - то мы пришли
                     */
                    callback();
                }
            });
        }

        /**
         * в общем-то это тот самый обработчик,который проходит
         * по всем локациям {@link E.locations} и составляет точки {@link points}
         */
        Object.keys(locations).forEach(function (name) {
            var loc = locations[name];
            points[name] = loc;
            loc.name = loc.name || name;
            if (Array.isArray(loc.ways)) {
                loc.ways.forEach(function (way) {
                    if (way.return) {
                        way.parent = loc;
                        points[way.name] = way;
                    }
                });
            }
        });

        return {
            findWay: findWay,
            get: getLocation,
            go: go,
            point: function (name) {
                return name && points[name.toLowerCase()] || {};
            },
            points: Object.keys(points)
        };
    }
]);

