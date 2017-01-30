/**
 * Provides functions related to user authorization. Compatible with built-in Meteor accounts packages.
 *
 * @module Roles
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Roles = undefined;

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mixingGroupAndNonGroupErrorMsg = "Roles error: Can't mix grouped and non-grouped roles for same user";

var Roles = exports.Roles = function () {
  /***
   * @param users MongoDB users collection
   * @param roles MongoDB roles collection
   *
   * Roles collection documents consist only of an id and a role name.
   *   ex: { _id:<uuid>, name: "admin" }
   */
  function Roles(_ref) {
    var users = _ref.users,
        roles = _ref.roles;
    (0, _classCallCheck3.default)(this, Roles);

    this.users = users;
    this.roles = roles;
  }

  /**
   * Create a new role. Whitespace will be trimmed.
   *
   * @method createRole
   * @param {String} role Name of role
   * @return {String} id of new role
   */


  (0, _createClass3.default)(Roles, [{
    key: 'createRole',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(role) {
        var id, match;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(!role || 'string' !== typeof role || role.trim().length === 0)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:
                _context.prev = 2;
                _context.next = 5;
                return this.roles.insert({ 'name': role.trim() });

              case 5:
                id = _context.sent;
                return _context.abrupt('return', id);

              case 9:
                _context.prev = 9;
                _context.t0 = _context['catch'](2);

                if (!/E11000 duplicate key error.*(index.*roles|roles.*index).*name/.test(_context.t0.err || _context.t0.errmsg)) {
                  _context.next = 15;
                  break;
                }

                throw new Error("Role '" + role.trim() + "' already exists.");

              case 15:
                throw _context.t0;

              case 16:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[2, 9]]);
      }));

      function createRole(_x) {
        return _ref2.apply(this, arguments);
      }

      return createRole;
    }()

    /**
     * Delete an existing role.  Will throw "Role in use" error if any users
     * are currently assigned to the target role.
     *
     * @method deleteRole
     * @param {String} role Name of role
     */

  }, {
    key: 'deleteRole',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(role) {
        var foundExistingUser, thisRole;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (role) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt('return');

              case 2:
                _context2.next = 4;
                return this.users.findOne({ roles: { $in: [role] } }, { fields: { _id: 1 } });

              case 4:
                foundExistingUser = _context2.sent;

                if (!foundExistingUser) {
                  _context2.next = 7;
                  break;
                }

                throw new Error('Role in use');

              case 7:
                _context2.next = 9;
                return this.roles.findOne({ name: role });

              case 9:
                thisRole = _context2.sent;

                if (!thisRole) {
                  _context2.next = 13;
                  break;
                }

                _context2.next = 13;
                return this.roles.remove({ _id: thisRole._id });

              case 13:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function deleteRole(_x2) {
        return _ref3.apply(this, arguments);
      }

      return deleteRole;
    }()

    /**
     * Add users to roles. Will create roles as needed.
     *
     * NOTE: Mixing grouped and non-grouped roles for the same user
     *       is not supported and will throw an error.
     *
     * Makes 2 calls to database:
     *  1. retrieve list of all existing roles
     *  2. update users' roles
     *
     * @example
     *     Roles.addUsersToRoles(userId, 'admin')
     *     Roles.addUsersToRoles(userId, ['view-secrets'], 'example.com')
     *     Roles.addUsersToRoles([user1, user2], ['user','editor'])
     *     Roles.addUsersToRoles([user1, user2], ['glorious-admin', 'perform-action'], 'example.org')
     *     Roles.addUsersToRoles(userId, 'admin', Roles.GLOBAL_GROUP)
     *
     * @method addUsersToRoles
     * @param {Array|String} users User id(s) or object(s) with an _id field
     * @param {Array|String} roles Name(s) of roles/permissions to add users to
     * @param {String} [group] Optional group name. If supplied, roles will be
     *                         specific to that group.
     *                         Group names can not start with a '$' or contain
     *                         null characters.  Periods in names '.' are
     *                         automatically converted to underscores.
     *                         The special group Roles.GLOBAL_GROUP provides
     *                         a convenient way to assign blanket roles/permissions
     *                         across all groups.  The roles/permissions in the
     *                         Roles.GLOBAL_GROUP group will be automatically
     *                         included in checks for any group.
     */

  }, {
    key: 'addUsersToRoles',
    value: function () {
      var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(users, roles, group) {
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return this._updateUserRoles(users, roles, group, this._update_$addToSet_fn.bind(this));

              case 2:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function addUsersToRoles(_x3, _x4, _x5) {
        return _ref4.apply(this, arguments);
      }

      return addUsersToRoles;
    }()

    /**
     * Set a users roles/permissions.
     *
     * @example
     *     Roles.setUserRoles(userId, 'admin')
     *     Roles.setUserRoles(userId, ['view-secrets'], 'example.com')
     *     Roles.setUserRoles([user1, user2], ['user','editor'])
     *     Roles.setUserRoles([user1, user2], ['glorious-admin', 'perform-action'], 'example.org')
     *     Roles.setUserRoles(userId, 'admin', Roles.GLOBAL_GROUP)
     *
     * @method setUserRoles
     * @param {Array|String} users User id(s) or object(s) with an _id field
     * @param {Array|String} roles Name(s) of roles/permissions to add users to
     * @param {String} [group] Optional group name. If supplied, roles will be
     *                         specific to that group.
     *                         Group names can not start with '$'.
     *                         Periods in names '.' are automatically converted
     *                         to underscores.
     *                         The special group Roles.GLOBAL_GROUP provides
     *                         a convenient way to assign blanket roles/permissions
     *                         across all groups.  The roles/permissions in the
     *                         Roles.GLOBAL_GROUP group will be automatically
     *                         included in checks for any group.
     */

  }, {
    key: 'setUserRoles',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(users, roles, group) {
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this._updateUserRoles(users, roles, group, this._update_$set_fn.bind(this));

              case 2:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function setUserRoles(_x6, _x7, _x8) {
        return _ref5.apply(this, arguments);
      }

      return setUserRoles;
    }()

    /**
     * Remove users from roles
     *
     * @example
     *     Roles.removeUsersFromRoles(users.bob, 'admin')
     *     Roles.removeUsersFromRoles([users.bob, users.joe], ['editor'])
     *     Roles.removeUsersFromRoles([users.bob, users.joe], ['editor', 'user'])
     *     Roles.removeUsersFromRoles(users.eve, ['user'], 'group1')
     *
     * @method removeUsersFromRoles
     * @param {Array|String} users User id(s) or object(s) with an _id field
     * @param {Array|String} roles Name(s) of roles to add users to
     * @param {String} [group] Optional. Group name. If supplied, only that
     *                         group will have roles removed.
     */

  }, {
    key: 'removeUsersFromRoles',
    value: function () {
      var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(users, roles, group) {
        var update;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                if (users) {
                  _context5.next = 2;
                  break;
                }

                throw new Error("Missing 'users' param");

              case 2:
                if (roles) {
                  _context5.next = 4;
                  break;
                }

                throw new Error("Missing 'roles' param");

              case 4:
                if (!group) {
                  _context5.next = 10;
                  break;
                }

                if (!('string' !== typeof group)) {
                  _context5.next = 7;
                  break;
                }

                throw new Error("Roles error: Invalid parameter 'group'. Expected 'string' type");

              case 7:
                if (!('$' === group[0])) {
                  _context5.next = 9;
                  break;
                }

                throw new Error("Roles error: groups can not start with '$'");

              case 9:

                // convert any periods to underscores
                group = group.replace(/\./g, '_');

              case 10:

                // ensure arrays
                if (!_underscore2.default.isArray(users)) users = [users];
                if (!_underscore2.default.isArray(roles)) roles = [roles];

                // ensure users is an array of user ids
                users = _underscore2.default.reduce(users, function (memo, user) {
                  var _id;
                  if ('string' === typeof user) {
                    memo.push(user);
                  } else if ('object' === (typeof user === 'undefined' ? 'undefined' : (0, _typeof3.default)(user))) {
                    _id = user._id;
                    if ('string' === typeof _id) {
                      memo.push(_id);
                    }
                  }
                  return memo;
                }, []);

                // update all users, remove from roles set

                if (group) {
                  update = { $pullAll: {} };
                  update.$pullAll['roles.' + group] = roles;
                } else {
                  update = { $pullAll: { roles: roles } };
                }

                _context5.prev = 14;
                _context5.next = 17;
                return this.users.update({ _id: { $in: users } }, update, { multi: true });

              case 17:
                _context5.next = 24;
                break;

              case 19:
                _context5.prev = 19;
                _context5.t0 = _context5['catch'](14);

                if (!(_context5.t0.name === 'MongoError' && isMongoMixError(_context5.t0.err || _context5.t0.errmsg))) {
                  _context5.next = 23;
                  break;
                }

                throw new Error(mixingGroupAndNonGroupErrorMsg);

              case 23:
                throw _context5.t0;

              case 24:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[14, 19]]);
      }));

      function removeUsersFromRoles(_x9, _x10, _x11) {
        return _ref6.apply(this, arguments);
      }

      return removeUsersFromRoles;
    }()

    /**
     * Check if user has specified permissions/roles
     *
     * @example
     *     // non-group usage
     *     Roles.userIsInRole(user, 'admin')
     *     Roles.userIsInRole(user, ['admin','editor'])
     *     Roles.userIsInRole(userId, 'admin')
     *     Roles.userIsInRole(userId, ['admin','editor'])
     *
     *     // per-group usage
     *     Roles.userIsInRole(user,   ['admin','editor'], 'group1')
     *     Roles.userIsInRole(userId, ['admin','editor'], 'group1')
     *     Roles.userIsInRole(userId, ['admin','editor'], Roles.GLOBAL_GROUP)
     *
     *     // this format can also be used as short-hand for Roles.GLOBAL_GROUP
     *     Roles.userIsInRole(user, 'admin')
     *
     * @method userIsInRole
     * @param {String|Object} user User Id or actual user object
     * @param {String|Array} roles Name of role/permission or Array of
     *                            roles/permissions to check against.  If array,
     *                            will return true if user is in _any_ role.
     * @param {String} [group] Optional. Name of group.  If supplied, limits check
     *                         to just that group.
     *                         The user's Roles.GLOBAL_GROUP will always be checked
     *                         whether group is specified or not.
     * @return {Boolean} true if user is in _any_ of the target roles
     */

  }, {
    key: 'userIsInRole',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(user, roles, group) {
        var id, userRoles, query, groupQuery, found;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                found = false;

                // ensure array to simplify code

                if (!_underscore2.default.isArray(roles)) {
                  roles = [roles];
                }

                if (user) {
                  _context6.next = 4;
                  break;
                }

                return _context6.abrupt('return', false);

              case 4:
                if (!group) {
                  _context6.next = 10;
                  break;
                }

                if (!('string' !== typeof group)) {
                  _context6.next = 7;
                  break;
                }

                return _context6.abrupt('return', false);

              case 7:
                if (!('$' === group[0])) {
                  _context6.next = 9;
                  break;
                }

                return _context6.abrupt('return', false);

              case 9:

                // convert any periods to underscores
                group = group.replace(/\./g, '_');

              case 10:
                if (!('object' === (typeof user === 'undefined' ? 'undefined' : (0, _typeof3.default)(user)))) {
                  _context6.next = 23;
                  break;
                }

                userRoles = user.roles;

                if (!_underscore2.default.isArray(userRoles)) {
                  _context6.next = 16;
                  break;
                }

                return _context6.abrupt('return', _underscore2.default.some(roles, function (role) {
                  return _underscore2.default.contains(userRoles, role);
                }));

              case 16:
                if (!(userRoles && 'object' === (typeof userRoles === 'undefined' ? 'undefined' : (0, _typeof3.default)(userRoles)))) {
                  _context6.next = 20;
                  break;
                }

                // roles field is dictionary of groups
                found = _underscore2.default.isArray(userRoles[group]) && _underscore2.default.some(roles, function (role) {
                  return _underscore2.default.contains(userRoles[group], role);
                });
                if (!found) {
                  // not found in regular group or group not specified.
                  // check Roles.GLOBAL_GROUP, if it exists
                  found = _underscore2.default.isArray(userRoles[Roles.GLOBAL_GROUP]) && _underscore2.default.some(roles, function (role) {
                    return _underscore2.default.contains(userRoles[Roles.GLOBAL_GROUP], role);
                  });
                }
                return _context6.abrupt('return', found);

              case 20:

                // missing roles field, try going direct via id
                id = user._id;
                _context6.next = 24;
                break;

              case 23:
                if ('string' === typeof user) {
                  id = user;
                }

              case 24:
                if (id) {
                  _context6.next = 26;
                  break;
                }

                return _context6.abrupt('return', false);

              case 26:

                query = { _id: id, $or: [] };

                // always check Roles.GLOBAL_GROUP
                groupQuery = {};
                groupQuery['roles.' + Roles.GLOBAL_GROUP] = { $in: roles };
                query.$or.push(groupQuery);

                if (group) {
                  // structure of query, when group specified including Roles.GLOBAL_GROUP
                  //   {_id: id,
                  //    $or: [
                  //      {'roles.group1':{$in: ['admin']}},
                  //      {'roles.__global_roles__':{$in: ['admin']}}
                  //    ]}
                  groupQuery = {};
                  groupQuery['roles.' + group] = { $in: roles };
                  query.$or.push(groupQuery);
                } else {
                  // structure of query, where group not specified. includes
                  // Roles.GLOBAL_GROUP
                  //   {_id: id,
                  //    $or: [
                  //      {roles: {$in: ['admin']}},
                  //      {'roles.__global_roles__': {$in: ['admin']}}
                  //    ]}
                  query.$or.push({ roles: { $in: roles } });
                }

                _context6.next = 33;
                return this.users.findOne(query, { fields: { _id: 1 } });

              case 33:
                found = _context6.sent;
                return _context6.abrupt('return', found ? true : false);

              case 35:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function userIsInRole(_x12, _x13, _x14) {
        return _ref7.apply(this, arguments);
      }

      return userIsInRole;
    }()

    /**
     * Retrieve users roles
     *
     * @method getRolesForUser
     * @param {String|Object} user User Id or actual user object
     * @param {String} [group] Optional name of group to restrict roles to.
     *                         User's Roles.GLOBAL_GROUP will also be included.
     * @return {Array} Array of user's roles, unsorted.
     */

  }, {
    key: 'getRolesForUser',
    value: function () {
      var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(user, group) {
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (user) {
                  _context7.next = 2;
                  break;
                }

                return _context7.abrupt('return', []);

              case 2:
                if (!group) {
                  _context7.next = 8;
                  break;
                }

                if (!('string' !== typeof group)) {
                  _context7.next = 5;
                  break;
                }

                return _context7.abrupt('return', []);

              case 5:
                if (!('$' === group[0])) {
                  _context7.next = 7;
                  break;
                }

                return _context7.abrupt('return', []);

              case 7:

                // convert any periods to underscores
                group = group.replace(/\./g, '_');

              case 8:
                if (!('string' === typeof user)) {
                  _context7.next = 14;
                  break;
                }

                _context7.next = 11;
                return this.users.findOne({ _id: user }, { fields: { roles: 1 } });

              case 11:
                user = _context7.sent;
                _context7.next = 16;
                break;

              case 14:
                if (!('object' !== (typeof user === 'undefined' ? 'undefined' : (0, _typeof3.default)(user)))) {
                  _context7.next = 16;
                  break;
                }

                return _context7.abrupt('return', []);

              case 16:
                if (!(!user || !user.roles)) {
                  _context7.next = 18;
                  break;
                }

                return _context7.abrupt('return', []);

              case 18:
                if (!group) {
                  _context7.next = 20;
                  break;
                }

                return _context7.abrupt('return', _underscore2.default.union(user.roles[group] || [], user.roles[Roles.GLOBAL_GROUP] || []));

              case 20:
                if (!_underscore2.default.isArray(user.roles)) {
                  _context7.next = 22;
                  break;
                }

                return _context7.abrupt('return', user.roles);

              case 22:
                return _context7.abrupt('return', user.roles[Roles.GLOBAL_GROUP] || []);

              case 23:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function getRolesForUser(_x15, _x16) {
        return _ref8.apply(this, arguments);
      }

      return getRolesForUser;
    }()

    /**
     * Retrieve set of all existing roles
     *
     * @method getAllRoles
     * @return {Cursor} cursor of existing roles
     */

  }, {
    key: 'getAllRoles',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.next = 2;
                return this.roles.find({}, { sort: { name: 1 } }).toArray();

              case 2:
                return _context8.abrupt('return', _context8.sent);

              case 3:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function getAllRoles() {
        return _ref9.apply(this, arguments);
      }

      return getAllRoles;
    }()

    /**
     * Retrieve all users who are in target role.
     *
     * NOTE: This is an expensive query; it performs a full collection scan
     * on the users collection since there is no index set on the 'roles' field.
     * This is by design as most queries will specify an _id so the _id index is
     * used automatically.
     *
     * @method getUsersInRole
     * @param {Array|String} role Name of role/permission.  If array, users
     *                            returned will have at least one of the roles
     *                            specified but need not have _all_ roles.
     * @param {String} [group] Optional name of group to restrict roles to.
     *                         User's Roles.GLOBAL_GROUP will also be checked.
     * @param {Object} [options] Optional options which are passed directly
     *                           through to `this.users.find(query, options)`
     * @return {Cursor} cursor of users in role
     */

  }, {
    key: 'getUsersInRole',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(role, group, options) {
        var query, roles, groupQuery;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                roles = role;

                // ensure array to simplify query logic

                if (!_underscore2.default.isArray(roles)) roles = [roles];

                if (!group) {
                  _context9.next = 8;
                  break;
                }

                if (!('string' !== typeof group)) {
                  _context9.next = 5;
                  break;
                }

                throw new Error("Roles error: Invalid parameter 'group'. Expected 'string' type");

              case 5:
                if (!('$' === group[0])) {
                  _context9.next = 7;
                  break;
                }

                throw new Error("Roles error: groups can not start with '$'");

              case 7:

                // convert any periods to underscores
                group = group.replace(/\./g, '_');

              case 8:

                query = { $or: [] };

                // always check Roles.GLOBAL_GROUP
                groupQuery = {};
                groupQuery['roles.' + Roles.GLOBAL_GROUP] = { $in: roles };
                query.$or.push(groupQuery);

                if (group) {
                  // structure of query, when group specified including Roles.GLOBAL_GROUP
                  //   {
                  //    $or: [
                  //      {'roles.group1':{$in: ['admin']}},
                  //      {'roles.__global_roles__':{$in: ['admin']}}
                  //    ]}
                  groupQuery = {};
                  groupQuery['roles.' + group] = { $in: roles };
                  query.$or.push(groupQuery);
                } else {
                  // structure of query, where group not specified. includes
                  // Roles.GLOBAL_GROUP
                  //   {
                  //    $or: [
                  //      {roles: {$in: ['admin']}},
                  //      {'roles.__global_roles__': {$in: ['admin']}}
                  //    ]}
                  query.$or.push({ roles: { $in: roles } });
                }

                _context9.next = 15;
                return this.users.find(query, options).toArray();

              case 15:
                return _context9.abrupt('return', _context9.sent);

              case 16:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function getUsersInRole(_x17, _x18, _x19) {
        return _ref10.apply(this, arguments);
      }

      return getUsersInRole;
    }() // end getUsersInRole

    /**
     * Retrieve users groups, if any
     *
     * @method getGroupsForUser
     * @param {String|Object} user User Id or actual user object
     * @param {String} [role] Optional name of roles to restrict groups to.
     *
     * @return {Array} Array of user's groups, unsorted. Roles.GLOBAL_GROUP will be omitted
     */

  }, {
    key: 'getGroupsForUser',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(user, role) {
        var userGroups;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                userGroups = [];

                if (user) {
                  _context10.next = 3;
                  break;
                }

                return _context10.abrupt('return', []);

              case 3:
                if (!role) {
                  _context10.next = 9;
                  break;
                }

                if (!('string' !== typeof role)) {
                  _context10.next = 6;
                  break;
                }

                return _context10.abrupt('return', []);

              case 6:
                if (!('$' === role[0])) {
                  _context10.next = 8;
                  break;
                }

                return _context10.abrupt('return', []);

              case 8:

                // convert any periods to underscores
                role = role.replace('.', '_');

              case 9:
                if (!('string' === typeof user)) {
                  _context10.next = 15;
                  break;
                }

                _context10.next = 12;
                return this.users.findOne({ _id: user }, { fields: { roles: 1 } });

              case 12:
                user = _context10.sent;
                _context10.next = 17;
                break;

              case 15:
                if (!('object' !== (typeof user === 'undefined' ? 'undefined' : (0, _typeof3.default)(user)))) {
                  _context10.next = 17;
                  break;
                }

                return _context10.abrupt('return', []);

              case 17:
                if (!(!user || !user.roles || _underscore2.default.isArray(user.roles))) {
                  _context10.next = 19;
                  break;
                }

                return _context10.abrupt('return', []);

              case 19:
                if (!role) {
                  _context10.next = 24;
                  break;
                }

                _underscore2.default.each(user.roles, function (groupRoles, groupName) {
                  if (_underscore2.default.contains(groupRoles, role) && groupName !== Roles.GLOBAL_GROUP) {
                    userGroups.push(groupName);
                  }
                });
                return _context10.abrupt('return', userGroups);

              case 24:
                return _context10.abrupt('return', _underscore2.default.without(_underscore2.default.keys(user.roles), Roles.GLOBAL_GROUP));

              case 25:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function getGroupsForUser(_x20, _x21) {
        return _ref11.apply(this, arguments);
      }

      return getGroupsForUser;
    }() //End getGroupsForUser


    /**
     * Private function 'template' that uses $set to construct an update object
     * for MongoDB.  Passed to _updateUserRoles
     *
     * @method _update_$set_fn
     * @protected
     * @param {Array} roles
     * @param {String} [group]
     * @return {Object} update object for use in MongoDB update command
     */

  }, {
    key: '_update_$set_fn',
    value: function _update_$set_fn(roles, group) {
      var update = {};

      if (group) {
        // roles is a key/value dict object
        update.$set = {};
        update.$set['roles.' + group] = roles;
      } else {
        // roles is an array of strings
        update.$set = { roles: roles };
      }

      return update;
    } // end _update_$set_fn

    /**
     * Private function 'template' that uses $addToSet to construct an update
     * object for MongoDB.  Passed to _updateUserRoles
     *
     * @method _update_$addToSet_fn
     * @protected
     * @param {Array} roles
     * @param {String} [group]
     * @return {Object} update object for use in MongoDB update command
     */

  }, {
    key: '_update_$addToSet_fn',
    value: function _update_$addToSet_fn(roles, group) {
      var update = {};

      if (group) {
        // roles is a key/value dict object
        update.$addToSet = {};
        update.$addToSet['roles.' + group] = { $each: roles };
      } else {
        // roles is an array of strings
        update.$addToSet = { roles: { $each: roles } };
      }

      return update;
    } // end _update_$addToSet_fn


    /**
     * Internal function that uses the Template pattern to adds or sets roles
     * for users.
     *
     * @method _updateUserRoles
     * @protected
     * @param {Array|String} users user id(s) or object(s) with an _id field
     * @param {Array|String} roles name(s) of roles/permissions to add users to
     * @param {String} group Group name. If not null or undefined, roles will be
     *                         specific to that group.
     *                         Group names can not start with '$'.
     *                         Periods in names '.' are automatically converted
     *                         to underscores.
     *                         The special group Roles.GLOBAL_GROUP provides
     *                         a convenient way to assign blanket roles/permissions
     *                         across all groups.  The roles/permissions in the
     *                         Roles.GLOBAL_GROUP group will be automatically
     *                         included in checks for any group.
     * @param {Function} updateFactory Func which returns an update object that
     *                         will be passed to Mongo.
     *   @param {Array} roles
     *   @param {String} [group]
     */

  }, {
    key: '_updateUserRoles',
    value: function () {
      var _ref12 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee12(users, roles, group, updateFactory) {
        var _this = this;

        var existingRoles, query, update;
        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                if (users) {
                  _context12.next = 2;
                  break;
                }

                throw new Error("Missing 'users' param");

              case 2:
                if (roles) {
                  _context12.next = 4;
                  break;
                }

                throw new Error("Missing 'roles' param");

              case 4:
                if (!group) {
                  _context12.next = 10;
                  break;
                }

                if (!('string' !== typeof group)) {
                  _context12.next = 7;
                  break;
                }

                throw new Error("Roles error: Invalid parameter 'group'. Expected 'string' type");

              case 7:
                if (!('$' === group[0])) {
                  _context12.next = 9;
                  break;
                }

                throw new Error("Roles error: groups can not start with '$'");

              case 9:

                // convert any periods to underscores
                group = group.replace(/\./g, '_');

              case 10:

                // ensure arrays to simplify code
                if (!_underscore2.default.isArray(users)) users = [users];
                if (!_underscore2.default.isArray(roles)) roles = [roles];

                // remove invalid roles
                roles = _underscore2.default.reduce(roles, function (memo, role) {
                  if (role && 'string' === typeof role && role.trim().length > 0) {
                    memo.push(role.trim());
                  }
                  return memo;
                }, []);

                // empty roles array is ok, since it might be a $set operation to clear roles
                //if (roles.length === 0) return

                // ensure all roles exist in 'roles' collection
                _context12.t0 = _underscore2.default;
                _context12.next = 16;
                return this.roles.find({}).toArray();

              case 16:
                _context12.t1 = _context12.sent;

                _context12.t2 = function (memo, role) {
                  memo[role.name] = true;
                  return memo;
                };

                _context12.t3 = {};
                existingRoles = _context12.t0.reduce.call(_context12.t0, _context12.t1, _context12.t2, _context12.t3);
                _context12.next = 22;
                return _underscore2.default.map(roles, function () {
                  var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11(role) {
                    return _regenerator2.default.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            if (existingRoles[role]) {
                              _context11.next = 3;
                              break;
                            }

                            _context11.next = 3;
                            return _this.createRole(role);

                          case 3:
                          case 'end':
                            return _context11.stop();
                        }
                      }
                    }, _callee11, _this);
                  }));

                  return function (_x26) {
                    return _ref13.apply(this, arguments);
                  };
                }());

              case 22:

                // ensure users is an array of user ids
                users = _underscore2.default.reduce(users, function (memo, user) {
                  var _id;
                  if ('string' === typeof user) {
                    memo.push(user);
                  } else if ('object' === (typeof user === 'undefined' ? 'undefined' : (0, _typeof3.default)(user))) {
                    _id = user._id;
                    if ('string' === typeof _id) {
                      memo.push(_id);
                    }
                  }
                  return memo;
                }, []);

                // update all users
                update = updateFactory(roles, group);

                _context12.prev = 24;
                _context12.next = 27;
                return this.users.update({ _id: { $in: users } }, update, { multi: true });

              case 27:
                _context12.next = 34;
                break;

              case 29:
                _context12.prev = 29;
                _context12.t4 = _context12['catch'](24);

                if (!(_context12.t4.name === 'MongoError' && isMongoMixError(_context12.t4.err || _context12.t4.errmsg))) {
                  _context12.next = 33;
                  break;
                }

                throw new Error(mixingGroupAndNonGroupErrorMsg);

              case 33:
                throw _context12.t4;

              case 34:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this, [[24, 29]]);
      }));

      function _updateUserRoles(_x22, _x23, _x24, _x25) {
        return _ref12.apply(this, arguments);
      }

      return _updateUserRoles;
    }() // end _updateUserRoles

  }]);
  return Roles;
}();

(0, _assign2.default)(Roles, {
  /**
   * Constant used to reference the special 'global' group that
   * can be used to apply blanket permissions across all groups.
   *
   * @example
   *     Roles.addUsersToRoles(user, 'admin', Roles.GLOBAL_GROUP)
   *     Roles.userIsInRole(user, 'admin') // => true
   *
   *     Roles.setUserRoles(user, 'support-staff', Roles.GLOBAL_GROUP)
   *     Roles.userIsInRole(user, 'support-staff') // => true
   *     Roles.userIsInRole(user, 'admin') // => false
   *
   * @property GLOBAL_GROUP
   * @type String
   * @static
   * @final
   */
  GLOBAL_GROUP: '__global_roles__'
});

function isMongoMixError(errorMsg) {
  var expectedMessages = ['Cannot apply $addToSet modifier to non-array', 'Cannot apply $addToSet to a non-array field', 'Can only apply $pullAll to an array', 'Cannot apply $pull/$pullAll modifier to non-array', "can't append to array using string field name", 'to traverse the element'];

  return _underscore2.default.some(expectedMessages, function (snippet) {
    return strContains(errorMsg, snippet);
  });
}

function strContains(haystack, needle) {
  return -1 !== haystack.indexOf(needle);
}