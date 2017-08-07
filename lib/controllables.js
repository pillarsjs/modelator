/* jslint node: true, esnext: true */
"use strict";

const Chain = require("./Chain");
const Jailer = require("./Jailer");
const {Tree, TreeArray} = require("./Tree");
const absoluteId = require("./AbsoluteId");
require("colors");

// TODO B: asyn/await, race fields...
// TODO B: review context objects with setters/getters concept

function dotPath(path){
  return path.map(function(v, i){
    const isObject = typeof v === 'object';
    v = isObject? v.ref + '[' + v.id + ']' : v;
    return (i > 0? '.' : '') + v;
  });
}

const Controllable = module.exports.Controllable = function(config = {}){
  const controllable = this;
  controllable.id = config.id || 'noid';
  controllable.index = config.index || false; // is a index on DB
  controllable.unique = config.unique || false; // is a unique index on DB
  controllable.main = config.main || false;   // is one of the minimal fields included by default on any retrieve from DB
  controllable.required = config.required || false; // require on inputData for inserts
  controllable.internal = config.internal || false; // everytime handling
  controllable.i18n = config.i18n || false;
  controllable.userOn = config.on || {};
  controllable.handlers = {};

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

    debug(("  " + context.method.charAt(0).toUpperCase() + context.method.slice(1) + ": \t").bgMagenta + (" " + (context.path.join(".") || '.')).magenta, traceResults(context.data));


    const every = controllable.internal || (context.method === "insert" && controllable.required) || context.method === "projection";
    if(every || context.result !== undefined){
      
      const keysCheck = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys);
      const keysCheckAsOwner = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys.concat(['owner']));
      const keysCheckAsGuest = controllable.keys.check(context.method === 'projection'? 'retrieve' : context.method, context.keys.concat(['guest']));
      // TODO: save credential conditions (ifGuest, ifOwner) to be accesible on handlers aka:on

      if(context.path.length > 0){
        const projection = {
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
        context.projection.set(dotPath(context.path), projection);
      }

      debug("  Cheking:\t".bgYellow + (" " + (context.path.join(".") || '.')).yellow + (" " + (controllable.internal? '(internal) ' : '') + (controllable.required? '(required) ' : '')).yellow + (keysCheck? 'ok!'.green : 'nop!'.red));
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
              path : context.path.concat([lang]),
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
    // debug("CALLBACK".black.bgWhite, typeof error, error, context.path.join('.'), context.parent? context.parent.path.join('.') : undefined);
    if(error){
      context.error = error;
    }
    chain.next();
  };
  Controllable.prototype.calling = function(context, handlerName, next){
    const controllable = this;
    debug("  Calling:\t".black.bgWhite, (context.path.join(".") || '.').bold.grey, ("'" + handlerName + "'").cyan);
    next();
  };
  Controllable.prototype.handle = function(context, done, next){
    const controllable = this;
    if(context.error){
      debug("  Error:\t".bgRed,     (context.path.join(".") || '.').bold.grey, context.error, new Error("Error!"));
      context.errors.set(context.path.join('.'), context.error);
      done();
    } else if (context.parent){
      if(typeof context.result === 'object' && Object.keys(context.result).length === 0 ){
        context.result = undefined;
      }
      // debug("indexing".bgCyan, context.parent.result, context.parent.path, context.result);
      if(context.parent.result[context.index] || context.result !== undefined){
        debug("  Handling:\t".bgCyan, (context.path.join(".") || '.').bold.grey, traceResults(context.result));
        context.parent.result[context.index] = context.result;
      } else {
        debug("  Ignoring:\t".bgCyan, (context.path.join(".") || '.').bold.grey, traceResults(context.result));
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
        update : [function hideId(context, done){
          context.result = undefined;
          done();
        }],
        */
        retrieve : [function hideId(context, done){
          let id;
          if(context.path.length === 1){ // entity root level
            id = context.entity._id;
          } else {
            id = context.path.slice(-2,-1)[0];
            id = Array.isArray(id)? id[0] : id;
          }
          context.result = id;
          done();
        }]
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
    // debug("SCHEMA".black.bgWhite, context.path, context.result, indexes);

    const result = context.result;
    context.result = new Tree();

    const chain = new Chain();

    for(const field of schema.schema){
      const index = field.id;
      const checkIndex = indexes.indexOf(index);
      if(checkIndex >= 0){
        indexes.splice(checkIndex,1);
      }
      // debug("FIELD".bgWhite, context.path, index);

      const subcontext = Object.assign({}, context, {
        index,
        data : context.data? context.data[field.id] : undefined,
        input : context.input? context.input[field.id] : undefined,
        result: undefined,
        path : context.path.concat([field.id]),
        parent : context
      });
      chain.add(field.fire.bind(field, subcontext, false));
    }
    for(const index of indexes){
      context.errors.set(context.path.concat([index]).join('.'), 'unknow-input-field');
    }
    chain.add(done, undefined).pull();
  };














const SchemaArray = module.exports.SchemaArray = function(config = {}){
  const SchemaArray = this;
  Schema.call(this, config);
  SchemaArray.on("retrieve", SchemaArray.retrieve);
};
  SchemaArray.prototype = Object.create(Controllable.prototype);
  SchemaArray.prototype.constructor = SchemaArray;
  SchemaArray.prototype.retrieve = function(context, done){
    const schemaArray = this;
    if(!Array.isArray(context.path.pop())){ // Is the main call with complete result, no a index
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
    // debug("SCHEMA-ARRAY".black.bgWhite, context.path, context.result);

    let result = context.result;
    context.result = new Tree();

    if(context.method !== 'retrieve'){
      context.parent = null; // avoid save to main
    }
    if(context.method === 'projection'){
      result = [{}];
    }

    const chain = new Chain();
    for(const index in result){ // agnostic iterator (array or object)

      let method = context.method;
      if(method === 'insert'){
        result[index]._id = absoluteId();
      } else if(method === 'update'){
        if(!result[index].hasOwnProperty("_id")){
          result[index]._id = absoluteId();
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
        path : context.method !== 'projection'? context.path.concat([indexId]) : context.path,
        parent : context,
        parents : context.parents.concat({
          ref : schemaArray.id,
          id : indexId,
          driver : schemaArray.driver
        })
      });
      chain.add(schemaArray.fire.bind(schemaArray, subcontext, true, Schema.prototype.controller));
      chain.add(schemaArray.arrayHandle.bind(schemaArray), subcontext, done);
    }
    chain.add(done,undefined).pull();
  };
  SchemaArray.prototype.arrayHandle = function(context, done, next){
    const schemaArray = this;
    if(context.result !== undefined){
      const resultDotPath = dotPath(context.parents).join('');
      if(context.method === 'insert'){
        context.inserts.set(resultDotPath, context.inserts.get(resultDotPath) || []);
        context.inserts.get(resultDotPath).push(context.result);
      } else if(context.method === 'update'){
        // TODO: check if empty (only internals _mtime _id ...)
        context.updates.set(resultDotPath, context.result);
      } else if(context.method === 'remove'){
        context.removes.set(resultDotPath, context.result);
      }
    }
    next();
  };













const Modelator = module.exports.Modelator = function(config = {}){
  const modelator = this;
  Schema.call(modelator, config);

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
  Modelator.prototype.do = function(method, entity, payload, cb, uid, keys){
    const modelator = this;

    if(!Array.isArray(keys)){
      keys = (typeof keys === 'string')? [keys] : [];
    } else {
      keys = keys.slice();
    }

    const id = (payload && payload._id) || (entity && entity._id) || absoluteId();

    const context = {
      modelator, method, entity, payload, uid, keys, 
      data : entity,
      input : payload,
      errors : new Map(),
      inserts : new Map(),
      updates : new Map(),
      removes : new Map(),
      projection : new Map(),
      path : [],
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
      const output = Object.assign({}, context, {
        errors : [...context.errors],
        projection : [...context.projection],
        inserts : [...context.inserts],
        updates : [...context.updates],
        removes : [...context.removes]
      });
      resultShow(error, output);

      if(cb) {cb(error, context);}

      // ----
      
      const transaction = new Transaction(context, function(error){
        if(error){
            console.log(('Transaction.' + dotPath(error.pointer)).bgRed, error);
        } else {
          for(const result of transaction.results){
            console.log(('Transaction.' + dotPath(result.pointer)).bgCyan, result.result.result? result.result.result : result.result);
          }
        }
      });

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

function Transaction(context, done){
  const transaction = this;
  transaction.done = done;
  transaction.results = [];
  transaction.projection = context.projection;
  transaction.uid = context.uid;
  transaction.keys = context.keys;
  const chain = transaction.chain = new Chain();
  

  chain.add(context.parents.shift().driver[context.method], transaction, undefined, context.result);

  if(context.inserts){
    for(const [pointer, sentence] of context.inserts){
      const driver = pointer.pop().driver;
      transaction.chain.add(driver.insert, transaction, pointer, sentence);
    }
  }
  if(context.updates){
    for(const [pointer, sentence] of context.updates){
      const driver = pointer.pop().driver;
      transaction.chain.add(driver.update, transaction, pointer, sentence);
    }
  }
  if(context.removes){
    for(const [pointer, sentence] of context.removes){
      const driver = pointer.pop().driver;
      transaction.chain.add(driver.remove, transaction, pointer, sentence);
    }
  }
  
  chain.add(done,undefined).pull();
}



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

function traceResults(result, limit = 256, space = ""){
  if(result === undefined){
    return '(undefined)'.grey;
  } else {
    let stringify = JSON.stringify(result,undefined,2).split("\n");
    const length = stringify.length;
    if(length > 1){
      stringify = " " + space + stringify.join("\n"+space);
    } else {
      stringify = " " + stringify[0];
    }
    result = ("(" + (result.constructor? result.constructor.name : 'anonymous') + ")").grey + stringify;
    result = result.length > limit? result.slice(0,limit) + '\n...etc (' + length + ' lines).' : result;
    return result;
  }
}

function resultShow(error, context){
  const errors = {};
  context.errors.forEach(function(v){
    errors[v[0]] = v[1];
  });
  const inserts = {};
  context.inserts.forEach(function(v){
    inserts[v[0]] = v[1];
  });
  const updates = {};
  context.updates.forEach(function(v){
    updates[v[0]] = v[1];
  });
  const removes = {};
  context.removes.forEach(function(v){
    removes[v[0]] = v[1];
  });
  let projection = {};
  context.projection.forEach(function(v){
    projection[v[0]] = v[1];
  });
  projection = Tree.create(projection).parse();

  console.log("\n\n  MODELATOR OUTPUT\n".black.bgWhite + "\n");
  console.log("\n    PROJECTION:\n".bgCyan, traceResults(projection, 750), "\n");
  console.log("\n    ERRORS:\n".bgRed, JSON.stringify(errors, undefined, 2), "\n");
  console.log("\n    MAIN:\n".bgCyan, JSON.stringify(context.result, undefined, 2), "\n");
  console.log("\n    INSERTS:\n".bgGreen, JSON.stringify(inserts, undefined, 2), "\n");
  console.log("\n    UPDATES:\n".bgGreen, JSON.stringify(updates, undefined, 2), "\n");
  console.log("\n    REMOVES:\n".bgGreen, JSON.stringify(removes, undefined, 2), "\n");

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
      const fileUID = context.path.join('.');

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