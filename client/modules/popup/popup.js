'use strict';

chrome.tabs.getSelected(function (tab) {
    chrome.tabs.sendMessage(tab.id, 'status', {frameId: 0}, function (status) {
        var dl = document.getElementsByTagName('dl')[0];
        dl.innerHTML = '';
        if (!status) {
            var dt = document.createElement('dt'),
                dd = document.createElement('dd');

            dt.innerText = 'Статус:';
            dd.innerText = 'Нихера не работает';
            dd.classList.add('error');
            dl.appendChild(dt);
            dl.appendChild(dd);
            return;
        }
        Object.keys(status).forEach(function (key) {
            var result = status[key].status,
                dt = document.createElement('dt'),
                dd = document.createElement('dd');

            dt.innerText = status[key].displayName;
            if (result.ok) {
                dd.innerText = result.ok === true ? 'OK' : result.ok;
            } else {
                dd.innerText = result.error ? result.error.message : 'NOT OK';
                dd.classList.add('error');
            }

            dl.appendChild(dt);
            dl.appendChild(dd);
        });
    });
});
