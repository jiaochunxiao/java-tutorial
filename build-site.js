#!/usr/bin/env node
/**
 * 站点构建脚本：把 java-blog-series 的 36 篇 Markdown + README 构建成纯静态站点
 *
 * 用法：NODE_PATH=<marked 所在 node_modules> node build-site.js
 * 产物：site/ 目录（HTML + assets），任意静态服务器可托管。
 * 模板：site-template.html（占位符 {{TITLE}} {{SIDEBAR}} {{CRUMB_EXTRA}} {{BODY}} {{PREVNEXT}}）
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'site-template.html'), 'utf-8');

const SECTIONS = [
  { dir: '01-java-basics', label: '📖 第一阶段 · Java 基础篇', color: '#2563EB',
    posts: ['01-hello-java', '02-data-types', '03-control-flow-arrays', '04-oop-part1', '05-oop-part2',
            '06-string-deep-dive', '07-collections-part1', '08-collections-part2', '09-exceptions', '10-generics-reflection'] },
  { dir: '02-java-advanced', label: '⚡ 第二阶段 · Java 进阶篇', color: '#059669',
    posts: ['01-thread-basics', '02-jmm-volatile', '03-aqs-threadpool', '04-juc-toolbox', '05-jvm-memory',
            '06-garbage-collection', '07-class-loading', '08-jvm-tuning', '09-network-programming', '10-design-patterns'] },
  { dir: '03-spring-boot', label: '🌸 第三阶段 · Spring Boot 原理篇', color: '#D97706',
    posts: ['01-spring-ioc', '02-bean-lifecycle', '03-spring-aop', '04-auto-configuration', '05-boot-startup', '06-transaction'] },
  { dir: '04-practice', label: '🛠️ 第四阶段 · 应用实践篇', color: '#DB2777',
    posts: ['01-restful-api', '02-database', '03-redis-cache', '04-async-mq', '05-testing', '06-logging-monitoring'] },
  { dir: '05-architecture', label: '🏔️ 第五阶段 · 高手进阶篇', color: '#7C3AED',
    posts: ['01-microservices', '02-distributed', '03-performance', '04-growth-guide'] },
];

function readTitle(rel) {
  const md = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/^\d+-/, '') : rel;
}

const pages = [{ href: '/index.html', file: 'README.md', title: '系列总览 · 学习路线' }];
for (const sec of SECTIONS) {
  for (const p of sec.posts) {
    const rel = sec.dir + '/' + p + '.md';
    pages.push({ href: '/' + sec.dir + '/' + p + '.html', file: rel, title: readTitle(rel) });
  }
}

function postprocess(html) {
  html = html.replace(/(\.\.\/)?assets\/images\//g, '/assets/images/');
  html = html.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, function (_, c) {
    var text = c.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
                .replace(/&amp;/g, '&');
    return '<div class="mermaid">' + text + '</div>';
  });
  var out = '', last = 0;
  for (var m of html.matchAll(/<blockquote>/g)) {
    var seg = html.slice(m.index, m.index + 400);
    var cls = '';
    if (seg.includes('📌')) cls = 'tip-key';
    else if (seg.includes('⚠')) cls = 'tip-warn';
    else if (seg.includes('💡')) cls = 'tip-expert';
    else if (seg.includes('🖼')) cls = 'tip-fig';
    out += html.slice(last, m.index) + (cls ? '<blockquote class="' + cls + '">' : '<blockquote>');
    last = m.index + '<blockquote>'.length;
  }
  return out + html.slice(last);
}

function sidebar(currentHref) {
  var lines = [];
  var homeCls = currentHref === '/index.html' ? ' active' : '';
  lines.push('<a class="nav-home' + homeCls + '" href="/index.html">🏠 系列总览 · 学习路线</a>');
  var no = 0;
  for (var sec of SECTIONS) {
    lines.push('<div class="sec" style="--c:' + sec.color + '">' + sec.label + '</div>');
    for (var p of sec.posts) {
      no += 1;
      var href = '/' + sec.dir + '/' + p + '.html';
      var active = href === currentHref ? ' active' : '';
      var title = readTitle(sec.dir + '/' + p + '.md');
      lines.push('<a class="item' + active + '" href="' + href + '"><span class="no">' +
                 String(no).padStart(2, '0') + '</span>' + title + '</a>');
    }
  }
  return lines.join('\n');
}

function pn(p, dir) {
  if (!p) return '<span class="pn ghost"></span>';
  return '<a class="pn" href="' + p.href + '"><span>' + dir + '</span><b>' + p.title + '</b></a>';
}

function prevNext(currentHref) {
  var i = pages.findIndex(function (p) { return p.href === currentHref; });
  var prev = i > 0 ? pages[i - 1] : null;
  var next = i < pages.length - 1 ? pages[i + 1] : null;
  return '<div class="pnbar">' + pn(prev, '← 上一篇') + pn(next, '下一篇 →') + '</div>';
}

function fill(tpl, key, value) {
  return tpl.split('{{' + key + '}}').join(value);
}

// ---- 构建 ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });

var n = 0;
for (var page of pages) {
  var raw = fs.readFileSync(path.join(ROOT, page.file), 'utf-8');
  var body = postprocess(marked.parse(raw));
  var crumb = page.href === '/index.html' ? '' : ' / ' + page.title;
  var html = TEMPLATE;
  html = fill(html, 'TITLE', page.title + ' · Java 从零到专家');
  html = fill(html, 'SIDEBAR', sidebar(page.href));
  html = fill(html, 'CRUMB_EXTRA', crumb);
  html = fill(html, 'BODY', body);
  html = fill(html, 'PREVNEXT', prevNext(page.href));
  var outPath = path.join(OUT, page.href.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  n += 1;
}
console.log('✅ 构建完成：' + n + ' 个页面 → site/');
