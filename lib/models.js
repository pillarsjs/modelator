/* jslint node: true */
"use strict";

var util = require("util");
var ObjectArray = require('objectArray');
var ObjectID = require('mongodb').ObjectID;
var paths = require('path');

function Chain(){
	var chain = this;
	var chainlinks = [];
	var failhandler = false;
	chain.data = {};
	chain.add = function(func){
		var args = Array.prototype.slice.call(arguments).slice(1);
		chainlinks.push({func:func,args:args});
		return chain;
	};
	chain.onfail = function(_failhandler){
		failhandler = _failhandler;
		return chain;
	};
	chain.pull = function(){
		if(chainlinks.length>0){
			chainlinks[0].func.apply(chain,chainlinks[0].args);
		}
	};
	chain.next = function(){
		chainlinks.shift();
		chain.pull();
	};
	chain.fail = function(error){
		if(failhandler){
			failhandler(error,chain);
		}
	};
}

module.exports = Jailer;
function Jailer(locks){
  locks = locks || {};
  for(var i=0,k=Object.keys(locks),l=k.length;i<l;i++){
    this[k[i]]=locks[k[i]];
  }
}
  Jailer.prototype.check = function(action,keys){
    var locks = this[action];
    if(!locks){return true;} // Unlocked action.

    // Avoid errors.
    if(!Array.isArray(locks)){locks = (typeof locks === 'string')?[locks]:[];}
    if(!Array.isArray(keys)){keys = (typeof keys === 'string')?[keys]:[];}

    var lock,grant;
    for(var i=0,l=locks.length;i<l;i++){ // OR...
      lock = locks[i].split(' ');
      grant = true;
      for(var i2=0,l2=lock.length;i2<l2;i2++){ // AND...
        if(keys.indexOf(lock[i2]) === -1){
          grant = false;
        }
      }
      if(grant){
        return true;
      }
    }
    return false;
  };

module.exports = Tree;
function Tree(){}
	Tree.prototype.parse = function treeParser(marks){
		var result = {};
		treeParseWalker([],this,result,marks);
		return result;
	};
		function treeParseWalker(path,tree,result,marks){
			for(var i=0,k=Object.keys(tree),l=k.length;i<l;i++){
				var key = k[i];
				if(tree[key] instanceof Tree){
					if(marks){result[path.concat([key]).join('.')]=true;}
					treeParseWalker(path.concat([key]),tree[key],result,marks);
				} else {
					result[path.concat([key]).join('.')]=tree[key];
				}
			}
		}






module.exports.Schema = Schema;
function Schema(config){
	var schema = this;
	config = config || {};
	schema.id = config.id || 'noid';
	schema.indexes = config.indexes || {}; // {indexName(string):unique(bool),...} // these fields are the filter options

 	var languages = [];
  Object.defineProperty(schema,"languages",{
    enumerable : true,
    get : function(){return languages;},
    set : function(set){
    	limit = Array.isArray(set)? set : [set];
    }
  });
  schema.limit = config.limit || 5;

 	var limit;
  Object.defineProperty(schema,"limit",{
    enumerable : true,
    get : function(){return limit;},
    set : function(set){
    	limit = parseInt(set);
    }
  });
  schema.limit = config.limit || 5;

 	var fields;
  Object.defineProperty(schema,"fields",{
    enumerable : true,
    get : function(){return fields;},
    set : function(set){
    	fields = set;
    	// fields = new ObjectArray(set);
    }
  });
  schema.fields = config.fields;

 	var keys;
  Object.defineProperty(schema,"keys",{
    enumerable : true,
    get : function(){return keys;},
    set : function(set){
    	set = set || {};
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
  Schema.prototype.configure = function schemaConfigure(config){
    for(var i=0,k=Object.keys(config),l=k.length;i<l;i++){
      this[k[i]]=config[k[i]];
    }
    return this;
  };
	Schema.prototype.get = function schemaGet(data,cb,uid,keys){
		this.action('get',data,undefined,cb,uid,keys);
	};
	Schema.prototype.insert = function schemaInsert(input,cb,uid,keys){
		this.action('insert',null,input,cb,uid,keys);
	};
	Schema.prototype.update = function schemaUpdate(data,input,cb,uid,keys){
		this.action('update',data,input,cb,uid,keys);
	};
	Schema.prototype.remove = function schemaRemove(data,cb,uid,keys){
		this.action('remove',data,undefined,cb,uid,keys);
	};
	Schema.prototype.action = function schemaAction(action,data,input,cb,uid,keys){
		var schema = this;

		if(!Array.isArray(keys)){keys = (typeof keys === 'string')?[keys]:[];} else {keys = keys.slice();}   // keys array preset
		var owner = (!uid || !data || data._owner===uid);                                                    // (bool) is owner?
		var guest = (data && Array.isArray(data._guests) && data._guests.indexOf(uid)>=0);                   // (bool) is guest?
		if(owner){keys.push('owner');}
		if(guest){keys.push('guest');}

		var result = new Tree();
		var errors = new Tree();
		var context = {
			schema:schema,
			action:action,
			data:data,
			input:input,
			uid:uid,
			keys:keys,
			owner:owner,
			guest:guest
		};
		var chain = new Chain();
		function chainHandler(field){
			field[action](Object.assign(context,{
					fieldData:data?data[field.id]:undefined,
					fieldInput:input?input[field.id]:undefined,
					path:[field.id],
				}),
				function chainCallback(output,error){
					if(error){
						errors[field.id]=error;
					} else {
						result[field.id]=output;
					}
					chain.next();
				}
			);
		}
		for(var i=0,l=schema.fields.length;i<l;i++){
			var field = schema.fields[i];
			if(data.hasOwnProperty(field.id)){
				if(field.keys.check(keys,action)){
					chain.add(chainHandler,field);
				} else if(action !== 'get'){
					errors[field.id]=['invalidCredentials'];
				}
			}
		}
		chain.add(function chainEnd(){
			if(Object.keys(errors).length>0){
				cb(null,errors.parse()); // .parse(true) for marks
			} else {
				cb(result);
			}
		}).pull();
	};










module.exports.Field = Field;
function Field(config){
	var field = this;
	config = config || {};
	field.id = config.id || 'noid';
	field.main = false;
	field.i18n = config.i18n || false;
	field.required = config.required || false; // false || true || 'get' || 'insert' || 'update' || 'remove' || 'get require' ...
	field.validations = config.validations || []; // regexp, nmin,nmax,lmin,lmax,required,date...

 	var fields;
  Object.defineProperty(field,"fields",{
    enumerable : true,
    get : function(){return fields;},
    set : function(set){
    	fields = set;
    	// fields = new ObjectArray(set);
    }
  });
  field.fields = config.fields;

 	var keys;
  Object.defineProperty(field,"keys",{
    enumerable : true,
    get : function(){return keys;},
    set : function(set){
    	set = set || {};
    	keys = new Jailer({
				get    : set.get,
				insert : set.insert,
				update : set.update,
				remove : set.remove
			});
    }
  });
  field.keys = config.keys;
}
	Field.prototype.get = function fieldGet(context,cb){
		if(this.i18n){
			this.actionI18n(context,cb);
		} else {
			this.action(context,cb);
		}
	};
	Field.prototype.insert = function fieldInsert(context,cb){
		if(this.i18n){
			this.actionI18n(context,cb);
		} else {
			this.action(context,cb);
		}
	};
	Field.prototype.update = function fieldUpdate(context,cb){
		if(this.i18n){
			this.actionI18n(context,cb);
		} else {
			this.action(context,cb);
		}
	};
	Field.prototype.remove = function fieldRemove(context,cb){
		if(this.i18n){
			this.actionI18n(context,cb);
		} else {
			this.action(context,cb);
		}
	};
	
	Field.prototype.actionI18n = function fieldActionI18n(context,cb){
		var field = this;
		var result = new Tree();
		var errors = new Tree();
		var chain = new Chain();
		function chainHandler(lang){
			field.action(Object.assign(context,{
					fieldData:context.fieldData?context.fieldData[lang]:undefined,
					fieldInput:context.fieldInput?context.fieldInput[lang]:undefined,
					path:context.path.concat([lang])
				}),
				function chainCallback(output,error){
					if(error){
						errors[lang]=error;
					} else {
						result[lang]=output;
					}
					chain.next();
				}
			);
		}
		for(var i=0,l=context.schema.languages.length;i<l;i++){
			var lang = context.schema.languages[i];
			if(field.keys.check(context.keys,context.action)){
				if(
					(context.action === 'get' && context.fieldData.hasOwnProperty(lang))     ||
					(context.action === 'insert' && context.fieldInput.hasOwnProperty(lang)) ||
					(context.action === 'update' && context.fieldInput.hasOwnProperty(lang)) ||
					(context.action === 'remove' && context.fieldData.hasOwnProperty(lang))
				){
					var validation = context.action === 'insert' || context.action === 'update'? field.validate(context) : [];
					if(validation.length>0){
						errors[lang]=validation;
					} else {
						chain.add(chainHandler,lang);
					}
				}
			} else {
				errors[lang]=['invalidCredentials'];
			}
		}
		chain.add(function chainEnd(){
			if(Object.keys(errors).length>0){
				cb(null,errors);
			} else {
				cb(result);
			}
		}).pull();
	};
	Field.prototype.action = function fieldAction(context,cb){
		var field = this;
		var handler = 'on'+context.action.replace(/^./,function(m){return m.toUpperCase();});
		if(typeof field[handler] === 'function'){
			field[handler](context,cb);
		} else {
			cb(null,['noActionHandler']);
		}
	};
	Field.prototype.validate = function(context){
		var field = this;
		var result = [];
		for(var i=0,l=field.validations.length;i<l;i++){
			var validation = field.validations[i].call(field,context);
			if(validation!==true){
				result.push(validation);
			}
		}
		return result;
	};
	Field.prototype.onGet = function(context,cb){
		cb(context.fieldData);
	};
	Field.prototype.onInsert = function(context,cb){
		cb(context.fieldInput);
	};
	Field.prototype.onUpdate = function(context,cb){
		cb(context.fieldInput);
	};
	Field.prototype.onRemove = function(context,cb){
		cb(context.fieldData);
	};










module.exports.Fieldset = Fieldset;
util.inherits(Fieldset, Field);
function Fieldset(config){
	Field.call(this,config);
}
	Fieldset.prototype.action = function(context,cb){
		var fieldset = this;
		var result = new Tree();
		var errors = new Tree();
		var chain = new Chain();
		function chainHandler(field){
			field[context.action](
				{
					fieldData:context.fieldData?context.fieldData[field.id]:undefined,
					fieldInput:context.fieldInput?context.fieldInput[field.id]:undefined,
					path:context.path.concat([fieldset.id,field.id]),
				},
				function chainCallback(value,error){
					if(error){
						errors[field.id]=error;
					} else {
						result[field.id]=value;
					}
					chain.next();
				}
			);
		}
		for(var i=0,l=fieldset.fields.length;i<l;i++){
			var field = fieldset.fields[i];
			if(field.keys.check(context.keys,context.action)){
				if(
					(context.action === 'get' && context.fieldData.hasOwnProperty(field.id))    ||
					(context.action === 'insert' && context.fieldInput.hasOwnProperty(field.id)) 		||
					(context.action === 'update' && context.fieldInput.hasOwnProperty(field.id))   	||
					(context.action === 'remove' && context.fieldData.hasOwnProperty(field.id))
				){
					var validation = context.action === 'insert' || context.action === 'update'? field.validate(context.fieldInput) : [];
					if(validation.length>0){
						errors[field.id]=validation;
					} else {
						chain.add(chainHandler,field);
					}
				}
			} else {
				errors[field.id]=['invalidCredentials'];
			}
		}
		chain.add(function chainEnd(){
			if(Object.keys(errors).length>0){
				cb(null,errors);
			} else {
				var handler = 'on'+context.action.replace(/^./,function(m){return m.toUpperCase();});
				if(typeof fieldset[handler] === 'function'){
					fieldset[handler](context,cb);
				} else {
					cb(null,['noActionHandler']);
				}
			}
		}).pull();
	};










module.exports.Text = Text;
util.inherits(Text, Field);
function Text(config){
	Field.call(this,config);
}









module.exports.Int = Int;
util.inherits(Int, Field);
function Int(config){
	Field.call(this,config);
}
	Int.prototype.onInsert = function(context,cb){
		if(parseInt(context.fieldInput,10)>=0){
			cb(context.fieldInput);
		} else {
			cb(null,["fields.int.invalid"]);
		}
	};
	Int.prototype.onUpdate = function(context,cb){
		if(parseInt(context.fieldInput,10)>=0){
			cb(context.fieldInput);
		} else {
			cb(null,["fields.int.invalid"]);
		}
	};











module.exports.Textarea = Textarea;
util.inherits(Textarea, Field);
function Textarea(config){
	Field.call(this,config);
}










module.exports.Editor = Editor;
util.inherits(Editor, Field);
function Editor(config){
	Field.call(this,config);
}










var fs = require('node-fs');
module.exports.File = File;
util.inherits(File, Field);
function File(config){
	Field.call(this,config);
}
	File.prototype.onInsert = function(context,cb){
		this.saveFile(context,cb);
	};
	File.prototype.onUpdate = function(context,cb){
		this.saveFile(context,cb);
	};
	File.prototype.saveFile = function saveFile(context,cb){
		var field = this;
		var fieldInput = context.fieldInput;
		if(fieldInput && fieldInput.path && fieldInput.size && fieldInput.name && fieldInput.type){
			var schemaId = context.schema.id;
			var entityId = context.action==='insert'?fieldInput._id:context.fieldData._id;
			var entityTime = new Date(parseInt(entityId.toString().slice(0,8),16)*1000);
			
			var filePath = paths.join(entityTime.getUTCFullYear(),entityTime.getUTCMonth(),entityId);
			var fileAbsolutePath = paths.join(global.uploads,schemaId,filePath);
			var fileUID = context.path.join('.');

			fs.mkdir(fileAbsolutePath, undefined, true, function(error){
				if(!error){
					fs.rename(fieldInput.path, paths.join(fileAbsolutePath,fileUID), function(error){
						if(!error){
							fieldInput.moved = true;
							cb({
								size: parseInt(fieldInput.size,10) || 0,
								name: fieldInput.name,
								type: fieldInput.type,
								lastmod: fieldInput.lastModifiedDate || new Date()
							});
						} else {
							cb(null,["fields.file.move"]);
						}
					});
				} else {
					cb(null,["fields.file.directory"]);
				}
			});
		} else {
			cb(null,['fields.file.invalid']);
		}
	};










module.exports.Img = Img;
util.inherits(Img, File);
function Img(config){
	File.call(this,config);
}










module.exports.Select = Select;
util.inherits(Select, Field);
function Select(config){
	Field.call(this,config);
	this.values = config?config.values:[];
}
	Select.prototype.onGet = function(context,cb){
		var value = context.value || [];
		var result = {};
		for(var i=0,l=this.values.length;i<l;i++){
			if(value.indexOf(this.values[i])>=0){
				result[this.values[i]]=true;
			} else {
				result[this.values[i]]=false;
			}
		}
		cb(result);
	};
	Select.prototype.onInsert = function(context,cb){
		this.onSet(context,cb);
	};
	Select.prototype.onUpdate = function(context,cb){
		this.onSet(context,cb);
	};
	Select.prototype.onSet = function(context,cb){
		var value = context.fieldInput || [];
		var result = [];
		for(var i=0,l=this.values.length;i<l;i++){
			if(value.indexOf(this.values[i])>=0 && result.indexOf(this.values[i])<0){
				result.push(this.values[i]);
			}
		}
		cb(result);
	};










module.exports.Checkbox = Checkbox;
util.inherits(Checkbox, Field);
function Checkbox(config){
	Field.call(this,config);
}
	Checkbox.prototype.onGet = function(context,cb){
		cb(context.value?true:false);
	};
	Checkbox.prototype.onUpdate = function(context,cb){
		cb(context.value?true:false);
	};
	Checkbox.prototype.onInsert = function(context,cb){
		cb(context.value?true:false);
	};










module.exports.Checkboxes = Checkboxes;
util.inherits(Checkboxes, Select);
function Checkboxes(config){
	Select.call(this,config);
}










module.exports.Radios = Radios;
util.inherits(Radios, Field);
function Radios(config){
	Field.call(this,config);
	this.values = config.values || {};
}










module.exports.Time = Time;
util.inherits(Time, Field);
function Time(config){
	Field.call(this,config);
}








console.log("hola");

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
    	values : ['A','B','C','D'],
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
  	new Fieldset({
  		id:'listFiles',
  		fields: [
    		new File({id:'file'}),
    		new Text({id:'text'})
    	]
    }),
  	new Fieldset({
  		id:'list',
  		fields: [
    		new Img({id:'img'}),
    		new Text({id:'text'})
    	]
  	}),
  	new Editor({
  		id:'editori18n',
  		i18n : true
  	})
	  /*
	  new Subset({
	  	id:'thesubset',
	  	fields: [
	    	new Text({id:'subset1'}),
	    	new Text({id:'subset2'}),
	    	new Text({id:'subset3'})
	    ]
	  })
	  */
  ]
});

var Data = {
	fielText : "Text",
	fieldCheckbox : true,
	fieldCheckboxes : [true,false,true,false],
	fieldRadios : 2,
	fieldSelect : "B",
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
	}
};


mySchema.get(Data,function(result){
	console.log(result.parse());
},
"userZero",
["A","B"]);


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