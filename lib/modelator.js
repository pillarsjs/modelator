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
const {Tree, TreeArray} = require("./Tree");
const pointerParse = require("./Pointer");
const endpoints = require("./endpoints");

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
  Modelator.prototype.do = function(method, payload, cb, uid, keys, exec){
    const modelator = this;

    if(!Array.isArray(keys)){
      keys = (typeof keys === 'string')? [keys] : [];
    } else {
      keys = keys.slice();
    }

    const originalPayload = payload;
    if(["count", "get"].indexOf(method) >= 0){
      payload = Tree.create(payload);
    }
    if(["insert", "update"].indexOf(method) >= 0){
      payload._id = payload._id || absoluteId();
    }

    const context = {
      modelator, method, payload: originalPayload, uid, keys, 
      input : payload,
      errors : new Map(),
      inserts : new Map(),
      updates : new Map(),
      removes : new Map(),
      filters : new Map(),
      pointers : new Map(),

      parents : [{
        ref : modelator.id,
        id : payload._id,
        driver : modelator.driver
      }]
    };
    context.context = context;

    modelator.fire(context, true, function(){

      context.inserts = new Map([...context.inserts].reverse());
      context.updates = new Map([...context.updates].reverse());
      context.removes = new Map([...context.removes].reverse());

      const error = Object.keys(context.errors).length > 0 || false;
      resultShow(error, context);

      // Es necesario refactorizar Modelator para terminar de unir las piezas:
      //   Los retrieve deben pasar de nuevo por Modelator para procesar la salida
      //   Deben filtrarse y normalizarse la forma de devolver los errores y los resultados
      //   Es necesario plantear el flujo común de todos los metodos y si esto implica ajustes en las transacciones etc

      //   Para tener en menos tiempo el montaje de los REST endpoints se puede prototipar esa parte y volver más adelante para afinar

      if(exec){
      
        const transaction = new Transaction(context, function(error, transaction){

          for(const result of transaction.results){
            console.log( (' Transaction ' + result.method + ' ok for '   + pointerParse(result.pointer)).bgCyan + '\n' + ("(collection:" + result.collection + ") ").yellow + (result.parents.length? "(parents:" + result.parents + ")" : "(main)").yellow + '\n' + traceResults(result.result, 1000) ); // ('Sentence:\n' + traceResults(result.sentence, 1000)) +
          }
          for(const result of transaction.counts){
            console.log( (' Transaction ' + result.method + ' ok for '   + pointerParse(result.pointer)).bgCyan + '\n' + ("(collection:" + result.collection + ") ").yellow + (result.parents.length? "(parents:" + result.parents + ")" : "(main)").yellow + '\n' + traceResults(result.result, 1000) ); // ('Sentence:\n' + traceResults(result.sentence, 1000)) +
          }
          for(const result of transaction.gets){
            console.log( (' Transaction ' + result.method + ' ok for '   + pointerParse(result.pointer)).bgCyan + '\n' + ("(collection:" + result.collection + ") ").yellow + (result.parents.length? "(parents:" + result.parents + ")" : "(main)").yellow + '\n' + traceResults(result.result, 1000) ); // ('Sentence:\n' + traceResults(result.sentence, 1000)) +
          }
          for(const reverse of transaction.reverse){
            console.log( (' Transaction ' + reverse.method + ' ok for ').bgYellow, reverse.collection, reverse.index, reverse.relation);
          }
          if(error){
            console.log( (' Transaction ' + error.method + ' error for ' + pointerParse(error.pointer)).bgRed   + '\n' + ("(collection:" + error.collection  + ") ").yellow + (error.parents.length?  "(parents:" + error.parents  + ")" : "(main)").yellow + '\n' + traceResults(error.result, 1000)  ); // ('Sentence:\n' + traceResults(error.sentence, 1000))  +
          }
          
          transaction.close(function(){
            if(cb) {
              cb(error, context, transaction);
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
  Modelator.prototype.count = function(){
    this.do('count', ...arguments);
  };
  Modelator.prototype.get = function(){
    this.do('get', ...arguments);
  };
  Modelator.prototype.generateApi = endpoints;











/*                      */
/* Console output utils */
/*                      */

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
    output[pointerParse(pointer)] = sentence;
  }
  return traceResults(new Tree(output), limit, space);
}
function traceProjections(sentences){
  const output = {};
  for(const [pointer, sentence] of sentences){
    output[pointerParse(pointer, true)] = JSON.stringify(sentence);
  }
  return output;
}
function traceCounts(sentences){
  const output = {};
  for(const [pointer, sentence] of sentences){
    output[pointerParse(pointer, true)] = sentence;
  }
  return output;
}

function resultShow(error, context){

  console.log("\n\n  MODELATOR OUTPUT\n".black.bgWhite + "\n");
  console.log("\n    PAYLOAD:\n".bgCyan,    traceResults(context.payload, 5750), "\n");
  console.log("\n    POINTERS:\n".bgCyan,   traceProjections(context.pointers, 5750), "\n");
  console.log("\n    ERRORS:\n".bgRed,      traceSetencesMap(context.errors, 750), "\n");
  console.log("\n    MAIN:\n".bgCyan,       traceResults(context.result, 750), "\n");
  console.log("\n    INSERTS:\n".bgGreen,   traceSetencesMap(context.inserts, 750), "\n");
  console.log("\n    UPDATES:\n".bgGreen,   traceSetencesMap(context.updates, 750), "\n");
  console.log("\n    REMOVES:\n".bgGreen,   traceSetencesMap(context.removes, 750), "\n");
  console.log("\n    FILTERS:\n".bgGreen,   traceSetencesMap(context.filters, 750), "\n");

}