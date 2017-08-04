/* jslint node: true, esnext: true */
"use strict";

const {Field} = module.exports = require("./controllables");

const Text = module.exports.Text = function(config = {}){
  Field.call(this, config);
};
  Text.prototype = Object.create(Field.prototype);
  Text.prototype.constructor = Text;


const Int = module.exports.Int = function(config = {}){
  Field.call(this, config);
  this.on('insert',Int.onSet);
  this.on('update',Int.onSet);
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
        return done('invalid-index:');
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
  this.on('retrieve',this.retrieve);
  this.on('update',this.set);
  this.on('insert',this.set);
};
  Checkbox.prototype = Object.create(Field.prototype);
  Checkbox.prototype.constructor = Checkbox;
  Checkbox.prototype.retrieve = function checkBoxRetrieve(context, done){
    context.result = context.result? true : false;
    return done();
  };
  Checkbox.prototype.set = function checkBoxSet(context, done){
    context.result = context.result? true : false;
    return done();
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

