/* jslint node: true, esnext: true */
"use strict";

const Chain = require("./Chain");
const Jailer = require("./Jailer");
const {Tree, TreeArray} = require("./Tree");
const absoluteId = require("./AbsoluteId");

function debug (){
  //console.log(...arguments);
}

// TODO: data => entity , fieldData => data, input => payload, fieldInput => input, get => retrieve?
// TODO: asyn/await, race fields...
// TODO: review context objects with setters/getters concept
// TODO: auth credentials without query original data






const Controllable = module.exports.Controllable = function(config = {}){
  const controllable = this;
  controllable.id = config.id || 'noid';
  controllable.main = false; // TODO: review
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
  Controllable.prototype.controller = function defaultController(context, cb){
    cb(undefined);
  };
  Controllable.prototype.on = function(action, handler){
    this.handlers[action] = this.handlers[action] || [];
    this.handlers[action].push(handler);
    return this;
  };
  Controllable.prototype.fire = function(context, auth, cb){
    const controllable = this;

    let controller;
    if(arguments.length > 3){
      controller = arguments[2];
      cb = arguments[3];
    }
    controller = controller || controllable.controller;
    const controllerName = controller.name;
    
    const fromData = ["projection", "retrieve", "remove"].indexOf(context.context.action) >= 0;
    const result = fromData? context.data : context.input;
    context.result = result;

    debug(("  " + context.action.charAt(0).toUpperCase() + context.action.slice(1) + ": \t").bgMagenta + (" " + (context.path.join(".") || '.')).magenta, traceResults(context.data));

    // TODO: requireds control
    const every = controllable.internal || context.action === "projection";
    if(every || context.result !== undefined){

      if(auth){ // TODO: review this
        context.owner = (!context.uid || !context.data || context.data._owner === context.uid);
        context.guest = (context.data && Array.isArray(context.data._guests) && context.data._guests.indexOf(context.uid) >= 0);
      }
      
      const ownkeys = [];
      if(context.owner){ownkeys.push('owner');}
      if(context.guest){ownkeys.push('guest');}
      
      const keysCheck = controllable.keys.check(context.action === 'projection'? 'retrieve' : context.action, context.keys.concat(ownkeys));

      if(context.action === "projection" && context.path.length > 0){
        context.projection.set(context.path.join("."), keysCheck? 1 : -1);
      }

      debug("  Cheking:\t".bgYellow + (" " + (context.path.join(".") || '.')).yellow + (" " + (context.owner? '(owner) ' : '') + (context.guest? '(guest) ' : '') + (controllable.internal? '(internal) ' : '')).yellow + (keysCheck? 'ok!'.green : 'nop!'.red));
      if(keysCheck || controllable.internal){
        const handlers = (controllable.handlers[context.action] || []).concat(controllable.userOn[context.action] || []);
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
              chain.add(controllable.handle.bind(controllable), subcontext, cb);
            }
          }
          chain.add(controllable.calling.bind(controllable), context, controllerName); // only for logs
          chain.add(controller.bind(controllable), context, controllable.fieldHandlerCallback.bind(controllable, context, chain));
          chain.add(controllable.handle.bind(controllable), context, cb);
        } else {
          for(const handler of handlers){
            chain.add(controllable.calling.bind(controllable), context, handler.name); // only for logs
            chain.add(handler.bind(controllable), context, controllable.fieldHandlerCallback.bind(controllable, context, chain));
            chain.add(controllable.handle.bind(controllable), context, cb);
          }
        }

        if(chain.chainlinks.length > 0){
          chain.add(cb).pull();
        } else {
          cb();
        }
        

      } else {
        context.error = 'no-credentials';
        controllable.handle(context, cb);
      }
    } else {
      cb();
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
  Controllable.prototype.handle = function(context, cb, next){
    const controllable = this;
    if(context.error){
      debug("  Error:\t".bgRed,     (context.path.join(".") || '.').bold.grey, context.error, new Error("Error!"));
      context.errors.set(context.path.join('.'), context.error);
      cb();
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
      return cb();
    }
  };
















const Schema = module.exports.Schema = function schemaController(config = {}){
  const schema = this;
  Controllable.call(this, config);

  schema.schema = config.schema || [];
  schema.schema.splice(0, 0, ...[
    new Controllable({ // really is idField TODO: id field
      id : "_id",
      on : {
        update : [function hideId(context,cb){
          context.result = undefined;
          cb();
        }],
        retrieve : [function hideId(context,cb){
          let id;
          if(context.path.length === 1){ // entity root level
            id = context.entity._id;
          } else {
            id = context.path.slice(-2,-1)[0];
            id = Array.isArray(id)? id[0] : id;
          }
          context.result = id;
          cb();
        }]
      }
    }),
    new Controllable({
      id : "_owner",
      internal : true,
      on : {
        insert : [function setOwner(context,cb){
          context.result = context.uid;
          cb();
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
        insert : function timeStamp(context,cb){
          context.result = Date.now();
          cb();
        }
      }
    }),
    new Controllable({
      id : "_mtime",
      internal : true,
      on : {
        insert : [function timeStamp(context,cb){
          context.result = Date.now();
          cb();
        }],
        update : [function timeStamp(context,cb){
          context.result = Date.now();
          cb();
        }]
      }
    })
  ]);
};
  Schema.prototype = Object.create(Controllable.prototype);
  Schema.prototype.constructor = Schema;
  Schema.prototype.controller = function(context, cb){
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
      context.errors.set(context.path.concat([index]).join('.'), 'unknow-input-field'); // TODO: toDotNotation method
    }
    chain.add(cb, undefined).pull();
  };














const SchemaArray = module.exports.SchemaArray = function(config = {}){
  const SchemaArray = this;
  Schema.call(this, config);
  SchemaArray.on("retrieve", SchemaArray.retrieve);
};
  SchemaArray.prototype = Object.create(Controllable.prototype);
  SchemaArray.prototype.constructor = SchemaArray;
  SchemaArray.prototype.retrieve = function(context, cb){
    const schemaArray = this;
    if(!Array.isArray(context.path.pop())){ // Is the main call with complete result, no a index
      const result = new TreeArray();
      for (const index in context.result){
        result.push(context.result[index]);
      }
      context.result = result;
    }
    return cb();
  };
  SchemaArray.prototype.controller = function schemaArrayController(context, cb){
    const schemaArray = this;
    // debug("SCHEMA-ARRAY".black.bgWhite, context.path, context.result);

    let result = context.result;
    context.result = new Tree();

    if(context.action !== 'retrieve'){
      context.parent = null; // avoid save to main
    }
    if(context.action === 'projection'){
      result = [{}];
    }

    const chain = new Chain();
    for(const index in result){// for(let index = 0; index < result.length; index++){

      let action = context.action;
      if(action === 'insert'){
        result[index]._id = absoluteId();
      } else if(action === 'update'){
        if(!result[index].hasOwnProperty("_id")){
          result[index]._id = absoluteId();
          action = 'insert';
        } else if(Object.keys(result[index]).length > 1) {
          action = 'update';
        } else {
          action = 'remove';
        }
      } else if(action === 'remove'){
        result[index]._id = index;
      } else if(action === 'retrieve'){
        result[index]._id = index;
      }

      const indexId = result[index]._id;
      result[indexId] = result[index];
      // delete result[index];
      
      context.result[indexId] = new Tree();

      if(context.context.action === 'insert' || context.context.action === 'remove'){
        if(action !== context.context.action){
          return cb('invalid-array-format');
        }
      }

      const subcontext = Object.assign({}, context, {
        action,
        result : result[indexId],
        index : indexId,
        data : context.data? context.data[index] : undefined,
        input : context.input? context.input[index] : undefined,
        path : context.action !== 'projection'? context.path.concat([[indexId]]) : context.path,
        parent : context
      });
      chain.add(schemaArray.fire.bind(schemaArray, subcontext, true, Schema.prototype.controller));
      chain.add(schemaArray.arrayHandle.bind(schemaArray), subcontext, cb);
    }
    chain.add(cb,undefined).pull();
  };
  SchemaArray.prototype.arrayHandle = function(context, cb, next){
    const schemaArray = this;

    let resultPath = context.path.slice(0,-1).map(function(v, i){
      const isArrayIndex = Array.isArray(v);
      v = isArrayIndex? '[' + v[0] + ']' : v;
      return (i > 0 && !isArrayIndex? '.' : '') + v;
    }).join('');
    if(context.result !== undefined){
      if(context.action === 'insert'){
        context.inserts.set(resultPath, context.inserts.get(resultPath) || []);
        context.inserts.get(resultPath).push(context.result);
      } else if(context.action === 'update'){
        // TODO: check if empty (only internals _mtime _id ...)
        context.updates.set(resultPath, context.result);
      } else if(context.action === 'remove'){
        context.removes.set(resultPath, context.result);
      }
    }
    next();
  };













const Modelator = module.exports.Modelator = function(config = {}){
  const modelator = this;
  Schema.call(modelator, config);
  modelator.indexes = config.indexes || {}; // {indexName(string):unique(bool),...} // these fields are the filter options

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
  Modelator.prototype.do = function(action, entity, payload, cb, uid, keys){
    const modelator = this;

    if(!Array.isArray(keys)){
      keys = (typeof keys === 'string')? [keys] : [];
    } else {
      keys = keys.slice();
    }

    const context = {
      modelator, action, entity, payload, uid, keys, 
      data : entity,
      input : payload,
      errors : new Map(),
      inserts : new Map(),
      updates : new Map(),
      removes : new Map(),
      projection : new Map(),
      path : []
    };
    context.context = context;

    modelator.fire(context, true, function(){
      context.errors =  [...context.errors];
      context.inserts = [...context.inserts].reverse();
      context.updates = [...context.updates].reverse();
      context.removes = [...context.removes].reverse();
      context.projection =  [...context.projection];
      if(Object.keys(context.errors).length > 0){
        cb(true, context);
      } else {
        cb(undefined, context);
      }
    });
  };





// TODO: default validations utils (for event api) regexp, nmin,nmax,lmin,lmax,required,date...
const Field = module.exports.Field = function (config = {}){
  const field = this;
  Controllable.call(field, config);
  
};
  Field.prototype = Object.create(Controllable.prototype);
  Field.prototype.constructor = Field;








function traceResults(result,space = ""){
  const limit = 256;
  if(result === undefined){
    return '(undefined)'.grey;
  } else {
    let stringify = JSON.stringify(result,undefined,2).split("\n");
    if(stringify.length > 1){
      stringify = " " + space + stringify.join("\n"+space);
    } else {
      stringify = " " + stringify[0];
    }
    result = ("(" + (result.constructor? result.constructor.name : 'anonymous') + ")").grey + stringify;
    result = result.length > limit? result.slice(0,limit) + '...' : result;
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
  File.prototype.onInsert = function(context, cb){
    this.saveFile(context, cb);
  };
  File.prototype.onUpdate = function(context, cb){
    this.saveFile(context, cb);
  };
  File.prototype.saveFile = function saveFile(context, cb){
    const field = this;
    const input = context.input;
    if(input && input.path && input.size && input.name && input.type){
      const modelatorId = context.modelator.id;
      const entityId = context.action === 'insert'? input._id : context.data._id;
      const entityTime = new Date(parseInt(entityId.toString().slice(0,8),16)*1000);
      
      const filePath = paths.join(entityTime.getUTCFullYear(), entityTime.getUTCMonth(), entityId);
      const fileAbsolutePath = paths.join(this.fsPath, modelatorId, filePath);
      const fileUID = context.path.join('.');

      fs.mkdir(fileAbsolutePath, undefined, true, function(error){
        if(!error){
          fs.rename(input.path, paths.join(fileAbsolutePath, fileUID), function(error){
            if(!error){
              input.moved = true;
              cb({
                size: parseInt(input.size, 10) || 0,
                name: input.name,
                type: input.type,
                lastmod: input.lastModifiedDate || new Date()
              });
            } else {
              cb(null, ["fields.file.move"]);
            }
          });
        } else {
          cb(null, ["fields.file.directory"]);
        }
      });
    } else {
      cb(null, ['fields.file.invalid']);
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
  Reference.prototype.getter = function(value,cb){
    var field = this;
    var modelator = field.modelator;
    var db = DB.collection(field.collection);
    var cols = {};
    for(var header in field.headers){cols[field.headers[header]]=true;}
    if(value.length>0){
      db.find({_id:{$in:value}},cols).toArray(function(error, items) {
        if(error){
          cb(null,[error]);
        } else {
          cb(items);
        }
      });
    } else {
      cb([]);
    }
  };
  Reference.prototype.setter = function(current,value,cb){
    var field = this;
    var list = [];
    value = value.toString().split(',');
    for(var rid in value){
      if(/^[a-f0-9]{24}$/i.test(value[rid])){list.push(new ObjectID.createFromHexString(value[rid]));}
    }
    cb(list);
  };
*/