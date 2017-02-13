# roles-npm
A user authorization library, integrates with MongoDB back-end, ported from Meteor accounts.

Based on the [Meteor roles package Version 1.2.15](https://github.com/alanning/meteor-roles/tree/4c64ea0b24fec774279cb472b2d4205ec8048ef8).

## Usage

```js
import Roles from '@alanning/roles'
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

## Testing

Start your local MongoDB server:

```sh
mongod
```

Then:

```sh
npm test
```

A `roles-npm` database will be used during testing.  Feel free to delete that database after the tests are run.
