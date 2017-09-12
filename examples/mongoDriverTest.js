/* jslint node: true, esnext: true */
"use strict";

/*

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




// Se declara un ejemplo básico de modelado para poder realizar la prueba. Tiene una serie de campos llamados como su tipo 
// de campo (para identificar facilmente cual es cada uno), solo se han añadido algunos ejemplos de acciones 'on' para 
// mostrar como funcionan, algunos comentados para evitar errores (por credenciales, validaciones 'on' etc)

const myModelator = new Modelator({
  id: "myModelator",
  limit : 50,
  languages : ['en','es'],
  driver,
  schema : [
    new Text({id:'text'}),
    new Text({
      id:'textI18n',
      i18n : true,
      keys : {
        get : ["owner", "guest"],
        update : ["owner", "guest"]
      }
    }),
    new Select({
      id:'select',
      multiple: true,
      values : ['A','B','C','D'],
      on : {
        update : [
          function avoidA(context, done){
            if(context.result.indexOf('A')>=0){
              done("A no is possible");
            } else {
              done();
            }         
          }
        ]
      },
      keys : {
        get: 'manager',
        update : 'manager',
        insert : 'manager',
        remove : 'manager'
      }
    }),
    new Select({
      id:'selectInt',
      multiple: true,
      values : [0,1,2,3,4,5,6]
    }),
    new Radios({
      id:'radios',
      values : ['A','B','C','D']
    }),
    new Checkboxes({
      id:'checkboxes',
      values : ['A','B','C','D']
    }),
    new Checkbox({id:'checkbox'}),
    new Time({id:'time'}),
    new Img({id:'img'}),
    new RelationalSchema({
      id:'list',
      driver,
      on : {
        insert : [function showMessage(context, done){
          // console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
          done();
        }]
      },
      schema: [
        new Img({
          id:'img',
          keys : {
            update: ["admin","root"],
            //insert: ["god"]
          },
          on : {
            /*
            update : [function(context, done){
              done('forced-error');
            }]
            */
          }
        }),
        new RelationalSchema({
          id:'sublist',
          driver,
          on : {
            insert : [function showMessage(context, done){
              // console.log("\n", " ---> INSERT EVENT for list <--- ".bgBlue, "\n");
              done();
            }]
          },
          schema: [
            new Checkbox({id:'chk'}),
            new Text({id:'text'})
          ]
        }),
        new Text({id:'text'}),
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

  // Id único para la prueba
  const theId = "id_" + Date.now();
  const Chain = require("../lib/Chain"); // Sirve para declarar funciones asincronas que deben ser llamadas de forma secuencial

  (new Chain())
    /* */
    .add(function(next){

      // Insertamos una nueva entidad
      // Con __id forzamos que se utilicen _id forzados y no autogenerados por absoluteId (solo en modo debug para realizar test)
      const method = 'POST';
      const sentence = {
        _id : theId,
        text : 'Hello 2!',
        list : [
          {
            __id : theId + "_" + "list1",
            img : 'imgFalse',
            sublist : [
              {
                __id : theId + "_" + "sublist11",
                chk : false,
                text : 'false 1'
              },
              {
                __id : theId + "_" + "sublist12",
                chk : false,
                text : 'false 2'
              }
            ]
          },
          {
            __id : theId + "_" + "list2",
            img : 'imgTrue',
            sublist : [
              {
                __id : theId + "_" + "sublist21",
                chk : true,
                text : 'true 1'
              },
              {
                __id : theId + "_" + "sublist22",
                chk : true,
                text : 'true 2'
              }
            ]
          },
        ]
      };

      // realiza una llamada al endpoint, al metodo elegido y pasando la sentencia (en get y delete 
      // se pasa como cabecera HTTP) y devuelve el statusCode y el payload parseado.
      // Esto solo sirve para realizar estas pruebas y mostrar los resultados con un formato 
      // adaptado para poder visualizarlo correctamente
      doRequest('/myModelator', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // Realizamos una busqueda, entidades con 'text' = "Hello2!", queremos popular/sobrecargar con las 
      // relaciones de list y list.sublist
      const method = 'GET';
      const sentence = {
        "text" : "Hello 2!",
        //"list.sublist" : {"chk" : true},
        "list" : {},
        "list.sublist" : {}
      };

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* */
    .add(function(next){

      // Realizamos una modificación de la entidad, en una misma sentencia podemos modificar 
      // valores, insertar/modificar/borrar elementos de listados anidados en cualquier nivel
      const method = 'PATCH';
      const sentence = {
        _id : theId,
        text : 'Hello Mod!',
        list : [
          {
            _id : theId + "_" + "list2",
            img : "imgMod"
          },
          {
            _id : theId + "_" + "list1"
          },
          {
            __id : theId + "_" + "listnuevo1",
            img : 'imgList1.png',
            sublist : [
              {
                chk : false,
                text : 'false 1mod'
              },
              {
                chk : false,
                text : 'false 2mod'
              }
            ]
          },
          {
            __id : theId + "_" + "listnuevo2",
            img : 'imgList2.png',
            sublist : [
              {
                chk : true,
                text : 'true 1mod'
              },
              {
                chk : true,
                text : 'true 2mod'
              }
            ]
          },
        ]
      };

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
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
        "_id" : theId,
        "list" : {},
        "list.sublist" : {}
      };

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* *
    .add(function(next){

      // Borramos elementos de list, cualquier borrado realiza un borrado en cascada de los elementos dependientes 
      // en cualquier colección
      const method = 'PATCH';
      const sentence = {
        _id : theId,
        text : 'Hello Mod2!',
        list : [
          {_id : theId + "_" + "list2"},
          {_id : theId + "_" + "listnuevo1"},
          {_id : theId + "_" + "listnuevo2"},
        ]
      };

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
        if(statusCode === 200){
          next();
        }
      });
    })
    /* *
    .add(function(next){

      // Volvemos a mostar una vista compelta de los datos
      const method = 'GET';
      const sentence = {
        "_id" : theId,
        "list" : {},
        "list.sublist" : {}
      };

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
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

      doRequest('/myModelator', method, sentence, function(statusCode, payload){
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