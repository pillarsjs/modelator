/* jslint node: true, esnext: true */
"use strict";

const Chain = module.exports.Chain = function(){
  this.chainlinks = [];
};
  Chain.prototype.add = function(func){
    const args = Array.prototype.slice.call(arguments).slice(1);
    this.chainlinks.push({func:func, args:args});
    return this;
  };
  Chain.prototype.pull = function(){
    if(this.chainlinks.length > 0){
      this.chainlinks[0].func.apply(this, this.chainlinks[0].args);
    }
  };
  Chain.prototype.next = function(){
    this.chainlinks.shift();
    this.pull();
  };

const Jailer = module.exports.Jailer = function(actionsLocks = {}){
  for(const actionLocks in actionsLocks){
    this[actionLocks] = actionsLocks[actionLocks];
  }
};
  Jailer.prototype.check = function(action,keys){
    let locks = this[action];
    if(!locks){return true;}

    // Avoid errors.
    if(!Array.isArray(locks)){locks = (typeof locks === 'string')? [locks] : [];}
    if(!Array.isArray(keys)){keys = (typeof keys === 'string')? [keys] : [];}

    let grant;
    for(let lock of locks){
      lock = lock.split(' ');
      grant = true;
      for(let key of lock){
        if(keys.indexOf(key) === -1){
          grant = false;
          break;
        }
      }
      return grant;
    }
    return false;
  };

const Tree = module.exports.Tree = function(){};
  Tree.prototype.parse = function treeParser(marks){
    const result = {};
    Tree.treeParseWalker([], this, result, marks);
    return result;
  };
  Tree.treeParseWalker = function(path, tree, result, marks){
    Object.getOwnPropertyNames(tree).forEach((key)=>{
      if(tree[key] instanceof Tree){
        if(marks){result[path.concat([key]).join('.')] = true;}
        Tree.treeParseWalker(path.concat([key]), tree[key], result, marks);
      } else {
        result[path.concat([key]).join('.')] = tree[key];
      }
    });
  };









const Controllable = module.exports.Controllable = function(config = {}){
  const controllable = this;
  controllable.id = config.id || 'noid';
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
  Controllable.prototype.on = function(action,handler){
    this.handlers[action] = this.handlers[action] || [];
    this.handlers[action].push(handler);
    return this;
  };
  Controllable.prototype.fire = function(context, cb, controller){
    const controllable = this;
    console.log("Fire".yellow, context.path.join("/").cyan);
    const handlers = (this.handlers[context.action] || []).concat(this.userOn[context.action] || []);
    const chain = new Chain();
    const chainHandler = function(handler){
      const chainCallback = function(error){
        if(error){
          cb.call(controllable,error);
        } else {
          chain.next();
        }
      };
      handler.call(controllable, context, chainCallback);
    };
    const keysCheck = controllable.keys.check(context.action, context.keys);
    if(keysCheck){
      handlers.unshift((controller || controllable.controller).bind(controllable));
      for(const handler of handlers){
        chain.add(chainHandler, handler);
      }
      chain.add(cb).pull();
    } else {
      cb.call(controllable,'no-credentials');
    }
  };


// TODO: default validations utils (for event api) regexp, nmin,nmax,lmin,lmax,required,date...
const Field = module.exports.Field = function (config = {}){
  const field = this;
  Controllable.call(field, config);

  field.main = false;
  field.i18n = config.i18n || false;
  // TODO: required controls
  field.required = config.required || false; // false || true || 'get' || 'insert' || 'update' || 'remove' || 'get require' ...
  // TODO: this.on('get'....) presets for initialize context.result - AKA new context.result attribute
};
  Field.prototype = Object.create(Controllable.prototype);
  Field.prototype.constructor = Field;
  Field.prototype.controller = function(context, cb){
    if(!this.i18n){
      cb();
    } else {
      this.controllerI18n(context, cb);
    }
  };
  Field.prototype.controllerI18n = function(context, cb){
    const field = this;
    const action = context.action;
    const result = new Tree();
    const errors = new Tree();
    const chain = new Chain();
    function chainHandler(lang){
      const fieldData = context.fieldData? context.fieldData[lang] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[lang] : undefined;
      const path = context.path.concat([lang]);
      const subcontext = Object.assign({}, context, {fieldData, fieldInput, path});
      const chainCallback = function(error){
        if(error){
          errors[lang] = error;
        } else {
          result[lang] = subcontext.fieldInput || subcontext.fieldData;
        }
        chain.next();
      };
      field.fire(subcontext, chainCallback);
    }
    for(const lang of context.modelator.languages){
      if(
        (context.action === 'get' && context.fieldData.hasOwnProperty(lang))     ||
        (context.action === 'insert' && context.fieldInput.hasOwnProperty(lang)) ||
        (context.action === 'update' && context.fieldInput.hasOwnProperty(lang)) ||
        (context.action === 'remove' && context.fieldData.hasOwnProperty(lang))
      ){
        chain.add(chainHandler, lang);
      }
    }
    chain.add(function chainEnd(){
      if(Object.keys(errors).length > 0){
        cb(errors);
      } else {
        context.fieldInput = context.input? result : context.fieldInput;
        context.fieldData = !context.input? result : context.fieldData;
        cb();
      }
    }).pull();
  };


const Schema = module.exports.Schema = function(config = {}){
  const schema = this;
  Field.call(this, config);

  schema.schema = config.schema || [];
};
  Schema.prototype = Object.create(Field.prototype);
  Schema.prototype.constructor = Schema;
  Schema.prototype.controller = function(context, cb){
    const schema = this;
    const result = new Tree();
    const errors = new Tree();
    const chain = new Chain();
    const chainHandler = function(field){
      const fieldData = context.fieldData? context.fieldData[field.id] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[field.id] : undefined;
      const path = context.path.concat([field.id]);
      const subcontext = Object.assign({}, context, {fieldData, fieldInput, path});
      const chainCallback = function(error){
        if(error){
          errors[field.id] = error;
        } else {
          result[field.id] = subcontext.fieldInput || subcontext.fieldData;
        }
        chain.next();
      };
      field.fire(subcontext, chainCallback);
    };
    for(const field of schema.schema){
      if(
        (context.action === 'get' && context.fieldData.hasOwnProperty(field.id))      ||
        (context.action === 'insert' && context.fieldInput.hasOwnProperty(field.id))  ||
        (context.action === 'update' && context.fieldInput.hasOwnProperty(field.id))  ||
        (context.action === 'remove' && context.fieldData.hasOwnProperty(field.id))
      ){
        chain.add(chainHandler, field);
      }
    }
    chain.add(function chainEnd(){
      if(Object.keys(errors).length > 0){
        cb(errors);
      } else {
        context.fieldInput = context.input? result : context.fieldInput;
        context.fieldData = !context.input? result : context.fieldData;
        cb();
      }
    }).pull();
  };


const SchemaArray = module.exports.SchemaArray = function(config = {}){
  Schema.call(this, config);
};
  SchemaArray.prototype = Object.create(Field.prototype);
  SchemaArray.prototype.constructor = SchemaArray;
  SchemaArray.prototype.controller = function(context, cb){
    const schemaArray = this;
    const result = new Tree();
    const errors = new Tree();
    const chain = new Chain();
    function chainHandler(index){
      const fieldData = context.fieldData? context.fieldData[index] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[index] : undefined;
      const path = context.path.concat([index]);
      const subcontext = Object.assign({}, context,{fieldData, fieldInput, path});
      const chainCallback = function(error){
        if(error){
          errors[index] = error;
        } else {
          result[index] = subcontext.fieldInput || subcontext.fieldData;
        }
        chain.next();
      };
      Schema.prototype.controller.call(schemaArray, subcontext, chainCallback);
    }
    for(const index in context.fieldData){
      if(
        (context.action === 'get' && context.fieldData.hasOwnProperty(index))      ||
        (context.action === 'insert' && context.fieldInput.hasOwnProperty(index))  ||
        (context.action === 'update' && context.fieldInput.hasOwnProperty(index))  ||
        (context.action === 'remove' && context.fieldData.hasOwnProperty(index))
      ){
        chain.add(chainHandler, index);
      }
    }
    chain.add(function chainEnd(){
      if(Object.keys(errors).length > 0){
        cb(errors);
      } else {
        context.fieldInput = context.input? result : context.fieldInput;
        context.fieldData = !context.input? result : context.fieldData;
        cb();
      }
    }).pull();
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
  Modelator.prototype = Object.create(Controllable.prototype);
  Modelator.prototype.constructor = Modelator;
  // TODO: on, fire... etc as generic field for Modelator entity?
  Modelator.prototype.do = function(action, data, input, cb, uid, keys){
    const modelator = this;

    if(!Array.isArray(keys)){keys = (typeof keys === 'string')? [keys] : [];} else {keys = keys.slice();}   // keys array preset
    const owner = (!uid || !data || data._owner === uid);                                                   // (bool) is owner?
    const guest = (data && Array.isArray(data._guests) && data._guests.indexOf(uid) >= 0);                  // (bool) is guest?
    if(owner){keys.push('owner');}
    if(guest){keys.push('guest');}

    const context = {modelator, action, data, input, uid, keys, owner, guest};
    const fieldData = data;
    const fieldInput = input;
    const path = [];
    const subcontext = Object.assign({}, context, {fieldData, fieldInput, path});
    modelator.fire(subcontext, function(error){
      if(error){
        cb(error.parse()); // .parse(true) for marks
      } else {
        cb(null,(subcontext.fieldInput || subcontext.fieldData).parse());
      }
    }, Schema.prototype.controller);
  };






const Text = module.exports.Text = function(config = {}){
  Field.call(this, config);
};
  Text.prototype = Object.create(Field.prototype);
  Text.prototype.constructor = Text;


const Int = module.exports.Int = function(config = {}){
  Field.call(this, config);
};
  Int.prototype = Object.create(Field.prototype);
  Int.prototype.constructor = Int;
  Int.prototype.onInsert = function(context, cb){
    if(parseInt(context.fieldInput, 10) >= 0){
      cb(context.fieldInput);
    } else {
      cb(null, ["no-int"]);
    }
  };
  Int.prototype.onUpdate = function(context, cb){
    if(parseInt(context.fieldInput, 10) >= 0){
      cb(context.fieldInput);
    } else {
      cb(null, ["no-int"]);
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
  Select.prototype.onSet = function(context, cb){
    const values = context.fieldInput || [];
    let result;
    let error;
    if(this.multiple){
      result = [];
      for(const value of values){
        if(this.values.indexOf(value)>=0){
          if(result.indexOf(value) < 0){
            result.push(value);
          } else {
            return cb('duplicate-index');
          }
        } else {
          return cb('invalid-index');
        }
      }
    } else {
      if(this.values.indexOf(values) >= 0){
        result = values;
      } else {
        return cb('invalidIndex');
      }
    }
    context.fieldInput = result;
    cb();
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
  this.on('get',this.onGet);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
};
  Checkbox.prototype = Object.create(Field.prototype);
  Checkbox.prototype.constructor = Checkbox;
  Checkbox.prototype.onGet = function(context, cb){
    context.fieldData = context.fieldData? true : false;
    cb();
  };
  Checkbox.prototype.onSet = function(context, cb){
    context.fieldInput = context.fieldInput? true : false;
    cb();
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
    const fieldInput = context.fieldInput;
    if(fieldInput && fieldInput.path && fieldInput.size && fieldInput.name && fieldInput.type){
      const modelatorId = context.modelator.id;
      const entityId = context.action === 'insert'? fieldInput._id : context.fieldData._id;
      const entityTime = new Date(parseInt(entityId.toString().slice(0,8),16)*1000);
      
      const filePath = paths.join(entityTime.getUTCFullYear(), entityTime.getUTCMonth(), entityId);
      const fileAbsolutePath = paths.join(this.fsPath, modelatorId, filePath);
      const fileUID = context.path.join('.');

      fs.mkdir(fileAbsolutePath, undefined, true, function(error){
        if(!error){
          fs.rename(fieldInput.path, paths.join(fileAbsolutePath, fileUID), function(error){
            if(!error){
              fieldInput.moved = true;
              cb({
                size: parseInt(fieldInput.size, 10) || 0,
                name: fieldInput.name,
                type: fieldInput.type,
                lastmod: fieldInput.lastModifiedDate || new Date()
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















console.log(("\n").bgRed);

const myModelator = new Modelator({
  id: "myModelator",
  limit : 5,
  indexes : ['_id','field1','field2'],
  languages : ['en','es'],
  schema : [
    new Text({id:'text'}),
    new Text({
      id:'textI18n',
      i18n : true
    }),
    new Select({
      id:'select',
      multiple: true,
      values : ['A','B','C','D'],
      on : {
        update : [
          function(context, cb){
            if(context.fieldInput.indexOf('A')>=0){
              cb("A no is possible");
            } else {
              cb();
            }         
          }
        ]
      },
      keys : {
        get: 'manager',
        update : 'manager',
        insert : 'manager',
        remove : 'manager'
      }
    }),
    new Select({
      id:'selectInt',
      multiple: true,
      values : [0,1,2,3,4,5,6]
    }),
    new Radios({
      id:'radios',
      values : ['A','B','C','D']
    }),
    new Checkboxes({
      id:'checkboxes',
      values : ['A','B','C','D']
    }),
    new Checkbox({id:'checkbox'}),
    new Time({id:'time'}),
    new Img({id:'img'}),
    new SchemaArray({
      id:'list',
      schema: [
        new Img({
          id:'img',
          keys : {
            update: ["admin","root"]
          }
        }),
        new Text({id:'text'})
      ]
    }),
    new Schema({
      id:'subset',
      schema: [
        new Text({
          id:'subsetA',
          keys : {
            update: ["admin","root"]
          }
        }),
        new Text({id:'subsetB'}),
        new Text({id:'subsetC'})
      ]
    })
  ]
});

const resourceData = {
  text : "Texto",
  textI18n : {
    en: "Hello",
    es: "Hola"
  },
  select : ["B"],
  selectInt : [1,3],
  radios : "A",
  checkboxes : ["B","C"],
  checkbox : 1,
  time : 12345678,
  img : "/to.img",
  list : [
    {
      img : "/to.file",
      text : "A"
    },
    {
      img : "/to.file",
      text : "B"
    }
  ],
  subset : {
      subsetA : "s1",
      subsetB : "s2",
      subsetC : "s3"
  }
};




const resultShow = function(error,result){
  console.log("");
  if(error){
    console.log("\tError:\t".bgRed, JSON.stringify(error, undefined, '    ').red);
  } else {
    console.log("\tResult:\t".bgCyan, JSON.stringify(result, undefined, '    ').cyan);
  }
};

// Testing get
console.log(("\n\t"+"GET test"+"\t").bgCyan, "\n");
myModelator.do(
  "get",
  resourceData,
  undefined,
  resultShow,
  "userZero",
  ["A", "B", "admin"]
);

// Testing update
console.log(("\n\t"+"UPDATE test"+"\t").bgCyan, "\n");
let updateData = {
  select : ['B','C','A'],
  selectInt : [1,2,3],
  radios : "C",
  subset : {
    subsetA : "s1mod"
  },
  list : [{
    img: "/to.new.file"
  }]
};

myModelator.do(
  "update",
  resourceData,
  updateData,
  resultShow,
  "someUserID",
  ["A", "B", "admin", "manager"]
);

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