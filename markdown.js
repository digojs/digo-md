/**
 * @file MarkDown 编译器
 * @author xuld <xuld@vip.qq.com>
 */
"use strict";
/**
 * 表示一个 Markdown 编译器。
 */
var Compiler = (function () {
    /**
     * 初始化新的编译器。
     * @param options 编译的选项。
     */
    function Compiler(options) {
        if (options === void 0) { options = {}; }
        this.options = options;
        /**
         * 解析语句块的规则。
         */
        this.blockRules = [
            {
                name: "blankLine",
                match: /^\n+/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "#line"
                    };
                }
            }, {
                name: "code",
                match: /^( {4}[^\n]+\n*)+/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "pre",
                        children: [{
                                source: source.replace(/\n+$/, "").replace(/^ {4}/gm, ""),
                                type: "#text",
                            }]
                    };
                }
            }, {
                name: "fences",
                match: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
                parse: function (source, quote, lang, content) {
                    return {
                        source: source,
                        type: "pre",
                        data: lang,
                        children: [{
                                source: content || "",
                                type: "#text",
                            }]
                    };
                }
            }, {
                name: "heading",
                match: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
                parse: function (source, depth, content) {
                    return {
                        source: source,
                        type: "h" + depth.length,
                        children: this.parseInline(content || "")
                    };
                }
            }, {
                name: "table",
                match: /^ *(\S.*\|.*)\n *([-:]+ *\|[-:| ]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
                parse: function (source, header, align, cell) {
                    var _this = this;
                    var aligns = align.replace(/\| *$/, "").split("|").map(function (align) { return /^ *-+: *$/.test(align) ? "right" : /^ *:-+: *$/.test(align) ? "center" : /^ *:-+ *$/.test(align) ? "left" : ""; });
                    return {
                        source: source,
                        type: "table",
                        children: [{
                                source: header,
                                type: "tr",
                                data: align,
                                children: header.replace(/\| *$/, "").split("|").map(function (header, index) { return ({
                                    source: header,
                                    type: "th",
                                    data: aligns[index],
                                    children: _this.parseInline(header.trim())
                                }); })
                            }].concat(cell.replace(/\n$/, "").split("\n").map(function (row) { return ({
                            source: row,
                            type: "tr",
                            children: row.replace(/\| *$/, "").split("|").map(function (cell, index) { return ({
                                source: cell,
                                type: "td",
                                data: aligns[index],
                                children: _this.parseInline(cell.trim())
                            }); })
                        }); }))
                    };
                }
            }, {
                name: "borderTable",
                match: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/,
                parse: function (source, header, align, cell) {
                    var _this = this;
                    var aligns = align.replace(/^ *\||\| *$/g, "").split("|").map(function (align) { return /^ *-+: *$/.test(align) ? "right" : /^ *:-+: *$/.test(align) ? "center" : /^ *:-+ *$/.test(align) ? "left" : ""; });
                    return {
                        source: source,
                        type: "table",
                        children: [{
                                source: header,
                                type: "tr",
                                data: align,
                                children: header.replace(/^ *\||\| *$/g, "").split("|").map(function (header, index) { return ({
                                    source: header,
                                    type: "th",
                                    data: aligns[index],
                                    children: _this.parseInline(header.trim())
                                }); })
                            }].concat(cell.replace(/\n$/, "").split("\n").map(function (row) { return ({
                            source: row,
                            type: "tr",
                            children: row.replace(/^ *\||\| *$/g, "").split("|").map(function (cell, index) { return ({
                                source: cell,
                                type: "td",
                                data: aligns[index],
                                children: _this.parseInline(cell.trim())
                            }); })
                        }); }))
                    };
                }
            }, {
                name: "lineHeading",
                match: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
                parse: function (source, content, depth) {
                    return {
                        source: source,
                        type: "h" + (depth.charAt(0) === "=" ? 1 : 2),
                        children: this.parseInline(content)
                    };
                }
            }, {
                name: "hr",
                match: /^(?: *[-*_]){3,} *(?:\n+|$)/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "hr"
                    };
                }
            }, {
                name: "blockquote",
                match: /^( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "blockquote",
                        children: this.parseBlock(source.replace(/^ *> ?/gm, ""))
                    };
                }
            }, {
                name: "list",
                match: /^( *)([*+-]|\d+\.) [\s\S]+?(?:\n+(?=(?: *[-*_]){3,} *(?:\n+|$))|\n+(?=reDef)|\n{2,}(?! )(?!\1[*+-]|\d+\. )\n*|\s*$)/,
                parse: function (source, indent, bullet) {
                    var _this = this;
                    var children = [];
                    source.replace(/^( *)((?:[*+-]|\d+\.) +)[^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm, function (source2, indent2, bullet2) {
                        children.push({
                            source: source2,
                            type: "li",
                            children: _this.parseBlock(source2.slice(bullet2.length).replace(new RegExp("^ {1," + (indent2.length + bullet2.length) + "}", "gm"), ""))
                        });
                        return "";
                    });
                    return {
                        source: source,
                        type: /^\d/.test(bullet) ? "ol" : "ul",
                        children: children
                    };
                }
            }, {
                name: "html",
                match: /^ *(?:<!--[\s\S]*?--> *(?:\n|\s*$)|<(reTag)[\s\S]+?<\/\1> *(?:\n{2,}|\s*$)|<reTag(?:"[^"]*"|'[^']*'|[^'">])*?> *(?:\n{2,}|\s*$))/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "#fragment"
                    };
                }
            }, {
                name: "def",
                match: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
                parse: function (source, name, href, title) {
                    return {
                        source: source,
                        type: "#def",
                        data: {
                            name: name,
                            href: href,
                            title: title,
                        }
                    };
                }
            }, {
                name: "paragraph",
                match: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def|fences|list))+)\n*/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "p",
                        children: this.parseInline(source)
                    };
                }
            }
        ];
        /**
         * 解析内联语句的规则。
         */
        this.inlineRules = [
            {
                name: "escape",
                match: /^\\([\\`*{}\[\]()#+\-.!_>~|])/,
                parse: function (source, char) {
                    return {
                        source: source,
                        type: "#escape",
                        data: char
                    };
                }
            },
            {
                name: "autolink",
                match: /^<([^ >]+(@|:\/)[^ >]+)>/,
                parse: function (source) {
                    //               if (cap[2] === '@') {
                    //     text = cap[1].charAt(6) === ':'
                    //       ? this.mangle(cap[1].substring(7))
                    //       : this.mangle(cap[1]);
                    //     href = this.mangle('mailto:') + text;
                    //   } else {
                    //     text = escape(cap[1]);
                    //     href = text;
                    //   }
                    //   out += this.renderer.link(href, null, text);
                    return {
                        source: source,
                        type: "#text"
                    };
                }
            },
            {
                name: "link",
                match: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
                parse: function (source) {
                    //             text = escape(cap[1]);
                    //   href = text;
                    return {
                        source: source,
                        type: "a",
                        data: {
                            href: source
                        }
                    };
                }
            },
            {
                name: "tag",
                match: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "#tag"
                    };
                }
            },
            {
                name: "reflink",
                match: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
                parse: function (source) {
                    //               src = src.substring(cap[0].length);
                    //   link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
                    //   link = this.links[link.toLowerCase()];
                    //   if (!link || !link.href) {
                    //     out += cap[0].charAt(0);
                    //     src = cap[0].substring(1) + src;
                    //     continue;
                    //   }
                    //   this.inLink = true;
                    //   out += this.outputLink(cap, link);
                    //   this.inLink = false;
                    return {
                        source: source,
                        type: "#text"
                    };
                }
            },
            {
                name: "nolink",
                match: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
                parse: function (source) {
                    //               src = src.substring(cap[0].length);
                    //   link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
                    //   link = this.links[link.toLowerCase()];
                    //   if (!link || !link.href) {
                    //     out += cap[0].charAt(0);
                    //     src = cap[0].substring(1) + src;
                    //     continue;
                    //   }
                    //   this.inLink = true;
                    //   out += this.outputLink(cap, link);
                    //   this.inLink = false;
                    return {
                        source: source,
                        type: "#text"
                    };
                }
            },
            {
                name: "link",
                match: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
                parse: function (source) {
                    //             text = escape(cap[1]);
                    //   href = text;
                    return {
                        source: source,
                        type: "#text"
                    };
                }
            },
            {
                name: "strong",
                match: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
                parse: function (source, content1, content2) {
                    return {
                        source: source,
                        type: "strong",
                        children: this.parseInline(content2 || content1)
                    };
                }
            },
            {
                name: "em",
                match: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
                parse: function (source, content1, content2) {
                    return {
                        source: source,
                        type: "em",
                        children: this.parseInline(content2 || content1)
                    };
                }
            },
            {
                name: "code",
                match: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
                parse: function (source, quote, content) {
                    return {
                        source: source,
                        type: "code",
                        data: quote,
                        children: [{
                                source: content,
                                type: "#text"
                            }]
                    };
                }
            },
            {
                name: "br",
                match: /^ {2,}\n(?!\s*$)/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "br"
                    };
                }
            },
            {
                name: "del",
                match: /^~~(?=\S)([\s\S]*?\S)~~/,
                parse: function (source, content) {
                    return {
                        source: source,
                        type: "del",
                        children: this.parseInline(content)
                    };
                }
            },
            {
                name: "text",
                match: /^[\s\S]+?(?=[\\<!\[_*`~]|https?:\/\/| {2,}\n|$)/,
                parse: function (source) {
                    return {
                        source: source,
                        type: "#text"
                    };
                }
            }
        ];
        /**
         * 渲染节点使用的函数。
         */
        this.renderer = {
            "#document": function (node) {
                return this.renderList(node.children);
            },
            "#line": function (node) {
                return "";
            },
            pre: function (node) {
                return "<pre><code" + (node.data ? " class=\"lang-" + node.data + "\"" : "") + ">" + this.renderList(node.children) + "</code></pre>\n";
            },
            h1: function (node) {
                return "<h1>" + this.renderList(node.children) + "</h1>\n";
            },
            h2: function (node) {
                return "<h2>" + this.renderList(node.children) + "</h2>\n";
            },
            h3: function (node) {
                return "<h3>" + this.renderList(node.children) + "</h3>\n";
            },
            h4: function (node) {
                return "<h4>" + this.renderList(node.children) + "</h4>\n";
            },
            h5: function (node) {
                return "<h5>" + this.renderList(node.children) + "</h5>\n";
            },
            h6: function (node) {
                return "<h6>" + this.renderList(node.children) + "</h6>\n";
            },
            table: function (node) {
                return "<table>\n\t<thead>\n" + this.render(node.children[0]) + "\t</thead>\n\t<tbody>\n" + this.renderList(node.children.slice(1)) + "\t</tbody>\n</table>\n";
            },
            tr: function (node) {
                return "\t\t<tr>\n" + this.renderList(node.children) + "\t\t</tr>\n";
            },
            th: function (node) {
                return "\t\t\t<th" + (node.data ? " style=\"text-align: " + node.data + ";\"" : "") + ">" + this.renderList(node.children) + "</th>\n";
            },
            td: function (node) {
                return "\t\t\t<td" + (node.data ? " style=\"text-align: " + node.data + ";\"" : "") + ">" + this.renderList(node.children) + "</td>\n";
            },
            hr: function (node) {
                return "<hr>\n";
            },
            blockquote: function (node) {
                return "<blockquote>" + this.renderList(node.children) + "</blockquote>\n";
            },
            ul: function (node) {
                return "<ul>" + this.renderList(node.children) + "</ul>\n";
            },
            ol: function (node) {
                return "<ol>" + this.renderList(node.children) + "</ol>\n";
            },
            li: function (node) {
                return "\t<li>" + this.renderList(node.children) + "</li>\n";
            },
            "#fragment": function (node) {
                return node.source;
            },
            "#def": function (node) {
                return "";
            },
            p: function (node) {
                return "<p>" + this.renderList(node.children) + "</p>\n";
            },
            // html(node) {
            // },
            // blank() {
            // },
            // "#element"() {
            // },
            // pre() {
            // },
            em: function (node) {
                return "<em>" + this.renderList(node.children) + "</em>";
            },
            "#text": function (node) {
                return node.source.replace(/</g, "&lt;");
            }
        };
        Object.assign(this.renderer, options.renderer);
    }
    /**
     * 解析指定的源码。
     * @param source 要处理的源码。
     * @return 返回语法树文档。
     */
    Compiler.prototype.parse = function (source) {
        return {
            source: source,
            type: "#document",
            children: this.parseBlock(source.replace(/\r\n|\r|\u2424/g, "\n")
                .replace(/\t/g, "    ")
                .replace(/\u00a0/g, " "))
        };
    };
    /**
     * 解析一个块源码。
     * @param source 要处理的源码。
     * @return 返回语法树节点数组。
     */
    Compiler.prototype.parseBlock = function (source) {
        return this.parseInternal(source, this.blockRules);
    };
    /**
     * 解析一个内联源码。
     * @param source 要处理的源码。
     * @return 返回语法树节点数组。
     */
    Compiler.prototype.parseInline = function (source) {
        return this.parseInternal(source, this.inlineRules);
    };
    /**
     * 使用指定的规则解析指定的源码。
     * @param source 要处理的源码。
     * @param rules 要使用的规则。
     * @return 返回源码列表。
     */
    Compiler.prototype.parseInternal = function (source, rules) {
        source = source.replace(/^ +$/gm, "");
        var result = [];
        while (source) {
            for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
                var rule = rules_1[_i];
                var match = rule.match.exec(source);
                if (match) {
                    result[result.length] = rule.parse.apply(this, match);
                    source = source.slice(match[0].length);
                    break;
                }
            }
        }
        return result;
    };
    /**
     * 渲染指定的节点为 HTML。
     * @param node 要渲染的节点。
     * @return 返回已渲染的 HTML。
     */
    Compiler.prototype.render = function (node) {
        //  console.log(node);
        if (this.renderer[node.type]) {
            return this.renderer[node.type].call(this, node);
        }
        return node.source;
    };
    /**
     * 渲染指定的节点列表为 HTML。
     * @param node 要渲染的节点列表。
     * @return 返回已渲染的 HTML。
     */
    Compiler.prototype.renderList = function (nodes) {
        var result = "";
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            result += this.render(node);
        }
        return result;
    };
    return Compiler;
}());
exports.Compiler = Compiler;
/**
 * 渲染指定的 MarkDown 源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
function render(source, options) {
    var compiler = new Compiler(options);
    var document = compiler.parse(source);
    console.log(document);
    return compiler.render(document);
}
exports.render = render;
/**
 * 渲染指定的 MarkDown 内联源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
function renderInline(source, options) {
    var compiler = new Compiler(options);
    var nodes = compiler.parseInline(source);
    return compiler.renderList(nodes);
}
exports.renderInline = renderInline;
