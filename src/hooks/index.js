const _ = require('lodash');
const bcrypt = require('bcryptjs');
const errors = require('feathers-errors');

// Add any common hooks you want to share across services in here.
//
// Below is an example of how a hook is written and exported. Please
// see http://docs.feathersjs.com/hooks/readme.html for more details
// on hooks.

exports.authenticateAPI = function(options){
  return (hook) => {
    if (hook.type !== 'before') {
      throw new Error(`The 'authenticateAPI' hook should only be used as a 'before' hook.`);
    }
    // If it was an internal call then skip this hook
    if (!hook.params.provider) {
      return hook;
    }
    const appKey = hook.params.youpinAppKey;
    if (!appKey) {
      throw new errors.NotAuthenticated('Authentication X-YOUPIN-3-APP-KEY is missing.');
    }
    const appKeySplit = appKey.split(':');
    if (appKeySplit.length !== 2) {
      throw new errors.NotAuthenticated('Incorret X-YOUPIN-3-APP-KEY format');
    }
    const appKeyId = appKeySplit[0];
    const apiKeyPassword = appKeySplit[1];
    console.log('Authenticated API 3rd App Id: ', appKeyId);
    return new Promise((resolve, reject) => {
      hook.app.service('/app3rds').get(appKeyId).then(app3rd => {
        const isVerified = bcrypt.compareSync(apiKeyPassword, app3rd.apikey);
        if (isVerified !== true) {
          throw new errors.NotAuthenticated('API KEY is not correct for this app id.');
        }
        hook.params.app3rd = app3rd; // eslint-disable-line no-param-reassign
        return resolve(hook);
      })
      .catch(reject);
    });
  };
};


function swapLatLongHelper(data) {
  if (Array.isArray(data)) {
    data = data.map(obj => {
      if (obj.location) {
        obj.location.coordinates = [obj.location.coordinates[1], obj.location.coordinates[0]];
      }
      return obj;
    });
  } else {
    // Single object
    if (data.location) {
      data.location.coordinates =
        [data.location.coordinates[1], data.location.coordinates[0]];
    }
  }
  return data;
}

// Mongo stores as [Long,Lat] but we want [Lat, Long]. So, swap them.
exports.swapLatLong = function(options) {
  return function(hook) {
    // BeforeHook
    var data = _.get(hook, 'data');
    if (data) {
      hook.data = swapLatLongHelper(data);
      return;
    }
    data = _.get(hook, 'result');
    if (data) {
      // check if it is array -> result: { data: []}
      // or single object -> result: { id: ..., detail: ...}
      if (data.data) {
        hook.result.data = swapLatLongHelper(data.data);
      } else {
        hook.result = swapLatLongHelper(data);
      }
    }
  };
};
