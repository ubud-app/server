FROM node
ARG CLIENT_TAG=latest

ADD "." "/usr/local/lib/node_modules/@dwimm/server"

RUN apt-get clean && \
    adduser --system --disabled-password dwimm && \
    chown -R dwimm:nogroup /usr/local/lib/node_modules && \
    chown -R dwimm:nogroup /usr/local/bin

USER dwimm
WORKDIR "/usr/local/lib/node_modules/@dwimm/server"

RUN cd "/usr/local/lib/node_modules/@dwimm/server" && \
    npm install && \
    npm install -g @dwimm/client-web@$CLIENT_TAG

CMD dwimm-server