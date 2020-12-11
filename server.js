#!/usr/bin/env node
'use strict';

require("dotenv").config();
const Server = require('./helpers/server');
Server.initialize();

process.title = 'ubud-server';