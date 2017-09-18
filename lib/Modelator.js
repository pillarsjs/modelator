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
/*    Copyright (c) 2014-2017 Francisco Javier Gallego Martín.
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
  Modelator.prototype.response = function(errors, transaction){
    const response = {errors: []};
    if(errors){
      // console.log(" ENDPOINT ERRORS: ".bgRed);
      for(const [pointer, error] of errors){
        response.errors.push({
          type : 'validationError', // TODO: all string errors to error objects
          pointer : pointerParse(pointer.slice(1)),
          msg: error,
          stack : "..."
        });
        // console.log("   " + pointerParse(pointer.slice(1)).red, error);
      }
    } else if(transaction.context.method === 'get') {
      response.data = transaction.main;
      response.included = [];
      // console.log(" ENDPOINT RESULTS: ".bgGreen, response.data);
      for(const [pointer, result] of transaction.results){
        response.included.push({
          pointer : pointerParse(pointer.slice(1)),
          data: result
        });
        // console.log("   " + pointerParse(pointer.slice(1), true).green, result);
      }
    } else {
      // console.log(" ENDPOINT RESULTS INSERT IDS: ".bgGreen, response.data);
      for(const [pointer, result] of transaction.results){
        response.ids = response.ids || [];
        if(result.insertedIds){
          response.ids.push({
            pointer : pointerParse(pointer.slice(1)),
            id: result.insertedIds[0]
          });
        }
        // console.log("   " + pointerParse(pointer.slice(1), true).green, result);
      }
      // console.log(" ENDPOINT OK ".bgGreen);
    }
    // console.log();
    return response;
  };
  Modelator.prototype.do = function(method, payload, cb, uid, keys, exec){
    const modelator = this;

    if(!Array.isArray(keys)){
      keys = (typeof keys === 'string')? [keys] : [];
    } else {
      keys = keys.slice();
    }

    const originalPayload = payload;
    if(method === 'get'){
      payload = Tree.create(payload);
    }
    if(['insert', 'update'].indexOf(method) >= 0){
      payload._id = payload._id || absoluteId();
    }

    const context = {
      modelator, method, payload: originalPayload, uid, keys, 
      input : payload,
      errors : new Map(),
      inserts : new Map(),
      updates : new Map(),
      removes : new Map(),
      getters : new Map(),
      pointers : new Map(),

      parents : [{
        ref : modelator.id,
        id : payload._id,
        driver : modelator.driver
      }]
    };
    context.context = context;

    modelator.fire(context, function(){

      // TODO: es necesario plantear un nuevo metodo para separar el proceso de query del de get, ya que los valores solo estarán en el segundo caso

      context.inserts = new Map([...context.inserts].reverse());
      context.updates = new Map([...context.updates].reverse());
      context.removes = new Map([...context.removes].reverse());
      context.getters = new Map([...context.getters].reverse());

      const error = context.errors.size > 0 || false;
      /* *
      resultShow(context);
      /* */

      if(error){
        cb(modelator.response(context.errors));
      } else {
        if(exec){
          new Transaction(context, function(error){
            const transaction = this;
            if(error){
              context.errors.set(error.pointer, error.error);
              /* *
              console.log("\n    TRANSACTION ERROR:\n".bgRed,   traceSetencesMap(context.errors, 750), "\n");
              /* */
              cb(modelator.response(context.errors));
            } else {
              /* *
              if(method === 'get'){
                console.log(
                  "\n    TRANSACTION RESULT:\n".bgGreen,
                  transaction.main,
                  traceSetencesMap(transaction.results, 1000),
                  "\n"
                );
              } else {
                console.log("\n    TRANSACTION SUCCESS".bgGreen);
              }
              /* */
              cb(modelator.response(undefined, transaction));
            }
          });


        } else {
          // if no 'exec' return context instead of transaction
          cb(modelator.response(undefined, context)); 
        }
      }
    });
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

function resultShow(context){
  console.log("\n\n  MODELATOR OUTPUT\n".black.bgWhite + "\n");
  console.log("\n    PAYLOAD:\n".bgCyan,    traceResults(context.payload, 5750), "\n");
  console.log("\n    POINTERS:\n".bgCyan,   traceProjections(context.pointers, 5750), "\n");
  console.log("\n    ERRORS:\n".bgRed,      traceSetencesMap(context.errors, 750), "\n");
  console.log("\n    MAIN:\n".bgCyan,       traceResults(context.result, 750), "\n");
  console.log("\n    INSERTS:\n".bgGreen,   traceSetencesMap(context.inserts, 750), "\n");
  console.log("\n    UPDATES:\n".bgGreen,   traceSetencesMap(context.updates, 750), "\n");
  console.log("\n    REMOVES:\n".bgGreen,   traceSetencesMap(context.removes, 750), "\n");
  console.log("\n    GETTERS:\n".bgGreen,   traceSetencesMap(context.getters, 750), "\n");
}