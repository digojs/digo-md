var digo = require("digo");

exports.default = function() {
	digo.src("fixtures/*.tpl").pipe("../").dest("_build");
};

exports.run = function() {
	const md = `\`\`\`.dasd 
asd
\`\`\`
`;
	digo.exec("tsc index.ts markdown.ts --lib es6 --target es5", { cwd: ".." });
    console.log(require("../markdown").render(md));
};

exports.test = function() {
	digo.exec("tsc index.ts .\markdown.ts --lib es6 --target es5", { cwd: ".." })
	digo.glob("./fixtures/*/*blockquote*.md", {
        file(path) {
          //  console.log = function () { };
			const md = digo.readFile(path).toString();
			const expected = digo.readFile(digo.setExt(path, ".html")).toString();
            const actual = require("../markdown").render(md);
            
            console.info(actual)

			if (expected.replace(/\n|^\s*/mg, "") !== actual.replace(/\n|^\s*/mg, "")) {
				console.error("Fail: ", path);
			} else {
				console.info("Pass: ", path);
			}
		}
	});
}
