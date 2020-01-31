#!/usr/bin/env bash

npx sentry-cli releases finalize ${VERSION}
curl -X "POST" "https://beacon.ubud.club/webhooks/update-components/${NOTIFY_WEBHOOK_SECRET}"
curl -X "POST" "https://hooks.microbadger.com/images/ubud/server/${MICROBADGER_WEBHOOK_SECRET}"
