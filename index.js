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

require("colors");
slashScreen();

module.exports = require('./lib/index');

function slashScreen(){
  // Splash screen...
  console.log(("\n\n"+
  "  ###########################################################\n"+
  "  ##·······················································##\n"+
  "  ##·········##############···###···##############·········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##·········###········###···###···###········###·········##\n"+
  "  ##···········####·····###···###···###·····####···········##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##····················###···###···###····················##\n"+
  "  ##···········####·····###···###···###·····####···········##\n"+
  "  ##·········###········###···###···###········###·········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##········###·········###···###···###·········###········##\n"+
  "  ##·········##############···###···##############·········##\n"+
  "  ##·······················································##\n"+
  "  ###########################################################\n"+
  "\n  Pillars Modelator v.0.0.1\n"
  ).replace(/·/g,' '.bgRed).replace(/#/g,' '.bgWhite));
}