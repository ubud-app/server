'use strict';

const fs = require('fs');
const version = process.env.MODULEVERSION;

if(!version) {
    throw new Error('Environment variable `MODULEVERSION` not set!');
}

['./package.json', './package-lock.json'].forEach(file => {
    const json = require(file);
    json.version = version;
    fs.writeFileSync(file, JSON.stringify(json, null, '  '));
});

console.log('✔ Version is now %s', version);