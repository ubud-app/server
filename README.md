<div align="center">
    <img src="https://d.sebbo.net/logo-Y9mgixZOSPhuRV2q1zXPU1gBuYboyGuPf12VWN3zo4ixz5v51vxyyYGVt0MFnqkXjak0igKbyqkpxGf8IGKj9wKKtrpVwZg4cRXV.svg" width="180" /><br />
    <br /><br /><br />
</div>

[![Status](https://git-badges.sebbo.net/67/develop/build)](https://github.com/ubud-app/server)
![npm version](https://img.shields.io/npm/v/@ubud-app/server?color=blue&label=version&style=flat-square)

## 🚨 Warning

This software is still in a very early stage (early preview). Errors can occur at any time. Therefore ubud should currently not be used productively, but only for testing purposes.


## 🧐 What's this?

This repository contains the software ubud, a small private software for budgeting. ubud works according to the envelope method and can be extended with plugins, so that turnovers of accounts can be imported automatically. So that your data doesn't buzz around in some clouds, ubud is a self-hosted software. Install ubud on a [Raspberry Pi](https://www.raspberrypi.org/) or on any NAS with docker support.


## 🖼 Screenshot

![Screenshot](https://d.sebbo.net/macbookpro13_front-UcPy3pEMhoqNuzqBJwY0nwV4DMPOAFu9h7SGxUSXXATFArbW5UPLQOBnkbw3R7CEsrponXZQ5SrYPs7hViVVKIhzJ2UmckumiVDh.png)


## 🎉 Features

- self-hosted software, no private data in the cloud
- web interface optimized for mobile devices
- Budgeting via envelope method
- Synchronization with banks possible with plugins
- Multi-user capable


## 🐳 Quick Start

The easiest way to test ubud is Docker. If you don't have Docker installed on your system yet, you can do this with [this guide](https://docs.docker.com/install/).

You need a database where all the data is stored. Currently MySQL and MariaDB are supported. Docker images are currently available for ARM and AMD64. 

```
# Download docker-compose.yml
wget https://raw.githubusercontent.com/ubud-app/server/develop/docker-compose.yml

# Edit environment variables
nano docker-compose.yml

# Start ubud
docker-compose up -d

# Get initial login credentials
docker logs -f $(docker-compose ps -q ubud) | docker-compose exec -T ubud \
    ./node_modules/bunyan/bin/bunyan -o short --color -l info
```


## 🔧 Configuration
| Environment Variable | Default Value | Description |
|:------- |:------------------- |:------------------ |
|DATABASE|mysql://localhost/ubud|Database Connection URI|
|SENTRY_DSN|-|Sentry DSN, overwrite to use a custom Sentry Instance|
|PORT|8080|Port to listen on|
|DEVELOP|0|Run in develop mode|


## 💬 Feedback & Help

For the early preview there are no issues possible, because I want to get the software to work well with it. However, questions and feedback can still be passed on. Either via Twitter [@ubudapp](https://twitter.com/ubudapp) or in our [Slack-Channel](https://join.slack.com/t/ubud-app/shared_invite/enQtNzAzNTU0MjM2MzUzLTY5MGRiZDE5ZDAyMDc3NDZkNGZlOGQxMTc2ZjA1NzEwZDk5ODc5YTc4MTg5N2VlYzY0ODViODZkNmQ0YTQ0MDk).


## 🛠 Build a Plugin

Plugins can be installed via the ubud user interface. These are written in node.js. There are three types of plugins, whereby one plugin can implement several types:

- Account Plugin: Allows you to synchronize one or more accounts with ubud. Example: Plugin for a bank
- Metadata Plugin: Enables metadata to be automatically added to a transaction. Example: Plugin that automatically splits the transaction between the different products for online shop orders.
- Goal Plugin: Allows you to automatically add saving targets to a document. Example: Synchronize wish lists of an online shop

The development of a plugin is currently still a bit hairy, since there is still no documentation and no tools to help. If you still don't want to wait, please feel free to contact us via Slack or Twitter.


## ⏱ Roadmap

During the Early Preview you can find a very rough roadmap on [GitHub](https://github.com/orgs/ubud-app/projects/1).


## 👩‍⚖️ Legal Stuff

- [General terms and conditions](https://github.com/ubud-app/server/blob/develop/Terms.md)
- [Privacy Statement](https://github.com/ubud-app/server/blob/develop/Privacy.md)
