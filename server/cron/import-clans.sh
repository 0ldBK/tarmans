#!/usr/bin/env bash

TRANSACTION=$1

curl -Ss 'http://oldbk.com/encicl/klani/clans.php' | \
    iconv -c -f cp1251 -t utf8 | \
    grep 'border: none;color: #a09c81;background-color: #a09c81;height: 2px' | \
    sed 's%</a>%\n%g' | \
    sed "s%.*align_\([0-9]\+\).*/klan/\([a-zA-Z]\+\).*%\1 \2%g" | \
    grep -v \d | tee clans.txt |
    sed "s%\([^\ ]\)\ \(.*\)%{\"_transaction\":${TRANSACTION},\"align\":\1,\"_id\":\"\2\"}%g" | \
    mongoimport --upsert -d tarmans -c clans
