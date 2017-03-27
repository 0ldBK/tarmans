(function () {
    function Scheduler(name) {
        if (!(this instanceof Scheduler)) {
            return new Scheduler(name);
        }
        if (this.schedulers[name]) {
            return this.schedulers[name];
        }
        this.name = name;
        this.schedulers[name] = this;
        this.tasks = {};
    }

    Scheduler.prototype.schedulers = {};

    Scheduler.prototype.create = function (name, options, func) {
        var self = this,
            task = this.tasks[name];

        if (task) {
            console.warn('Task "' + name + '" already exist');
            return;
        }

        task = this.tasks[name];
        if (!task) {
            task = this.tasks[name] = {
                name: name,
                _progress: false,
                get progress() {
                    return this._progress;
                },
                set progress(value) {
                    //console.log('Task [' + name + '] State changed to "' + value + '"');
                    this._progress = value;
                },
                next: angular.noop,
                options: options,
                func: func
            };
        }

        function finTask(task, nextTimeout) {
            clearTimeout(task.timeout);
            task.progress = false;
            task.next(nextTimeout);
        }

        function fire() {
            if (task.disabled) {
                return;
            }
            if (task.progress) {
                console.warn('Task "' + name + '" already in progress!');
                return;
            }

            task.progress = true;

            if (typeof func === 'function') {
                setImmediate(function () {
                    func(function (nextTimeout) {
                        finTask(task, nextTimeout);
                    }, task);
                });
            }

            if (task.options.async) {
                clearTimeout(task.timeout);

                task.timeout = setTimeout(function () {
                    console.warn('Task Error: async callback for task "' + name + '" timed out');
                    task.progress = false;
                    task.next();
                }, options.timeout || 30000);
            } else {
                task.progress = false;
            }
        }

        task.timer = setTimeout(function () {
            if (!options.updateInterval) {
                fire();
                self.clear(name);
                return;
            }
            if (options.async) {
                task.next = function (nextTimeout) {
                    if (task.progress) {
                        return;
                    }

                    if (!self.tasks[name]) {
                        return self.clear(name);
                    }
                    if (typeof nextTimeout !== 'number') {
                        nextTimeout = null;
                    }
                    task.timer = setTimeout(fire, nextTimeout || options.updateInterval);
                };

                return fire();
            }

            task.timer = setInterval(function () {
                if (!self.tasks[name]) {
                    return self.clear(name);
                }
                fire();
            }, options.updateInterval);

            fire();
        }, options.when - new Date().getTime());

        return this;
    };

    Scheduler.prototype.get = function (name) {
        return this.tasks[name];
    };

    Scheduler.prototype.getAll = function () {
        return Object.keys(this.tasks);
    };

    Scheduler.prototype.clear = function (name) {
        var task = this.tasks[name];
        if (!task) {
            console.warn('Task "' + name + '" not found');
            return;
        }
        clearInterval(task.timer);
        clearInterval(task.timeout);
        delete this.tasks[name];
        return this;
    };

    Scheduler.prototype.clearAll = function () {
        var self = this;
        Object.getOwnPropertyNames(this.tasks).forEach(function (name) {
            self.clear(name);
        });
        return this;
    };

    Scheduler.prototype.disabled = {};
    Scheduler.prototype.disable = function (name) {
        var task = this.tasks[name];
        if (!task) {
            return;
        }

        task.disabled = true;
        this.disabled[name] = [task.name, task.options, task.func];
        this.clear(name);
    };

    Scheduler.prototype.enable = function (name) {
        var task = this.tasks[name],
            disabled = this.disabled[name];

        if (task) {
            return;
        }
        if (!disabled) {
            console.warn('Disabled task "' + name + '" not found.');
            return;
        }

        delete this.disabled[name];
        this.create.apply(this, disabled);
    };

    Scheduler.prototype.disableAll = function () {
        var self = this;
        Object.keys(this.tasks).forEach(function (name) {
            self.disable(name);
        });
    };

    Scheduler.prototype.enableAll = function () {
        var self = this;
        Object.keys(this.disabled).forEach(function (name) {
            self.enable(name);
        });
    };

    angular.module('TarmansOBKPlugin').factory('Scheduler', [function () {
        return Scheduler('plugin');
    }]);
})();
