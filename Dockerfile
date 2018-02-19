FROM node
ARG CLIENT_TAG=latest
ARG NODE_ENV=production

ADD "." "/usr/local/lib/node_modules/@dwimm/server"

RUN apt-get clean && \
    adduser --system --disabled-password dwimm && \
    chown -R dwimm:nogroup /usr/local/lib/node_modules && \
    chown -R dwimm:nogroup /usr/local/bin

USER dwimm
WORKDIR "/usr/local/lib/node_modules/@dwimm/server"

RUN cd "/usr/local/lib/node_modules/@dwimm/server" && \
    npm install && \
    npm install -g @dwimm/client-web@$CLIENT_TAG && \
    ln -s "/usr/local/lib/node_modules/@dwimm/server/bin/database" "/usr/local/bin/dwimm-db" && \
    ln -s "/usr/local/lib/node_modules/@dwimm/server/bin/plugin" "/usr/local/bin/dwimm-plugin" && \
    ln -s "/usr/local/lib/node_modules/@dwimm/server/server.js" "/usr/local/bin/dwimm-server"

CMD dwimm-server