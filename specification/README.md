# JAQL - JSON API Query Language

### About this Version

- **Current version: 0.1-draft**
- **Previous version: [Wiki](https://github.com/pillarsjs/modelator/wiki/JAQL-Specification-(v0.1))**
- **[Open Discussions](https://github.com/pillarsjs/modelator/labels/specification)**

## Definición

**JAQL - JSON API Query Language**

JAQL define un lenguaje de consulta agnóstico en cuanto a BDD (SQL-NOSQL) que permita realizar la variedad de operaciones que ofrece Modelator desde un API restfull.

**Pillars Modelator (aka Modelator)**

Modelator permite definir esquemas de datos relacionales y la lógica de los mismos, mientras automatiza gran cantidad de tareas de desarrollo.

## Básicos

### Definición general

Modelator es una clase con (entre otros) cinco métodos que se montan sobre los correspondientes métodos HTTP, el input y output de los métodos de Modelator funcionan con JAQL por lo que el API producida funciona de la misma forma. Un API público de Modelator, uno expuesto vía HTTP, es básicamente una interface para realizar llamadas a métodos de la clase Modelator.

Modelator puede generar un API en base a un modelado (instancia de Modelator) de forma totalmente automática, gestionar su seguridad, acceso, internacionalización, relaciones, proyecciones/includes y amplio rango de acciones muy superior al básico que ofrece un API restfull al uso.

Una de las grandes diferencias de JAQL es que se trata de un lenguaje de consulta montado sobre métodos HTTP, no es una versión de RESTfull. La otra gran diferencia es que Modelator asume que el modelo es una entidad superior a la lógica, es decir, en Modelator la lógica no accede al modelo sino que el modelo gestiona la lógica.

Modelator acepta 4 métodos a ejecutar sobre un modelado:
 - myModel.insert()
 - get()
 - update()
 - remove()

Cada uno de los métodos están relacioandos con un método HTTP. A su vez cada método permite realizar operaciones especialmente complejas (transacciones relacionales, proyecciones...) descritas de forma breve y clara en utilizando JSON.


### Funcionamiento de una API basada en JAQL

Como ya hemos visto el método HTTP define el método de Modelator, pero necesitamos conocer que modelado de todos los instanciados queremos operar, para esto utilizamos el path/endpoint que sirve exclusivamente para seleccionar un modelado sobre el que realizar una operación. No existen, como ocurre en RESTfull, números indicando indices para operaciones, o sub-rutas, ya que esto es responsabilidad de las sentencias JAQL que oportan en este punto mucha más libertad para realizar operaciones que un escueto indice numérico.

> La selección del modelado (instancia de Modelator) desde JAQL se especifica por medio del PATH de la solicitud HTTP

Finalmente la sentencia que se pasa a dicho método del modelado seleccionado se define por medio del PAYLOAD de la solicitud en JSON, lo que llamamos sentencia JAQL.

> Nota: ¿porque llamamos modelado a algo que podríamos llamar colección o tabla? Porque un modelado no está asociado con una sola colección/table, un modelado es la descripción de una entidad relacional completa, es decir, todas las colecciones/tablas y sus relaciones que forman un modelo relacional. Lo que le da la facultad a Modelator de poder inferir gran cantidad de comportamientos sobre los datos por si mismo, Modelator conoce por completo el esquema relacional y por lo tanto puede hacer muchas tareas de la lógica de negocio por si mismo.

Como JAQL es un lenguaje de consulta relacional podemos comparar una consulta SQL con JAQL y comprobar como el endpoint junto con el payload en JAQL forman una consulta clásica extrapolable a SQL (y NOSQL):

**Ejemplo de consulta de datos, SIN modificación**

- SQL:
```sql
SQL: SELECT c1, c2, c3 FROM users WHERE c1 = 0;
```
- JAQL:
```txt
GET '/api/v1/users' > {select:['c1','c2','c3'], query: {c1 : 0}}
```
- Interpretación:
```txt
(HTTP METHOD: GET) (JAQL: select) (HTTP PATH: '/api/v1/users') (JAQL: query)
```

**Ejemplo de consulta de datos, CON modificación**

- SQL:
```sql
UPDATE users SET c1 = 1, c2 = 2 WHERE _id = 10
```

- JAQL:
```txt
(HTTP METHOD: PATCH) (HTTP PATH: '/api/v1/users') (JAQL: update)
```

- Interpretación:
```txt
JAQL: PATCH '/api/v1/users' > {update: {_id : 10, c1 : 1, c2: 2}}
```


## JAQL en detalle

### Básico: Métodos
Una sentencia JAQL (JSON enviado en el payload de la solicitud HTTP) tiene 5 propiedades posibles

**Select**

Permite filtrar los campos que deseamos obtener ahorrando peso y tiempo de consulta, es opcional la utilizar el metodo GET, ignorado en cualquier otro caso.

```json
{
  'select': ['colors','!_id']
}
```

**Query**

Permite realizar operaciones de comparación por cada campo (>=,==,<=,!=), Modelator solo permitirá realizar operaciones de este tipo en campos indexados. Es opcional en el metodo GET, se ignora en cualquier otro caso.

La lógica sería `(c1 > 5 AND c1 <= 10) OR c1 = 15`

```json
{
  'query': {
    'c1' : [{'>': 5, '<=' : 10}, {'=' : 15}]
  }
}
```

**Insert**

El cuerpo de una entidad/es a insertar, Modelator permite crear esquemas relacionales y el mismo gestiona dichas relaciones de forma automatica, una nueva entidad puede implicar inserciones en multitud de tablas/colecciones. Solo en metodo POST

```json
{
  'insert' : [{
    'c1' : 10,
    'c2' : 12
  }]
}
```


**Update**

Los campos a modificar en una entidad especificada por la propiedad `\_id`, es posible declarar modificaciones, inserciones y borrados en entidades 'hija' de la entidad seleccionada en la misma llamada. Solo en el metodo PATCH


```json
{
  update : {
    '_id' : 'someId',
    'c1' : 10,
    'c2' : 12
  }
}
```

El campo es de tipo `list` y puede (en el meotodo PATCH) realizar operaciones de inserción, actualización o borrado de sus elementos a la vez que realizamos modificaciones en otros campos de la entidad, o en cualquier otras relacion.

Las reglas son las siguientes:
- Se actualiza un elemento si tiene `\_id` y otras propiedades (payload)
- Se borra un elemento si tiene `\_id` y carece propiedades (payload)
- Se añade un elemento nuevo si tiene propiedades (payload) pero carece de `\_id`

```json
{
  update : {
    '_id' : 'someId',
    'c1' : 10,
    'c2' : 12,
    'list' : [  
      {
        _id : 'n1001',
        img: "/to.mod.file",
      },
      {
        img : "/to.new.file",
        text : 'newText'
      },
      {
        _id : 'n1000'
      }
    ],
  }
}
```

**Remove**

Borrar las entidades con el `\_id` especificado, puede eliminarse multiples entidades en la misma llamada. Solo en metodo REMOVE

```json
{
  remove : [{
    '_id' : 'someId'
  }]  
}
```

### Básico: Combos

Podemos mezclar multiples propiedades en una misma petición

```json
{
  'select': ['colors','!_id'],
  query: {
    'c1' : [{'>': 5, '<=' : 10}, {'=' : 15}]
  },
  'insert' : [{
    'c1' : 10,
    'c2' : 12
  }],
  update : {
    '_id' : 'someId',
    'c1' : 10,
    'c2' : 12,
    'list' : [  
      {
        _id : 'n1001',
        img: "/to.mod.file",
      },
      {
        img : "/to.new.file",
        text : 'newText'
      },
      {
        _id : 'n1000'
      }
    ],
  },
  remove : [{
    '_id' : 'someId'
  }]  
}
```

> Nota: otros métodos quedan reservados a posibles usos con archivos o para adquirir el descriptor publico del modelado seleccionado etc, por lo que PUT queda reservado para su uso en posteriores versiones.


### Petición en detalle

**Otro ejemplo de JAQL query:**

SELECT * FROM db WHERE a = 0 AND (b = 1 || b = 2) AND d = 5
```
{
  query : {
    a : 0,
    b : [{'=' : 1},{'=' : 2}],
    d : 5
  }
}
```


**Ejemplo de JAQL query más complejo (sin revisar, viene de otras notas de la especificación):**

```
SQL (SELECT c1, c3, c4, sublist.* FROM db INNER JOIN sublist ON sublist._id = db.__sublist AND sublist.color = 'red' WHERE db.c3 > 3 AND db.c3 <= 8 ORDER BY c2 DESC LIMIT 30, 10)
```

```  
JAQL : {
  select : {
    'c1' : true,
    'c2' : false,
    // los objetos son conjuntos AND, los array son conjuntos OR
    'c3' : {'>':3,'<=':8,...ands,'=':...,'!=':...}, || [{...ands},or{...ands},...ors],
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
```


**JAQL select en más detalle:**

La propiedad `.main` de cada field en Modelator especifica (como bool) si se considera un field principal, e incluido en las selecciones por defecto, o no. Es decir, main:true hace que dicho atributo/field sea devuelto por defecto si no se especifica lo contrario en la sentencia de lección `select`

Con las sentencias de selección de JAQL se puede variar la selección por defecto del modelado y, adicionalmente, indicar conteos que tb se desean solicitar.

```
select : [
  "fieldName1",                 // include field/column
  "!fieldName2",                // exclude field/column
  "*",                          // get count of main query (SQL: SELECT COUNT(*) FROM...)
  "fieldListName.fieldName1",   // include inner field
  "!fieldListName.fieldName2",  // exclude inner field
  "*.fieldListName",            // get count of subquery   (SQL: SELECT COUNT(fieldListName))
  "!",                          // no incluir ningún campo por defecto que no sea explicitamente añadido en la selección
]
```

> Nota: descartamos un flag "!!" o similar para añadir todos los campos de una vez, es una opción contraría a lo que se busca en las selecciones (ajustar en cada llamada el resultado esperado a lo imprescindible que se necesita en cada llamada)

> Nota: los conteos son interesantes, pero puede que podamos descartar su uso en una primera versión.

> Nota: la idea de los conteos podría extenderse en una versión posterior y permitir por ejemplo `"+.fieldListName"` _(SQL: SELECT SUM(fieldListName))_ e ir añadiendo progresivamente diferentes operaciones de proyección clásicas de forma sencilla (de momento no es algo que deba resolver un API aunque Modelator puede implementarlo y existe esa opción)

> Nota: En la sub-sentencia `query` de JAQL no es necesario solucionar una forma de permitir comparar una columna con otra, todos los posibles enlaces relacionales de los datos son conocidos por el modelado, incluidas las sentencias `"INNER JOIN ... ON"` que dejan de ser necesarias para realizar consultas relacionales utilizando JAQL.


### La respuesta JAQL

Una respuesta JAQL sigue el siguiente formato para cualquiera de los métodos disponibles:

```
{
  errors : {
    // Identificador/puntero y descriptores de error para el mismo
    'user.friendships[345f2da0]._id' : [
      {type:"validation", msg:"Invalid ID", details: {...error, stack, etc...}}
      ...
    ],
    ...
  },
  data: [],
  // data contiene el cuerpo principal del resultado, siempre es undefined si errors contiene uno o más errores.
  // para llamadas get: devuelve un array que contendrá los resultados.
  // para el resto de llamadas no emite ninguna respuesta
  meta: {}     // para añadir meta información como paginación, conteos, indices insertados... Es un objeto
  includes: [] // siempre es un array, permite empaquetar todos los resultados de proyecciones/population evitando repetir contenido en el cuerpo principal.
}
```
