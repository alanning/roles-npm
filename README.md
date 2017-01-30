# roles-npm
A user authorization library, integrates with MongoDB back-end, ported from Meteor accounts.

## Usage

```js
import Roles from 'roles'
import { MongoClient } from 'mongodb'

// MongoDB connection
const db = await MongoClient.connect(MONGO_URL)
// Pass the users and roles collection to the Roles constructor
const roles = new Roles({
    users: db.collection('users')
    roles: db.collection('roles')
})
```

The roles instance has all the methods documented [here](http://alanning.github.io/meteor-roles/classes/Roles.html).

## Build

```sh
npm run build
```
