angular.module('TarmansOBKPlugin').factory('Scroll', [
    'helpers', 'cache',
    function (helpers, cache) {
        function checkIfErrorMessage(message) {
            return ['Не в бою', 'Не так быстро', 'Персонаж здоров', 'У вас не хватает требований',
                'необходима лицензия', 'Тут это не работает', 'Персонаж не в игре', 'Персонаж в другой комнате',
                'Вы использовали Ключ "Лабиринта']
                .some(function (text) {
                    return message.toLowerCase().indexOf(text.toLowerCase()) !== -1;
                });
        }

        function Scroll(name, places) {
            if (!(this instanceof Scroll)) {
                return new Scroll(name, places);
            }

            this.place = null;
            this.list = null;
            this.name = name;
            this.places = places || ['inventory'];
        }

        Scroll.prototype.find = function (condition) {
            if (!condition && this.list) {
                return this;
            }
            var self = this,
                name = this.name,
                names = cache.get('aliases')[name],
                defaultPlaces = helpers.getDefaultPlaces(),
                places = [];

            if (!names) {
                names = [name];
            }

            this.places.forEach(function (name) {
                var place = defaultPlaces[name];
                if (!place) {
                    console.warn('Place "' + name + '" not found');
                    return;
                }

                places.push(place);
            });

            if (places.length === 0) {
                places.push(defaultPlaces.inventory);
            }

            this.list = [];
            places.some(function (place) {
                return names.some(function (name) {
                    var list = place.list[name] || [];
                    if (condition) {
                        list = list.filter(condition);
                    }
                    if (list.length > 0 && list[0]) {
                        self.list = list;
                        self.place = place;
                        return true;
                    }
                });
            });

            return this;
        };

        Scroll.prototype.complete = function (scroll) {
            var index = this.list.indexOf(scroll);
            if (index !== -1) {
                if (scroll.durability > 0) {
                    scroll.durability -= 1;
                    this.durability = scroll.durability;
                }
                if (!scroll.builtin) {
                    this.list.splice(index, 1);
                }
            }
            return this;
        };

        Scroll.prototype.use = function (user, callback) {
            var self = this,
                battle = cache.get('battle');

            this.find();
            function notFound() {
                return callback(new Error('Магия "' + self.name + '" не найдена!'));
            }

            if (!this.list.length) {
                return notFound();
            }
            this.list.sort(function (a, b) {
                return a.durability - b.durability;
            });

            var scroll = this.list[0];
            if (!scroll) {
                return notFound();
            }

            angular.extend(this, scroll);

            var xhr = helpers.request(this.place.data(scroll, user), function (error, dom) {
                if (error) {
                    return callback(error);
                }
                if (xhr.requestURL !== xhr.responseURL) {
                    return helpers.reloadMain(xhr.responseURL);
                }
                var message = helpers.getErrorMessage(dom),
                    success = false;
                if (message && checkIfErrorMessage(message) && cache.get('battle') !== battle) {
                    self.complete(scroll);
                    success = true;
                } else {
                    error = new Error(message);
                }
                helpers.message(message);
                callback(error, {
                    message: message,
                    success: success
                });
            });
        };

        return Scroll;
    }
]);
