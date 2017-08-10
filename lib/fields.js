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

const Controllable = module.exports.Controllable = require("./Controllable");
const Schema = module.exports.Schema = require("./Schema");
const RelationalSchema = module.exports.RelationalSchema = require("./RelationalSchema");
const Modelator =  module.exports.Modelator = require("./Modelator");
const Field = module.exports.Field = require("./Field");


const Text = module.exports.Text = function(config = {}){
  Field.call(this, config);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
};
  Text.prototype = Object.create(Field.prototype);
  Text.prototype.constructor = Text;
  Text.prototype.onSet = function textSet(context, done){    
    if (typeof context.result != "string"){
      return done("Text-is-not-a-type-String");
    }else{
      return done();  
    }    
  };


const Int = module.exports.Int = function(config = {}){
  Field.call(this, config);
  this.on('insert', this.onSet);
  this.on('update', this.onSet);
};
  Int.prototype = Object.create(Field.prototype);
  Int.prototype.constructor = Int;
  Int.prototype.onSet = function intSet(context, done){
    if(!Number.isInteger(context.result)){
      return done('no-int');
    } else {
      context.result = parseInt(context.result);
      return done();
    }
  };


const Select = module.exports.Select = function(config = {}){
  Field.call(this, config);
  this.values = config? config.values : [];
  this.multiple = (config && config.multiple);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
};
  Select.prototype = Object.create(Field.prototype);
  Select.prototype.constructor = Select;
  Select.prototype.onSet = function selectSet(context, done){
    const values = Array.isArray(context.result)? context.result : [context.result];
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
  };


const Checkboxes = module.exports.Checkboxes = function(config = {}){
  config.multiple = true;
  Select.call(this,config);
};
  Checkboxes.prototype = Object.create(Select.prototype);
  Checkboxes.prototype.constructor = Checkboxes;


const Radios = module.exports.Radios = function(config = {}){
  Select.call(this, config);
  this.values = config.values || {};
};
  Radios.prototype = Object.create(Select.prototype);
  Radios.prototype.constructor = Radios;


const Checkbox = module.exports.Checkbox = function(config = {}){
  Field.call(this, config);  
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
};
  Checkbox.prototype = Object.create(Field.prototype);
  Checkbox.prototype.constructor = Checkbox;  
  Checkbox.prototype.onSet = function checkBoxSet(context, done){
    if (typeof context.result == "boolean"){
      return done();
    }else{
      return done("no-boolean");
    }    
  };


const Time = module.exports.Time = function(config = {}){
  Field.call(this, config);
};
  Time.prototype = Object.create(Field.prototype);
  Time.prototype.constructor = Time;


const Img = module.exports.Img = function(config = {}){
  Field.call(this, config);
};
  Img.prototype = Object.create(Field.prototype);
  Img.prototype.constructor = Img;