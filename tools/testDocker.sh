#!/usr/bin/env bash

docker build -t husky-test .
docker run -it --rm -p 3000:3000 --env-file .env husky-test
docker rmi husky-test
