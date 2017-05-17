# digo-md
[digo](https://github.com/digojs/digo) 插件：编译 Markdown 文件到 HTML。

## 安装
```bash
npm install digo-md -g
```

## 用法
### 编译 markdown 文件到 HTML
```js
digo.src("*.md").pipe("digo-md");
```

### 源映射(Source Map)
本插件不支持生成源映射。

## 配置
```js
digo.src("*.md").pipe("digo-md"), {
    
});
```

> [1]: 插件内部已重设了此配置的默认值。
