/* jslint node: true, esnext: true */
"use strict";

/*

(mantengo los comentarios, pero el ejemplo de modelado cambia a una mini red social en un solo modelo que permite ser escalado con otros de forma modular, flipa)

  Muy alpha, si explota es bastante normal.

  En este ejemplo se crea un modelado básico y posteriormente se levanta un servicio http donde
  se montan un API autogenerado por el propio modelado de ejemplo

  Se realizan despues una serie de llamadas en cadena al API autogenerada y muestra por consola cada llamada y su resultado

  Solo es necesario tener una BDD MongoDB en local

  Si una tarea falla se detiene el proceso

  Cosas que faltan con respecto a la spec:

    - Hay que pasar el formato final del output a la spec
    - Los 'select' aún no están soportados, las consultas devuelven todas las propiedades del documento (as SELECT *)
    - No hay control de la entrada en las sentencias query, por lo que no funciona la sintaxis de la spec, se debe pasar la sintaxis de mongo tal cual en cada atributo si se quieren probar los filtros
    - Los eventos on:get no permiten aún modificar la salida
    - De lo anterior todo está, en parte, ya planteado y se resolverá en breve

  Todo lo demás, en principio funciona ´:D

  Se puede jugar con las credenciales y otros valores para comprobar el funcionamiento, 
  también es interesante ver la BDD mongo generada por el ejemplo que consistira en tres 
  tablas relacionadas por diferentes indices, una por cada relación del modelado
  
*/


// Se seleccionan las clases necesarias para construir el modelado
const {
  Controllable,
  Modelator,
  RelationalSchema,
  Text,
  Select,
  Radios,
  Checkboxes,
  Checkbox,
  Time,
  Img
} = require('../index'); // really is: require("modelator");

Controllable.debug = false; // Show all debug (and colorfull) info of modalating process

// Se declara un nuevo driver para el modelado, se selecciona el driver de mongoDB, el driver solicita 
// un servicio (la conexión mongoDB, en este caso un wrap de la misma) y el nombre de la BDD
const driver = new (require('../lib/mongoInterface.js'))({
  service : new (require('../lib/mongoService'))(),
  database : 'Modelator'
});

const myModelator = new Modelator({
  id: "users",
  driver,
  schema : [
    new Text({id:'userName'}),
    new Text({id:'password'}),
    new Text({id:'firstName'}),
    new Text({id:'lastName'}),
    new Select({
      id:'gender',
      multiple: false,
      values : ['H','M','Q']
    }),
    new Select({
      id:'genderPreference',
      multiple: true,
      values : ['H','M','Q','P']
    }),
    new Checkbox({id:'publicProfile'}),
    new Img({id:'photo'}),
    new RelationalSchema({ // Esto se llamará List, no relationalSchema
      id:'likes',
      driver,
      schema: [
        new Text({id:'to'}),
      ]
    }),
    new RelationalSchema({ // Esto se llamará List, no relationalSchema
      id:'follows',
      driver,
      schema: [
        new Text({id:'to'}),
        new Checkbox({id:'hiddenFollow'}),
      ]
    })
  ]
});












// Iniciar server
const server = require('pillars').configure({debug : false});
server.services.get('http').configure({
  port: 3000 
}).start(function(){

  // Insertar endopints autogenerados del modelado myModelator
  server.routes.add(myModelator.generateApi());

  // Id único para la prueba, forzamos ids en los insert para poder hacer los test
  const theId = "id_" + Date.now();
  const Chain = require("../lib/Chain"); // Sirve para declarar funciones asincronas que deben ser llamadas de forma secuencial

  (new Chain())
    /* */
    .add(function(next){

      const method = 'POST';
      const sentence = {
        _id : theId,
        userName : 'userName_' + theId,
        password : '123456',
        firstName : 'firstName_'+theId,
        lastName : 'lastName_'+theId,
        gender : ['M'],
        genderPreference : ['M'],
        publicProfile : false
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      const method = 'GET';
      const sentence = {
        userName : 'userName_' + theId,
        likes : {},
        follows : {}
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // añadimos likes y follows al usuario en la misma llamada, genramos _ids especificos para poder borrar posteriormente los elementos para el test
      const method = 'PATCH';
      const sentence = {
        _id : theId,
        follows : [
          {
            __id : theId + "_" + "follow1",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "follow2",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "follow3",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "follow4",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
        ],
        likes : [
          {
            __id : theId + "_" + "like1",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "like2",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "like3",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
          {
            __id : theId + "_" + "like4",
            to : Date.now().toString(), // imaginemos que es un id de otro usuario 
          },
        ]
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // Volvemos a obtener una vista de los datos completos
      const method = 'GET';
      const sentence = {
        _id : theId,
        likes : {},
        follows : {}
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // Borramos parte de los likes y follows (los numerados como 1 y 2) dejando los 3 y 4
      // y modificamos los hiddenFollow a false en el 3
      const method = 'PATCH';
      const sentence = {
        _id : theId,
        likes : [
          {_id : theId + "_" + "like1"},
          {_id : theId + "_" + "like2"},
        ],
        follows : [
          {_id : theId + "_" + "follow1"},
          {_id : theId + "_" + "follow2"},
          {_id : theId + "_" + "follow3", hiddenFollow : false},
        ]
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // Volvemos a mostar una vista compelta de los datos
      const method = 'GET';
      const sentence = {
        _id : theId,
        likes : {},
        follows : {}
      };

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* *
    .add(function(next){

      // Borramos la entidad principal
      const method = 'DELETE';
      const sentence = {_id : theId};

      doRequest('/users', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){
      driver.service.stop();
      next();
    })
    /* */
  .pull();
});

const http = require('http');
function doRequest(path, method, modelatorQL, cb){
  console.log("\n    API REQUEST:\n".bgCyan, "( method: " + method + " ) sentence:", traceResults(modelatorQL, 10000), "\n");
  modelatorQL = JSON.stringify(modelatorQL);

  const options = {
    host: '127.0.0.1',
    port: 3000,
    path,
    method,
    headers: {}
  };

  if(method === 'GET'){
    options.headers.query = modelatorQL;
  } else if(method === 'DELETE'){
    options.headers.delete = modelatorQL;
  } else {
    options.headers["content-type"] = 'application/json';
  }

  const request = http.request(options, function(response) {
    response.payload = '';
    response.on('data', function (chunk) {
      response.payload += chunk;
    });
    response.on('error', function (error){
      console.log(error);
    });
    response.on('end', function () {
      try {
        response.payload = JSON.parse(response.payload);
      } catch (error) {
        console.log("Invalid JSON response for: ",path, method, modelatorQL);
      }
      if(response.statusCode !== 200){
        console.log("\n    API RESPONSE:\n".bgRed, "( statusCode: " + response.statusCode + " ) result:", traceResults(response.payload, 10000), "\n");
      } else {
        console.log("\n    API RESPONSE:\n".bgGreen, "( statusCode: " + response.statusCode + " ) result:", traceResults(response.payload, 10000), "\n");
      }
      cb(response.statusCode, response.payload);
    });
  });
  if(['GET', 'DELETE'].indexOf(method)<0){
    request.write(modelatorQL);
  }
  request.end();
}

function traceResults(result, limit = 256, space = "", grey = false){
  if(result === undefined){
    return '(undefined)'.grey;
  } else {
    let stringify = JSON.stringify(result, undefined, 2).split("\n");
    const length = stringify.length;
    if(length > 1){
      stringify = (" " + space + stringify.join("\n"+space));
    } else {
      stringify = " " + stringify[0];
    }
    result = ("(" + (result.constructor? result.constructor.name : 'anonymous') + ")").grey + (grey? stringify.grey : stringify);
    result = result.length > limit? result.slice(0,limit) + '\n...etc (' + length + ' lines).' : result;
    return result;
  }
}