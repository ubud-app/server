ARG BASEIMAGE=node:slim
FROM $BASEIMAGE

ARG CLIENT_TAG=latest
ARG NODE_ENV=production
ARG NEXT
ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN
ENV NEXT=$NEXT

ADD "." "/usr/local/lib/node_modules/@ubud/server"

RUN apt-get update && \
    apt-get install -y libexpat-dev python make gcc g++ libc-dev && \
    apt-get clean && \
    adduser --system --disabled-password ubud && \
    chown -R ubud:nogroup /usr/local/lib/node_modules && \
    chown -R ubud:nogroup /usr/local/bin

USER ubud
WORKDIR "/usr/local/lib/node_modules/@ubud-app/server"

RUN cd "/usr/local/lib/node_modules/@ubud-app/server" && \
    npm ci && \
    npm i -g @ubud-app/client-web@$CLIENT_TAG --no-audit && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/database" "/usr/local/bin/ubud-db" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/plugin" "/usr/local/bin/ubud-plugin" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/bin/user" "/usr/local/bin/ubud-user" && \
    ln -s "/usr/local/lib/node_modules/@ubud-app/server/server.js" "/usr/local/bin/ubud-server"

CMD ubud-server