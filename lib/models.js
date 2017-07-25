/* jslint node: true, esnext: true */
"use strict";

const Chain = function(){
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


const Jailer = function(actionsLocks = {}){
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




const Tree = function(){};
  Tree.prototype.parse = function treeParser(marks){
    // console.log("TreeParsing...");
    const result = {};
    Tree.treeParseWalker([], this, result, marks);
    return result;
  };
  Tree.create = function(dotFormat,array){
      const tree = new Tree();
      const checklist = array? [] : {};
      Object.getOwnPropertyNames(dotFormat).forEach((index)=>{
        const value = dotFormat[index];
        index = index.split(".");
        const name = index.shift();
        if(index.length>0){
          const Type = /^[09]+$/.test(index[0])? TreeArray : Tree;
          checklist[name] = checklist[name] || new Type();
          checklist[name][index.join(".")] = value;
        } else {
          checklist[name] = value;
        }
      });
      for(const index in checklist){
        if(checklist[index] instanceof Tree){
          checklist[index] = Tree.create(checklist[index]);
        } else if(checklist[index] instanceof TreeArray){
          checklist[index] = Tree.create(checklist[index],true);
        }
      }
      return checklist;
  };
  Tree.treeParseWalker = function(path, tree, result, marks){
    const isTreeArray = Tree.isTreeArray(tree);
    (isTreeArray? Object.getOwnPropertyNames(tree) : tree).forEach((key)=>{
      // console.log("walker",path,key,tree[key]);
      if(Tree.isTreeArray(tree[key])){
        if(marks){result[path.concat([key]).join('.')] = true;}
        Tree.treeParseWalker(path.concat([key]), tree[key], result, marks);
      } else if(tree[key] !== undefined){
        result[path.concat([key]).join('.')] = tree[key];
      } else {
        // ignore undefineds
      }
    });
  };
  Tree.isTreeArray = function(tree){
    return tree && tree.constructor && tree.constructor === TreeArray;
  };
  Tree.isTree = function(tree){
    return (tree && tree.constructor && tree.constructor === Tree) || Tree.isTreeArray(tree);
  };

const TreeArray = function(){
  var treeArray = Array.call(this,...arguments);
  Object.setPrototypeOf(treeArray, Object.assign({}, Array.prototype, Tree.prototype, {constructor: TreeArray}));
  return treeArray;
};





// TODO: data => entity , fieldData => data, input => payload, fieldInput => input

const Controllable = module.exports.Controllable = function(config = {}){
  const controllable = this;
  controllable.id = config.id || 'noid';
  controllable.required = config.required || false; // require inputData for inserts
  controllable.internal = config.internal || false; // everytime handling
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
  Controllable.prototype.fire = function(context, cb, controller){ // cb function(context,cb){}
    const controllable = this;
    
    console.log(" -> Firing: ".bgMagenta, (context.path.join(".") || '.').bold.grey);

    const fromData = ["projection", "get", "remove"].indexOf(context.action) >= 0; // ["insert", "update"]
    context.result = fromData? context.fieldData : context.fieldInput;

    // TODO: requireds control
    const every = controllable.internal || ["projection"].indexOf(context.action) >= 0; // ["get","update","insert","remove"]
    if(every || context.result !== undefined){

      const keysCheck = controllable.internal? true : controllable.keys.check(context.action, context.keys);
      console.log("  "+" Cheking: ".bgYellow, keysCheck, controllable.internal? '(internal)' : '');
      if(keysCheck){
        controller = (controller || controllable.controller).bind(controllable);
        const handlers = (controllable.handlers[context.action] || []).concat(controllable.userOn[context.action] || []);
        handlers.unshift(controller);
        //console.log("    "+" Handling: ".bgGreen, handlers.length);

        const chain = new Chain();
        for(const handler of handlers){
          chain.add(controllable.chainHandler, chain, handler, context, controller, cb);
        }
        chain.add(function(context, cb){
          console.log(" <- Result: ".bgMagenta, (context.path.join(".") || '.').bold.grey, context.result);
          cb();
        },context, cb).pull();
      } else {
        cb.call(controllable,'no-credentials');
      }
    } else {
      // TODO: no handled result, some mark as ignore?
      cb();
    }
  };
  Controllable.prototype.chainHandler = function(chain, handler, context, controller, cb){
    // estoy aqui
    const controllable = this;
    const chainCallback = function(error){
      if(handler !== controller){
        // TODO: Handlers naming
        if(error){
          console.log("    " + " ModelingError: ".bgRed, error);
        } else {
          console.log("    " + " Modeling: ".bgCyan, context.result);
        }
      }
      if(error){
        cb.call(controllable,error);
      } else {
        chain.next();
      }
    };
    handler.call(controllable, context, chainCallback);
  };




function chainHandler(subcontext, controller, errors, result, next){
  const chainCallback = function(error){
    if(error){
      errors[subcontext.index] = error;
    } else {
      result[subcontext.index] = subcontext.result;
    }
    next();
  };
  controller(subcontext, chainCallback);
}

// TODO: defered actions, acciones que se realizan cuando todo es correcto.
// TODO: default validations utils (for event api) regexp, nmin,nmax,lmin,lmax,required,date...
const Field = module.exports.Field = function (config = {}){
  const field = this;
  Controllable.call(field, config);

  field.main = false; // TODO: review
  field.i18n = config.i18n || false;
};
  Field.prototype = Object.create(Controllable.prototype);
  Field.prototype.constructor = Field;
  Field.prototype.controller = function(context, cb){
    if(!this.i18n || context.i18nAvoid){
      cb();
    } else {
      this.controllerI18n(context, cb);
    }
  };
  Field.prototype.controllerI18n = function(context, cb){
    const field = this;
    const action = context.action;
    const result = new Tree();
    const errors = new TreeArray();
    const chain = new Chain();

    for(const lang of context.modelator.languages){
      const index = lang;
      const fieldData = context.fieldData? context.fieldData[lang] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[lang] : undefined;
      const path = context.path.concat([lang]);
      const subcontext = Object.assign({i18nAvoid:true}, context, {fieldData, fieldInput, path, index});
      const controller = field.fire.bind(field);
      chain.add(chainHandler, subcontext, controller, errors, result, chain.next.bind(chain));
    }
    chain.add(function chainEnd(){
      if(errors.length > 0){
        cb(errors);
      } else {
        context.result = result;
        cb();
      }
    }).pull();
  };


const Schema = module.exports.Schema = function(config = {}){
  const schema = this;
  Field.call(this, config);

  schema.schema = config.schema || [];
  schema.schema.splice(0,0,...entityDefaultsFields);
};
  Schema.prototype = Object.create(Field.prototype);
  Schema.prototype.constructor = Schema;
  Schema.prototype.controller = function(context, cb){
    const schema = this;
    const result = new Tree();
    const errors = new TreeArray();
    const chain = new Chain();
    for(const field of schema.schema){
      const index = field.id;
      const fieldData = context.fieldData? context.fieldData[field.id] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[field.id] : undefined;
      const path = context.path.concat([field.id]);
      const subcontext = Object.assign({}, context, {index, fieldData, fieldInput, path});
      const controller = field.fire.bind(field);
      chain.add(chainHandler, subcontext, controller, errors, result, chain.next.bind(chain));
    }
    chain.add(function chainEnd(){
      if(errors.length > 0){
        cb(errors);
      } else {
        context.result = result;
        cb();
      }
    }).pull();
  };



// TODO: schema array self controlling (insert updates...)
const SchemaArray = module.exports.SchemaArray = function(config = {}){
  const SchemaArray = this;
  Schema.call(this, config);
  SchemaArray.schema.splice(0,0,...entityDefaultsFields);

  if(config.autonum){
    SchemaArray.autonum = config.autonum;
  }
};
  SchemaArray.prototype = Object.create(Field.prototype);
  SchemaArray.prototype.constructor = SchemaArray;
  SchemaArray.prototype.controller = function(context, cb){
    const schemaArray = this;
    const result = new TreeArray();
    const errors = new TreeArray();
    const chain = new Chain();
    //console.log("INDEXES".white.bgRed, context.result, context.result.length);
    // da error on projection, en ese caso la extructura interna no tiene indices que consultar
    for(const index in context.result){
      const fieldData = context.fieldData? context.fieldData[index] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[index] : undefined;
      const path = context.path.concat([index]);
      const subcontext = Object.assign({}, context,{index, fieldData, fieldInput, path});
      const controller = Schema.prototype.controller.bind(schemaArray);
       //console.log("INDEX".white.bgRed, index);
      chain.add(chainHandler, subcontext, controller, errors, result, chain.next.bind(chain));
    }
    chain.add(function chainEnd(){
      //console.log("schemaarray error check",errors.length > 0, errors);
      if(errors.length > 0){
        cb(errors);
      } else {
        context.result = result;
        cb();
      }
    }).pull();
  };
  SchemaArray.prototype.autonum = function(){
    Date.now();
  };


const Modelator = module.exports.Modelator = function(config = {}){
  const modelator = this;
  Controllable.call(modelator, config);

  modelator.schema = config.schema || [];
  modelator.schema.splice(0,0,...entityDefaultsFields);
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
  Modelator.prototype.do = function(action, data, input, cb, uid, keys){
    const modelator = this;

    if(!Array.isArray(keys)){keys = (typeof keys === 'string')? [keys] : [];} else {keys = keys.slice();}
    const owner = (!uid || !data || data._owner === uid);
    const guest = (data && Array.isArray(data._guests) && data._guests.indexOf(uid) >= 0);
    if(owner){keys.push('owner');}
    if(guest){keys.push('guest');}

    const fieldData = data;
    const fieldInput = input;
    const path = [];
    const context = {modelator, action, data, input, uid, keys, owner, guest, fieldData, fieldInput, path};

    modelator.fire(context, function(error){
      if(error){
        cb(error);
      } else {
        cb(null,context.result);
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
    if(parseInt(context.result, 10) >= 0){
      cb(context.result);
    } else {
      cb("no-int");
    }
  };
  Int.prototype.onUpdate = function(context, cb){
    if(parseInt(context.result, 10) >= 0){
      cb(context.result);
    } else {
      cb("no-int");
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
    const values = Array.isArray(context.result)? context.result : [context.result];
    if(!this.multiple && values.length > 1){
      return cb('no-multiple');
    }
    let result;
    let error;
    result = [];
    for(const value of values){
      if(this.values.indexOf(value)>=0){
        if(result.indexOf(value) < 0){
          result.push(value);
        } else {
          return cb('duplicate-index');
        }
      } else {
        return cb('invalid-index:');
      }
    }
    context.result = result;
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
    context.result = context.result? true : false;
    cb();
  };
  Checkbox.prototype.onSet = function(context, cb){
    context.result = context.result? true : false;
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

const entityDefaultsFields = [
  new Text({ // really is id TODO: id field
    id : "id"
  }),
  new Text({ // really is Reference TODO: reference field
    id : "_owner"
  }),
  new Select({ // really is MultipleReference TODO: multipleReference field
    id : "_guests",
    values : ["userA","userB","userC"]
  }),
  new Time({
    id : "_ctime",
    internal : true,
    on : {
      insert : function(context,cb){
        context.result = Date.now();
        cb();
      }
    }
  }),
  new Time({
    id : "_mtime",
    internal : true,
    on : {
      insert : [function(context,cb){
        context.result = Date.now();
        cb();
      }],
      update : [function(context,cb){
        context.result = Date.now();
        cb();
      }]
    }
  })
];













console.log(("\n").bgRed);
let autonum = 1005;
const myModelator = new Modelator({
  id: "myModelator",
  limit : 5,
  indexes : ['_id','field1','field2'],
  languages : ['en','es'],
  schema : [
    new Text({id:'text'}),
    new Text({
      id:'textI18n',
      i18n : true,
      keys : {
        get : ["owner", "guest"]
      }
    }),
    new Select({
      id:'select',
      multiple: true,
      values : ['A','B','C','D'],
      on : {
        update : [
          function(context, cb){
            if(context.result.indexOf('A')>=0){
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
      autonum : function(cb){
        cb(autonum++);
      },
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



const resultShow = function(error,result){
  console.log("");
  if(error){
    console.log("\tError:\t".bold.bgRed,JSON.stringify(error, undefined, 2));
  } else {
    console.log("\tResult:\t".bold.bgCyan, JSON.stringify(result, undefined, 2));
  }
};





/* Testing projection 1 */
console.log(("\n\t"+"PROJECTION test 1"+"\t").bold.bgCyan, "\n");
myModelator.do(
  "projection",
  Tree.create({
    "_owner" : 1,
    "_guests" : 1,
    "text" : 1,
    "textI18n.en" : 1,
    //"select" : 1,
    "selectInt" : 1,
    "list.img" : 1,
    "list.text" : 1,
    "subset.subsetB" : 1
  }),
  undefined,
  resultShow,
  "someUserID",
  ["A", "B", "admin"]
);

/* Testing get 1 */
const resourceData = {
  _owner : "someUserID",
  _guests : ["friend1","friend2"],
  text : "Texto",
  textI18n : {
    en: "Hello",
    es: "Hola"
  },
  //select : ["B"],
  selectInt : [1,3],
  //radios : "A",
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
console.log(("\n\t"+"GET test 1"+"\t").bold.bgCyan, "\n");
myModelator.do(
  "get",
  resourceData,
  undefined,
  resultShow,
  "someUserID",
  ["A", "B", "admin"]
);

/* Testing update 1 *
console.log(("\n\t"+"UPDATE test 1"+"\t").bold.bgCyan, "\n");
const updateData = {
  select : ['B','C'],
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

/* Testing update 2 */
console.log(("\n\t"+"UPDATE test 2"+"\t").bold.bgCyan, "\n");
const resourceData2 = {
  _owner : "someUserID",
  _guests : ["friend1","friend2"],
  text : "Texto",
  textI18n : {
    en: "Hello",
    es: "Hola"
  },
  //select : ["B"],
  selectInt : [1,3],
  radios : "A",
  checkboxes : ["B","C"],
  checkbox : 1,
  time : 12345678,
  img : "/to.img",
  list : [
    {
      id : 1000,
      img : "/to.file",
      text : "A"
    },
    {
      id : 1001,
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
const updateData2 = {
  textI18n : {
    es : 'Hello!'
  },
  list : [
    { // update id
      id : 1001,
      img: "/to.mod.file"
    },
    { // insert new element
      img : "/to.new.file",
      text : 'newText'
    },
    { // remove id, no payload
      id : 1000
    }
  ]
};

console.log("DATA".red,JSON.stringify(resourceData2, undefined, 2));
myModelator.do(
  "update",
  resourceData2,
  updateData2,
  resultShow,
  "someUserID",
  ["A", "B", "admin", "manager"]
);
console.log("INPUT".red,JSON.stringify(updateData2, undefined, 2));

/* - */

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