#!/bin/bash


root=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}"   )" &> /dev/null && pwd );

abort() {
  echo [!] $@ 1>&2
  exit 1
}

flushAll() {
  echo [*] flushing database
  docker-compose stop
  docker-compose rm setup_rabbitmq
}

. .env

flush=0
while :; do
  case $1 in
    --flush | -f) flush=1;;
    -*) abort "unknown options";;
    *) test -z "$1" && break || abort "unknown options";;
  esac
  shift
done

if [ $flush -eq 1 ]; then
  flushAll
else
  docker-compose up -d 
  sleep 2
fi
