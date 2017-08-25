/*
/*    Copyright (C) 2017 Consuelo Quilón Gómez <cheloq.at.gmail.com>
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
/*    The Initial Developer of the Original Code is Consuelo Quilón Gómez <cheloq.at.gmail.com>.
/*    Copyright (c) 2014-2017 Consuelo Quilón Gómez.  All rights reserved.
/*/

/* jslint node: true, esnext: true */
"use strict";

module.exports = {
  Controllable : require("./Controllable"),
  Schema :  require("./Schema"),
  RelationalSchema : require("./RelationalSchema"),
  Modelator : require("./Modelator"),
  Field : require("./Field")
};

module.exports = Object.assign({
  Controllable : require("./Controllable"),
  Schema :  require("./Schema"),
  RelationalSchema : require("./RelationalSchema"),
  Modelator : require("./Modelator"),
  Field : require("./Field")
},require("./fields/index"));