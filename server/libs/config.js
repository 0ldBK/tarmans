'use strict';

const fs = require('fs'),
    path = require('path');

function loadConfig(directory) {
    directory = directory || process.cwd();

    let args = process.args || [],
        env = process.env.NODE_ENV;

    if (!env) {
        args.some((argv) => {
            if (argv.startsWith('-env=')) {
                env = argv.substr(5);
                return true;
            }
        });
    }

    if (!env) {
        env = 'dev';
    }

    function getConfig(jsonFile) {
        let config = path.resolve(directory, jsonFile);
        if (fs.existsSync(config)) {
            return require(config);
        }
        return {};
    }

    return Object.assign({}, getConfig('./config/config.json'), getConfig(`./config/config.${env}.json`));
}

module.exports = loadConfig();
