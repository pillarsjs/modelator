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

const Chain = require("./Chain");
const Jailer = require("./Jailer");
const {Tree, TreeArray} = require("./Tree");
const pointerParse = require("./Pointer");

// TODO B: asyn/await, race fields...
// TODO B: review context objects with setters/getters concept

const Controllable = module.exports = function Controllable(config = {}){
  const controllable = this;
  controllable.id = config.id || 'noid';
  controllable.index = config.index || false;       // is a index on DB
  controllable.unique = config.unique || false;     // is a unique index on DB
  controllable.main = config.main || false;         // is one of the minimal fields included by default on any retrieve from DB
  controllable.required = config.required || false; // require on inputData for inserts
  controllable.internal = config.internal || false; // everytime handling
  controllable.i18n = config.i18n || false;         // internationalization
  controllable.userOn = config.on || {};            // users events handlers declaration
  controllable.handlers = {};                       // real event handler stack

  let keys;
  Object.defineProperty(controllable, "keys", {
    enumerable : true,
    get : function(){return keys;},
    set : function(set = {}){
      keys = new Jailer(set);
    }
  });
  controllable.keys = config.keys;
};
  Controllable.prototype.controller = function defaultController(context, done){
    done(undefined);
  };
  Controllable.prototype.on = function(method, handler){
    this.handlers[method] = this.handlers[method] || [];
    this.handlers[method].push(handler);
    return this;
  };
  Controllable.prototype.fire = function(context, next){
    const controllable = this;

    let controller;
    if(arguments.length > 2){
      controller = arguments[1];
      next = arguments[2];
    }
    controller = controller || controllable.controller;
    const controllerName = controller.name;
    
    context.result = context.input;

    debug(("  " + context.method.charAt(0).toUpperCase() + context.method.slice(1) + ": \t").bgMagenta + (" " + (pointerParse(context.parents))).magenta, traceResults(context.input));


    const every = controllable.internal || (context.method === "insert" && controllable.required);
    if(every || context.result !== undefined){
      
      const keysCheck = controllable.keys.check( context.method, context.keys);
      const keysCheckAsOwner = controllable.keys.check(context.method, context.keys.concat(['owner']));
      const keysCheckAsGuest = controllable.keys.check(context.method, context.keys.concat(['guest']));

      debug("  Cheking:\t".bgYellow + (" " + (pointerParse(context.parents))).yellow + (" " + (controllable.internal? '(internal) ' : '') + (controllable.required? '(required) ' : '')).yellow + (keysCheck? 'ok!'.green : 'nop!'.red), keysCheckAsOwner, keysCheckAsGuest);

      const pointerDot = context.pointers.get(pointerParse(context.parents, true));
      if(!pointerDot){
        const pointerData = {
          id : controllable.id,
          index : controllable.index,
          unique : controllable.unique,
          main : controllable.main,
          required : controllable.required,
          credentials: keysCheck,                     // have or not basic credential for the method on this field
          guest : !keysCheck && keysCheckAsOwner,     // need to be guest for do the method on this field
          owner : !keysCheck && keysCheckAsGuest,     // need to be owner for do the method on this field
                                                      // both (guest & owner) on true: need to be (owner || guest) for do the method on this field
        };
        Object.defineProperty(pointerData, 'controllable', {
          enumerable : false,
          value : controllable
        });
        Object.defineProperty(pointerData, 'context', {
          enumerable : false,
          value : context
        });
        context.pointers.set(pointerParse(context.parents, true), pointerData);
      }

      if(keysCheck || controllable.internal || keysCheckAsOwner || keysCheckAsGuest){
        const handlers = (controllable.handlers[context.method] || []).concat(controllable.userOn[context.method] || []);
        handlers.unshift(controller);
        const chain = new Chain();
        
        if(controllable.i18n){
          context.result = new Tree(context.result);

          for(const lang of context.modelator.languages){
            const subcontext = Object.assign({}, context, {
              index : lang,
              input : context.input? context.input[lang] : undefined,
              result: context.result? context.result[lang] : undefined,
              parents : context.parents.concat([lang]),
              parent : context
            });
            for(const handler of handlers){
              chain.add(controllable.calling.bind(controllable), subcontext, handler.name); // only for logs
              chain.add(handler.bind(controllable), context, controllable.fieldHandlerCallback.bind(controllable, subcontext, chain));
              chain.add(controllable.handle.bind(controllable), subcontext, next);
            }
          }
          chain.add(controllable.calling.bind(controllable), context, controllerName); // only for logs
          chain.add(controller.bind(controllable), context, controllable.fieldHandlerCallback.bind(controllable, context, chain));
          chain.add(controllable.handle.bind(controllable), context, next);
        } else {
          for(const handler of handlers){
            chain.add(controllable.calling.bind(controllable), context, handler.name); // only for logs
            chain.add(handler.bind(controllable), context, controllable.fieldHandlerCallback.bind(controllable, context, chain));
            chain.add(controllable.handle.bind(controllable), context, next);
          }
        }

        if(chain.chainlinks.length > 0){
          chain.add(next).pull();
        } else {
          next();
        }
        
      } else {
        context.error = 'no-credentials';
        controllable.handle(context, next);
      }

    } else {
      next();
    }
  };
  Controllable.prototype.fieldHandlerCallback = function(context, chain, error){
    // debug("CALLBACK".black.bgWhite, typeof error, error, dotPath(context.parents), context.parent? dotPath(context.parent.parents) : undefined);
    if(error){
      context.error = error;
    }
    chain.next();
  };
  Controllable.prototype.calling = function(context, handlerName, next){
    const controllable = this;
    // debug("  Calling:\t".black.bgWhite, (dotPath(context.parents)).bold.grey, ("'" + handlerName + "'").cyan);
    next();
  };
  Controllable.prototype.handle = function(context, done, next){
    const controllable = this;
    if(context.error){
      debug("  Error:\t".bgRed,     (pointerParse(context.parents)).bold.grey, context.error, new Error("Error!"));
      context.errors.set(context.parents, context.error);
      done();
    } else if (context.parent){
      if(context.method === 'get' && typeof context.result === 'object' && Object.keys(context.result).length === 0 ){
        context.result = undefined;
      }
      // debug("indexing".bgCyan, context.parent.result, dotPath(context.parents.parents), context.result);
      if(context.parent.result[context.index] || context.result !== undefined){
        debug("  Handling:\t".bgCyan, (pointerParse(context.parents)).bold.cyan, traceResults(context.result));
        context.parent.result[context.index] = context.result;
      } else {
        debug("  Ignoring:\t".black.bgWhite, (pointerParse(context.parents)).bold.grey, traceResults(context.result));
      }
      
      next();
    } else {
      return done();
    }
  };









/*                      */
/* Console output utils */
/*                      */


function debug (){
  if(Controllable.debug){
    console.log(...arguments);
  }
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



/*
const paths = require('path');
const fs = require('node-fs');
const File = module.exports.File = function(config = {}){
  Field.call(this, config);
  this.fsPath = config.path || File.defaultFsPath;
}
  File.prototype = Object.create(Field.prototype);
  File.prototype.constructor = File;
  File.defaultFsPath = "./uploads";
  File.prototype.onInsert = function(context, done){
    this.saveFile(context, done);
  };
  File.prototype.onUpdate = function(context, done){
    this.saveFile(context, done);
  };
  File.prototype.saveFile = function saveFile(context, done){
    const field = this;
    const input = context.input;
    if(input && input.path && input.size && input.name && input.type){
      const modelatorId = context.modelator.id;
      const entityId = context.method === 'insert'? input._id : context.input._id;
      const entityTime = new Date(parseInt(entityId.toString().slice(0,8),16)*1000);
      
      const filePath = paths.join(entityTime.getUTCFullYear(), entityTime.getUTCMonth(), entityId);
      const fileAbsolutePath = paths.join(this.fsPath, modelatorId, filePath);
      const fileUID = dotPath(context.parents);

      fs.mkdir(fileAbsolutePath, undefined, true, function(error){
        if(!error){
          fs.rename(input.path, paths.join(fileAbsolutePath, fileUID), function(error){
            if(!error){
              input.moved = true;
              done({
                size: parseInt(input.size, 10) || 0,
                name: input.name,
                type: input.type,
                lastmod: input.lastModifiedDate || new Date()
              });
            } else {
              done(null, ["fields.file.move"]);
            }
          });
        } else {
          done(null, ["fields.file.directory"]);
        }
      });
    } else {
      done(null, ['fields.file.invalid']);
    }
  };

module.exports.Img = Img;
util.inherits(Img, File);
function Img(config = {}){
  File.call(this, config);
}
*/






/*

new Reference({
  id:'fieldReference',
  collection : 'system',
  headers : ['_id','_img','field1','field2','reverse']
}),

const ObjectID = require('mongodb').ObjectID;
const Reference = module.exports.Reference = function(config){
  Field.call(this,config);
  field.collection = config.collection || false;
  field.headers = config.headers || false;
}
  Reference.prototype = Object.create(Field.prototype);
  Reference.prototype.constructor = Reference;
  Reference.prototype.getter = function(value,done){
    var field = this;
    var modelator = field.modelator;
    var db = DB.collection(field.collection);
    var cols = {};
    for(var header in field.headers){cols[field.headers[header]]=true;}
    if(value.length>0){
      db.find({_id:{$in:value}},cols).toArray(function(error, items) {
        if(error){
          done(null,[error]);
        } else {
          done(items);
        }
      });
    } else {
      done([]);
    }
  };
  Reference.prototype.setter = function(current,value,done){
    var field = this;
    var list = [];
    value = value.toString().split(',');
    for(var rid in value){
      if(/^[a-f0-9]{24}$/i.test(value[rid])){list.push(new ObjectID.createFromHexString(value[rid]));}
    }
    done(list);
  };
*/