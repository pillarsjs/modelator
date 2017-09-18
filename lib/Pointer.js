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
/*    Copyright (c) 2014-2017 Francisco Javier Gallego Martín.
/*/

/* jslint node: true, esnext: true */
"use strict";

const pointerParse = module.exports = function pointerParse(pointer, collapse){
  if(typeof pointer === "string"){
    return pointer;
  }
  if(!collapse){
    return pointer.map(function(v, i){
      const isObject = typeof v === 'object';
      v = isObject? (i === 0? v.ref : '') + '[' + v.id + ']' : v;
      return (i > 0 && !isObject? '.' : '') + v;
    }).join('');
  } else {
    return pointer.map(function(v, i){
      const isObject = typeof v === 'object';
      v = isObject? '' : v;
      return (i > 1 && !isObject? '.' : '') + v;
    }).join('');
  }
};

/*
const Pointer = module.exports = function Pointer(preset, controllable, index){
  const pointer = this;
  pointer.elements = [];
  pointer.elements.splice(0,0,...preset.elements);
  if(controllable && index){
    pointer.add(controllable, index);
  }
};
  Pointer.prototype.add = function pointerAdd(controllable, index){
    const pointer = this;
    pointer.elements.splice(0,0,{
        ref : controllable.id,
        id : index,
        driver : controllable.driver 
    });
  };
*/