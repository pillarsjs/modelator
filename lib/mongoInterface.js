/* jslint node: true, esnext: true */
"use strict";

const ObjectID = require('mongodb').ObjectID;
const mongoInterface = module.exports = {};
const {Tree, TreeArray} = require("./Tree");
const Chain = require("./Chain");
const absoluteId = require("./AbsoluteId");


function Driver(config){
  const driver = this;
  driver.mongoService = config.mongoService;
  Object.defineProperty(driver, 'database', {
    get(){return driver.mongoService.database;}
  });
}
  Driver.prototype.insert = function(transaction, pointer, sentence, next){
    const driver = this;
    const projection = transaction.projection[pointer];
    const controllable = projection? projection.controllable : undefined;

    // throw errors: "insert-no-sentence", "insert-forbidden" out if(grant){ if(sentence){
      
    if(pointer){ 
      for (const insert of sentence){
        for (const parent of pointer){
          insert['_' + parent.ref] = parent.id;
        }
      }
    }
    const dbc = driver.database.collection(controllable.collection);
    dbc.insertOne(sentence, function(error, result) {
      if(error){
        return transaction.done({
          pointer,
          error : "insert-main-error",
          details : error
        });
      } else if(false) {
        return transaction.done({
          pointer,
          error : "insert-main-unreachable"
        });
      } else {
        transaction.results.push({pointer,result});
        next();
      }
    });
  };

// const myModelator = new Modelator({driver: ModelatorMongoDriver}); new Schema({driver: ModelatorMongoDriver})
// myModelator.insert(APIsentence || id || undefined, user, keys, doneCb);
// internamente los metodos de montaje van llamando a cada schema para generar las sentencias.
// el problema en este punto es que al combinar llamadas a distintas BBD es imposible crear transacciones seguras
// pero desde otro punto de vista son errores parciales al actualizar campos particulares dentro del modelo, por lo que se puede realizar de forma parcial.

// de esta forma modelator da la sensación de "tocar" propiedades cuando relamente son relaciones mas complejas
// en cada parte de la trasaccion me llega un puntero en dotnotation y la sentencia que le corresponde,
// puedo comprobar dicho puntero en projection para ver su controllable si hereda de schema y si tiene driver etc

// por lo tanto al driver llegan peticiones para solucionar punteros




mongoInterface.count = function(schema, params, cb, user, keys){
  
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

mongoInterface.list = function(schema, params, cb, user, keys){

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
      */
      sort = params.sort;
    }
    if(sort){
      qsort[sort] = order;
      /*
      if(typeof params.range === 'string' && params.range !== ''){ // WTF? range need two factors
        range = params.range;
        query[sort] = order > 0? {$gt : range} : {$lt : range};
      }
      */
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
      */

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
    */

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

mongoInterface.retrieve = function(schema, params, cb, user, keys){

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

mongoInterface.update = function(schema, params, cb, user, keys, transaction, main, next){

  keys = Array.isArray(keys)? keys : [keys];

  let grant = true;

  const query = {_id : params._id};
  
  if(grant){
    if(params){
      if(transaction){
        const update = {
          $set : Tree.create(params).parse()
        };
        const dbc = schema.driver.collection(schema.collection);
        dbc.update(transaction.query, update, function(error, result) {
          if(error){
            transaction.errors.push({
              error : "update-transaction-error",
              details : error
            });
          } else if(false) {
            transaction.errors.push({
              error : "update-transaction-unreachable"
            });
          } else {
            transaction.results.push({
              data : result
            });
          }
          next();
        });
      } else {
        delete params._id;
        const update = {
          $set : Tree.create(params).parse()
        };
        const dbc = schema.driver.collection(schema.collection);
        dbc.update(query, update, function(error, result) {
          if(error){
            cb({
              error : "update-error",
              details : error
            });
          } else if(false) {
            cb({
              error : "update-unreachable"
            });
          } else {
            cb({
              error : false,
              data : result
            });
          }
        });
      }
    } else {
      cb({
        error : "update-no-params"
      });
    }
  } else {
    cb({
      error : "update-forbidden"
    });
  }
};

// cambiar todo a transacciones, no se da el caso sin transacciones aparte de la prueba inicial
/*
db.getCollection('modelatorOne').update(
  {_id : '00100115dbbfbcb0d0000'},
  { $set : {ejemplo : []}, $push : { ejemplo : {sub: true } } } // el set y el push no pueden ir a la vez
  // { multi : true }
)

db.getCollection('modelatorOne').find(
  {_id : '00100115dbbfbcb0d0000', 'ejemplo.sub' : true},
  {ejemplo : 1}
  // { multi : true }
)

lo más sencillo es enfocar el driver mongo para trabajar solo con objetos indexados por id
para eliminarlos, actualizarlos etc es lo más sencillo y solo limita las proyecciones que se hacen imposibles en el interior de los arrays
pueden recortrse las proyecciones en el retrieve mismo.

la otra opción es hacerlo es limitar la profundidad de un posible array a uno solo, de esta forma permitiría....

a ver, si tratamos mongo como relacional un array de un solo nivel nos permite enlazar facilmente identificadores a otras tablas uqe podremos comprobar por separado
aunque implicaría repetir el id dos veces, una en el array de indeices y otra vez en la tabla relacionada

podemos tratar mongo como compeltamente relacional donde las relaciones multiples implican una tabla independiente que se gestiona por su cuenta,
esto implica que para conocer esos indices se debe hacer otra consulta aunque finalmente esto se debe hacer igual en relacional y
viendo las limitaciones de profundidad en arrays de mongo es una buena opción.

Plantear el uso completamente relacional utilizando tablas dinamicas mongo en lugar de mysql

es lo más razonable.

El campo list[] por ejemplo no existiria en la tabla principal, sino que seria una tabla "lists" o "collectionName.list" donde se realizarian las peraciones.

cada schema debe tener su driver y su collection etc, para poder montar los queries, las tablas intermedias pueden acumular indeices para mejorar la busqueda de relaciones sin necesidad de hacer consultas intermedias


*/
mongoInterface.insert = function(schema, params, cb, user, keys, transaction, main, next){

  keys = Array.isArray(keys)? keys : [keys];

  let grant = true;

  if(grant){
    if(params){
      if(transaction){
        if(main){
          const dbc = schema.driver.collection(schema.collection);
          dbc.insertOne(params, function(error, result) {
            if(error){
              transaction.errors.push({
                error : "insert-transaction-main-error",
                details : error
              });
            } else if(false) {
              transaction.errors.push({
                error : "insert-transaction-main-unreachable"
              });
            } else {
              transaction.results.push({
                data : result
              });
            }
            next();
          });          
        } else {
          const set = {
            $set : Tree.create(params).parse()
          };
          const dbc = schema.driver.collection(schema.collection);
          dbc.update(transaction.query, set, function(error, result) {
            if(error){
              transaction.errors.push({
                error : "insert-transaction-error",
                details : error
              });
            } else if(false) {
              transaction.errors.push({
                error : "insert-transaction-unreachable"
              });
            } else {
              transaction.results.push({
                data : result
              });
            }
            next();
          });
        }
      } else {
        const dbc = schema.driver.collection(schema.collection);
        dbc.insertOne(params, function(error, result) {
          if(error){
            cb({
              error : "insert-error",
              details : error
            });
          } else if(false){
            cb({
              error : "insert-unreachable"
            });
          } else {
            cb({
              error : undefined,
              data : result
            });
          }
        });
      }
    } else {
      cb({
        error : "insert-no-params"
      });
    }
  } else {
    cb({
      error : "insert-forbidden"
    });
  }
};

mongoInterface.remove = function(schema, params, cb, user, keys, transaction, main, next){
  
  keys = Array.isArray(keys)? keys : [keys];

  let grant = true;

  const query = {_id: params._id};

  if(grant){
    if(params){
      if(transaction){
        const unset = {
          $unset : Tree.create(params).parse()
        };
        const dbc = schema.driver.collection(schema.collection);
        dbc.update(transaction.query, unset, function(error, result) {
          if(error){
            cb({
              error : "remove-transaction-error",
              details : error
            });
          } else if(false) {
            cb({
              error : "remove-transaction-unreachable"
            });
          } else {
            cb({
              error : false,
              data : result
            });
          }
        });
      } else {
        const dbc = schema.driver.collection(schema.collection);
        dbc.remove(query, function(error, result) {
          if(error){
            cb({
              error : "remove-error",
              details : error
            });
          } else if(false) {
            cb({
              error : "remove-unreachable"
            });
          } else {
            cb({
              error : undefined,
              data : result
            });
          }
        });
      }
    } else {
      cb({
        error : "remove-no-params"
      });
    }
  } else {
    cb({
      error : "remove-forbidden"
    });
  }
};








function dbResultShow(title, result){
  if(result.error){
    console.log(('mongo.driver.' + title + '.error').bgRed, result.error, result.details.toString().grey);
  } else if(result.data){
    console.log(('mongo.driver.' + title + '.result').bgCyan, result.data.result? result.data.result : result.data); // insertedCount: int, insertedId: id, result: { ok: 1, n: 1 }
  } else {
    console.log(('mongo.driver.' + title + '.wtf').bgYellow, result);
  }
}



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
