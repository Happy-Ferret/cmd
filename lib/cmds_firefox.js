/*

Module for searching available commands in the browser.

Allows searching and execution of commands in Firefox, such as
'Back', 'Zoom In', 'Reload'.

API

The 'search' method takes two parameters. the first is a string of text
to match against command names. For example, "zo" will match the commands
"Zoom In" and "Zoom Out". The second parameter is a callback that'll be
passed the command objects for all commands matching the search. The command
object has an 'name' property, which contains a label used in the application
to refer to the command. The command object has an 'execute' method which
will trigger the command. 

Implementation

The module enumerates all <command> elements found in the active browser
window, and then searches for any element in the browser that has a
command attribute with that command's id, storing the item's label
attribute value. The DOM traveral is only done once, on the first invocation
of the 'search' method.

TODO:
* find all elements with @oncommand, and log their string and id as a command
* for above, find keys, and walk back to consumers with strings, and log the
  string + key id as a command

*/

// Event handling boilerplate
// When regenerating commands, do:
//  emit(exports, 'commands', commands)
var { emit, on, once, off } = require("sdk/event/core");
exports.on = on.bind(null, exports)
exports.removeListener = function removeListener(type, listener) {
  off(exports, type, listener);
}


let commands = {},
    aliases = {},
    aliasArray = [],
    cached = false;

function getXULDocument() {
  var utils = require('sdk/window/utils'),
      window = utils.getMostRecentBrowserWindow();
      //window = utils.getXULWindow(active);
  return window.document;
}

function cacheCommands() {
  var document = getXULDocument();

  // harvest all basic commands
  let els = document.querySelectorAll("command");
  let len = els.length;
  for (let i = 0; i < len; i++) {
    let el = els[i];
    let labels = [];
    let subEls = document.querySelectorAll("*[command=\"" + el.id + "\"]");
    if (subEls) {
      for (let i = 0; i < subEls.length; i++) {
        if (subEls[i].label) {
          labels.push(subEls[i].label);
        }
      }
    }
    if (labels.length) {
      commands[el.id] = el.id;
      labels.forEach(function(label) {
        aliases[label] = el.id;
        if (aliasArray.indexOf(label) == -1)
          aliasArray.push(label);
      });
    }
  }

  // harvest all elements with an oncommand attribute
  els = document.querySelectorAll("*[oncommand]");
  len = els.length;
  for (let i = 0; i < len; i++) {
    let el = els[i];
    if (el.label && !aliases[el.label]) {
      aliases[el.label] = el.id;
      commands[el.id] = el.id;
      if (aliasArray.indexOf(el.label) == -1)
        aliasArray.push(el.label);
    }
    // ignore keys for now
    /*
    else {
      let labels = [];
      let subEls = document.querySelectorAll("*[command=\"" + el.id + "\"]");
      if (subEls) {
        for (let i = 0; i < subEls.length; i++) {
          if (subEls[i].label) {
            labels.push(subEls[i].label);
          }
        }
      }
      if (labels.length) {
        commands[commandEl.id] = commandEl.id;
        labels.forEach(function(label) aliases[label] = commandEl.id);
      }
    }
    */
  }

  aliasArray.sort(function(a, b) a - b);
}

function command(id, name) {
  this.name = name;
  this.execute = function() {
    if (commands[id]) {
      let el = getXULDocument().getElementById(id);
      if (el)
        el.doCommand();
    }
  };
}

exports.search = function(text, callback) {
  if (!cached) {
    cacheCommands();
    cached = true;
  }

  for (var i in aliasArray) {
    if (!text.length || (new RegExp(text, "i")).test(aliasArray[i])) {
      callback(new command(aliases[aliasArray[i]], aliasArray[i]));
    }
  }
  callback(null);
};

exports.commands = new Promise(function(resolve, reject) {
  if (!cached) {
    cacheCommands();
    cached = true;
  }

  var cmds = []
  for (var i in aliasArray) {
    cmds.push(new command(aliases[aliasArray[i]], aliasArray[i]));
  }
  emit(exports, 'commands', commands)
  resolve(cmds);
})
