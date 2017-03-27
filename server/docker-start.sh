#!/bin/sh

if [ ! -f /.installed ]; then
    apk update
    apk add nodejs
    touch /.installed
    npm install
fi

if [ -f .reinstall ]; then
    rm -rf ./reinstall ./node_modules ~/.npm ~/.node-gyp
    npm install
fi

node .
