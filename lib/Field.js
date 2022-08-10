/* jslint node: true, esnext: true */
"use strict";

const Controllable = require("./Controllable");

// TODO: default validations utils (for event api) regexp, nmin,nmax,lmin,lmax,required,date...
const Field = module.exports = function Field(config = {}){
  const field = this;
  Controllable.call(field, config);
  
};
  Field.prototype = Object.create(Controllable.prototype);
  Field.prototype.constructor = Field;
