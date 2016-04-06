module.exports = function(server) {

  var ds = server.dataSources.postgres;

  function automigrate() {

    ds.automigrate([
      "Accounts",
      "AccountUsers",
      "Users",
      "AccessToken",
      "ACL",
      "RoleMapping",
      "Role"
    ], function onAutoMigrate(err, result) {

      if (err)
        return console.error("auto migrate error ", err);
      console.log("auto migrate ", result);
      createUser();
    });

  }

  function createPrincipal(createdRole, createdUser, cb){
    var RoleMappings = server.models.RoleMapping;

    createdRole.principals.create({
      principalType: RoleMappings.USER,
      principalId: createdUser.id
    }, function(err, rolePrincipal) {
      err &&  console.error('error creating rolePrincipal', err);
      cb();
    });

  }

  function createAccount(user, cb){
    if( user.id === 1)
      return user.accounts.create({}, function(err, _account){

        account = _account; // hack because not even the AccountUsers works
        cb();
      });

    user.accounts.add(account, function(){
      cb();
    });

    // TODO: why doesn't this work?, the res is filled correctly but data is no persisted.
    /*server.models.AccountUsers.create({accountsid:1, usersid:2}, function(err, res){
      console.log(err, res);
      cb();
    });*/
  }

  var account;

  var roles = [{
    name: 'user',
    users: [{
      id: 2,
      firstName: 'user',
      lastName: 'loopback',
      email: 'user@user.com',
      username: 'user',
      password: 'user'
    }]
  },{
    name: 'admin',
    users: [{
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@admin.com',
      username: 'admin',
      password: 'admin'
    }]
  }];

  function createUser(role) {

    if( !role && !roles.length )
      return console.info("database filled");

    var Users = server.models.Users;
    var Roles = server.models.Role;

    if( !role ) role = roles.pop();

    Roles.findOrCreate(
      {where: {name: role.name}}, // find
      {name: role.name}, // create
      function(err, createdRole, created) {

        err && console.error('error running findOrCreate('+role.name+')', err);

        role.users.forEach(function(roleUser) {
          Users.findOrCreate(
            {where: {username: roleUser.username}}, // find
            roleUser, // create
            function(err, createdUser, created) {

              err && console.error('error creating roleUser', err);
              createPrincipal(createdRole, createdUser, function(){

                createAccount(createdUser, function(){
                  createUser();
                });

              });

            });
        });
      });
  }


  if(ds.connected)
    automigrate();
  else
    ds.once('connected', automigrate);
};
