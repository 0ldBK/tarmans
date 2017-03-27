(function init() {
    document.domain = 'oldbk.com';
    function getText(message) {
        return new DOMParser().parseFromString('<div>' + message + '</div>', 'text/html').body.innerText;
    }

    function parseChat(script) {
        if (!script) {
            return;
        }
        return (Function('var out=[],document={},noop=function(){},top={' +
            'slid:noop,srld:noop,soundD:noop,main:noop,frames:{main:{}},' +
            'p:function(){out.push([].slice.call(arguments))}};' + script + ';return out;'))();
    }

    var messages = parseChat(document.head && document.head.innerText);
    var getName = function (script) {
        if (!script) {
            return;
        }
        if (script.match(/javascript/i)) {
            script = script.substr(11);
        }
        var returnName = function (name) {
                return name;
            },
            top = {
                AddTo: returnName,
                AddToPrivate: returnName
            };
        return Function('top', 'return ' + script)(top);
    };

    messages.forEach(function (message) {
        var channel = message[1];

        var tmp = new DOMParser().parseFromString('<div>' + message[0] + '</div>', 'text/html');
        var from = tmp.querySelector('div > a'),
            to = tmp.querySelectorAll('a[class^="private"]'),
            last = tmp.querySelector('a[class^="private"]:last-of-type'),
            text = '';

        if (from) {
            from = getName(from.getAttribute('href') || from.getAttribute('onclick'));
        }
        if (to.length) {
            to = [].slice.apply(to).map(function (a) {
                var span = a.querySelector('span[oncontextmenu]');
                if (span) {
                    return span.innerText;
                }
            }).filter(function (name) {
                return !!name;
            });
        }
        if (last) {
            do {
                last = last.nextSibling;
                if (last.nodeName === '#text') {
                    text += last.data;
                    text += ' ';
                }
            } while (last.nextSibling);
        } else {
            text = getText(message[0]);
        }

        if (!top.$injector) {
            return;
        }

        top.$injector.get('chat::actions').wrapMessage({
            channel: channel,
            from: from,
            to: to,
            text: text
        });
    });
})();
