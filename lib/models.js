/* jslint node: true, esnext: true */
"use strict";

const util = require("util");
const ObjectID = require('mongodb').ObjectID;
const paths = require('path');

function Chain(){
  const chain = this;
  const chainlinks = [];
  var failhandler = false;
  chain.add = function(func){
    var args = Array.prototype.slice.call(arguments).slice(1);
    chainlinks.push({func:func, args:args});
    return chain;
  };
  chain.pull = function(){
    if(chainlinks.length > 0){
      chainlinks[0].func.apply(chain, chainlinks[0].args);
    }
  };
  chain.next = function(){
    chainlinks.shift();
    chain.pull();
  };
}

module.exports = Jailer;
function Jailer(actionsLocks = {}){
  for(const actionLocks in actionsLocks){
    this[actionLocks] = actionsLocks[actionLocks];
  }
}
  Jailer.prototype.check = function(action,keys){
    let locks = this[action];
    if(!locks){return true;} // Unlocked action.

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


/* ------------------------------ *

var jailer = new Jailer({
  remove: ['admin'],
  // Action:'remove', only: ['admin'].
  edit: ['editor owner','admin','publisher'],
  // Action:'edit', only: ['admin'] or ['publisher'] or ['editor' and 'owner']
  view: ['editor','admin','publisher','guest privileged']
  // Action:'view', only ['editor'] or ['admin'] or ['publisher'] or ['guest' and 'privileged']
});

console.log(jailer.check('remove',['guest'])); // nop
console.log(jailer.check('remove',['owner'])); // nop
console.log(jailer.check('remove',['admin'])); // yes!

console.log(jailer.check('edit',['editor','guest'])); // nop
console.log(jailer.check('edit',['publisher','manager'])); // yes!
console.log(jailer.check('edit',['editor','owner'])); // yes!

console.log(jailer.check('view',['guest'])); // nop
console.log(jailer.check('view',['anonymous'])); // nop
console.log(jailer.check('view',['editor','owner'])); // yes!
console.log(jailer.check('view',['guest','privileged','VIP'])); // yes!


/* ------------------------------ */

module.exports = Tree;
function Tree(){}
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






module.exports.Schema = Schema;
function Schema(config = {}){
  const schema = this;
  schema.id = config.id || 'noid';
  schema.indexes = config.indexes || {}; // {indexName(string):unique(bool),...} // these fields are the filter options
  schema.fields = config.fields || [];

  let languages = [];
  Object.defineProperty(schema, "languages", {
    enumerable : true,
    get : function(){return languages;},
    set : function(set){
      languages = Array.isArray(set)? set : [set];
    }
  });
  schema.languages = config.languages || [];

  let limit;
  Object.defineProperty(schema, "limit", {
    enumerable : true,
    get : function(){return limit;},
    set : function(set){
      limit = parseInt(set, 10);
    }
  });
  schema.limit = config.limit || 5;

  var keys;
  Object.defineProperty(schema, "keys",{
    enumerable : true,
    get : function(){return keys;},
    set : function(set = {}){
      keys = new Jailer({
        get    : set.get,
        insert : set.insert,
        update : set.update,
        remove : set.remove
      });
    }
  });
  schema.keys = config.keys;
}
  Schema.prototype.configure = function schemaConfigure(config = {}){
    for(const key in config){
      this[key] = config[key];
    }
    return this;
  };
  Schema.prototype.get = function schemaGet(data, input, cb, uid, keys){
    this.action('get', data, input, cb, uid, keys);
  };
  Schema.prototype.insert = function schemaInsert(data, input, cb, uid, keys){
    this.action('insert', data, input, cb, uid, keys);
  };
  Schema.prototype.update = function schemaUpdate(data, input, cb, uid, keys){
    this.action('update', data, input, cb, uid, keys);
  };
  Schema.prototype.remove = function schemaRemove(data, input, cb, uid, keys){
    this.action('remove', data, input, cb, uid, keys);
  };
  Schema.prototype.action = function schemaAction(action, data, input, cb, uid, keys){
    const schema = this;

    if(!Array.isArray(keys)){keys = (typeof keys === 'string')? [keys] : [];} else {keys = keys.slice();}   // keys array preset
    const owner = (!uid || !data || data._owner === uid);                                                    // (bool) is owner?
    const guest = (data && Array.isArray(data._guests) && data._guests.indexOf(uid) >= 0);                   // (bool) is guest?
    if(owner){keys.push('owner');}
    if(guest){keys.push('guest');}

    const result = new Tree();
    const errors = new Tree();
    const context = {schema, action, data, input, uid, keys, owner, guest};
    var chain = new Chain();
    const chainHandler = function(field){
      const fieldData = data? data[field.id] : undefined;
      const fieldInput = input? input[field.id] : undefined;
      const path = [field.id];
      const subcontext = Object.assign({}, context, {fieldData, fieldInput, path});
      const chainCallback = function(error){
        // Esta parte se puede fusionar con la de fieldset?
        console.log(context.action,'/'+field.id, fieldData, subcontext.fieldData);
        if(error){
          errors[field.id] = error;
        } else {
          if(context.action === 'get' || context.action === 'remove'){
            result[field.id] = subcontext.fieldData;
          } else {
            result[field.id] = subcontext.fieldInput;
          }
        }
        chain.next();
      };
      field.fire(subcontext, chainCallback);
    };
    for(const field of schema.fields){
      if(
        (context.action === 'get' && data.hasOwnProperty(field.id))     ||
        (context.action === 'insert' && input.hasOwnProperty(field.id)) ||
        (context.action === 'update' && input.hasOwnProperty(field.id)) ||
        (context.action === 'remove' && data.hasOwnProperty(field.id))
      ){ 
        chain.add(chainHandler, field);
      }
    }
    chain.add(function chainEnd(){
      if(Object.keys(errors).length > 0){
        cb(errors.parse()); // .parse(true) for marks
      } else {
        cb(null,result.parse());
      }
    }).pull();
  };










module.exports.Field = Field;
function Field(config = {}){
  const field = this;
  field.id = config.id || 'noid';
  field.main = false;
  field.i18n = config.i18n || false;
  field.required = config.required || false; // false || true || 'get' || 'insert' || 'update' || 'remove' || 'get require' ...
  //field.validations = config.validations || []; // regexp, nmin,nmax,lmin,lmax,required,date...
  field.fields = config.fields || [];
  config.on = config.on || {};
  field.handlers = {};

  let keys;
  Object.defineProperty(field, "keys", {
    enumerable : true,
    get : function(){return keys;},
    set : function(set = {}){
      keys = new Jailer(set);
    }
  });
  field.keys = config.keys;
}
  Field.prototype.configure = Schema.prototype.configure;
  Field.prototype.on = function(action,handler){
    this.handlers[action] = this.handlers[action] || [];
    this.handlers[action].push(handler);
    return this;
  };
  Field.prototype.fire = function(context,cb){
    const field = this;
    const handlers = this.handlers[context.action] || [];
    const chain = new Chain();
    const chainHandler = function(handler){
      const chainCallback = function(error){
        if(error){
          cb.call(field,error);
        } else {
          chain.next();
        }
      };
      handler.call(
        field,
        context,
        chainCallback 
      );
    };
    if(field.keys.check(context.keys, context.action)){
      handlers.unshift(field.controller);
      for(const handler of handlers){
        chain.add(chainHandler, handler);
      }
      chain.add(cb).pull();
    } else {
      cb.call(field,'no-credentials');
    }
  };
  Field.prototype.controller = function fieldController(context, cb){ // esto es un handler del tipo field.on("action",handler)
    if(!this.i18n){
      cb();
    } else {
      this.controllerI18n(context, cb);
    }
  };
  Field.prototype.controllerI18n = function fieldControllerI18n(context, cb){
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
          if(context.action === 'get' || context.action === 'remove'){
            result[lang] = subcontext.fieldData;
          } else {
            result[lang] = subcontext.fieldInput;
          }
        }
        chain.next();
      };
      field.fire(subcontext, chainCallback);
    }
    for(const lang of context.schema.languages){
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
        if(context.action === 'get' || context.action === 'remove'){
          context.fieldData = result;
        } else {
          context.fieldInput = result;
        }
        cb();
      }
    }).pull();
  };









module.exports.Fieldset = Fieldset;
util.inherits(Fieldset, Field);
function Fieldset(config = {}){
  Field.call(this, config);
}
  Fieldset.prototype.controller = function(context, cb){
    const fieldset = this;
    const result = new Tree();
    const errors = new Tree();
    const chain = new Chain();
    const chainHandler = function(field){
      const fieldData = context.fieldData? context.fieldData[field.id] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[field.id] : undefined;
      const path = context.path.concat([field.id]);
      const subcontext = Object.assign({}, context, {fieldData, fieldInput, path});
      const chainCallback = function(error){
        console.log(context.action, '/' + path.join("/"), fieldData, subcontext.fieldData);
        if(error){
          errors[field.id] = error;
        } else {
          if(context.action === 'get' || context.action === 'remove'){
            result[field.id] = subcontext.fieldData;
          } else {
            result[field.id] = subcontext.fieldInput;
          }
        }
        chain.next();
      };
      field.fire(subcontext, chainCallback);
    };
    for(const field of fieldset.fields){
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
        if(context.action === 'get' || context.action === 'remove'){
          context.fieldData = result;
        } else {
          context.fieldInput = result;
        }
        cb();
      }
    }).pull();
  };



module.exports.List = List;
util.inherits(List, Field);
function List(config = {}){
  Field.call(this, config);
}
  List.prototype.controller = function(context, cb){
    const list = this;
    const result = new Tree();
    let errors = new Tree();
    const chain = new Chain();
    function chainHandler(index){
      const fieldData = context.fieldData? context.fieldData[index] : undefined;
      const fieldInput = context.fieldInput? context.fieldInput[index] : undefined;
      const path = context.path.concat([index]);
      const subcontext = Object.assign({}, context,{fieldData, fieldInput, path});
      const chainCallback = function(error){
        console.log(context.action,'/'+path.join("/"), fieldData, subcontext.fieldData);
        if(error){
          errors[index] = error;
        } else {
          if(context.action === 'get' || context.action === 'remove'){
            result[index] = subcontext.fieldData;
          } else {
            result[index] = subcontext.fieldInput;
          }
        }
        chain.next();
      };
      Fieldset.prototype.controller.call(list, subcontext, chainCallback);
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
        if(context.action === 'get' || context.action === 'remove'){
          context.fieldData = result;
        } else {
          context.fieldInput = result;
        }
        cb();
      }
    }).pull();
  };








module.exports.Text = Text;
util.inherits(Text, Field);
function Text(config = {}){
  Field.call(this, config);
}









module.exports.Int = Int;
util.inherits(Int, Field);
function Int(config = {}){
  Field.call(this, config);
}
  Int.prototype.onInsert = function(context, cb){
    if(parseInt(context.fieldInput, 10) >= 0){
      cb(context.fieldInput);
    } else {
      cb(null, ["fields.int.invalid"]);
    }
  };
  Int.prototype.onUpdate = function(context, cb){
    if(parseInt(context.fieldInput, 10) >= 0){
      cb(context.fieldInput);
    } else {
      cb(null, ["fields.int.invalid"]);
    }
  };











module.exports.Textarea = Textarea;
util.inherits(Textarea, Field);
function Textarea(config = {}){
  Field.call(this, config);
}










module.exports.Editor = Editor;
util.inherits(Editor, Field);
function Editor(config = {}){
  Field.call(this, config);
}










const fs = require('node-fs');
module.exports.File = File;
util.inherits(File, Field);
function File(config = {}){
  Field.call(this, config);
  this.fsPath = config.path || File.defaultFsPath;
}
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
      const schemaId = context.schema.id;
      const entityId = context.action === 'insert'? fieldInput._id : context.fieldData._id;
      const entityTime = new Date(parseInt(entityId.toString().slice(0,8),16)*1000);
      
      const filePath = paths.join(entityTime.getUTCFullYear(), entityTime.getUTCMonth(), entityId);
      const fileAbsolutePath = paths.join(this.fsPath, schemaId, filePath);
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










module.exports.Select = Select;
util.inherits(Select, Field);
function Select(config = {}){
  Field.call(this, config);
  this.values = config? config.values : [];
  this.multiple = (config && config.multiple);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
}
  Select.prototype.onSet = function(context, cb){
    const value = context.fieldInput || [];
    let result;
    // TODO las validaciones deberian servir para esto, una mezcla, onset
    if(this.multiple){
      result = [];
      for(const option of this.values){
        if(value.indexOf(option) >= 0 && result.indexOf(option) < 0){
          result.push(option);
        }
      }
    } else {
      if(this.values.indexOf(value) >= 0){
        result = value;
      }
    }
    context.fieldInput = result;
    cb();
  };









module.exports.Checkbox = Checkbox;
util.inherits(Checkbox, Field);
function Checkbox(config = {}){
  Field.call(this, config);
  this.on('get',this.onGet);
  this.on('update',this.onSet);
  this.on('insert',this.onSet);
}
  Checkbox.prototype.onGet = function(context, cb){
    context.fieldData = context.fieldData? true : false;
    cb();
  };
  Checkbox.prototype.onSet = function(context, cb){
    context.fieldInput = context.fieldInput? true : false;
    cb();
  };










module.exports.Checkboxes = Checkboxes;
util.inherits(Checkboxes, Select);
function Checkboxes(config = {}){
  config.multiple = true;
  Select.call(this,config);
}










module.exports.Radios = Radios;
util.inherits(Radios, Select);
function Radios(config = {}){
  Select.call(this, config);
  this.values = config.values || {};
}










module.exports.Time = Time;
util.inherits(Time, Field);
function Time(config = {}){
  Field.call(this, config);
}








console.log("Loading...");

var mySchema = new Schema({
  id: "mySchema",
  limit : 5,
  indexes : ['_id','field1','field2'],
  languages : ['en','es'],
  fields : [

    new Text({id:'fielText'}),
    new Checkbox({id:'fieldCheckbox'}),
    new Checkboxes({
      id:'fieldCheckboxes',
      values : ['A','B','C','D']
    }),
    new Radios({
      id:'fieldRadios',
      values : ['A','B','C','D']
    }),
    new Select({
      id:'fieldSelect',
      multiple: true,
      values : ['A','B','C','D'],
      /*
      on : {
        get : [
          function(context,cb){
            // verifications...
            // ok
            cb();
            // or error
            cb(new Error("Error!"));
          },
          function(context,cb){
            
          }
        ]
      }
      */
      /*
      keys : {
        update : 'manager',
        insert : 'manager',
        remove : ''
      }
      */
    }),
    new Time({id:'fieldTime'}),
    /*
    new Reference({
      id:'fieldReference',
      collection : 'system',
      headers : ['_id','_img','field1','field2','reverse']
    }),
    */
    new Img({id:'_img'}),
    new List({
      id:'listFiles',
      fields: [
        new File({id:'file'}),
        new Text({id:'text'})
      ]
    }),
    new List({
      id:'list',
      fields: [
        new Img({id:'img'}),
        new Text({id:'text'})
      ]
    }),
    new Editor({
      id:'editori18n',
      i18n : true
    }),
    new Fieldset({
      id:'thesubset',
      fields: [
        new Text({id:'subset1'}),
        new Text({id:'subset2'}),
        new Text({id:'subset3'})
      ]
    })
  ]
});

var Data = {
  fielText : "Texto",
  fieldCheckbox : 1,
  fieldCheckboxes : ["B","C"],
  fieldRadios : 2,
  fieldSelect : ["B"],
  fieldTime : 12345678,
  _img : "/to.img",
  listFiles : [
    {
      file : "/to.file",
      text : "A"
    },
    {
      file : "/to.file",
      text : "B"
    }
  ],
  list : [
    {
      img : "to.img",
      text : "A"
    },
    {
      img : "to.img",
      text : "B"
    }
  ],
  editori18n : {
    en: "Hello",
    es: "Hola"
  },
  thesubset : {
      subset1 : "s1",
      subset2 : "s2",
      subset3 : "s3"
  }
};


mySchema.get(Data,undefined,function(error,result){
  console.log(result);
},
"userZero",["A","B"]);


/*
module.exports.Reference = Reference;
Reference.prototype = new Field();
function Reference(config){
  Field.call(this,config);
  field.collection = config.collection || false;
  field.headers = config.headers || false;
}
  Reference.prototype.getter = function(value,cb){
    var field = this;
    var schema = field.schema;
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