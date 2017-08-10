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

const absoluteId = require("./AbsoluteId");
const Transaction = require("./Transaction");
const Schema = require("./Schema");

const Modelator = module.exports = function Modelator(config = {}){
  const modelator = this;
  Schema.call(modelator, config);

  modelator.driver = config.driver;

  let languages = [];
  Object.defineProperty(modelator, "languages", {
    enumerable : true,
    get : function(){return languages;},
    set : function(set){
      languages = Array.isArray(set)? set : [set];
    }
  });
  modelator.languages = config.languages || [];

  let limit;
  Object.defineProperty(modelator, "limit", {
    enumerable : true,
    get : function(){return limit;},
    set : function(set){
      limit = parseInt(set, 10);
    }
  });
  modelator.limit = config.limit || 5;
};
  Modelator.prototype = Object.create(Schema.prototype);
  Modelator.prototype.constructor = Modelator;
  Modelator.prototype.do = function(method, entity, payload, cb, uid, keys, exec){
    const modelator = this;

    if(!Array.isArray(keys)){
      keys = (typeof keys === 'string')? [keys] : [];
    } else {
      keys = keys.slice();
    }

    const id = (payload && payload._id) || (entity && entity._id) || absoluteId();

    if(payload){payload._id = id;}
    if(entity){entity._id = id;}

    const context = {
      modelator, method, entity, payload, uid, keys, 
      data : entity,
      input : payload,
      errors : new Map(),
      inserts : new Map(),
      updates : new Map(),
      removes : new Map(),
      projection : new Map(),
      // path : [],
      parents : [{
        ref : modelator.id,
        id : id,
        driver : modelator.driver
      }]
    };
    context.context = context;

    modelator.fire(context, true, function(){

      context.inserts = new Map([...context.inserts].reverse());
      context.updates = new Map([...context.updates].reverse());
      context.removes = new Map([...context.removes].reverse());

      const error = Object.keys(context.errors).length > 0 || false;
      // resultShow(error, context);

      if(exec){
      
        const transaction = new Transaction(context, function(error){

          for(const result of transaction.results){
            console.log( ('Transaction ' + result.method + ' ok for '   + dotPath(result.pointer)).bgCyan + '\n' + ("(collection:" + result.collection + ") ").yellow + (result.parents.length? "(parents:" + result.parents + ")" : "(main)").yellow + '\n' + ('Sentence:\n' + traceResults(result.sentence, 1000)) + traceResults(result.result, 1000) );
          }
          for(const reverse of transaction.reverse){
            console.log( ('Transaction ' + reverse.method + ' ok for ').bgYellow, reverse.collection, reverse.index, reverse.relation);
          }
          if(error){
            console.log( ('Transaction ' + error.method + ' error for ' + dotPath(error.pointer)).bgRed   + '\n' + ("(collection:" + error.collection  + ") ").yellow + (error.parents.length?  "(parents:" + error.parents  + ")" : "(main)").yellow + '\n' + ('Sentence:\n' + traceResults(error.sentence, 1000))  + traceResults(error.result, 1000)  );
          }
          
          transaction.close(function(){
            if(cb) {
              cb(error, context);
            }
          });

        });
      } else {
        if(cb) {
          cb(error, context);
        }
      }

    });
  };
  Modelator.prototype.projection = function(){
    this.do('projection', ...arguments);
  };
  Modelator.prototype.retrieve = function(){
    this.do('retrieve', ...arguments);
  };
  Modelator.prototype.insert = function(){
    this.do('insert', ...arguments);
  };
  Modelator.prototype.update = function(){
    this.do('update', ...arguments);
  };
  Modelator.prototype.remove = function(){
    this.do('remove', ...arguments);
  };










/*                      */
/* Console output utils */
/*                      */



function dotPath(parents){
  return parents.map(function(v, i){
    const isObject = typeof v === 'object';
    v = isObject? (i === 0? v.ref : '') + '[' + v.id + ']' : v;
    return (i > 0 && !isObject? '.' : '') + v;
  }).join('');
}

function traceResults(result, limit = 256, space = "", grey = false){
  if(result === undefined){
    return '(undefined)'.grey;
  } else {
    let stringify = JSON.stringify(result, undefined, 2).split("\n");
    const length = stringify.length;
    if(length > 1){
      stringify = (" " + space + stringify.join("\n"+space));
    } else {
      stringify = " " + stringify[0];
    }
    result = ("(" + (result.constructor? result.constructor.name : 'anonymous') + ")").grey + (grey? stringify.grey : stringify);
    result = result.length > limit? result.slice(0,limit) + '\n...etc (' + length + ' lines).' : result;
    return result;
  }
}

function traceSetencesMap(sentences, limit, space){
  const output = {};
  for(const [pointer, sentence] of sentences){
    output[dotPath(pointer)] = sentence;
  }
  return traceResults(output, limit, space);
}

function resultShow(error, context){

  console.log("\n\n  MODELATOR OUTPUT\n".black.bgWhite + "\n");
  console.log("\n    PROJECTION:\n".bgCyan, traceSetencesMap(context.projection, 750), "\n");
  console.log("\n    ERRORS:\n".bgRed,      traceSetencesMap(context.errors, 750), "\n");
  console.log("\n    MAIN:\n".bgCyan,       traceResults(context.result, 750), "\n");
  console.log("\n    INSERTS:\n".bgGreen,   traceSetencesMap(context.inserts, 750), "\n");
  console.log("\n    UPDATES:\n".bgGreen,   traceSetencesMap(context.updates, 750), "\n");
  console.log("\n    REMOVES:\n".bgGreen,   traceSetencesMap(context.removes, 750), "\n");

}