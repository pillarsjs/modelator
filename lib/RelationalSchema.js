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
const {Tree, TreeArray} = require("./Tree");
const absoluteId = require("./AbsoluteId");
const Schema = require("./Schema");

const RelationalSchema = module.exports = function(config = {}){
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
          ref : relationalSchema.id,
          id : indexId,
          driver : relationalSchema.driver
        }]),
        parent : context,
        relationalSchemaMain : false
      });
      chain.add(relationalSchema.fire.bind(relationalSchema, subcontext, true, Schema.prototype.controller));
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
    }
    next();
  };