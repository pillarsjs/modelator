/*
/*    Copyright (C) 2017 Consuelo Quilón Gómez <cheloq.at.gmail.com>
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
/*    The Initial Developer of the Original Code is Consuelo Quilón Gómez <cheloq.at.gmail.com>.
/*    Copyright (c) 2014-2017 Consuelo Quilón Gómez.  All rights reserved.
/*/

/* jslint node: true, esnext: true */
"use strict";

const Field = require("../Field");

const Select = module.exports = function(config = {}){
  Field.call(this, config);
  this.values = config? config.values : [];
  this.multiple = (config && config.multiple);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
};
  Select.prototype = Object.create(Field.prototype);
  Select.prototype.constructor = Select;
  Select.prototype.onSet = function selectSet(context, done){
    if (!Array.isArray(context.result)){
      return done('Value-is-not-in-an-Array');
    }else{
      const values =context.result;
      if(!this.multiple && values.length > 1){
        return done('no-multiple');
      }
      const result = [];
      for(const value of values){
        if(this.values.indexOf(value)>=0){
          if(result.indexOf(value) < 0){
            result.push(value);
          } else {
            return done('duplicate-index');
          }
        } else {
          return done('invalid-index');
        }
      }
      context.result = result;
      return done();
    }
  };