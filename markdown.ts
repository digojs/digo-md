/**
 * @file MarkDown 编译器
 * @author xuld <xuld@vip.qq.com>
 */

/**
 * 表示一个 Markdown 编译器。
 */
export class Compiler {

    /**
     * 初始化新的编译器。
     * @param options 编译的选项。
     */
    constructor(public options: Options = {}) {
        Object.assign(this.renderer, options.renderer);
    }

    /**
     * 解析指定的源码。
     * @param source 要处理的源码。
     * @return 返回语法树文档。
     */
    parse(source: string) {
        return {
            source: source,
            type: "#document",
            children: this.parseBlock(source.replace(/\r\n|\r|\u2424/g, "\n")
                .replace(/\t/g, "    ")
                .replace(/\u00a0/g, " "), true)
        };
    }

    /**
     * 解析一个块源码。
     * @param source 要处理的源码。
     * @param top 是否正在解析顶级标签。
     * @return 返回语法树节点数组。
     */
    parseBlock(source: string, top = false) {
        const oldTop = this.top;
        this.top = top;
        try {
            return this.parseInternal(source, this.blockRules);
        } finally {
            top = oldTop;
        }
    }

    /**
     * 标记当前是否正在解析顶级标签。
     */
    private top: boolean;

    /**
     * 解析语句块的规则。
     */
    blockRules: Rule[] = [
        {
            name: "blankLine",
            match: /^\n+/,
            parse(source) {
                return {
                    source: source,
                    type: "#line"
                };
            }
        }, {
            name: "code",
            match: /^( {4}[^\n]+\n*)+/,
            parse(source) {
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
            parse(source, quote, lang, content) {
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
            parse(source, depth, content) {
                return {
                    source: source,
                    type: `h${depth.length}`,
                    children: this.parseInline(content || "")
                };
            }
        }, {
            name: "table",
            match: /^ *(\S.*\|.*)\n *([-:]+ *\|[-:| ]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
            parse(source, header, align, cell) {
                const aligns = align.replace(/\| *$/, "").split("|").map(align => /^ *-+: *$/.test(align) ? "right" : /^ *:-+: *$/.test(align) ? "center" : /^ *:-+ *$/.test(align) ? "left" : "");
                return {
                    source: source,
                    type: "table",
                    children: [{
                        source: header,
                        type: "tr",
                        data: align,
                        children: header.replace(/\| *$/, "").split("|").map((header, index) => ({
                            source: header,
                            type: "th",
                            data: aligns[index],
                            children: this.parseInline(header.trim())
                        }))
                    }, ...cell.replace(/\n$/, "").split("\n").map(row => ({
                        source: row,
                        type: "tr",
                        children: row.replace(/\| *$/, "").split("|").map((cell, index) => ({
                            source: cell,
                            type: "td",
                            data: aligns[index],
                            children: this.parseInline(cell.trim())
                        }))
                    }))]
                };
            }
        }, {
            name: "borderTable",
            match: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/,
            parse(source, header, align, cell) {
                const aligns = align.replace(/^ *\||\| *$/g, "").split("|").map(align => /^ *-+: *$/.test(align) ? "right" : /^ *:-+: *$/.test(align) ? "center" : /^ *:-+ *$/.test(align) ? "left" : "");
                return {
                    source: source,
                    type: "table",
                    children: [{
                        source: header,
                        type: "tr",
                        data: align,
                        children: header.replace(/^ *\||\| *$/g, "").split("|").map((header, index) => ({
                            source: header,
                            type: "th",
                            data: aligns[index],
                            children: this.parseInline(header.trim())
                        }))
                    }, ...cell.replace(/\n$/, "").split("\n").map(row => ({
                        source: row,
                        type: "tr",
                        children: row.replace(/^ *\||\| *$/g, "").split("|").map((cell, index) => ({
                            source: cell,
                            type: "td",
                            data: aligns[index],
                            children: this.parseInline(cell.trim())
                        }))
                    }))]
                };
            }
        }, {
            name: "lineHeading",
            match: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
            parse(source, content, depth) {
                return {
                    source: source,
                    type: `h${depth.charAt(0) === "=" ? 1 : 2}`,
                    children: this.parseInline(content)
                };
            }
        }, {
            name: "hr",
            match: /^(?: *[-*_]){3,} *(?:\n+|$)/,
            parse(source) {
                return {
                    source: source,
                    type: "hr"
                };
            }
        }, {
            name: "blockquote",
            match: /^( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+/,
            parse(source) {
                return {
                    source: source,
                    type: "blockquote",
                    children: this.parseBlock(source.replace(/^ *> ?/gm, ""))
                };
            }
        }, {
            name: "list",
            match: /^( *)([*+-]|\d+\.) [\s\S]+?(?:\n+(?=(?: *[-*_]){3,} *(?:\n+|$))|\n+(?=reDef)|\n{2,}(?! )(?!\1[*+-]|\d+\. )\n*|\s*$)/,
            parse(source, indent, bullet) {
                const children: Node[] = [];
                source.replace(/^( *)((?:[*+-]|\d+\.) +)[^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm, (source2, indent2, bullet2) => {
                    children.push({
                        source: source2,
                        type: "li",
                        children: this.parseBlock(source2.slice(bullet2.length).replace(new RegExp(`^ {1,${indent2.length + bullet2.length}}`, "gm"), ""))
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
            parse(source) {
                return {
                    source: source,
                    type: "#fragment"
                };
            }
        }, {
            name: "def",
            match: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
            parse(source, name, href, title) {
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
            parse(source) {
                return {
                    source: source,
                    type: this.top || source.charAt(source.length - 1) === "\n" ? "p" : "#root",
                    children: this.parseInline(source.replace(/\n+$/, ""))
                };
            }
        }
    ];

    /**
     * 解析一个内联源码。
     * @param source 要处理的源码。
     * @return 返回语法树节点数组。
     */
    parseInline(source: string) {
        return this.parseInternal(source, this.inlineRules);
    }

    /**
     * 解析内联语句的规则。
     */
    inlineRules: Rule[] = [
        {
            name: "escape",
            match: /^\\([\\`*{}\[\]()#+\-.!_>~|])/,
            parse(source, char) {
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
            parse(source) {
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
            parse(source) {
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
            parse(source) {
                return {
                    source: source,
                    type: "#tag"
                };
            }
        },
        {
            name: "reflink",
            match: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
            parse(source) {
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
            parse(source) {
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
            parse(source) {
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
            parse(source, content1, content2) {
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
            parse(source, content1, content2) {
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
            parse(source, quote, content) {
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
            parse(source) {
                return {
                    source: source,
                    type: "br"
                };
            }
        },
        {
            name: "del",
            match: /^~~(?=\S)([\s\S]*?\S)~~/,
            parse(source, content) {
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
            parse(source) {
                return {
                    source: source,
                    type: "#text"
                };
            }
        }
    ];

    /**
     * 使用指定的规则解析指定的源码。
     * @param source 要处理的源码。
     * @param rules 要使用的规则。
     * @return 返回源码列表。
     */
    private parseInternal(source: string, rules: Rule[]) {
        source = source.replace(/^ +$/gm, "");
        const result: Node[] = [];
        while (source) {
            for (const rule of rules) {
                const match = rule.match.exec(source);
                if (match) {
                    result[result.length] = rule.parse.apply(this, match);
                    source = source.slice(match[0].length);
                    break;
                }
            }
        }
        return result;
    }

    /**
     * 渲染指定的节点为 HTML。
     * @param node 要渲染的节点。
     * @return 返回已渲染的 HTML。
     */
    render(node: Node) {
        //  console.log(node);
        if (this.renderer[node.type]) {
            return this.renderer[node.type].call(this, node);
        }
        return node.source;
    }

    /**
     * 渲染指定的节点列表为 HTML。
     * @param node 要渲染的节点列表。
     * @return 返回已渲染的 HTML。
     */
    renderList(nodes: Node[]) {
        let result = "";
        for (const node of nodes) {
            result += this.render(node);
        }
        return result;
    }

    /**
     * 渲染节点使用的函数。
     */
    renderer = {

        "#document"(this: Compiler, node: Node) {
            return this.renderList(node.children);
        },

        "#root"(this: Compiler, node: Node) {
            return this.renderList(node.children);
        },

        "#line"(this: Compiler, node: Node) {
            return "";
        },

        pre(this: Compiler, node: Node) {
            return `<pre><code${node.data ? ` class="lang-${node.data}"` : ""}>${this.renderList(node.children)}</code></pre>\n`;
        },

        h1(this: Compiler, node: Node) {
            return `<h1>${this.renderList(node.children)}</h1>\n`;
        },

        h2(this: Compiler, node: Node) {
            return `<h2>${this.renderList(node.children)}</h2>\n`;
        },

        h3(this: Compiler, node: Node) {
            return `<h3>${this.renderList(node.children)}</h3>\n`;
        },

        h4(this: Compiler, node: Node) {
            return `<h4>${this.renderList(node.children)}</h4>\n`;
        },

        h5(this: Compiler, node: Node) {
            return `<h5>${this.renderList(node.children)}</h5>\n`;
        },

        h6(this: Compiler, node: Node) {
            return `<h6>${this.renderList(node.children)}</h6>\n`;
        },

        table(this: Compiler, node: Node) {
            return `<table>\n\t<thead>\n${this.render(node.children[0])}\t</thead>\n\t<tbody>\n${this.renderList(node.children.slice(1))}\t</tbody>\n</table>\n`;
        },

        tr(this: Compiler, node: Node) {
            return `\t\t<tr>\n${this.renderList(node.children)}\t\t</tr>\n`;
        },

        th(this: Compiler, node: Node) {
            return `\t\t\t<th${node.data ? ` style="text-align: ${node.data};"` : ""}>${this.renderList(node.children)}</th>\n`;
        },

        td(this: Compiler, node: Node) {
            return `\t\t\t<td${node.data ? ` style="text-align: ${node.data};"` : ""}>${this.renderList(node.children)}</td>\n`;
        },

        hr(this: Compiler, node: Node) {
            return `<hr>\n`;
        },

        blockquote(this: Compiler, node: Node) {
            return `<blockquote>${this.renderList(node.children)}</blockquote>\n`;
        },

        ul(this: Compiler, node: Node) {
            return `<ul>\n${this.renderList(node.children)}</ul>\n`;
        },

        ol(this: Compiler, node: Node) {
            return `<ol>\n${this.renderList(node.children)}</ol>\n`;
        },

        li(this: Compiler, node: Node) {
            return `\t<li>${this.renderList(node.children)}</li>\n`;
        },

        "#fragment"(this: Compiler, node: Node) {
            return node.source;
        },

        "#def"(this: Compiler, node: Node) {
            return "";
        },

        p(this: Compiler, node: Node) {
            return `<p>${this.renderList(node.children)}</p>\n`;
        },

        // html(node) {

        // },

        // blank() {

        // },

        // "#element"() {

        // },

        // pre() {

        // },

        em(this: Compiler, node: Node) {
            return `<em>${this.renderList(node.children)}</em>`;
        },

        "#text"(this: Compiler, node: Node) {
            return node.source.replace(/</g, "&lt;");
        }

    };

}

/**
 * 表示解析的选项。
 */
export interface Options {

    /**
     * 获取当前的渲染器。
     */
    renderer?: Partial<Compiler["renderer"]>;

}

/**
 * 表示一个语法解析规则。
 */
export interface Rule {

    /**
     * 规则的名字。
     */
    name: string;

    /**
     * 当前规则匹配的正则表达式。
     */
    match: RegExp;

    /**
     * 用于解析当前规则内容并生成标记的回调函数。
     * @param matches 正则匹配后的结果。
     * @return 返回解析生成的节点。
     */
    parse(this: Compiler, ...matches: string[]): Node;

}

/**
 * 表示一个 Markdown 语法树节点。
 */
export interface Node {

    /**
     * 当前节点的源码。
     */
    source: string;

    /**
     * 当前节点的类型。
     */
    type: keyof Compiler["renderer"] | string;

    /**
     * 当前节点的附加数据。
     */
    data?: any;

    /**
     * 当前节点的子节点。
     */
    children?: Node[];

}

/**
 * 渲染指定的 MarkDown 源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
export function render(source: string, options: Options) {
    const compiler = new Compiler(options);
    const document = compiler.parse(source);
    console.log(document);
    return compiler.render(document);
}

/**
 * 渲染指定的 MarkDown 内联源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
export function renderInline(source: string, options: Options) {
    const compiler = new Compiler(options);
    const nodes = compiler.parseInline(source);
    return compiler.renderList(nodes);
}
