/* jslint node: true */
"use strict";

global.modulesCache = global.modulesCache || {};
if(global.modulesCache.modelator){
  module.exports = global.modulesCache.modelator;
  return;
}

var crier = require('crier').addGroup('modelator');
var ObjectArray = require('objectarray');
var i18n = require('textualization');
require('date.format');

i18n.load('modelator',__dirname+'/languages/');

var models =module.exports = global.modulesCache.modelator = require('./lib/models');

for(var i=0,k=Object.keys(models),l=k.length;i<l;i++){
  var key = k[i];
  global[key]=models[key];
}

console.log(global);

/*

module.exports.schemaAPI = require('./lib/schemaAPI');
module.exports.mongoInterface = require('./lib/mongoInterface');

*/