"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var md = require("./markdown");
__export(require("./markdown"));
exports.load = true;
function add(file, options) {
    file.ext = ".html";
    file.content = md.render(file.content, options);
}
exports.add = add;
