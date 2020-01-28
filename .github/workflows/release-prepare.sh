#!/usr/bin/env bash

npm install -g @sentry/cli
sentry-cli releases new -p client "${VERSION}"

docker pull multiarch/qemu-user-static:register
docker pull multiarch/alpine:x86_64-latest-stable

docker run --rm --privileged multiarch/qemu-user-static:register --reset
