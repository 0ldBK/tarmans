'use strict';
window.$injector.invoke([
    'helpers', 'config', '$rootScope', 'actions',
    function (helpers, config, $rootScope, actions) {
        $rootScope.$on('frame::end::online', function (event, url, win, doc) {
            var invalids = doc.querySelectorAll('img[alt="Инвалидность"]');
            if (!invalids) {
                return;
            }
            angular.toArray(invalids).forEach(function (image) {
                var login = image.previousElementSibling.previousElementSibling.innerText;
                image.addEventListener('click', function () {
                    actions.cure({user: {login: login}});
                });
                image.style.cursor = 'pointer';
            });
        });

        function updateChat(event, url, win, doc) {
            function addMenu () {
                var OpenMenuTmp = window.OpenMenu;
                window.OpenMenu = function (event) {
                    OpenMenuTmp.apply(this, arguments);
                    var menu = document.getElementById('oMenu');
                    var a = document.createElement('a');
                    a.setAttribute('href', 'javascript:void(0)');
                    a.setAttribute('class', 'menuItem');
                    a.setAttribute('onclick', 'document.dispatchEvent(new CustomEvent("cure",{detail:"' +
                        event.target.innerText + '"}));');
                    a.innerHTML = 'Лечить';
                    menu.appendChild(a);
                    return false;
                };
            }
            var script = document.createElement('script');
            script.text = '(' + addMenu + ')();';
            doc.addEventListener('cure', function (event) {
                var login = event.detail;
                if (login) {
                    actions.cure({user: {login: login}}, angular.noop);
                }
            });
            doc.body.appendChild(script);
        }

        $rootScope.$on('frame::end::chat', updateChat);

        try {
            var win = document.querySelector('frame[name="chat"]').contentWindow,
                doc = document.querySelector('frame[name="chat"]').contentDocument;
            updateChat(null, null, win, doc);
        } catch (e) {
            // ignore
        }

        if (!config.get('stopWords["actions::cure"]')) {
            config.put('stopWords["actions::cure"]', {
                enabled: false,
                channels: [2, 3],
                words: ['лечи', 'подлечи', 'вылечи', 'лекани', 'легк', 'средн', 'тяж'],
                convert: '{"user": {"login": this.from}, "scroll": "cure"}'
            });
        }
    }
]);
