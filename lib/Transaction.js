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

const Chain = require("./Chain");

const Transaction = module.exports = function Transaction(context, done){
  const transaction = this;
  transaction.done = done;
  transaction.results = [];
  transaction.reverse = [];
  transaction.projection = context.projection;
  transaction.uid = context.uid;
  transaction.keys = context.keys;
  transaction.pointer = context.parents;
  transaction.chain = new Chain();

  const driver =   context.parents[0].driver;
  const handler = driver.handle(context.method, transaction, transaction.pointer, context.result, true);
  transaction.chain.add(driver[context.method].bind(driver), transaction, transaction.pointer, context.result, true, handler);

  transaction.mountSentences("insert", context.inserts);
  transaction.mountSentences("update", context.updates);
  transaction.mountSentences("remove", context.removes);

  transaction.chain.add(done,undefined).pull();
};
  Transaction.prototype.mountSentences = function(method, sentences){
    const transaction = this;
    if(sentences){
      for(const [pointer, sentence] of sentences){
        const driver = pointer.slice(-1)[0].driver;
        const handler = driver.handle(method, transaction, pointer, sentence, false);
        transaction.chain.add(driver[method].bind(driver), transaction, pointer, sentence, false, handler);
      }
    }
  };