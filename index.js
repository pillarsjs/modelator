/* jslint node: true, esnext: true */
"use strict";

require("colors");
slashScreen();

module.exports = require('./lib/modelator');

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