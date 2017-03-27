#!/usr/bin/env bash
CLAN=$1
TRANSACTION=$2
echo -n "Importing clan ${CLAN}... "

curl -Ss http://oldbk.com/api/clans_xml.php\?clan=${CLAN} | \
    iconv -c -f cp1251 -t utf8 | \
    xml-json user | \
    grep -Ev '"lasttime":"[0-9]+ мес' | \
    sed 's%"\([0-9]\+\)"%\1%g' | \
    sed "s%\"id\"%\"_transaction\":${TRANSACTION},\"clan\":\"${CLAN}\",\"_id\"%g" | \
    sed 's%"login":\([0-9]\+\),%"login":"\1",%g' | \
    mongoimport --quiet --upsert -d tarmans -c players
echo "complete"
