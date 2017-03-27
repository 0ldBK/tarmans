angular.module('TarmansOBKPlugin').factory('Queue', [function () {
    function Queue(maxThreads, name) {
        if (!(this instanceof Queue)) {
            return new Queue(maxThreads, name);
        }

        this.name = name || Math.random().toString(32).substr(2);
        this.running = 0;
        this.drained = false;
        this.maxThreads = maxThreads || 5;
        this.pool = [];
        this.drain = angular.noop;
        this.emitter = new (chrome.Event);

        var self = this;

        this.on('start', function (iterator) {
            if (self.running >= self.maxThreads) {
                self.pool.push(iterator);
                return;
            }
            iterator = iterator || self.pool.shift();
            if (typeof iterator !== 'function' && !self.pool.length) {
                if (!self.running && !self.drained) {
                    self.drained = true;
                    self.emit('drain');
                }
                return;
            }

            self.running += 1;
            setImmediate(function () {
                try {
                    iterator(function () {
                        self.running -= 1;
                        self.emit('start');
                    });
                } catch (error) {
                    console.error(error, 'Queue[' + self.name + ']: Iterator Error');
                    self.pool.splice(0);
                    self.emit('drain');
                }
            }, 0);
        });
        this.on('drain', function () {
            if (typeof self.drain === 'function') {
                self.drain();
            }
        });
    }

    Queue.prototype.push = function (fn) {
        this.emit('start', fn);
    };

    Queue.prototype.on = function (name, fn) {
        this.emitter.addListener(function (eventName) {
            if (eventName === name) {
                var args = [].slice.call(arguments, 1);
                fn.apply(this, args);
            }
        });
    };

    Queue.prototype.emit = function () {
        this.emitter.dispatch.apply(this.emitter, arguments);
    };

    function async(workers, callback) {
        var queue = new Queue(Infinity);
        queue.drain = callback;
        workers.forEach(queue.push);
        return queue;
    }

    function forEach(array, iterator, callback) {
        var queue = new Queue(1), next,
            index = 0;
        queue.drain = callback;

        next = function () {
            if (index === array.length) {
                return;
            }
            var item = array[index++];
            queue.push(function (callback) {
                iterator(item, function (error) {
                    if (error) {
                        return queue.drain(error);
                    }
                    next();
                    callback();
                });
            });
        };

        next();
        return queue;
    }

    function forEachAsync(array, iterator, callback) {
        var queue = new Queue(Infinity);
        queue.drain = callback;
        array.forEach(function (item) {
            queue.push(function (callback) {
                iterator(item, callback);
            });
        });
        return queue;
    }

    Queue.async = async;
    Queue.forEach = forEach;
    Queue.forEachAsync = forEachAsync;

    return Queue;
}]);
