/**
 * @file MarkDown 解析器
 * @author xuld <xuld@vip.qq.com>
 */

/**
 * 渲染指定的 MarkDown 源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
export function render(source: string, options: Options) {
    const doc = parse(source, options);
    const renderer = options.renderer || new Renderer(options);
    return renderer.render(doc);
}

/**
 * 渲染指定的 MarkDown 内联源码为 HTML。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回已渲染的模板。
 */
export function renderInline(source: string, options: Options) {
    const doc = parseInline(source, options);
    const renderer = options.renderer || new Renderer(options);
    return renderer.render(doc);
}

/**
 * 解析一个 markdown 源码。
 * @param source 要处理的源码。
 * @param options 渲染的选项。
 * @return 返回语法树。
 */
export function parse(source: string, options: Options) {
    const doc = {} as AstDocument;
    parseBlock(source, options, doc);
    return doc;
}

// /**
//  * 解析一个 markdown 内联源码。
//  * @param source 要处理的源码。
//  * @param options 渲染的选项。
//  * @return 返回语法树。
//  */
// export function parseInline(source: string, options: Options) {
//     const doc = {} as AstDocument;
//     parseInline(source, options, doc);
//     return doc;
// }

/**
 * 表示解析的选项。
 */
export interface Options {

    /**
     * 获取当前的渲染器。
     */
    renderer?: Renderer;

}

/**
 * 表示一个渲染器。
 */
export class Renderer {

    /**
     * 初始化新的渲染器。
     * @param options 渲染的选项。
     */
    constructor(public options: Options) {

    }

    /**
     * 渲染指定的节点为 HTML。
     * @param node 要渲染的节点。
     */
    render(node: AstNode) {
        if (this[node.type]) {
            return this[node.type](node);
        }
        return node.source;
    }

    protected html(node: AstDocument) {

    }

}

/**
 * 表示一个语法树节点。
 */
export interface AstNode {

    /**
     * 当前节点的源码。
     */
    source: string;

    /**
     * 当前节点的类型。
     */
    type: string;

    /**
     * 当前节点的内容。
     */
    content?: string;

    /**
     * 当前节点的附加数据。
     */
    data?: any;

    /**
     * 当前节点的子节点。
     */
    children?: AstNode[];

}

/**
 * 表示一个语法树。
 */
export interface AstDocument extends AstNode {

}

/**
 * 表示一个 Markdown 解析器。
 */
export class Parser {
    readonly reNewLine = /^\n+/;
    readonly reCode = /^( {4}[^\n]+\n*)+/;
    readonly reHr = /^(?: *[-*_]){3,} *(?:\n+|$)/;
    readonly reFences = /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/;
    readonly reHeading = /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/;
    readonly reNpTable = /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/;
    readonly reLHeading = /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/; // /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/
    readonly reBlockquote = /^( *>[^\n]+(\n(?!reDef)[^\n]+)*\n*)+/;
    readonly reList = /^( *)(reBullet) [\s\S]+?(?:\n+(?=reHr)|\n+(?=reDef)|\n{2,}(?! )(?!\1reBullet )\n*|\s*$)/;
    readonly reHtml = /^ *(?:<!--[\s\S]*?--> *(?:\n|\s*$)|<(reTag)[\s\S]+?<\/\1> *(?:\n{2,}|\s*$)|<reTag(?:"[^"]*"|'[^']*'|[^'">])*?> *(?:\n{2,}|\s*$))/;
    readonly reDef = /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/;
    readonly reTable = /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/;
    readonly reParagraph = /^/; // /^((?:[^\n]+\n?(?!reHr|reHeading|reLHeading|reBlockquote|reTag|reDef))+)\n*/;
    readonly reText = /^[^\n]+/;

    readonly reTag = /(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b/;
    readonly reBullet = /(?:[*+-]|\d+\.)/;
    readonly reItem = /^( *)(reBullet) [^\n]*(?:\n(?!\reBullet )[^\n]*)*/;

    constructor() {
        for (const key in this as any) {
            if (this[key] instanceof RegExp && /re[A-Z]\w*/g.test(this[key].source)) {
                this[key] = new RegExp(this[key].source.replace(/re[A-Z]\w*/g, source => this[source].source));
            }
        }
    }

    block(source: string, options: Options, parent: AstNode) {
        this.quickParse(source, [
            {
                match: /^\n+/,
                parse(source) {
                    parent.children.push({
                        source: source,
                        type: "blank"
                    });
                }
            }, {
                match: /^( {4}[^\n]+\n*)+/,
                parse(source) {
                    parent.children.push({
                        source: source,
                        type: "pre",
                        content: source.replace(/^ {4}/gm, "")
                    });
                }
            }, {
                match: /^ *([`~]{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
                parse(source, quote, lang, value) {
                    parent.children.push({
                        source: source,
                        type: "pre",
                        content: value || "",
                        data: lang
                    });
                }
            }, {
                match: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
                parse(source, depth, value) {
                    parent.children.push({
                        source: source,
                        type: `h${depth.length}`,
                        content: value || "",
                        children: []
                    });
                }
            }, {
                match: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
                parse(source, header, align, cell) {
                    const headers = header.replace(/^ *| *\| *$/g, "").split(/ *\| */);
                    const aligns = align.replace(/^ *| *\| *$/g, "").split(/ *\| */);
                    const cells = cell.replace(/\n$/, "").split("\n");
                    parent.children.push({
                        source: source,
                        type: "table",
                        children: [{
                            source: header,
                            type: "tr",
                            data: align,
                            children: headers.map((header, index) => ({
                                source: header,
                                type: "th",
                                content: header,
                                data: /^ *-+: *$/.test(aligns[index]) ? "right" : /^ *:-+: *$/.test(aligns[index]) ? "center" : /^ *:-+ *$/.test(aligns[index]) ? "left" : ""
                            }))
                        }, ...cells.map(row => ({
                            source: row,
                            type: "tr",
                            children: row.replace(/^ *| *\| *$/g, "").split(/ *\| */).map(cell => ({
                                source: cell,
                                type: "td",
                                content: cell
                            }))
                        }))]
                    });
                }
            }, {
                match: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
                parse(source, text, depth) {
                    parent.children.push({
                        source: source,
                        type: `h${depth.charAt(0) === "=" ? 1 : 2}`,
                        content: text
                    });
                }
            }, {
                match: /^( *[-*_]){3,} *(?:\n+|$)/,
                parse(source) {
                    parent.children.push({
                        source: source,
                        type: "hr"
                    });
                }
            }, {
                match: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
                parse(source) {
                    parent.children.push(parseBlock(source.replace(/^ *> ?/gm, ""), options, {
                        source: source,
                        type: "blockquote",
                        children: []
                    }));
                }
            }, {
                match: /^( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))|\\n+(?=^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)/,
                parse(source, indent, bullet) {
                    const children: AstNode[] = [];
                    source.replace(/^( *)((?:[*+-]|\d+\.) +)[^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm, (source2, indent2, bullet2) => {
                        children.push(parseBlock(source2.slice(bullet2.length).replace(new RegExp(`^ {1,${indent2.length + bullet2.length}}`, "gm"), ""), options, {
                            source: source2,
                            type: "li",
                            children: []
                        }));
                        return "";
                    });
                    parent.children.push({
                        source: source,
                        type: /^\d/.test(bullet) ? "ol" : "ul",
                        children: children
                    });
                }
            }, {
                match: /^ *(?:<!--[\s\S]*?--> *(?:\n|\s*$)|<(tag)[\s\S]+?<\/\1> *(?:\n{2,}|\s*$)|<tag(?:"[^"]*"|'[^']*'|[^'">])*?> *(?:\n{2,}|\s*$))/,
                parse(source) {

                }
            }, {
                match: /x/,
                parse(source) {

                }
            }, {
                match: /x/,
                parse(source) {

                }
            }, {
                match: /x/,
                parse(source) {

                }
            },
        ]);
        return parent;
    }

    /**
     * 使用正则快速解析指定的源码。
     * @param source 要解析的源码。
     * @param parsers 所有匹配正则。
     */
    private quickParse(source: string, parsers: { match: RegExp, parse(...matches: string[]): void }[]) {
        while (source) {
            for (const parser of parsers) {
                const match = parser.match.exec(source);
                if (match) {
                    parser.parse(...match);
                    source = source.slice(match[0].length);
                    break;
                }
            }
        }
    }

}

/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

; (function () {

    /**
     * Block-Level Grammar
     */

    var block = {
        newline: /^\n+/,
        code: /^( {4}[^\n]+\n*)+/,
        fences: noop,
        hr: /^( *[-*_]){3,} *(?:\n+|$)/,
        heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
        nptable: noop,
        lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
        blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
        list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
        html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
        def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
        table: noop,
        paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
        text: /^[^\n]+/
    };

    block.bullet = /(?:[*+-]|\d+\.)/;
    block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
    block.item = replace(block.item, 'gm')
        (/bull/g, block.bullet)
        ();

    block.list = replace(block.list)
        (/bull/g, block.bullet)
        ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
        ('def', '\\n+(?=' + block.def.source + ')')
        ();

    block.blockquote = replace(block.blockquote)
        ('def', block.def)
        ();

    block._tag = '(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

    block.html = replace(block.html)
        ('comment', /<!--[\s\S]*?-->/)
        ('closed', /<(tag)[\s\S]+?<\/\1>/)
        ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
        (/tag/g, block._tag)
        ();

    block.paragraph = replace(block.paragraph)
        ('hr', block.hr)
        ('heading', block.heading)
        ('lheading', block.lheading)
        ('blockquote', block.blockquote)
        ('tag', '<' + block._tag)
        ('def', block.def)
        ();

    /**
     * Normal Block Grammar
     */

    block.normal = merge({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge({}, block.normal, {
        fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]*?)\s*\1 *(?:\n+|$)/,
        paragraph: /^/,
        heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
    });

    block.gfm.paragraph = replace(block.paragraph)
        ('(?!', '(?!'
        + block.gfm.fences.source.replace('\\1', '\\2') + '|'
        + block.list.source.replace('\\1', '\\3') + '|')
        ();

    /**
     * GFM + Tables Block Grammar
     */

    block.tables = merge({}, block.gfm, {
        nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
        table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
    });

    /**
     * Block Lexer
     */

    function Lexer(options) {
        this.tokens = [];
        this.tokens.links = {};
        this.options = options || marked.defaults;
        this.rules = block.normal;

        if (this.options.gfm) {
            if (this.options.tables) {
                this.rules = block.tables;
            } else {
                this.rules = block.gfm;
            }
        }
    }

    /**
     * Expose Block Rules
     */

    Lexer.rules = block;

    /**
     * Static Lex Method
     */

    Lexer.lex = function (src, options) {
        var lexer = new Lexer(options);
        return lexer.lex(src);
    };

    /**
     * Preprocessing
     */

    Lexer.prototype.lex = function (src) {
        src = src
            .replace(/\r\n|\r/g, '\n')
            .replace(/\t/g, '    ')
            .replace(/\u00a0/g, ' ')
            .replace(/\u2424/g, '\n');

        return this.token(src, true);
    };

    /**
     * Lexing
     */

    Lexer.prototype.token = function (src, top, bq) {
        var src = src.replace(/^ +$/gm, '')
            , next
            , loose
            , cap
            , bull
            , b
            , item
            , space
            , i
            , l;

        while (src) {

            // html
            if (cap = this.rules.html.exec(src)) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: this.options.sanitize
                        ? 'paragraph'
                        : 'html',
                    pre: !this.options.sanitizer
                    && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
                    text: cap[0]
                });
                continue;
            }

            // def
            if ((!bq && top) && (cap = this.rules.def.exec(src))) {
                src = src.substring(cap[0].length);
                this.tokens.links[cap[1].toLowerCase()] = {
                    href: cap[2],
                    title: cap[3]
                };
                continue;
            }

            // table (gfm)
            if (top && (cap = this.rules.table.exec(src))) {
                src = src.substring(cap[0].length);

                item = {
                    type: 'table',
                    header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
                    align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                    cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
                };

                for (i = 0; i < item.align.length; i++) {
                    if (/^ *-+: *$/.test(item.align[i])) {
                        item.align[i] = 'right';
                    } else if (/^ *:-+: *$/.test(item.align[i])) {
                        item.align[i] = 'center';
                    } else if (/^ *:-+ *$/.test(item.align[i])) {
                        item.align[i] = 'left';
                    } else {
                        item.align[i] = null;
                    }
                }

                for (i = 0; i < item.cells.length; i++) {
                    item.cells[i] = item.cells[i]
                        .replace(/^ *\| *| *\| *$/g, '')
                        .split(/ *\| */);
                }

                this.tokens.push(item);

                continue;
            }

            // top-level paragraph
            if (top && (cap = this.rules.paragraph.exec(src))) {
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 'paragraph',
                    text: cap[1].charAt(cap[1].length - 1) === '\n'
                        ? cap[1].slice(0, -1)
                        : cap[1]
                });
                continue;
            }

            // text
            if (cap = this.rules.text.exec(src)) {
                // Top-level should never reach here.
                src = src.substring(cap[0].length);
                this.tokens.push({
                    type: 'text',
                    text: cap[0]
                });
                continue;
            }

            if (src) {
                throw new
                    Error('Infinite loop on byte: ' + src.charCodeAt(0));
            }
        }

        return this.tokens;
    };

    /**
     * Inline-Level Grammar
     */

    var inline = {
        escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
        autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
        url: noop,
        tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
        link: /^!?\[(inside)\]\(href\)/,
        reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
        nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
        strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
        em: /^\b_((?:[^_]|__)+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
        code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
        br: /^ {2,}\n(?!\s*$)/,
        del: noop,
        text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
    };

    inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
    inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

    inline.link = replace(inline.link)
        ('inside', inline._inside)
        ('href', inline._href)
        ();

    inline.reflink = replace(inline.reflink)
        ('inside', inline._inside)
        ();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge({}, inline.normal, {
        strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
        em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge({}, inline.normal, {
        escape: replace(inline.escape)('])', '~|])')(),
        url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
        del: /^~~(?=\S)([\s\S]*?\S)~~/,
        text: replace(inline.text)
            (']|', '~]|')
            ('|', '|https?://|')
            ()
    });

    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge({}, inline.gfm, {
        br: replace(inline.br)('{2,}', '*')(),
        text: replace(inline.gfm.text)('{2,}', '*')()
    });

    /**
     * Inline Lexer & Compiler
     */

    function InlineLexer(links, options) {
        this.options = options || marked.defaults;
        this.links = links;
        this.rules = inline.normal;
        this.renderer = this.options.renderer || new Renderer;
        this.renderer.options = this.options;

        if (!this.links) {
            throw new
                Error('Tokens array requires a `links` property.');
        }

        if (this.options.gfm) {
            if (this.options.breaks) {
                this.rules = inline.breaks;
            } else {
                this.rules = inline.gfm;
            }
        } else if (this.options.pedantic) {
            this.rules = inline.pedantic;
        }
    }

    /**
     * Expose Inline Rules
     */

    InlineLexer.rules = inline;

    /**
     * Static Lexing/Compiling Method
     */

    InlineLexer.output = function (src, links, options) {
        var inline = new InlineLexer(links, options);
        return inline.output(src);
    };

    /**
     * Lexing/Compiling
     */

    InlineLexer.prototype.output = function (src) {
        var out = ''
            , link
            , text
            , href
            , cap;

        while (src) {
            // escape
            if (cap = this.rules.escape.exec(src)) {
                src = src.substring(cap[0].length);
                out += cap[1];
                continue;
            }

            // autolink
            if (cap = this.rules.autolink.exec(src)) {
                src = src.substring(cap[0].length);
                if (cap[2] === '@') {
                    text = cap[1].charAt(6) === ':'
                        ? this.mangle(cap[1].substring(7))
                        : this.mangle(cap[1]);
                    href = this.mangle('mailto:') + text;
                } else {
                    text = escape(cap[1]);
                    href = text;
                }
                out += this.renderer.link(href, null, text);
                continue;
            }

            // url (gfm)
            if (!this.inLink && (cap = this.rules.url.exec(src))) {
                src = src.substring(cap[0].length);
                text = escape(cap[1]);
                href = text;
                out += this.renderer.link(href, null, text);
                continue;
            }

            // tag
            if (cap = this.rules.tag.exec(src)) {
                if (!this.inLink && /^<a /i.test(cap[0])) {
                    this.inLink = true;
                } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
                    this.inLink = false;
                }
                src = src.substring(cap[0].length);
                out += this.options.sanitize
                    ? this.options.sanitizer
                        ? this.options.sanitizer(cap[0])
                        : escape(cap[0])
                    : cap[0]
                continue;
            }

            // link
            if (cap = this.rules.link.exec(src)) {
                src = src.substring(cap[0].length);
                this.inLink = true;
                out += this.outputLink(cap, {
                    href: cap[2],
                    title: cap[3]
                });
                this.inLink = false;
                continue;
            }

            // reflink, nolink
            if ((cap = this.rules.reflink.exec(src))
                || (cap = this.rules.nolink.exec(src))) {
                src = src.substring(cap[0].length);
                link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
                link = this.links[link.toLowerCase()];
                if (!link || !link.href) {
                    out += cap[0].charAt(0);
                    src = cap[0].substring(1) + src;
                    continue;
                }
                this.inLink = true;
                out += this.outputLink(cap, link);
                this.inLink = false;
                continue;
            }

            // strong
            if (cap = this.rules.strong.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.strong(this.output(cap[2] || cap[1]));
                continue;
            }

            // em
            if (cap = this.rules.em.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.em(this.output(cap[2] || cap[1]));
                continue;
            }

            // code
            if (cap = this.rules.code.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.codespan(escape(cap[2], true));
                continue;
            }

            // br
            if (cap = this.rules.br.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.br();
                continue;
            }

            // del (gfm)
            if (cap = this.rules.del.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.del(this.output(cap[1]));
                continue;
            }

            // text
            if (cap = this.rules.text.exec(src)) {
                src = src.substring(cap[0].length);
                out += this.renderer.text(escape(this.smartypants(cap[0])));
                continue;
            }

            if (src) {
                throw new
                    Error('Infinite loop on byte: ' + src.charCodeAt(0));
            }
        }

        return out;
    };

    /**
     * Compile Link
     */

    InlineLexer.prototype.outputLink = function (cap, link) {
        var href = escape(link.href)
            , title = link.title ? escape(link.title) : null;

        return cap[0].charAt(0) !== '!'
            ? this.renderer.link(href, title, this.output(cap[1]))
            : this.renderer.image(href, title, escape(cap[1]));
    };

    /**
     * Smartypants Transformations
     */

    InlineLexer.prototype.smartypants = function (text) {
        if (!this.options.smartypants) return text;
        return text
            // em-dashes
            .replace(/---/g, '\u2014')
            // en-dashes
            .replace(/--/g, '\u2013')
            // opening singles
            .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
            // closing singles & apostrophes
            .replace(/'/g, '\u2019')
            // opening doubles
            .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
            // closing doubles
            .replace(/"/g, '\u201d')
            // ellipses
            .replace(/\.{3}/g, '\u2026');
    };

    /**
     * Mangle Links
     */

    InlineLexer.prototype.mangle = function (text) {
        if (!this.options.mangle) return text;
        var out = ''
            , l = text.length
            , i = 0
            , ch;

        for (; i < l; i++) {
            ch = text.charCodeAt(i);
            if (Math.random() > 0.5) {
                ch = 'x' + ch.toString(16);
            }
            out += '&#' + ch + ';';
        }

        return out;
    };

    /**
     * Renderer
     */

    function Renderer(options) {
        this.options = options || {};
    }

    Renderer.prototype.code = function (code, lang, escaped) {
        if (this.options.highlight) {
            var out = this.options.highlight(code, lang);
            if (out != null && out !== code) {
                escaped = true;
                code = out;
            }
        }

        if (!lang) {
            return '<pre><code>'
                + (escaped ? code : escape(code, true))
                + '\n</code></pre>';
        }

        return '<pre><code class="'
            + this.options.langPrefix
            + escape(lang, true)
            + '">'
            + (escaped ? code : escape(code, true))
            + '\n</code></pre>\n';
    };

    Renderer.prototype.blockquote = function (quote) {
        return '<blockquote>\n' + quote + '</blockquote>\n';
    };

    Renderer.prototype.html = function (html) {
        return html;
    };

    Renderer.prototype.heading = function (text, level, raw) {
        return '<h'
            + level
            + ' id="'
            + this.options.headerPrefix
            + raw.toLowerCase().replace(/[^\w]+/g, '-')
            + '">'
            + text
            + '</h'
            + level
            + '>\n';
    };

    Renderer.prototype.hr = function () {
        return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
    };

    Renderer.prototype.list = function (body, ordered) {
        var type = ordered ? 'ol' : 'ul';
        return '<' + type + '>\n' + body + '</' + type + '>\n';
    };

    Renderer.prototype.listitem = function (text) {
        return '<li>' + text + '</li>\n';
    };

    Renderer.prototype.paragraph = function (text) {
        return '<p>' + text + '</p>\n';
    };

    Renderer.prototype.table = function (header, body) {
        return '<table>\n'
            + '<thead>\n'
            + header
            + '</thead>\n'
            + '<tbody>\n'
            + body
            + '</tbody>\n'
            + '</table>\n';
    };

    Renderer.prototype.tablerow = function (content) {
        return '<tr>\n' + content + '</tr>\n';
    };

    Renderer.prototype.tablecell = function (content, flags) {
        var type = flags.header ? 'th' : 'td';
        var tag = flags.align
            ? '<' + type + ' style="text-align:' + flags.align + '">'
            : '<' + type + '>';
        return tag + content + '</' + type + '>\n';
    };

    // span level renderer
    Renderer.prototype.strong = function (text) {
        return '<strong>' + text + '</strong>';
    };

    Renderer.prototype.em = function (text) {
        return '<em>' + text + '</em>';
    };

    Renderer.prototype.codespan = function (text) {
        return '<code>' + text + '</code>';
    };

    Renderer.prototype.br = function () {
        return this.options.xhtml ? '<br/>' : '<br>';
    };

    Renderer.prototype.del = function (text) {
        return '<del>' + text + '</del>';
    };

    Renderer.prototype.link = function (href, title, text) {
        if (this.options.sanitize) {
            try {
                var prot = decodeURIComponent(unescape(href))
                    .replace(/[^\w:]/g, '')
                    .toLowerCase();
            } catch (e) {
                return '';
            }
            if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
                return '';
            }
        }
        var out = '<a href="' + href + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
    };

    Renderer.prototype.image = function (href, title, text) {
        var out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
            out += ' title="' + title + '"';
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
    };

    Renderer.prototype.text = function (text) {
        return text;
    };

    /**
     * Parsing & Compiling
     */

    function Parser(options) {
        this.tokens = [];
        this.token = null;
        this.options = options || marked.defaults;
        this.options.renderer = this.options.renderer || new Renderer;
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
    }

    /**
     * Static Parse Method
     */

    Parser.parse = function (src, options, renderer) {
        var parser = new Parser(options, renderer);
        return parser.parse(src);
    };

    /**
     * Parse Loop
     */

    Parser.prototype.parse = function (src) {
        this.inline = new InlineLexer(src.links, this.options, this.renderer);
        this.tokens = src.reverse();

        var out = '';
        while (this.next()) {
            out += this.tok();
        }

        return out;
    };

    /**
     * Next Token
     */

    Parser.prototype.next = function () {
        return this.token = this.tokens.pop();
    };

    /**
     * Preview Next Token
     */

    Parser.prototype.peek = function () {
        return this.tokens[this.tokens.length - 1] || 0;
    };

    /**
     * Parse Text Tokens
     */

    Parser.prototype.parseText = function () {
        var body = this.token.text;

        while (this.peek().type === 'text') {
            body += '\n' + this.next().text;
        }

        return this.inline.output(body);
    };

    /**
     * Parse Current Token
     */

    Parser.prototype.tok = function () {
        switch (this.token.type) {
            case 'space': {
                return '';
            }
            case 'hr': {
                return this.renderer.hr();
            }
            case 'heading': {
                return this.renderer.heading(
                    this.inline.output(this.token.text),
                    this.token.depth,
                    this.token.text);
            }
            case 'code': {
                return this.renderer.code(this.token.text,
                    this.token.lang,
                    this.token.escaped);
            }
            case 'table': {
                var header = ''
                    , body = ''
                    , i
                    , row
                    , cell
                    , flags
                    , j;

                // header
                cell = '';
                for (i = 0; i < this.token.header.length; i++) {
                    flags = { header: true, align: this.token.align[i] };
                    cell += this.renderer.tablecell(
                        this.inline.output(this.token.header[i]),
                        { header: true, align: this.token.align[i] }
                    );
                }
                header += this.renderer.tablerow(cell);

                for (i = 0; i < this.token.cells.length; i++) {
                    row = this.token.cells[i];

                    cell = '';
                    for (j = 0; j < row.length; j++) {
                        cell += this.renderer.tablecell(
                            this.inline.output(row[j]),
                            { header: false, align: this.token.align[j] }
                        );
                    }

                    body += this.renderer.tablerow(cell);
                }
                return this.renderer.table(header, body);
            }
            case 'blockquote_start': {
                var body = '';

                while (this.next().type !== 'blockquote_end') {
                    body += this.tok();
                }

                return this.renderer.blockquote(body);
            }
            case 'list_start': {
                var body = ''
                    , ordered = this.token.ordered;

                while (this.next().type !== 'list_end') {
                    body += this.tok();
                }

                return this.renderer.list(body, ordered);
            }
            case 'list_item_start': {
                var body = '';

                while (this.next().type !== 'list_item_end') {
                    body += this.token.type === 'text'
                        ? this.parseText()
                        : this.tok();
                }

                return this.renderer.listitem(body);
            }
            case 'loose_item_start': {
                var body = '';

                while (this.next().type !== 'list_item_end') {
                    body += this.tok();
                }

                return this.renderer.listitem(body);
            }
            case 'html': {
                var html = !this.token.pre && !this.options.pedantic
                    ? this.inline.output(this.token.text)
                    : this.token.text;
                return this.renderer.html(html);
            }
            case 'paragraph': {
                return this.renderer.paragraph(this.inline.output(this.token.text));
            }
            case 'text': {
                return this.renderer.paragraph(this.parseText());
            }
        }
    };

    /**
     * Helpers
     */

    function escape(html, encode) {
        return html
            .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function unescape(html) {
        // explicitly match decimal, hex, and named HTML entities 
        return html.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/g, function (_, n) {
            n = n.toLowerCase();
            if (n === 'colon') return ':';
            if (n.charAt(0) === '#') {
                return n.charAt(1) === 'x'
                    ? String.fromCharCode(parseInt(n.substring(2), 16))
                    : String.fromCharCode(+n.substring(1));
            }
            return '';
        });
    }

    function replace(regex, opt) {
        regex = regex.source;
        opt = opt || '';
        return function self(name, val) {
            if (!name) return new RegExp(regex, opt);
            val = val.source || val;
            val = val.replace(/(^|[^\[])\^/g, '$1');
            regex = regex.replace(name, val);
            return self;
        };
    }

    function noop() { }
    noop.exec = noop;

    function merge(obj) {
        var i = 1
            , target
            , key;

        for (; i < arguments.length; i++) {
            target = arguments[i];
            for (key in target) {
                if (Object.prototype.hasOwnProperty.call(target, key)) {
                    obj[key] = target[key];
                }
            }
        }

        return obj;
    }


    /**
     * Marked
     */

    function marked(src, opt, callback) {
        if (callback || typeof opt === 'function') {
            if (!callback) {
                callback = opt;
                opt = null;
            }

            opt = merge({}, marked.defaults, opt || {});

            var highlight = opt.highlight
                , tokens
                , pending
                , i = 0;

            try {
                tokens = Lexer.lex(src, opt)
            } catch (e) {
                return callback(e);
            }

            pending = tokens.length;

            var done = function (err) {
                if (err) {
                    opt.highlight = highlight;
                    return callback(err);
                }

                var out;

                try {
                    out = Parser.parse(tokens, opt);
                } catch (e) {
                    err = e;
                }

                opt.highlight = highlight;

                return err
                    ? callback(err)
                    : callback(null, out);
            };

            if (!highlight || highlight.length < 3) {
                return done();
            }

            delete opt.highlight;

            if (!pending) return done();

            for (; i < tokens.length; i++) {
                (function (token) {
                    if (token.type !== 'code') {
                        return --pending || done();
                    }
                    return highlight(token.text, token.lang, function (err, code) {
                        if (err) return done(err);
                        if (code == null || code === token.text) {
                            return --pending || done();
                        }
                        token.text = code;
                        token.escaped = true;
                        --pending || done();
                    });
                })(tokens[i]);
            }

            return;
        }
        try {
            if (opt) opt = merge({}, marked.defaults, opt);
            return Parser.parse(Lexer.lex(src, opt), opt);
        } catch (e) {
            e.message += '\nPlease report this to https://github.com/chjj/marked.';
            if ((opt || marked.defaults).silent) {
                return '<p>An error occured:</p><pre>'
                    + escape(e.message + '', true)
                    + '</pre>';
            }
            throw e;
        }
    }

    /**
     * Options
     */

    marked.options =
        marked.setOptions = function (opt) {
            merge(marked.defaults, opt);
            return marked;
        };

    marked.defaults = {
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        sanitizer: null,
        mangle: true,
        smartLists: false,
        silent: false,
        highlight: null,
        langPrefix: 'lang-',
        smartypants: false,
        headerPrefix: '',
        renderer: new Renderer,
        xhtml: false
    };

    /**
     * Expose
     */

    marked.Parser = Parser;
    marked.parser = Parser.parse;

    marked.Renderer = Renderer;

    marked.Lexer = Lexer;
    marked.lexer = Lexer.lex;

    marked.InlineLexer = InlineLexer;
    marked.inlineLexer = InlineLexer.output;

    marked.parse = marked;

    if (typeof module !== 'undefined' && typeof exports === 'object') {
        module.exports = marked;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return marked; });
    } else {
        this.marked = marked;
    }

}).call(function () {
    return this || (typeof window !== 'undefined' ? window : global);
}());