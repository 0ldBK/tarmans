'use strict';

(function () {
    document.domain = 'oldbk.com';
    var name = window.frameElement ? window.frameElement.name : window.name;
    var url = window.location.host + window.location.pathname;
    top.$injector.get('$rootScope').$emit('frame::end::' + url, window, document);
    if (name) {
        top.$injector.get('$rootScope').$emit('frame::end::' + name, url, window, document);
    }
})();
