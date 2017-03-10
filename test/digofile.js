var digo = require("digo");

exports.default = function () {
	digo.src("fixtures/*.tpl").pipe("../").dest("_build");
};
