/* jslint node: true, esnext: true */
"use strict";

const Chain = require("./Chain");
const {Tree, TreeArray} = require("./Tree");
const Controllable = require("./Controllable");

const Schema = module.exports = function Schema(config = {}){
  const schema = this;
  Controllable.call(this, config);

  schema.driver = config.driver;

  schema.schema = config.schema || [];
  schema.schema.splice(0, 0, ...[
    new Controllable({
      id : "_id",
      on : {
        /*
        get : [function getId(context, done){
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
  Schema.prototype.controller = function schemaController(context, done){
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
        input : context.input? context.input[field.id] : undefined,
        result: undefined,
        parents : context.parents.concat([field.id]),
        parent : context
      });
      chain.add(field.fire.bind(field, subcontext));
    }
    for(const index of indexes){
      if(index !== "__id"){
        context.errors.set(context.parents.concat([index]), 'unknow-input-field');
      }
    }
    chain.add(done, undefined).pull();
  };

  const Modelator = require("./Modelator");
  const RelationalSchema = require("./RelationalSchema");
  Schema.prototype.walker = function schemaWalker(parent = this, childList = []){
    if(parent && parent.constructor && (parent.constructor === Modelator || parent.constructor === RelationalSchema) ){
      childList.splice(0,0,parent);
      for(const controllable of parent.schema){
        schemaWalker(controllable, childList);
      }
    }
    return childList;
  };


