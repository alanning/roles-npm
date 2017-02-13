import { createDb } from 'mongodb-in-memory'
import assert from 'assert'
import { Roles } from '../index'
import { Accounts } from 'accounts'
import _ from 'underscore'
import { MongoClient } from 'mongodb'

require('source-map-support').install()

const test = {
  equal(actual, expected, message) {
    return assert.deepEqual(actual, expected, message)
  },
  isTrue(actual, message) {
    return assert.equal(actual, true, message)
  },
  isFalse(actual, message) {
    return assert.equal(actual, false, message)
  },
  promiseRejected(promise) {
    return promise.then(
      function () {
        throw new Error('Promise did not reject')
      },
      function () {}
    )
  }
}

describe('roles', function () {
  let db, roles, rolesCollection, usersCollection

  var users = {},
    userRoles = ['admin','editor','user']

  beforeEach(async function () {
    // db = createDb() // Use TingoDB
    db = await MongoClient.connect('mongodb://localhost:27017/roles-npm')

    usersCollection = db.collection('users')
    rolesCollection = db.collection('roles')
    rolesCollection.ensureIndex('name', {unique: 1})

    roles = new Roles({
      users: usersCollection,
      roles: rolesCollection,
    })
  })

  async function addUser (name) {
    // TODO: Port
    return await Accounts.createUser({'username': name, db})
  }

  async function reset () {
    await rolesCollection.remove({})
    await usersCollection.remove({})

    users = {
      'eve': await addUser('eve'),
      'bob': await addUser('bob'),
      'joe': await addUser('joe')
    }
  }


  async function testUser(__, username, expectedRoles, group) {
    var userId = users[username],
      userObj = await usersCollection.findOne({_id: userId})

    // check using user ids (makes db calls)
    await _innerTest(test, userId, username, expectedRoles, group)

    // check using passed-in user object
    await _innerTest(test, userObj, username, expectedRoles, group)
  }

  async function _innerTest (__, userParam, username, expectedRoles, group) {
    // test that user has only the roles expected and no others
    for (let role of userRoles) {
      var expected = _.contains(expectedRoles, role),
        msg = username + ' expected to have \'' + role + '\' permission but does not',
        nmsg = username + ' had the following un-expected permission: ' + role

      if (expected) {
        test.isTrue(await roles.userIsInRole(userParam, role, group), msg)
      } else {
        test.isFalse(await roles.userIsInRole(userParam, role, group), nmsg)
      }
    }
  }

  it(
    'can create and delete roles',
    async function () {
      await reset()

      await roles.createRole('test1')
      test.equal((await rolesCollection.findOne()).name, 'test1')

      await roles.createRole('test2')
      test.equal((await rolesCollection.findOne({'name':'test2'})).name, 'test2')

      test.equal(await rolesCollection.find().count(), 2)

      await roles.deleteRole('test1')
      test.equal(await rolesCollection.findOne({'name':'test1'}), null)

      await roles.deleteRole('test2')
      test.equal(await rolesCollection.findOne(), null)
    })

  it(
    'can\'t create duplicate roles',
    async function () {
      await reset()

      await roles.createRole('test1')
      await test.promiseRejected(roles.createRole('test1'))
    })

  it(
    'can\'t create role with empty names',
    async function () {
      await reset()

      await roles.createRole('')
      await roles.createRole(null)

      test.equal(await rolesCollection.find().count(), 0)

      await roles.createRole(' ')
      test.equal(await rolesCollection.find().count(), 0)
    })

  it(
    'can check if user is in role',
    async function () {
      await reset()

      await usersCollection.update(
        {"_id":users.eve},
        {$addToSet: { roles: { $each: ['admin', 'user'] } } }
      )
      await testUser(test, 'eve', ['admin', 'user'])
    })

  it(
    'can check if user is in role by group',
    async function () {
      await reset()

      await usersCollection.update(
        {"_id":users.eve},
        {$addToSet: { 'roles.group1': { $each: ['admin', 'user'] } } })
      await usersCollection.update(
        {"_id":users.eve},
        {$addToSet: { 'roles.group2': { $each: ['editor'] } } })

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'eve', ['editor'], 'group2')
    })

  it(
    'can check if non-existant user is in role',
    async function () {
      await reset()

      test.isFalse(await roles.userIsInRole('1', 'admin'))
    })

  it(
    'can check if null user is in role',
    async function () {
      var user = null
      await reset()

      test.isFalse(await roles.userIsInRole(user, 'admin'))
    })

  it(
    'can check user against several roles at once',
    async function () {
      var user
      await reset()

      await roles.addUsersToRoles(users.eve, ['admin', 'user'])
      user = await usersCollection.findOne({_id:users.eve})

      test.isTrue(await roles.userIsInRole(user, ['editor','admin']))
    })

  it(
    'can\'t add non-existent user to role',
    async function () {
      await reset()

      await roles.addUsersToRoles(['1'], ['admin'])
      test.equal(await usersCollection.findOne({_id:'1'}), undefined)
    })

  it(
    'can add individual users to roles',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.eve, ['admin', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', [])
      await testUser(test, 'joe', [])

      await roles.addUsersToRoles(users.joe, ['editor', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', [])
      await testUser(test, 'joe', ['editor', 'user'])
    })

  it(
    'can add individual users to roles by group',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.eve, ['admin', 'user'], 'group1')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', [], 'group1')
      await testUser(test, 'joe', [], 'group1')

      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', [], 'group2')
      await testUser(test, 'joe', [], 'group2')

      await roles.addUsersToRoles(users.joe, ['editor', 'user'], 'group1')
      await roles.addUsersToRoles(users.bob, ['editor', 'user'], 'group2')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', [], 'group1')
      await testUser(test, 'joe', ['editor', 'user'], 'group1')

      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['editor', 'user'], 'group2')
      await testUser(test, 'joe', [], 'group2')
    })

  it(
    'can add user to roles via user object',
    async function () {
      await reset()

      var eve = await usersCollection.findOne({_id: users.eve}),
        bob = await usersCollection.findOne({_id: users.bob})

      await roles.addUsersToRoles(eve, ['admin', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', [])
      await testUser(test, 'joe', [])

      await roles.addUsersToRoles(bob, ['editor'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', ['editor'])
      await testUser(test, 'joe', [])
    })

  it(
    'can add user to roles multiple times',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.eve, ['admin', 'user'])
      await roles.addUsersToRoles(users.eve, ['admin', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', [])
      await testUser(test, 'joe', [])

      await roles.addUsersToRoles(users.bob, ['admin'])
      await roles.addUsersToRoles(users.bob, ['editor'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', ['admin', 'editor'])
      await testUser(test, 'joe', [])
    })

  it(
    'can add user to roles multiple times by group',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.eve, ['admin', 'user'], 'group1')
      await roles.addUsersToRoles(users.eve, ['admin', 'user'], 'group1')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', [], 'group1')
      await testUser(test, 'joe', [], 'group1')

      await roles.addUsersToRoles(users.bob, ['admin'], 'group1')
      await roles.addUsersToRoles(users.bob, ['editor'], 'group1')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', ['admin', 'editor'], 'group1')
      await testUser(test, 'joe', [], 'group1')
    })

  it(
    'can add multiple users to roles',
    async function () {
      await reset()

      await roles.addUsersToRoles([users.eve, users.bob], ['admin', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', ['admin', 'user'])
      await testUser(test, 'joe', [])

      await roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'])

      await testUser(test, 'eve', ['admin', 'user'])
      await testUser(test, 'bob', ['admin', 'editor', 'user'])
      await testUser(test, 'joe', ['editor', 'user'])
    })

  it(
    'can add multiple users to roles by group',
    async function () {
      await reset()

      await roles.addUsersToRoles([users.eve, users.bob], ['admin', 'user'], 'group1')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', ['admin', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')

      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', [], 'group2')
      await testUser(test, 'joe', [], 'group2')

      await roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'], 'group1')
      await roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'], 'group2')

      await testUser(test, 'eve', ['admin', 'user'], 'group1')
      await testUser(test, 'bob', ['admin', 'editor', 'user'], 'group1')
      await testUser(test, 'joe', ['editor', 'user'], 'group1')

      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['editor', 'user'], 'group2')
      await testUser(test, 'joe', ['editor', 'user'], 'group2')
    })

  it(
    'can remove individual users from roles',
    async function () {
      await reset()

      // remove user role - one user
      await roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['editor', 'user'])
      await roles.removeUsersFromRoles(users.eve, ['user'])
      await testUser(test, 'eve', ['editor'])
      await testUser(test, 'bob', ['editor', 'user'])
    })
  it(
    'can remove user from roles multiple times',
    async function () {
      await reset()

      // remove user role - one user
      await roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['editor', 'user'])
      await roles.removeUsersFromRoles(users.eve, ['user'])
      await testUser(test, 'eve', ['editor'])
      await testUser(test, 'bob', ['editor', 'user'])

      // try remove again
      await roles.removeUsersFromRoles(users.eve, ['user'])
      await testUser(test, 'eve', ['editor'])
    })

  it(
    'can remove users from roles via user object',
    async function () {
      await reset()

      var eve = await usersCollection.findOne({_id: users.eve}),
        bob = await usersCollection.findOne({_id: users.bob})

      // remove user role - one user
      await roles.addUsersToRoles([eve, bob], ['editor', 'user'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['editor', 'user'])
      await roles.removeUsersFromRoles(eve, ['user'])
      await testUser(test, 'eve', ['editor'])
      await testUser(test, 'bob', ['editor', 'user'])
    })


  it(
    'can remove individual users from roles by group',
    async function () {
      await reset()

      // remove user role - one user
      await roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], 'group1')
      await roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'group2')
      await testUser(test, 'eve', ['editor', 'user'], 'group1')
      await testUser(test, 'bob', ['editor', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group2')

      await roles.removeUsersFromRoles(users.eve, ['user'], 'group1')
      await testUser(test, 'eve', ['editor'], 'group1')
      await testUser(test, 'bob', ['editor', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group2')
    })

  it(
    'can remove multiple users from roles',
    async function () {
      await reset()

      // remove user role - two users
      await roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['editor', 'user'])

      test.isFalse(await roles.userIsInRole(users.joe, 'admin'))
      await roles.addUsersToRoles([users.bob, users.joe], ['admin', 'user'])
      await testUser(test, 'bob', ['admin', 'user', 'editor'])
      await testUser(test, 'joe', ['admin', 'user'])
      await roles.removeUsersFromRoles([users.bob, users.joe], ['admin'])
      await testUser(test, 'bob', ['user', 'editor'])
      await testUser(test, 'joe', ['user'])
    })

  it(
    'can remove multiple users from roles by group',
    async function () {
      await reset()

      // remove user role - one user
      await roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], 'group1')
      await roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'group2')
      await testUser(test, 'eve', ['editor', 'user'], 'group1')
      await testUser(test, 'bob', ['editor', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group2')

      await roles.removeUsersFromRoles([users.eve, users.bob], ['user'], 'group1')
      await testUser(test, 'eve', ['editor'], 'group1')
      await testUser(test, 'bob', ['editor'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group2')

      await roles.removeUsersFromRoles([users.joe, users.bob], ['admin'], 'group2')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', [], 'group2')
      await testUser(test, 'joe', [], 'group2')
    })

  it(
    'can set user roles',
    async function () {
      await reset()

      var eve = await usersCollection.findOne({_id: users.eve}),
        bob = await usersCollection.findOne({_id: users.bob}),
        joe = await usersCollection.findOne({_id: users.joe})

      await roles.setUserRoles([users.eve, bob], ['editor', 'user'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['editor', 'user'])
      await testUser(test, 'joe', [])

      // use addUsersToRoles add some roles
      await roles.addUsersToRoles([bob, users.joe], ['admin'])
      await testUser(test, 'eve', ['editor', 'user'])
      await testUser(test, 'bob', ['admin', 'editor', 'user'])
      await testUser(test, 'joe', ['admin'])

      await roles.setUserRoles([eve, bob], ['user'])
      await testUser(test, 'eve', ['user'])
      await testUser(test, 'bob', ['user'])
      await testUser(test, 'joe', ['admin'])

      await roles.setUserRoles(bob, 'editor')
      await testUser(test, 'eve', ['user'])
      await testUser(test, 'bob', ['editor'])
      await testUser(test, 'joe', ['admin'])

      await roles.setUserRoles([users.joe, users.bob], [])
      await testUser(test, 'eve', ['user'])
      await testUser(test, 'bob', [])
      await testUser(test, 'joe', [])
    })

  it(
    'can set user roles by group',
    async function () {
      await reset()

      var eve = await usersCollection.findOne({_id: users.eve}),
        bob = await usersCollection.findOne({_id: users.bob}),
        joe = await usersCollection.findOne({_id: users.joe})

      await roles.setUserRoles([users.eve, users.bob], ['editor', 'user'], 'group1')
      await roles.setUserRoles([users.bob, users.joe], ['admin'], 'group2')
      await testUser(test, 'eve', ['editor', 'user'], 'group1')
      await testUser(test, 'bob', ['editor', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group2')

      // use addUsersToRoles add some roles
      await roles.addUsersToRoles([users.eve, users.bob], ['admin'], 'group1')
      await roles.addUsersToRoles([users.bob, users.joe], ['editor'], 'group2')
      await testUser(test, 'eve', ['admin', 'editor', 'user'], 'group1')
      await testUser(test, 'bob', ['admin', 'editor', 'user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', [], 'group2')
      await testUser(test, 'bob', ['admin','editor'], 'group2')
      await testUser(test, 'joe', ['admin','editor'], 'group2')

      await roles.setUserRoles([eve, bob], ['user'], 'group1')
      await roles.setUserRoles([eve, joe], ['editor'], 'group2')
      await testUser(test, 'eve', ['user'], 'group1')
      await testUser(test, 'bob', ['user'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', ['editor'], 'group2')
      await testUser(test, 'bob', ['admin','editor'], 'group2')
      await testUser(test, 'joe', ['editor'], 'group2')

      await roles.setUserRoles(bob, 'editor', 'group1')
      await testUser(test, 'eve', ['user'], 'group1')
      await testUser(test, 'bob', ['editor'], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', ['editor'], 'group2')
      await testUser(test, 'bob', ['admin','editor'], 'group2')
      await testUser(test, 'joe', ['editor'], 'group2')

      await roles.setUserRoles([bob, users.joe], [], 'group1')
      await testUser(test, 'eve', ['user'], 'group1')
      await testUser(test, 'bob', [], 'group1')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'eve', ['editor'], 'group2')
      await testUser(test, 'bob', ['admin','editor'], 'group2')
      await testUser(test, 'joe', ['editor'], 'group2')
    })

  it(
    'can set user roles by group including GLOBAL_GROUP',
    async function () {
      await reset()

      var eve = await usersCollection.findOne({_id: users.eve}),
        bob = await usersCollection.findOne({_id: users.bob}),
        joe = await usersCollection.findOne({_id: users.joe})

      await roles.addUsersToRoles(eve, 'admin', await Roles.GLOBAL_GROUP)
      await testUser(test, 'eve', ['admin'], 'group1')
      await testUser(test, 'eve', ['admin'])

      await roles.setUserRoles(eve, 'editor', await Roles.GLOBAL_GROUP)
      await testUser(test, 'eve', ['editor'], 'group2')
      await testUser(test, 'eve', ['editor'])
    })


  it(
    'can get all roles',
    async function () {
      await reset()
      for (let role of userRoles) {
        await roles.createRole(role)
      }

      // compare roles, sorted alphabetically
      var expected = userRoles,
        actual = _.pluck(await roles.getAllRoles(), 'name')

      test.equal(actual, expected)
    })

  it(
    'can\'t get roles for non-existant user',
    async function () {
      await reset()
      test.equal(await roles.getRolesForUser('1'), [])
      test.equal(await roles.getRolesForUser('1', 'group1'), [])
    })

  it(
    'can get all roles for user',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      // by userId
      test.equal(await roles.getRolesForUser(userId), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj), [])


      await roles.addUsersToRoles(userId, ['admin', 'user'])

      // by userId
      test.equal(await roles.getRolesForUser(userId), ['admin', 'user'])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj), ['admin', 'user'])
    })

  it(
    'can get all roles for user by group',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      // by userId
      test.equal(await roles.getRolesForUser(userId, 'group1'), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj, 'group1'), [])


      // add roles
      await roles.addUsersToRoles(userId, ['admin', 'user'], 'group1')

      // by userId
      test.equal(await roles.getRolesForUser(userId, 'group1'), ['admin', 'user'])
      test.equal(await roles.getRolesForUser(userId), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj, 'group1'), ['admin', 'user'])
      test.equal(await roles.getRolesForUser(userObj), [])
    })

  it(
    'can get all roles for user by group with periods in name',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us')

      test.equal(await roles.getRolesForUser(users.joe, 'example.k12.va.us'), ['admin'])
    })

  it(
    'can get all roles for user by group including await Roles.GLOBAL_GROUP',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      await roles.addUsersToRoles([users.eve], ['editor'], await Roles.GLOBAL_GROUP)
      await roles.addUsersToRoles([users.eve], ['admin', 'user'], 'group1')

      // by userId
      test.equal(await roles.getRolesForUser(userId, 'group1'), ['admin', 'user', 'editor'])
      test.equal(await roles.getRolesForUser(userId), ['editor'])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj, 'group1'), ['admin', 'user', 'editor'])
      test.equal(await roles.getRolesForUser(userObj), ['editor'])
    })


  it(
    'getRolesForUser should not return null entries if user has no roles for group',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      // by userId
      test.equal(await roles.getRolesForUser(userId, 'group1'), [])
      test.equal(await roles.getRolesForUser(userId), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj, 'group1'), [])
      test.equal(await roles.getRolesForUser(userObj), [])


      await roles.addUsersToRoles([users.eve], ['editor'], await Roles.GLOBAL_GROUP)

      // by userId
      test.equal(await roles.getRolesForUser(userId, 'group1'), ['editor'])
      test.equal(await roles.getRolesForUser(userId), ['editor'])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getRolesForUser(userObj, 'group1'), ['editor'])
      test.equal(await roles.getRolesForUser(userObj), ['editor'])
    })

  it(
    'can get all groups for user',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      await roles.addUsersToRoles([users.eve], ['editor'], 'group1')
      await roles.addUsersToRoles([users.eve], ['admin', 'user'], 'group2')

      // by userId
      test.equal(await roles.getGroupsForUser(userId), ['group1', 'group2'])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getGroupsForUser(userObj), ['group1', 'group2'])
    })

  it(
    'can get all groups for user by role',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      await roles.addUsersToRoles([users.eve], ['editor'], 'group1')
      await roles.addUsersToRoles([users.eve], ['editor', 'user'], 'group2')

      // by userId
      test.equal(await roles.getGroupsForUser(userId, 'user'), ['group2'])
      test.equal(await roles.getGroupsForUser(userId, 'editor'), ['group1', 'group2'])
      test.equal(await roles.getGroupsForUser(userId, 'admin'), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getGroupsForUser(userObj, 'user'), ['group2'])
      test.equal(await roles.getGroupsForUser(userObj, 'editor'), ['group1', 'group2'])
      test.equal(await roles.getGroupsForUser(userObj, 'admin'), [])
    })

  it(
    'getGroupsForUser returns [] when not using groups',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      await roles.addUsersToRoles([users.eve], ['editor', 'user'])

      // by userId
      test.equal(await roles.getGroupsForUser(userId), [])
      test.equal(await roles.getGroupsForUser(userId, 'editor'), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getGroupsForUser(userObj), [])
      test.equal(await roles.getGroupsForUser(userObj, 'editor'), [])
    })


  it(
    'getting all groups for user does not include GLOBAL_GROUP',
    async function () {
      await reset()

      var userId = users.eve,
        userObj

      await roles.addUsersToRoles([users.eve], ['editor'], 'group1')
      await roles.addUsersToRoles([users.eve], ['editor', 'user'], 'group2')
      await roles.addUsersToRoles([users.eve], ['editor', 'user', 'admin'], await Roles.GLOBAL_GROUP)

      // by userId
      test.equal(await roles.getGroupsForUser(userId, 'user'), ['group2'])
      test.equal(await roles.getGroupsForUser(userId, 'editor'), ['group1', 'group2'])
      test.equal(await roles.getGroupsForUser(userId, 'admin'), [])

      // by user object
      userObj = await usersCollection.findOne({_id: userId})
      test.equal(await roles.getGroupsForUser(userObj, 'user'), ['group2'])
      test.equal(await roles.getGroupsForUser(userObj, 'editor'), ['group1', 'group2'])
      test.equal(await roles.getGroupsForUser(userObj, 'admin'), [])
    })


  it(
    'can get all users in role',
    async function () {
      await reset()
      for (let role of userRoles) {
        await roles.createRole(role)
      }

      await roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'])
      await roles.addUsersToRoles([users.bob, users.joe], ['editor'])

      var expected = [users.eve, users.joe],
        actual = _.pluck(await roles.getUsersInRole('admin'), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })

  it(
    'can get all users in role by group',
    async function () {
      await reset()
      await roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'], 'group1')
      await roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'group2')

      var expected = [users.eve, users.joe],
        actual = _.pluck(await roles.getUsersInRole('admin','group1'), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })

  it(
    'can get all users in role by group including await Roles.GLOBAL_GROUP',
    async function () {
      await reset()
      await roles.addUsersToRoles([users.eve], ['admin', 'user'], await Roles.GLOBAL_GROUP)
      await roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'group2')

      var expected = [users.eve],
        actual = _.pluck(await roles.getUsersInRole('admin','group1'), '_id')

      // order may be different so check difference instead of equality
      // difference uses first array as base so have to check both ways
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])

      expected = [users.eve, users.bob, users.joe]
      actual = _.pluck(await roles.getUsersInRole('admin','group2'), '_id')

      // order may be different so check difference instead of equality
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])


      expected = [users.eve]
      actual = _.pluck(await roles.getUsersInRole('admin'), '_id')

      // order may be different so check difference instead of equality
      test.equal(_.difference(actual, expected), [])
      test.equal(_.difference(expected, actual), [])
    })

  it(
    'can get all users in role by group and passes through mongo query arguments',
    async function () {
      await reset()
      await roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'], 'group1')
      await roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'group2')

      var results = await roles.getUsersInRole('admin','group1', { fields: { username: 0 }, limit: 1 });

      test.equal(1, results.length);
      test.isTrue(results[0].hasOwnProperty('_id'));
      test.isFalse(results[0].hasOwnProperty('username'));
    })


  it(
    'can use await Roles.GLOBAL_GROUP to assign blanket permissions',
    async function () {
      await reset()

      await roles.addUsersToRoles([users.joe, users.bob], ['admin'], await Roles.GLOBAL_GROUP)

      await testUser(test, 'eve', [], 'group1')
      await testUser(test, 'joe', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group1')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'bob', ['admin'], 'group1')

      await roles.removeUsersFromRoles(users.joe, ['admin'], await Roles.GLOBAL_GROUP)

      await testUser(test, 'eve', [], 'group1')
      await testUser(test, 'joe', [], 'group2')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'bob', ['admin'], 'group1')
    })

  it(
    'await Roles.GLOBAL_GROUP is independent of other groups',
    async function () {
      await reset()

      await roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'group5')
      await roles.addUsersToRoles([users.joe, users.bob], ['admin'], await Roles.GLOBAL_GROUP)

      await testUser(test, 'eve', [], 'group1')
      await testUser(test, 'joe', ['admin'], 'group5')
      await testUser(test, 'joe', ['admin'], 'group2')
      await testUser(test, 'joe', ['admin'], 'group1')
      await testUser(test, 'bob', ['admin'], 'group5')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'bob', ['admin'], 'group1')

      await roles.removeUsersFromRoles(users.joe, ['admin'], await Roles.GLOBAL_GROUP)

      await testUser(test, 'eve', [], 'group1')
      await testUser(test, 'joe', ['admin'], 'group5')
      await testUser(test, 'joe', [], 'group2')
      await testUser(test, 'joe', [], 'group1')
      await testUser(test, 'bob', ['admin'], 'group5')
      await testUser(test, 'bob', ['admin'], 'group2')
      await testUser(test, 'bob', ['admin'], 'group1')
    })

  it(
    'await Roles.GLOBAL_GROUP also checked when group not specified',
    async function () {
      await reset()

      await roles.addUsersToRoles(users.joe, 'admin', await Roles.GLOBAL_GROUP)

      await testUser(test, 'joe', ['admin'])

      await roles.removeUsersFromRoles(users.joe, 'admin', await Roles.GLOBAL_GROUP)

      await testUser(test, 'joe', [])
    })

  it(
    'mixing group with non-group throws descriptive error',
    async function () {
      var expectedErrorMsg = "Roles error: Can't mix grouped and non-grouped roles for same user"

      await reset()
      await roles.addUsersToRoles(users.joe, ['editor', 'user'], 'group1')
      try {
        await roles.addUsersToRoles(users.joe, ['admin'])
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      // This case doesn't throw with TingoDB
      await reset()
      await roles.addUsersToRoles(users.bob, ['editor', 'user'])
      try {
        await roles.addUsersToRoles(users.bob, ['admin'], 'group2')
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await reset()
      await roles.addUsersToRoles(users.bob, ['editor', 'user'], 'group1')
      try {
        await roles.removeUsersFromRoles(users.bob, ['user'])
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      // This case doesn't throw with TingoDB
      await reset()
      await roles.addUsersToRoles(users.bob, ['editor', 'user'])
      try {
        await roles.setUserRoles(users.bob, ['user'], 'group1')
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await reset()
      await roles.addUsersToRoles(users.bob, ['editor', 'user'])
      try {
        await roles.removeUsersFromRoles(users.bob, ['user'], 'group1')
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await reset()
      await roles.addUsersToRoles(users.bob, ['editor', 'user'], 'group1')
      // this is probably not a good idea but shouldn't throw...
      await roles.setUserRoles(users.bob, ['user'])
    })

  it(
    "can use '.' in group name",
    async function () {
      await reset()

      await roles.addUsersToRoles(users.joe, ['admin'], 'example.com')
      await testUser(test, 'joe', ['admin'], 'example.com')
    })

  it(
    "can use multiple periods in group name",
    async function () {
      await reset()

      await roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us')
      await testUser(test, 'joe', ['admin'], 'example.k12.va.us')
    })

  it(
    'invalid group name throws descriptive error',
    async function () {
      var expectedErrorMsg = "Roles error: groups can not start with '$'"

      await reset()
      try {
        await roles.addUsersToRoles(users.joe, ['admin'], '$group1')
        throw new Error("expected exception but didn't get one")
      }
      catch (ex) {
        test.isTrue(ex.message == expectedErrorMsg, ex.message)
      }

      await reset()
      // should not throw error
      await roles.addUsersToRoles(users.bob, ['editor', 'user'], 'g$roup1')
    })

  it(
    'userIsInRole returns false for unknown roles',
    async function () {
      await reset();

      await roles.createRole('admin')
      await roles.createRole('user')
      await roles.createRole('editor')
      await roles.addUsersToRoles(users.eve, ['admin', 'user'])
      await roles.addUsersToRoles(users.eve, ['editor'])

      test.isFalse(await roles.userIsInRole(users.eve, 'unknown'))
      test.isFalse(await roles.userIsInRole(users.eve, []))
      test.isFalse(await roles.userIsInRole(users.eve, null))
      test.isFalse(await roles.userIsInRole(users.eve, undefined))
    });

  function printException (ex) {
    var tmp = {}
    for (var key in ex) {
      if (key != 'stack') {
        tmp[key] = ex[key]
      }
    }
    console.log(JSON.stringify(tmp));
  }
})
