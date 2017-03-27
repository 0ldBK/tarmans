'use strict';

(function () {
    document.domain = 'oldbk.com';
    var name = window.frameElement ? window.frameElement.name : window.name;
    var url = window.location.host + window.location.pathname;
    top.$injector.get('$rootScope').$emit('frame::start::' + url, window, document);
    if (name) {
        top.$injector.get('$rootScope').$emit('frame::start::' + name, url, window, document);
    }
})();
