/* jslint node: true, esnext: true */
"use strict";

const Chain = require("./Chain");
const {Tree, TreeArray} = require("./Tree");
const absoluteId = require("./AbsoluteId");
const Schema = require("./Schema");
const pointerParse = require("./Pointer");

const RelationalSchema = module.exports = function RelationalSchema(config = {}){
  const relationalSchema = this;
  Schema.call(this, config);

  relationalSchema.driver = config.driver;
  relationalSchema.on("retrieve", RelationalSchema.retrieve);
};
  RelationalSchema.prototype = Object.create(Schema.prototype);
  RelationalSchema.prototype.constructor = RelationalSchema;
  RelationalSchema.prototype.retrieve = function(context, done){
    const relationalSchema = this;
    if(context.relationalSchemaMain){
      const result = new TreeArray();
      for (const index in context.result){
        result.push(context.result[index]);
      }
      context.result = result;
    }
    return done();
  };
  RelationalSchema.prototype.controller = function relationalSchemaController(context, done){
    const relationalSchema = this;
    // debug("SCHEMA-ARRAY".black.bgWhite, dotPath(context.parents), context.result);

    let result = context.result;
    context.result = new Tree();
    context.relationalSchemaMain = true;

    if(context.method !== 'retrieve'){
      context.parent = null; // avoid save to main
    }
    if(context.method === 'get'){
      result = [result];
    }

    const chain = new Chain();
    for(const index in result){ // TODO: review agnostic iterator (array or object for projection mode)

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
      } else if(method === 'get'){
        //result[index]._id = index;
      }

      const indexId = result[index]._id || parseInt(index);
      if(indexId != index){
        result[indexId] = result[index];
      }
      
      context.result[indexId] = new Tree();

      if(["insert", "remove"].indexOf(context.context.method) >= 0){
        if(method !== context.context.method){
          return done('invalid-array-format');
        }
      }

      const subcontext = Object.assign({}, context, {
        method,
        result : result[indexId],
        index : indexId,
        input : result[indexId], // context.input? context.input[index] : undefined, 
        parents : context.parents.concat([{
          ref : relationalSchema.id,
          id : indexId,
          driver : relationalSchema.driver
        }]),
        parent : context,
        relationalSchemaMain : false
      });

      chain.add(relationalSchema.fire.bind(relationalSchema, subcontext, Schema.prototype.controller));
      chain.add(relationalSchema.arrayHandle.bind(relationalSchema), subcontext, done);
    }

    chain.add(done,undefined).pull();
  };
  RelationalSchema.prototype.arrayHandle = function(context, done, next){
    const relationalSchema = this;
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
    } else if (context.method === 'get'){
      const payloadPoint = context.payload[pointerParse(context.parents, true)];
      if(payloadPoint){
        context.result = context.result || new Tree();
        context.getters.set(context.parents, context.result);
      }
    }
    next();
  };

