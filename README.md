# tiny-tpl

<p>
  <img src="https://github.com/AwesomeXR/tiny-tpl/actions/workflows/ci.yml/badge.svg" alt="CI" />
  <img src="https://img.shields.io/npm/dw/tiny-tpl" alt="npm" />
  <img src="https://img.shields.io/npm/v/tiny-tpl" alt="npm" />
</p>

一个 **零依赖** 的 JavaScript 模板引擎，支持浏览器和 Node.js。

## 特性

- **零依赖**：基于 string template 实现，无需引入额外依赖。
- **后置渲染**：可传入数据对象后置渲染。

## 安装

```bash
npm install tiny-tpl --save
```

## 使用

```javascript
import { tpl } from 'tiny-tpl';

const data = {
  title: 'Hello, World!',
  content: 'This is a tiny-tpl example.',
};

const html = tpl`
<div>
  <h1>${tpl.print(ctx => ctx.title)}</h1>
  <p>${tpl.print(ctx => ctx.content)}</p>
</div>
`;

document.body.innerHTML = html.render(data);
```

## API

### tpl\`...\`

构造一个模板字符串。

### tpl.print(ctx => ctx.xxx)

后置渲染一个变量。
