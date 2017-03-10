import * as digo from "digo";
import * as md from "./markdown";

export * from "./markdown";

export var load = true;

export function add(file: digo.File, options: md.Options) {
    file.ext = ".html";
    file.content = md.render(file.content, options);
}
