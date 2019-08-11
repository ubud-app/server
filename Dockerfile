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
    npm install -g --unsafe-perm npm && \
    addgroup -g $GID ubud && \
    adduser -u $UID -G ubud -s /bin/sh -D ubud

ADD "." "/@ubud-app/server"

RUN cd "/@ubud-app/server" && \
    npm ci && \
    cd ../ && \
    npm i "@ubud-app/client@$CLIENT_TAG" --no-save --no-audit --production && \
    ln -s "/@ubud-app/server/bin/database" "/usr/local/bin/ubud-db" && \
    ln -s "/@ubud-app/server/bin/plugin" "/usr/local/bin/ubud-plugin" && \
    ln -s "/@ubud-app/server/bin/user" "/usr/local/bin/ubud-user" && \
    ln -s "/@ubud-app/server/server.js" "/usr/local/bin/ubud-server" && \
    chown -R ubud:ubud /@ubud-app/server/node_modules

USER ubud
WORKDIR "/@ubud-app/server"
CMD ubud-server
