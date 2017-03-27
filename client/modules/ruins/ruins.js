'use strict';
window.p1;
(function () {
    document.body.innerHTML = '';
    var rs = document.getElementById('ruin-styles');
    if (rs) {
        rs.remove();
    }
    function createPoint(x, y) {
        function brokenLink(x, y) {
            return ((([0, 3, 5, 6, 8, 11].indexOf(x) !== -1) && (y === 0 || y === 7)) ||
                ((x === 4 || x === 7) && (y >= 1 && y <= 6)) ||
                ((x === 5 || x === 6) && (y == 2))
            );
        }

        function getNext(array, y, x) {
            if (!array[y]) {
                return;
            }

            for (var n = y + 1; n < array.length; n += 1) {
                if (array[n]) {
                    if (typeof x === 'number' && !array[n][x]) {
                        continue;
                    }
                    return n;
                }
            }
        }

        function getLink(x, y) {
            var name = map[y] && map[y][x];
            if (!name) {
                return;
            }

            linkedMap[name] = linkedMap[name] || {
                name: name, x: x, y: y
            };

            return linkedMap[name];
        }

        var nextX = getNext(map[y], x),
            nextY = getNext(map, y, x),
            point = getLink(x, y);

        if (!point) {
            return;
        }

        point.right = !(x === 3 && y === 4) && getLink(nextX, y);
        if (point.right) {
            point.right.left = point;
        }

        point.bottom = !brokenLink(x, y) && getLink(x, nextY);
        if (point.bottom) {
            point.bottom.top = point;
        }

        return point;
    }
    var linkedMap = {},
        map = [];

    map.push(['Черная башня', 'Северные чертоги', 'Разрушенная северная башня', 'Высохшее водохранилище',
        'Северный обрыв', 'Таинственное логово', 'Угрюмый лес', 'Сгоревший частокол', 'Гигантская нора',
        'Непроходимый бурьян', 'Часовня темных побуждений', 'Красный трон']);
    map.push(['', 'Западный склон', 'Подземелье смерти', 'Ручей безвольных', 'Незримые топи', 'Хижина болотных ведьм',
        'Сгоревшая лесопилка', 'Хижина лесничего', 'Сломанный дуб', 'Забытые ворота', 'Лестница темных побуждений',
        '']);
    map.push(['', 'Западный тупик', 'Забытый алтарь', 'Лабиринт отступников', 'Проклятая часовня', 'Зловонные каналы',
        'Скрытый грот', 'Заброшенный огород', 'Развалины старой колокольни', 'Башня дракона', 'Кузница дьявола', '']);
    map.push(['', '', '', 'Западные захоронения', 'Северная окраина кладбища', '', '', 'Северные захоронения',
        'Восточная окраина кладбища', '', '', '']);
    map.push(['', 'Овраг мучений', 'Кровавый перекресток', 'Одинокая могила', 'Кладбище', 'Кладбище', 'Кладбище',
        'Кладбище', 'Таинственный склеп', 'Перекресток проклятых', 'Черная заводь', '']);
    map.push(['', '', '', 'Западная окраина кладбища', 'Южные захоронения', '', '', 'Южная окраина кладбища',
        'Восточные захоронения', '', '', '']);
    map.push(['', 'Утес безумства', 'Дворы повешенных', 'Тоннель оживших мертвецов', 'Бесформенный завал',
        'Секретный проход', 'Подворотня слез', 'Сгоревшие конюшни', 'Холм висельников', 'Старый сарай',
        'Вход в катакомбы', '']);
    map.push(['', 'Лестница благих намерений', 'Рыночная площадь', 'Подворотня страха', 'Разрушенная казарма',
        'Площадь забытых мастеров', 'Заброшенный склад', 'Ратушная площадь', 'Южный тупик', 'Опустевшее хранилище',
        'Восточные ворота', '']);
    map.push(['Синий трон', 'Часовня благих намерений', 'Развалины южных ворот', 'Зловещие провалы',
        'Оградительный вал', 'Главные ворота', 'Южные развалины', 'Проклятое место', 'Сумеречный провал',
        'Разрушенная южная башня', 'Бойница стойкости', 'Белая башня']);

    map = map.map(function (row, y) {
        return row.map(function (name, x) {
            return createPoint(x, y);
        });
    });

    function createElement(name, classes, actions, body) {
        var el = document.createElement(name);

        if (classes) {
            classes = Array.isArray(classes) ? classes : [classes];
            el.classList.add.apply(el.classList, classes);
        }

        Object.keys(actions || {}).forEach(function (action) {
            el.addEventListener(action, actions[action]);
        });

        if (body) {
            el.innerHTML = body;
        }

        return el;
    }

    function addRule(sheet, selector, styles) {
        var styleString = Object.keys(styles).reduce(function (content, name) {
            return content + name + ':' + styles[name] + ';';
        }, '');
        sheet.addRule(selector, styleString);
    }

    function applyStyles(container) {
        var doc = container.ownerDocument;

        if (doc.getElementById('ruin-styles')) {
            return;
        }

        var style = document.createElement('style');

        style.appendChild(document.createTextNode(''));
        style.setAttribute('id', 'ruin-styles');
        style.addEventListener('load', function () {
            var sheet = style.sheet;
            addRule(sheet, '.ruins-container', {
                position: 'absolute',
                width: '600px',
                height: '400px',
                'z-index': 2
            });

            addRule(sheet, '.substrate', {
                top: '42px',
                left: '58px',
                position: 'absolute',
                width: '100%',
                height: '100%',
                'z-index': 1
            });

            addRule(sheet, '.substrate .substrate-cel', {
                position: 'relative',
                display: 'inline-block',
                width: '30px',
                height: '25px',
                margin: '2px',
                'vertical-align': 'top'
            });

            addRule(sheet, '.substrate .route-bottom:after', {
                content: '""',
                display: 'block',
                position: 'absolute',
                'background-color': 'black',
                //margin: '0 auto',
                //top: '8px',
                //left: '8px',
                width: '4px',
                height: '30px'
                //'margin-top': '10px',
                //'margin-left': '1px'
                //'margin-bottom': '12px'
            });

            addRule(sheet, '.substrate .route-right', {
                'background-color': 'black',
                margin: '2px',
                top: '10px',
                //left: '10px',
                width: '30px',
                height: '4px'
            });

            addRule(sheet, '.cel', {
                display: 'inline-block',
                position: 'relative',
                width: '30px',
                height: '25px',
                margin: '2px',
                'vertical-align': 'middle',
                'text-align': 'center',
                'line-height': '26px'
            });

            addRule(sheet, '.cel.cemetery', {
                width: '132px'
            });

            addRule(sheet, '.cel:not(.empty)', {
                'box-sizing': 'border-box',
                border: '1px solid black',
                'border-radius': '2px',
                'background-color': 'lightgray',
                'font-weight': 'bold',
                'vertical-align': 'top',
                'text-align': 'center',
                'font-size': '1em',
                'z-index': 2
            });

            addRule(sheet, '.cel:not(.cel-head):not(.empty):not(.cemetery):hover', {
                'background-color': 'green'
            });

            addRule(sheet, '.cel-head', {
                'vertical-align': 'top',
                'text-align': 'center',
                'padding-top': '3px'
            });
            addRule(sheet, '.cel-0-0', {
                'background-color': 'black !important',
                color: 'white'
            });
            addRule(sheet, '.cel-11-0', {
                'background-color': 'red !important'
            });
            addRule(sheet, '.cel-0-8', {
                'background-color': 'lightblue !important'
            });
            addRule(sheet, '.cel-11-8', {
                'background-color': 'white !important'
            });
            addRule(sheet, '.cel-0-0:after, .cel-11-8:after', {
                content: '"\\2656"', // ♖
                'font-size': '1.2em',
                'font-weight': 'bold',
                'vertical-align': 'top',
                'margin-left': '5px'
            });
            addRule(sheet, '.cel-0-8:after, .cel-11-0:after', {
                content: '"\\2655"', // ♕
                color: 'white !important',
                'font-size': '1.2em',
                'font-weight': 'bold',
                'vertical-align': 'top',
                'margin-left': '5px'
            });

            addRule(sheet, '.user', {
                position: 'absolute',
                top: '-3px',
                left: '-3px',
                'z-index': 5,
                'font-size': '1.2em',
                'font-weight': 'bold'
            });
        });

        doc.head.appendChild(style);
    }

    function drawMap(container) {
        applyStyles(container);

        var divContainer = createElement('div', 'ruins-container'),
            celHeads = createElement('div', ['row']),
            substrate = createElement('div', 'substrate');

        for (var i = 0; i <= map[0].length; i += 1) {
            var headClasses = ['cel', 'cel-head'];
            if (i === 0) {
                headClasses.push('empty');
            }
            celHeads.appendChild(createElement('div', headClasses, 0, i && String(i)));
        }

        divContainer.appendChild(celHeads);

        map.forEach(function (row, y) {
            var rowDiv = createElement('div', ['row', 'row-' + y]),
                substrateRow = rowDiv.cloneNode();

            rowDiv.appendChild(createElement('div', ['cel', 'cel-head'], 0, String.fromCharCode(65 + y)));
            row.forEach(function (cel, x) {
                var substrateClasses = ['substrate-cel', 'substrate-cel-' + x + '-' + y];
                if (x === 6 && y === 3 || x === 6 && y === 5) {
                    substrateClasses.push('route-right');
                }
                if (cel && cel.name === 'Кладбище') {
                    if (x === 4 && y === 4) {
                        rowDiv.appendChild(createElement('div', ['cel', 'cemetery']));
                    }
                    substrateRow.appendChild(createElement('div', ['substrate-cel']));
                    return;
                }

                if (!cel) {
                    if (map[y][x - 1] && map[y][x - 1].right) {
                        substrateClasses.push('route-right');
                    }

                    if (map[y - 1] && map[y - 1][x] && map[y - 1][x].bottom) {
                        substrateClasses.push('route-bottom');
                    }

                    rowDiv.appendChild(createElement('div', ['cel', 'empty']));
                    substrateRow.appendChild(createElement('div', substrateClasses));
                    return;
                }

                ['right', 'left', 'bottom'].forEach(function (arrow) {
                    if (cel[arrow]) {
                        substrateClasses.push('route-' + arrow);
                    }
                });

                var celDiv = createElement('div', ['cel', 'cel-' + x + '-' + y], {
                        hover: function () {
                            // calculatePath(userX, userY, x, y);
                        },
                        dblclick: function () {
                            // moveTo(x, y);
                        }
                    }, x && x !== 11 && String.fromCharCode(65 + y) + (x + 1)),
                    substrateCel = createElement('div', substrateClasses);
                celDiv.setAttribute('title', cel.name);
                rowDiv.appendChild(celDiv);
                substrateRow.appendChild(substrateCel);
            });

            substrate.appendChild(substrateRow);
            divContainer.appendChild(rowDiv);
        });

        container.appendChild(substrate);
        container.appendChild(divContainer);
    }

    drawMap(document.body);

    function findBestWay(from, to) {
        from = linkedMap[from];
        to = linkedMap[to];
        var ways = [];


    }

    function Player(user, position) {
        this.user = user;
        this.position = position;
        this.el = document.createElement('span');
        this.el.setAttribute('title', user.login);
        this.el.innerText = '♝';
        this.el.style.color = 'blue';
        this.el.classList.add('user', this.getClass());
        this.redraw();
    }

    Player.prototype.getClass = function () {
        return '.user-' + this.user.id;
    };

    Player.prototype.redraw = function () {
        var userClass = this.getClass(),
            cel = document.querySelector('.cel-' + this.position.x + '-' + this.position.y);

        [].slice.apply([], document.querySelectorAll(userClass)).forEach(function (element) {
            element.remove();
        });

        if (cel) {
            cel.appendChild(this.el.cloneNode(true));
        }
    };
    window.p1 = new Player({id: 123, login: 'Crimea'}, {x: 9, y: 8});
})();
