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
const Controllable = require("./Controllable");

const Schema = module.exports = function schemaController(config = {}){
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









