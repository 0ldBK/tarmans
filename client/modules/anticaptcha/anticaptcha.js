'use strict';
window.$injector.invoke([
    'helpers', 'config', 'cache', '$rootScope', 'server',
    function (helpers, config, cache, $rootScope, server) {
        function getBase64Image(img) {
            // Create an empty canvas element
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            // Copy the image contents to the canvas
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Get the data-URL formatted image
            // Firefox supports PNG and JPEG. You could check img.src to
            // guess the original format, but be aware the using "image/jpg"
            // will re-encode the image.
            var dataURL = canvas.toDataURL('image/png');

            return dataURL.replace(/^data:image\/(png|jpg);base64,/, '');
        }

        function checksum(s) {
            var i;
            var chk = 0x12345678;

            for (i = 0; i < s.length; i++) {
                chk += (s.charCodeAt(i) * (i + 1));
            }

            return chk;
        }

        $rootScope.$on('anti-captcha', function antiCaptcha(event, imageUrl, callback) {
            if (!config.get('antiCaptchaOptions.key')) {
                return;
            }
            var image = document.createElement('img'),
                imageBody, imageSum;

            function poller(id) {
                var opts = {
                    url: 'http://anti-captcha.com/res.php', type: 'text',
                    query: {key: config.get('antiCaptchaOptions.key'), action: 'get', id: id}
                };
                helpers.request(opts, function (error, data) {
                    if (data === 'CAPCHA_NOT_READY') {
                        return setTimeout(function () {
                            poller(id);
                        }, 1000);
                    } else if (data.substr(0, 2) === 'OK') {
                        data = data.substr(3);
                        server.putAntiCaptchaCode({hash: imageSum, code: data, base64: imageBody});
                        callback(null, data);
                    } else {
                        callback(new Error(data));
                    }
                });
            }

            image.addEventListener('load', function () {
                imageBody = encodeURIComponent(getBase64Image(image));
                imageSum = checksum(imageBody);
                var opts = {
                    url: 'http://anti-captcha.com/in.php', method: 'POST', type: 'text',
                    data: 'method=base64&key=' + config.get('antiCaptchaOptions.key') + '&body=' + imageBody
                };

                server.getAntiCaptchaCode(imageSum, function (code) {
                    if (code) {
                        return callback(null, code);
                    }

                    helpers.request(opts, function (error, data) {
                        if (error) {
                            return callback(error);
                        }
                        if (data.substr(0, 2) == 'OK') {
                            return poller(data.split('|')[1]);
                        }
                        callback(new Error(data));
                    });
                });
            });

            image.setAttribute('src', imageUrl);
        });
    }
]);
