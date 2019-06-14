#!/usr/bin/env bash
DIR="$( cd "$(dirname "$0")" ; pwd -P )"

cd "${DIR}/../"

npm start --silent -- $@
