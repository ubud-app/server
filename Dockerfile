ARG BASEIMAGE=multiarch/alpine:x86_64-latest-stable
FROM $BASEIMAGE

ARG UID=1000
ARG GID=1000
ARG CLIENT_TAG=latest
ARG NODE_ENV=production
ARG NEXT
ARG SENTRY_DSN

ENV SENTRY_DSN=$SENTRY_DSN
ENV NEXT=$NEXT

RUN apk add --no-cache --update \
    nodejs \
    nodejs-npm \
    libstdc++ \
    python \
    make \
    gcc \
    g++ && \
    addgroup -g $GID ubud && \
    adduser -u $UID -G ubud -s /bin/sh -D ubud

ADD "." "/usr/local/lib/node_modules/@ubud-app/server"

USER ubud
WORKDIR "/usr/local/lib/node_modules/@ubud-app/server"

RUN cd "/usr/local/lib/node_modules/@ubud-app/server" && \
    npm ci && \
    npm i -g @ubud-app/client@$CLIENT_TAG --no-audit && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/database" "/usr/local/bin/ubud-db" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/plugin" "/usr/local/bin/ubud-plugin" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/user" "/usr/local/bin/ubud-user" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/server.js" "/usr/local/bin/ubud-server"

CMD ubud-server
