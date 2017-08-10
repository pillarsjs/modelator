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

const ObjectID = require('mongodb').ObjectID;
const {Tree, TreeArray} = require("./Tree");
const Chain = require("./Chain");
const absoluteId = require("./AbsoluteId");

const ModelatorMongoDriver = module.exports = Driver;

// TODO: no tira el removeback

// TODO: driver count
// TODO: driver list
// TODO: driver retrieve
// TODO: driver refactor as extendable Class
// TODO: Extract PillarsMongoService to Pillars services
// TODO: Create new Mosca service for Pillars services, connect mosca service and Modelator events... wow.

// Reorganize:
//   lib/Controllable.js
//   lib/Transaction.js
//   lib/Section.js, RelationalSection.js, Modelator.js (schema, relationalSchema, modelator)
//   lib/fields/field.js  (and ...rest of Field extends on separate files)
//   lib/driver/Driver.js (Driver extensible base class)
//   lib/driver/$drivername/...  (particular driver)

function Driver(config){
  const driver = this;
  driver.service = config.service;
  driver.database = config.database;
  Object.defineProperty(driver, 'conn', {
    get(){return driver.service.database;}
  });
}
  Driver.prototype.connect = function(cb){
    const driver = this;
    driver.service.start({
      database : driver.database
    }, cb);
  };
  Driver.prototype.handle = function(method, transaction, pointer, sentence, main){
    const driver = this;
    const pointerProjection = transaction.projection.get(pointer);
    const collection = pointerProjection.id;
    const n = Array.isArray(sentence)? sentence.length : 1;
    const parents = [];
    for (const parent of pointer.slice(0,-1)){
      if(typeof parent !== 'string'){
        parents.push('__' + parent.ref);
      }
    }

    if(main){
      transaction.close = driver.service.stop.bind(driver.service);
    }

    return function(error, result = {result:{}}) {
      if( !error && ( method === "insert" || method === "update" || method === "remove") && result.result.ok && result.result.n === n ) {
        transaction.results.push({method, pointer, sentence, collection, result, parents});
        return transaction.chain.next();
      } else {
        return transaction.done({method, pointer, sentence, collection, result, parents});
      }
    };
  };
  Driver.prototype.insert = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.projection.get(pointer);

    // TODO: if(check error on parent executions for exist){}
    // TODO: ownering check

    if(!main){
      for (const insert of sentence){
        for (const parent of pointer.slice(0,-1)){
          if(typeof parent !== 'string'){
            insert['__' + parent.ref] = parent.id;
          }
        }
      }
    }

    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        const method = main? 'insert' : 'insertMany';
        dbc[method](sentence, done);
      } else {
        done(); // TODO: review.
      }
    });
  };
  Driver.prototype.update = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.projection.get(pointer);

    const query = {_id : sentence._id};
    const update = {
      $set : sentence.parse()
    };

    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        dbc.updateOne(query, update, done);
      } else {
        done(); // TODO: review.
      }
    });
  };
  // TODO : remove and reverseRemove refactor (clean? cleaner?)
  Driver.prototype.remove = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.projection.get(pointer);
    const controllable = pointerProjection.controllable;

    const reversed = schemaWalker(controllable,[]);
    const reverseChain = new Chain();
    const parent = '__' + controllable.id;
    const index = sentence._id;
    for(const controllable of reversed){
      const driver = controllable.driver;
      reverseChain.add(driver.reverseRemove.bind(driver), transaction, controllable.id , parent, index);
    }
    reverseChain.add(function(){
      const query = {_id : sentence._id};
      driver.connect(function(error, conn){
        if(!error){
          const dbc = driver.conn.collection(pointerProjection.id);
          dbc.removeOne(query, done);
        } else {
          done(); // TODO: review.
        }
      });
    },undefined).pull();
  };
  Driver.prototype.reverseRemove = function(transaction, collection , relation, index, done){
    const driver = this;
   
    const query = {};
    query[relation] = index;
    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(collection);
        dbc.removeMany(query, function(error, result = {result:{}}){
          if(result.result.ok) {
            transaction.reverse.push({method : 'clean', collection, relation, index});
          } else {
            // return transaction.done({method : 'clean', collection, relation, index});
          }
          return done();
        });
      } else {
        done(); // TODO: review.
      }
    });
  
  };



  function schemaWalker(parent, childList){
    if(parent && parent.constructor && parent.constructor.name == 'SchemaArray'){
      childList.splice(0,0,parent);
      for(const controllable of parent.schema){
        schemaWalker(controllable, childList);
      }
    }
    return childList;
  }

/*
ModelatorMongoDriver.count = function(schema, params, cb, user, keys){
  
  keys = Array.isArray(keys)? keys : [keys];

  let grant = true;
  const query = {};

  if(grant){
    const dbc = schema.driver.collection(schema.collection);
    dbc.count(query, function(error, count) {
      if(error){
        cb({
          error : "count-error",
          details : error
        });
      } else {
        cb({
          error : undefined,
          data : count
        });
      }
    });
  } else {
    cb({
      error : "count-forbidden"
    });
  }
};

ModelatorMongoDriver.list = function(schema, params, cb, user, keys){

  keys = Array.isArray(keys)? keys : [keys];

  let skip = 0;
  let filter = false;
  let limit = schema.limit || 10;
  let range = false;
  let order = schema.order === -1? -1 : 1;
  let sort = schema.sort || false;

  const cols = {};
  const qsort = {};
  const qors = [];

  let grant = true;
  const query = {};

  if(grant){
    if(parseInt(params.order, 10) === -1){
      order = -1;
    }
    if(typeof params.sort === 'string' && params.sort !== ''){
      /*
      for(const header of schema.headers){ // TODO: from projection (use index)
        if(header === params.sort){
          sort = params.sort;
          break;
        }
      }
      *
      sort = params.sort;
    }
    if(sort){
      qsort[sort] = order;
      /*
      if(typeof params.range === 'string' && params.range !== ''){ // WTF? range need two factors
        range = params.range;
        query[sort] = order > 0? {$gt : range} : {$lt : range};
      }
      *
    }
    if(typeof params.skip === 'string' && parseInt(params.skip, 10) > 0){
      skip = parseInt(params.skip, 10);
    }

    if(typeof params.filter === 'string' && params.filter !== ''){
      filter = params.filter;
      /*
      for(const filter of schema.filters){ // TODO: from projection (use index)
        const qor = {};
        qor[filter] = new RegExp(filter, "i");
        qors.push(qor);
        break;
      }
      *

      const qor = {};
      qor[filter.field] = new RegExp(filter.regExp, "i");
      qors.push(qor);

      if(!query.$and){
        query.$and = [];
      }
      query.$and.push({$or : qors});
    }

    /*
    for(const header of schema.headers){ // TODO: from projection (use main)
      cols[header] = true;
    }
    *

    const dbc = schema.driver.collection(schema.collection);
    dbc.find(query, cols).sort(qsort).skip(skip).limit(limit).toArray(function(error, list) {
      if(error){
        cb({
          error : "list-error",
          details : error
        });
      } else {
        cb({
          error : false,
          data : list,
          meta : {order, sort, range, skip, limit, filter, cols}
        });
      }
    });
  } else {
    cb({
      error : "list-forbidden"
    });
  }
};

ModelatorMongoDriver.retrieve = function(schema, params, cb, user, keys){

  keys = Array.isArray(keys)? keys : [keys];

  let grant = true;
  const query = {_id:params._id};

  if(grant){
    if(params){
      const dbc = schema.driver.collection(schema.collection);
      dbc.findOne(query, function(error, doc) {
        if(error){
          cb({
            error : "retrieve-error",
            details : error
          });
        } else if(!doc) {
          cb({
            error : "retrieve-unreachable"
          });
        } else {
          // context.result._id = id;
          cb({
            error : undefined,
            data : doc
          });
        }
      });
    } else {
      cb({
        error : "retrieve-no-params"
      });
    }
  } else {
    cb({
      error : "retrieve-forbidden"
    });
  }
};



*/







  /*
  Base para implementar las credenciales basados en owner/guest
  if(user) {
    const owner = schema.keysCheck(keys.concat(['owner']), 'get');
    const guest = schema.keysCheck(keys.concat(['guest']), 'get');
    if(owner || guest){
      grant = true;
      query.$and = [];
    }
    if(owner && guest){
      query.$and.push({
        $or:[{_author : user}, {_guests : user}]
      });
    } else if(owner){
      query.$and._owner = user;
    } else if(owner){
      query.$and._guests = user;
    }
  }
  */





/*
La gestión de archivos debria gestionarse en un modulo de interface indpendiente para poder realizar combinaciones de sistemas de datos y sistemas de archivos libremente

var paths = require('path');
mongoInterface.files = function(DB,schema,params,user,cb){

  /*
    schema: descriptor de un schema, ver en models.
    params: parametros para la acción, opcional
    user: {id:"",keys:[]}
      id: id de usuario
      keys: llaves que se poseen, opcional
    cb: callback tras realizar la acción
  *

  params = params || {};
  user = user || {};
  var userId = user.id;
  var keys = user.keys || [];

  var query = {}, cols = {};

  var grant = false; // control de permisos

  if(schema.keys.check('get',keys)){
    grant = true;
  } else if(userId && schema.keys.check(keys.concat(['owner']),'get')){
    grant = true;
    query.$or = [{_author:userId},{_guests:userId}];
  }

  if(grant){
    var path = params.path || schema.uploads; // Warning, clean first and end '/'.
    var field = path.split('/').pop();
    var pathOId = oId(path.split('/').slice(2,3).join());

    if(pathOId){
      query._id = pathOId;
      cols[field] = 1;
      var collection = DB.collection(schema.collection);
      collection.findOne(query,cols,function(error, result) {
        if(error){
          cb({
            error : 500,
            details : error
          });
        } else if(!result) {
          cb({
            error : 404
          });
        } else {
          schema.get(result,function(getted, errors){
            if(errors){
              cb({
                error : 403,
                ads : errors
              });
            } else {
              var file = false;
              try {
                file = eval('getted.'+field);
              } catch(error) {
                errors = [error];
              }
              
              if(file){
                var pathfs = paths.resolve(paths.join(schema.uploads,schema.id,path));
                cb({
                  error : false,
                  data : {
                    file: pathfs,
                    name: file.name
                  }
                });
              } else {
                cb({
                  error : 404
                });
              }
            }
          },user,keys);
        }
      });
    } else {
      cb({
        error : 404
      });
    }
  } else {
    cb({
      error : 403
    });
  }
};

*/
