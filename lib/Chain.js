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

const Chain = module.exports =  function Chain(){
  this.chainlinks = [];
};
  Chain.prototype.add = function(func){
    const args = Array.prototype.slice.call(arguments).slice(1);
    this.chainlinks.push({func:func, args:args});
    return this;
  };
  Chain.prototype.pull = function(){
    if(this.chainlinks.length > 0){
      this.chainlinks[0].func.apply(this,this.chainlinks[0].args.concat([this.next.bind(this)]));
    }
  };
  Chain.prototype.next = function(){
    this.chainlinks.shift();
    this.pull();
  };