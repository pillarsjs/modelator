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
const absoluteId = require("./AbsoluteId");
require("colors");

// TODO B: asyn/await, race fields...
// TODO B: review context objects with setters/getters concept





const Transaction = module.exports.Transaction = function(context, done){
  const transaction = this;
  transaction.done = done;
  transaction.results = [];
  transaction.reverse = [];
  transaction.projection = context.projection;
  transaction.uid = context.uid;
  transaction.keys = context.keys;
  transaction.pointer = context.parents;
  transaction.chain = new Chain();

  const driver =   context.parents[0].driver;
  const handler = driver.handle(context.method, transaction, transaction.pointer, context.result, true);
  transaction.chain.add(driver[context.method].bind(driver), transaction, transaction.pointer, context.result, true, handler);

  transaction.mountSentences("insert", context.inserts);
  transaction.mountSentences("update", context.updates);
  transaction.mountSentences("remove", context.removes);

  transaction.chain.add(done,undefined).pull();
};
  Transaction.prototype.mountSentences = function(method, sentences){
    const transaction = this;
    if(sentences){
      for(const [pointer, sentence] of sentences){
        const driver = pointer.slice(-1)[0].driver;
        const handler = driver.handle(method, transaction, pointer, sentence, false);
        transaction.chain.add(driver[method].bind(driver), transaction, pointer, sentence, false, handler);
      }
    }
  };










const Controllable = module.exports.Controllable = function(config = {}){
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
  Controllable.prototype.fire = function(context, auth, next){
    const controllable = this;

    let controller;
    if(arguments.length > 3){
      controller = arguments[2];
      next = arguments[3];
    }
    controller = controller || controllable.controller;
    const controllerName = controller.name;
    
    const fromData = ["projection", "retrieve", "remove"].indexOf(context.context.method) >= 0;
    const result = fromData? context.data : context.input;
    context.result = result;

    debug(("  " + context.method.charAt(0).toUpperCase() + context.method.slice(1) + ": \t").bgMagenta + (" " + (dotPath(context.parents))).magenta, traceResults(context.data));


    const every = controllable.internal || (context.method === "insert" && controllable.required) || context.method === "projection";
    if(every || context.result !== undefined){
      
      const keysCheck = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys);
      const keysCheckAsOwner = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys.concat(['owner']));
      const keysCheckAsGuest = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys.concat(['guest']));


      const projection = {
        id : controllable.id,
        index : controllable.index,
        unique : controllable.unique,
        main : controllable.main,
        required : controllable.required,
        credentials: keysCheck,           // have or not basic credential for the method on this field
        guest : keysCheckAsOwner,         // need to be guest for do the method on this field
        owner : keysCheckAsGuest,         // need to be owner for do the method on this field
                                          // both (guest & owner) on true: need to be (owner || guest) for do the method on this field
      };
      Object.defineProperty(projection, 'controllable', {
        enumerable : false,
        value : controllable
      });
      Object.defineProperty(projection, 'context', {
        enumerable : false,
        value : context
      });
      context.projection.set(context.parents, projection);


      debug("  Cheking:\t".bgYellow + (" " + (dotPath(context.parents))).yellow + (" " + (controllable.internal? '(internal) ' : '') + (controllable.required? '(required) ' : '')).yellow + (keysCheck? 'ok!'.green : 'nop!'.red));
      if(keysCheck || controllable.internal || keysCheckAsOwner || keysCheckAsGuest){
        const handlers = (controllable.handlers[context.method] || []).concat(controllable.userOn[context.method] || []);
        handlers.unshift(controller);
        const chain = new Chain();
        
        if(controllable.i18n){
          context.result = new Tree(context.result);

          for(const lang of context.modelator.languages){
            const subcontext = Object.assign({}, context, {
              index : lang,
              data : context.data? context.data[lang] : undefined,
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
      debug("  Error:\t".bgRed,     (dotPath(context.parents)).bold.grey, context.error, new Error("Error!"));
      context.errors.set(context.parents, context.error);
      done();
    } else if (context.parent){
      if(typeof context.result === 'object' && Object.keys(context.result).length === 0 ){
        context.result = undefined;
      }
      // debug("indexing".bgCyan, context.parent.result, dotPath(context.parents.parents), context.result);
      if(context.parent.result[context.index] || context.result !== undefined){
        debug("  Handling:\t".bgCyan, (dotPath(context.parents)).bold.cyan, traceResults(context.result));
        context.parent.result[context.index] = context.result;
      } else {
        debug("  Ignoring:\t".black.bgWhite, (dotPath(context.parents)).bold.grey, traceResults(context.result));
      }
      
      next();
    } else {
      return done();
    }
  };













const Schema = module.exports.Schema = function schemaController(config = {}){
  const schema = this;
  Controllable.call(this, config);

  schema.driver = config.driver;

  schema.schema = config.schema || [];
  schema.schema.splice(0, 0, ...[
    new Controllable({
      id : "_id",
      on : {
        /*
        retrieve : [function getId(context, done){
          let id;
          if(context.parents.length === 1){ // entity root level
            id = context.entity._id;
          } else {
            id = context.parents.slice(-2,-1)[0];
            id = Array.isArray(id)? id[0] : id;
          }
          context.result = id;
          done();
        }]
        */
      }
    }),
    new Controllable({
      id : "_owner",
      internal : true,
      on : {
        insert : [function setOwner(context, done){
          context.result = context.uid;
          done();
        }]
      }
    }),
    new Controllable({
      id : "_guests",
      values : ["userA","userB","userC"]
    }),
    new Controllable({
      id : "_ctime",
      internal : true,
      on : {
        insert : function timeStamp(context, done){
          context.result = Date.now();
          done();
        }
      }
    }),
    new Controllable({
      id : "_mtime",
      internal : true,
      on : {
        insert : [function timeStamp(context, done){
          context.result = Date.now();
          done();
        }],
        update : [function timeStamp(context, done){
          context.result = Date.now();
          done();
        }]
      }
    })
  ]);
};
  Schema.prototype = Object.create(Controllable.prototype);
  Schema.prototype.constructor = Schema;
  Schema.prototype.controller = function(context, done){
    const schema = this;
    const indexes = Object.keys(context.result || {});
    // debug("SCHEMA".black.bgWhite, dotPath(context.parents), context.result, indexes);

    const result = context.result;
    context.result = new Tree();

    const chain = new Chain();

    for(const field of schema.schema){
      const index = field.id;
      const checkIndex = indexes.indexOf(index);
      if(checkIndex >= 0){
        indexes.splice(checkIndex,1);
      }
      // debug("FIELD".bgWhite, dotPath(context.parents), index);

      const subcontext = Object.assign({}, context, {
        index,
        data : context.data? context.data[field.id] : undefined,
        input : context.input? context.input[field.id] : undefined,
        result: undefined,
        parents : context.parents.concat([field.id]),
        parent : context
      });
      chain.add(field.fire.bind(field, subcontext, false));
    }
    for(const index of indexes){
      if(index !== "__id"){
        context.errors.set(context.parents.concat([index]), 'unknow-input-field');
      }
    }
    chain.add(done, undefined).pull();
  };














const SchemaArray = module.exports.SchemaArray = function(config = {}){
  const schemaArray = this;
  Schema.call(this, config);

  schemaArray.driver = config.driver;
  schemaArray.on("retrieve", SchemaArray.retrieve);
};
  SchemaArray.prototype = Object.create(Controllable.prototype);
  SchemaArray.prototype.constructor = SchemaArray;
  SchemaArray.prototype.retrieve = function(context, done){
    const schemaArray = this;
    if(context.schemaArrayMain){
      const result = new TreeArray();
      for (const index in context.result){
        result.push(context.result[index]);
      }
      context.result = result;
    }
    return done();
  };
  SchemaArray.prototype.controller = function schemaArrayController(context, done){
    const schemaArray = this;
    // debug("SCHEMA-ARRAY".black.bgWhite, dotPath(context.parents), context.result);

    let result = context.result;
    context.result = new Tree();
    context.schemaArrayMain = true;

    if(context.method !== 'retrieve'){
      context.parent = null; // avoid save to main
    }
    if(context.method === 'projection'){
      result = [{}];
    }

    const chain = new Chain();
    for(const index in result){ // agnostic iterator (array or object for projections)

      let method = context.method;
      if(method === 'insert'){
        result[index]._id = result[index].__id || absoluteId();
      } else if(method === 'update'){
        if(!result[index].hasOwnProperty("_id")){
          result[index]._id = result[index].__id || absoluteId();
          method = 'insert';
        } else if(Object.keys(result[index]).length > 1) {
          method = 'update';
        } else {
          method = 'remove';
        }
      } else if(method === 'remove'){
        result[index]._id = index;
      } else if(method === 'retrieve'){
        result[index]._id = index;
      }

      const indexId = result[index]._id;
      if(indexId != index){
        result[indexId] = result[index];
      }
      
      context.result[indexId] = new Tree();

      if(context.context.method === 'insert' || context.context.method === 'remove'){
        if(method !== context.context.method){
          return done('invalid-array-format');
        }
      }

      const subcontext = Object.assign({}, context, {
        method,
        result : result[indexId],
        index : indexId,
        data : context.data? context.data[index] : undefined,
        input : context.input? context.input[index] : undefined,
        // path : context.method !== 'projection'? context.path.concat([indexId]) : context.path, // TODO: check projections about new pointers/parents
        parents : context.parents.concat([{
          ref : schemaArray.id,
          id : indexId,
          driver : schemaArray.driver
        }]),
        parent : context,
        schemaArrayMain : false
      });
      chain.add(schemaArray.fire.bind(schemaArray, subcontext, true, Schema.prototype.controller));
      chain.add(schemaArray.arrayHandle.bind(schemaArray), subcontext, done);
    }

    chain.add(done,undefined).pull();
  };
  SchemaArray.prototype.arrayHandle = function(context, done, next){
    const schemaArray = this;
    if(context.result !== undefined){
      if(context.method === 'insert'){
        context.inserts.set(context.parents, context.inserts.get(context.parents) || []);
        context.inserts.get(context.parents).push(context.result);
      } else if(context.method === 'update'){
        // TODO: check if empty (only internals _mtime _id ...)
        context.updates.set(context.parents, context.result);
      } else if(context.method === 'remove'){
        context.removes.set(context.parents, context.result);
      }
    }
    next();
  };













const Modelator = module.exports.Modelator = function(config = {}){
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
  Modelator.prototype = Schema.prototype = Object.create(Schema.prototype);
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
















// TODO: default validations utils (for event api) regexp, nmin,nmax,lmin,lmax,required,date...
const Field = module.exports.Field = function (config = {}){
  const field = this;
  Controllable.call(field, config);
  
};
  Field.prototype = Object.create(Controllable.prototype);
  Field.prototype.constructor = Field;















/*                      */
/* Console output utils */
/*                      */

function debug (){
  if(Modelator.debug){
    console.log(...arguments);
  }
}

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
      const entityId = context.method === 'insert'? input._id : context.data._id;
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