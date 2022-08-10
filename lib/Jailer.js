/* jslint node: true, esnext: true */
"use strict";

const Jailer = module.exports = function Jailer(actionsLocks = {}){
  for(const actionLocks in actionsLocks){
    this[actionLocks] = actionsLocks[actionLocks];
  }
};
  Jailer.prototype.check = function(action,keys){
    let locks = this[action];
    if(!locks){return true;}

    if(!Array.isArray(locks)){locks = (typeof locks === 'string')? [locks] : [];}
    if(!Array.isArray(keys)){keys = (typeof keys === 'string')? [keys] : [];}

    let grant;
    for(let lock of locks){
      lock = lock.split(' ');
      grant = true;
      for(let key of lock){
        if(keys.indexOf(key) === -1){
          grant = false;
          break;
        }
      }
      return grant;
    }
    return false;
  };
