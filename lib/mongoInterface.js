/* jslint node: true, esnext: true */
"use strict";

const ObjectID = require('mongodb').ObjectID;
const {Tree, TreeArray} = require("./Tree");
const Chain = require("./Chain");
const absoluteId = require("./AbsoluteId");
const pointerParse = require("./Pointer");

const ModelatorMongoDriver = module.exports = Driver;

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
  Driver.prototype.trace = function(pointer, method, collection, sentence){
    const parents = [];
    for (const parent of pointer.slice(0,-1)){
      if(typeof parent !== 'string'){
        parents.push('__' + parent.ref);
      }
    }

    console.log(
      (' MongoDriver ').bgCyan +
      ' ' + method.toUpperCase() +
      ' ' + pointerParse(pointer).cyan +
      '\n' +
      ("(Collection:" + collection + ") ").yellow +
      // ' ' + ("(Parents:" + parents.join(', ') + ") ").yellow,
      (" Sentence:... ").yellow,
      sentence,
      '\n'
    );
  };
  Driver.prototype.handle = function(method, transaction, pointer, sentence, main){
    const driver = this;
    const n = Array.isArray(sentence)? sentence.length : 1;

    return function(error, result) {
      if(!error && result && (method === 'get' || result.result && result.result.ok && result.result.n === n ) ) {
        if(method === 'get'){
          const selfPoint = pointer.slice(-1)[0];
          selfPoint.ids = result.map(function(e, i){
            return e._id;
          });
          selfPoint.result = result;
          if(main){
            transaction.main = result;
          } else {
            const parentPoint = pointer.slice(-3)[0];
            const parentRef = "__" + parentPoint.ref;
            const parentAtt = pointer.slice(-1)[0].ref;
            parentPoint.result.forEach(function(parent){
              result.forEach(function(include){
                if(include[parentRef] === parent._id){
                  parent[parentAtt] = parent[parentAtt] || [];
                  const mod = Object.assign({}, include);
                  for(const att in mod){
                    if(att.slice(0,2) === '__'){
                      mod[att] = undefined;
                    }
                  }
                  parent[parentAtt].push(Object.assign(include, mod));
                }
              });
            });
            // transaction.results.set(pointer, result);
          }
        } else {
          if(main){
            transaction.main = result;
          } else {
            transaction.results.set(pointer, result);
          }
        }
        return transaction.chain.next();
      } else {
        // TODO: transaction errors push & next call
        if(!error){
          error = 'unespected-result';
        }
        return transaction.done({
          error: error && error.message? error.message : error,
          oerror: error,
          pointer,
          result
        });
      }
    };
  };
  Driver.prototype.insert = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));

    // TODO: if(check error on parent executions for exist){}

    if(!main){
      for (const insert of sentence){
        for (const parent of pointer.slice(0,-1)){
          if(typeof parent !== 'string'){
            insert['__' + parent.ref] = parent.id;
          }
        }
      }
    }

    driver.trace(pointer, 'insert', pointerProjection.id, sentence);
    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        //const method = main? 'insert' : 'insertMany';
        dbc.insert(sentence, done);
      } else {
        done('connection-error'); // TODO: review.
      }
    });
  };
  Driver.prototype.update = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));

    const query = {_id : sentence._id};

    const uid = transaction.context.uid;
    if(pointerProjection.owner && pointerProjection.guest){
      query.$or = [{_guest : uid}, {_owner : uid}];
    } else if(pointerProjection.owner){
      query._owner = uid;
    } else if(pointerProjection.guest){
      query._guest = uid;
    }

    const update = {
      $set : sentence.parse()
    };

    driver.trace(pointer, 'update', pointerProjection.id, {query, update});
    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        dbc.updateOne(query, update, done);
      } else {
       done('connection-error');
      }
    });
  };
  // TODO : remove and clear refactor
  Driver.prototype.remove = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));
    const controllable = pointerProjection.controllable;

    // TODO: ownering check

    const relations = controllable.walker();
    const reverseChain = new Chain();
    const parent = '__' + controllable.id;
    const index = sentence._id;
    for(const controllable of relations){
      const driver = controllable.driver;
      reverseChain.add(driver.clear.bind(driver), transaction, pointer, controllable.id , parent, index);
    }
    reverseChain.add(function(){
      const query = {_id : sentence._id};

      const uid = transaction.context.uid;
      if(pointerProjection.owner && pointerProjection.guest){
        query.$or = [{_guest : uid}, {_owner : uid}];
      } else if(pointerProjection.owner){
        query._owner = uid;
      } else if(pointerProjection.guest){
        query._guest = uid;
      }

      driver.trace(pointer, 'remove', pointerProjection.id, query);

      driver.connect(function(error, conn){
        if(!error){
          const dbc = driver.conn.collection(pointerProjection.id);
          dbc.removeOne(query, done);
        } else {
          done('connection-error');
        }
      });
    },undefined).pull();
  };
  Driver.prototype.clear = function(transaction, pointer, collection , relation, index, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));
   
    const query = {};
    query[relation] = index;

    driver.trace(pointer, 'clear', collection, query);

    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(collection);
        dbc.removeMany(query, function(error, result = {result:{}}){
          if(result.result.ok) {
            // console.log("Descendants remoed for:", collection, relation, index);
          } else {
            console.log("Error on clear".bgRed, collection, relation, index);
          }
          return done();
        });
      } else {
        done('connection-error');
      }
    });
  
  };
  Driver.prototype.count = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));
    
    sentence = sentence === true? true : sentence.parse();
    if(main && transaction.context.getters.size > 0){
      if(sentence !== true && Object.keys(sentence).length === 0){
        return transaction.chain.next(); // TODO: review. return done(undefined);
      }
    }
    const query = sentence === true? {} : sentence;

    if(!main){
      for (const parent of pointer.slice(0,-1)){
        if(typeof parent !== 'string' && parent.id !== 0){
          query['__' + parent.ref] = parent.id;
        }
      }
    }

    const uid = transaction.context.uid;
    if(pointerProjection.owner && pointerProjection.guest){
      query.$or = [{_guest : uid}, {_owner : uid}];
    } else if(pointerProjection.owner){
      query._owner = uid;
    } else if(pointerProjection.guest){
      query._guest = uid;
    }

    driver.trace(pointer, 'count', pointerProjection.id, query);

    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        dbc.count(query, done);
      } else {
        done('connection-error');
      }
    });
    
  };
  Driver.prototype.get = function(transaction, pointer, sentence, main, done){
    const driver = this;
    const pointerProjection = transaction.context.pointers.get(pointerParse(pointer, true));
    const controllable = pointerProjection.controllable;

    const query = sentence.parse();
    if(main && transaction.context.getters.size > 0){
      if(Object.keys(query).length === 0){
        return transaction.chain.next();
      }
    }

    // TODO: query validation, traverse query, array values as or and comp operators etc.
    // TODO: add to validation: field is index etc, check if is text based search...

    if(!main){
      for (const parent of pointer.slice(0,-1)){
        if(typeof parent !== 'string' && parent.id !== 0){
          if(parent.id){
            query['__' + parent.ref] = parent.id;
          } else {
            query['__' + parent.ref] = {$in : parent.ids};
          }
        }
      }
    }

    const uid = transaction.context.uid;
    if(pointerProjection.owner && pointerProjection.guest){
      query.$or = [{_guest : uid}, {_owner : uid}];
    } else if(pointerProjection.owner){
      query._owner = uid;
    } else if(pointerProjection.guest){
      query._guest = uid;
    }

    let limit = controllable.limit || 10;
    let skip = 0; // pagina * limit

    const cols = {};
    const sort = {};

    driver.trace(pointer, 'get', pointerProjection.id, query);

    driver.connect(function(error, conn){
      if(!error){
        const dbc = driver.conn.collection(pointerProjection.id);
        dbc.find(query, cols).sort(sort).skip(skip).limit(limit).toArray(done);
      } else {
        done('connection-error');
      }
    });

  };


/*

  ModelatorQL - JSON API Query Language

  SQL (SELECT c1, c3, c4 WHERE c3 > 3 AND c3 < 8 ORDER BY c2 DESC LIMIT 30, 10)
  ModelatorQL : {
    select : ['colors','!_id'],
    query : {
      'c2' : {$or:}
      'c3' : {$gt:3,$lt:8,...ands, $eq:,$neq:...}, || [{...ands},or{...ands},...ors],
      '$limit' : 10,
      '$sort' : {c2 : -1} ,
      '$skip' : 30,
    }
  } 



SELECT * FROM db WHERE a = 0 AND (b = 1 || b = 2) AND d = 5
{
  query : {
    a : 0,
    b : [{eq : 1},{eq : 2}],
    d : 5
  }
}

SELECT * FROM db WHERE a = 0 OR d = 5
{
  query : {
    a : {$eq: 0},
    b : [{$gt : 1, $lt : 6},{$eq : 10}],
    d : 5
  }
}


  'c' : 1
  $and : {'b' : 3}
  $or : ['c':3,'d':5]

  SQL (SELECT c1, c3, c4, sublist.* FROM db INNER JOIN sublist ON sublist._id == db.__sublist AND sublist.color == 'red' WHERE db.c3 > 3 AND db.c3 < 8 ORDER BY c2 DESC LIMIT 30, 10)
  ModelatorQL : {
    select : {
      'c1' : true,
      'c2' : false,
      'c3' : {gt:3,lt:8,...ands, eq:,neq:...}, || [{...ands},or{...ands},...ors],
      'sublist' : {
        'color' : 'red',
        'size' : true,
        $limit : 50,
      },
      '$limit' : 10,
      '$sort' : {c2 : -1} ,
      '$skip' : 30
    }
  }

*/






 
/*

  Para resolver busquedas cruzadas: debe resolver el query en su parte correspondiente, cambiar un {peliculas.actores.edad:{gt:50}} por {_id {$in:{1,2,3,4,5}}} para la consulta principal

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
