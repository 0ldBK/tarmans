#!/usr/bin/env bash
if [ -e ./.running ]; then
    exit 0
fi
touch ./.running
echo -n "Starting, transaction "
TRANSACTION=$(mongo tarmans --quiet --eval 'db.transaction.findOne({_id: "transaction"}).transaction+=1')
echo ${TRANSACTION}

./import-clans.sh ${TRANSACTION}
./import-clan.sh + ${TRANSACTION}

for klan in $(cat clans.txt | awk '{print $2}'); do
    ./import-clan.sh ${klan} ${TRANSACTION}
done

mongo tarmans --quiet --eval "db.players.remove({_transaction: {\$lt: ${TRANSACTION}}})"
mongo tarmans --quiet --eval "db.transaction.update({_id: \"transaction\"}, {\$set: {\"transaction\": ${TRANSACTION}}})"
rm -f ./.running
