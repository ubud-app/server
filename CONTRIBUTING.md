
# install client & server
```
npm run install
// If running linux:
npm run check:eslint --fix
npm run check
// for client/src/scripts/ do a manually conversion to  (notepad++ edit>EOL conversion)
```

# build client

```
cd client
npm run build
```

# create environment variables
see .env.example

# run Migrations
```
node ./bin/database up 
```

# add user
```
node ./bin/user add email@example.com
```

# start server
```
node ./server
```

# start client
```
npm run develop
```

# (optional) add plugins
Retreive document id from url the id after the #
```
node ./bin/plugin install document-id @ubud-app/plugin-bunq
```

# login
Go to the url, probably localhost:3000/en-US/
Login with your newly created user and password