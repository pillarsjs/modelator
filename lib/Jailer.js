/*
/*    Copyright (C) 2017 Francisco Javier Gallego Martín <bifuer.at.gmail.com>
/*
/*    This program is free software: you can redistribute it and/or  modify
/*    it under the terms of the GNU Affero General Public License, version 3,
/*    as published by the Free Software Foundation.
/*
/*    This program is distributed in the hope that it will be useful,
/*    but WITHOUT ANY WARRANTY; without even the implied warranty of
/*    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
/*    GNU Affero General Public License for more details.
/*
/*    You should have received a copy of the GNU Affero General Public License
/*    along with this program.  If not, see <http://www.gnu.org/licenses/>.
/*
/*    The Original Code is "Pillars.js Modelator" aka "Modelator"
/*
/*    The Initial Developer of the Original Code is Francisco Javier Gallego Martín <bifuer.at.gmail.com>.
/*    Copyright (c) 2014-2017 Francisco Javier Gallego Martín.  All rights reserved.
/*/

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