'use strict';

const net = require('net'),
    xml2js = require('xml2js'),
    iconv = require('iconv-lite');

function translateResponseBody(result, encoding) {
    let contentType = result.headers['content-type'];
    if (!contentType) {
        return result;
    }
    let charsetIndex = contentType.indexOf('charset=');

    if (charsetIndex > -1) {
        encoding = contentType.substr(charsetIndex + 8);
        let semicolonIndex = encoding.indexOf(';');
        if (semicolonIndex > 0) {
            encoding = encoding.substr(0, semicolonIndex);
        }
    }

    if (encoding) {
        try {
            result.body = iconv.decode(result.body, encoding);
        } catch (error) {
            console.error('cannot convert from encoding "' + encoding + '": ', error);
        }
    }
}

function parseResponse(response, requestOptions) {
    let result = {headers: {}, body: new Buffer(0), request: requestOptions},
        isHeaders = true,
        buffer = null,
        byte,
        prevByte = 0,
        index = 0,
        prevIndex = 0,
        chunked = false;

    do {
        byte = response[index];
        buffer = null;
        if (isHeaders && prevByte === 13 && byte === 10) { // line end
            buffer = response.slice(prevIndex, index - 1);
            isHeaders = !!buffer.length;
            prevIndex = index + 1;
        }

        if (Buffer.isBuffer(buffer)) {
            if (!isHeaders) {
                let body = response.slice(index + 1);
                if (!chunked) {
                    result.body = body;
                } else {
                    for (let i = 0; i < body.length; i += 1) {
                        if (i && body[i - 1] === 13 && body[i] === 10 && i + 1 !== body.length) {
                            let chunkLength = parseInt(body.slice(0, i - 1), 16);
                            if (isNaN(chunkLength)) {
                                throw new Error('Failed to parse chunks');
                            }
                            result.body = Buffer.concat([result.body, body.slice(i + 1, i + 1 + chunkLength)]);
                            body = body.slice(i + 1 + chunkLength);
                            i = 2;
                        }
                    }
                }
                translateResponseBody(result, requestOptions.encoding);
                break;
            }

            let line = buffer.toString();
            if (line.indexOf('HTTP/') > -1) {
                let head = /HTTP\/([^ ]+) (\d+) (.*)/.exec(line);
                if (head) {
                    result.httpVersion = head[1];
                    result.statusCode = parseInt(head[2], 10);
                    result.statusMessage = head[3];
                }
            }

            let colonIndex = line.indexOf(':');

            if (colonIndex > -1) {
                let header = line.slice(0, colonIndex).toLowerCase(),
                    value = result.headers[header] = line.slice(colonIndex + 2);

                if (header === 'transfer-encoding' && 'chunked' === value.toLowerCase()) {
                    chunked = true;
                }
            }
        }

        prevByte = byte;
    } while (++index < response.length);

    return result;
}

function request(options) {
    let raw = [],
        host = options.address || options.host,
        port = options.port || 80,
        method = options.method || 'get',
        path = options.path || '/',
        httpVersion = 'HTTP/1.1',
        headers = options.headers = options.headers || {};

    raw.push([method.toUpperCase(), path, httpVersion].join(' '));
// > Host: capitalcity.oldbk.com
// > User-Agent: curl/7.47.0
// > Accept: */*
// > Cookie: PHPSESSID=vonhbgkshd6q51sm2hrfknrcj3
//

		headers.Host = options.host;
    headers['User-Agent'] = 'curl/7.47.0';
    headers.Accept = '*/*';
    headers.Connection = 'close';

    Object.keys(options.headers).forEach(function (header) {
        raw.push([header, options.headers[header]].join(': '));
    });

    return new Promise(function (resolve) {
        let data = new Buffer(0),
            client = net.connect({port: port, host: host}, function () {
                client.write(raw.join('\r\n'));
                client.write('\r\n');
                client.write('\r\n');
            });

        client.on('data', function (chunk) {
            data = Buffer.concat([data, chunk]);
        });
        client.on('end', function () {
            resolve(parseResponse(data, options));
        });

        client.on('error', function (error) {
            resolve({error: error});
        });
    });
}

function* userInfo(uuid) {
    let opts = {
        		address: '2400:cb00:2048:1::6814:ecc',
						host: 'capitalcity.oldbk.com',
            path: `/inf.php?${uuid}&short=1`,
            headers: {
                'Content-Type': 'plain/text'
            },
            method: 'GET'
        };
console.log(`Get user:${uuid} info`);
    let result = yield request(opts),
        body = result.body && result.body.toString(),
        info = {};
console.log(`Request complete for user:${uuid}`);
    if (result.error || !body || body.indexOf('AntiDDOS') === 0 || body.toLowerCase().indexOf('<script type=') !== -1) {
console.log(`Request error for user:${uuid}`, result.error, !body || body.indexOf('AntiDDOS') === 0);
				yield new Promise(function (resolve) {
            setTimeout(resolve, 100);
        });

        return yield userInfo(uuid);
    }
console.log(`Parsing user:${uuid} info`);
    body.split('\n').forEach(function (row) {
        let equalIndex = row.indexOf('=');
        if (equalIndex === -1) {
            return;
        }
        let key = row.substr(0, equalIndex),
            value = row.substr(equalIndex + 1).trim();

        info[key] = +value;
        if (isNaN(info[key])) {
            info[key] = value;
        }
    });

console.log(`Parse complete for user:${uuid}`);
		return Promise.resolve(info);
}

function timeout(timeout) {
    return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
    });
}

function *parseXML(xml) {
    return new Promise(function (resolve, reject) {
        try {
            xml2js.parseString(xml, function (error, result) {
                if (error) {
                    return reject(error);
                } else {
                    resolve(result);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports.request = request;
module.exports.userInfo = userInfo;
module.exports.timeout = timeout;
module.exports.parseXML = parseXML;
