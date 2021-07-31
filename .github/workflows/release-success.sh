#!/usr/bin/env bash

npx sentry-cli releases set-commits "${VERSION}" --auto
npx sentry-cli releases finalize "${VERSION}"

curl -X "POST" "https://beacon.ubud.club/webhooks/update-components/${NOTIFY_WEBHOOK_SECRET}"
