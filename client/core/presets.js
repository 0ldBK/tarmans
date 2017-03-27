'use strict';
(function () {
    window.addEventListener('load', function () {
        var frameset = document.querySelectorAll('frameset')[1];

        frameset.setAttribute('border', '2');
        frameset.setAttribute('rows', '75%, *, 0');
    });

    var script = document.createElement('script');
    script.innerText = 'document.addEventListener(\'plugin-message\',function (event){new Function(event.detail)();});';
    document.documentElement.appendChild(script);
    script.remove();
})();
