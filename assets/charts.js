/* 小型 SVG 圖表：橫條、分組直條、折線（斜率）、散佈、堆疊。
   顏色全部取自 CSS 變數，深淺色主題都能讀。 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function svgRoot(w, h, label) {
    return el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': label || '' });
  }
  function fmt(v, d, unit) {
    const s = (d === undefined ? v : Number(v).toFixed(d));
    return unit ? s + unit : String(s);
  }
  function mount(sel, svg) {
    const host = document.querySelector(sel);
    if (host) host.appendChild(svg);
  }
  function tip(node, text) { node.appendChild(el('title', {}, text)); }

  // 橫條：一個指標、多個項目
  function hbar(sel, o) {
    const rows = o.rows, lw = o.labelWidth || 190, W = 760, rh = o.rowHeight || 28;
    const top = o.ref !== undefined && o.refLabel ? 26 : 8, H = top + rows.length * rh + 26;
    const max = o.max || Math.max(...rows.map(r => r.value));
    const x0 = lw + 10, x1 = W - 70, sx = v => x0 + (v / max) * (x1 - x0);
    const s = svgRoot(W, H, o.title);
    const ticks = o.ticks || [0, max / 2, max];
    ticks.forEach(t => {
      s.appendChild(el('line', { x1: sx(t), x2: sx(t), y1: top, y2: H - 22, class: 'ch-grid' }));
      s.appendChild(el('text', { x: sx(t), y: H - 6, 'text-anchor': 'middle', class: 'ch-muted' }, fmt(t, o.tickDecimals, o.unit)));
    });
    if (o.ref !== undefined) {
      s.appendChild(el('line', { x1: sx(o.ref), x2: sx(o.ref), y1: top, y2: H - 22, stroke: 'var(--ink)', 'stroke-dasharray': '4 3', 'stroke-width': 1 }));
      s.appendChild(el('text', { x: sx(o.ref) + 4, y: top - 8, class: 'ch-muted' }, o.refLabel || ''));
    }
    rows.forEach((r, i) => {
      const y = top + i * rh;
      s.appendChild(el('text', { x: lw, y: y + rh / 2 + 4, 'text-anchor': 'end', class: r.hl ? 'ch-text' : 'ch-muted', 'font-weight': r.hl ? 700 : 400 }, r.label));
      const bar = el('rect', { x: x0, y: y + 5, width: Math.max(1, sx(r.value) - x0), height: rh - 10, rx: 2, fill: r.color || (r.hl ? 'var(--accent)' : 'var(--grey)') });
      tip(bar, `${r.label}：${fmt(r.value, o.decimals, o.unit)}`);
      s.appendChild(bar);
      s.appendChild(el('text', { x: sx(r.value) + 6, y: y + rh / 2 + 4, class: 'ch-val' }, r.text || fmt(r.value, o.decimals, o.unit)));
    });
    mount(sel, s);
  }

  // 分組直條：類別 × 系列
  function grouped(sel, o) {
    const W = 760, H = o.height || 320, left = 46, right = 12, y0 = 40, bottom = 46;
    const g = o.groups, se = o.series, max = o.max || Math.max(...se.flatMap(x => x.values));
    const min = o.min || 0;
    const plotW = W - left - right, gw = plotW / g.length, bw = Math.min(36, (gw - 14) / se.length);
    const sy = v => H - bottom - ((v - min) / (max - min)) * (H - bottom - y0);
    const s = svgRoot(W, H, o.title);
    (o.ticks || [min, (min + max) / 2, max]).forEach(t => {
      s.appendChild(el('line', { x1: left, x2: W - right, y1: sy(t), y2: sy(t), class: 'ch-grid' }));
      s.appendChild(el('text', { x: left - 6, y: sy(t) + 4, 'text-anchor': 'end', class: 'ch-muted' }, fmt(t, o.tickDecimals, o.unit)));
    });
    if (o.ref !== undefined) {
      s.appendChild(el('line', { x1: left, x2: W - right, y1: sy(o.ref), y2: sy(o.ref), stroke: 'var(--ink)', 'stroke-dasharray': '4 3' }));
      s.appendChild(el('text', { x: W - right, y: sy(o.ref) - 5, 'text-anchor': 'end', class: 'ch-muted' }, o.refLabel || ''));
    }
    // legend
    let lx = left;
    se.forEach(x => {
      s.appendChild(el('rect', { x: lx, y: 10, width: 11, height: 11, rx: 2, fill: x.color }));
      const t = el('text', { x: lx + 16, y: 20, class: 'ch-text' }, x.name);
      s.appendChild(t);
      lx += 26 + x.name.length * 12.5;
    });
    g.forEach((name, gi) => {
      const gx = left + gi * gw + (gw - bw * se.length) / 2;
      se.forEach((x, si) => {
        const v = x.values[gi];
        if (v === null || v === undefined) return;
        const bx = gx + si * bw, by = sy(Math.max(v, min));
        const r = el('rect', { x: bx + 1, y: by, width: bw - 2, height: Math.max(1, H - bottom - by), fill: x.color, rx: 1.5 });
        tip(r, `${name} · ${x.name}：${fmt(v, o.decimals, o.unit)}`);
        s.appendChild(r);
        if (o.showValues) s.appendChild(el('text', { x: bx + bw / 2, y: by - 4, 'text-anchor': 'middle', class: 'ch-val', 'font-size': 10 }, fmt(v, o.decimals)));
      });
      const lines = String(name).split('\n');
      lines.forEach((ln, li) => s.appendChild(el('text', { x: left + gi * gw + gw / 2, y: H - bottom + 18 + li * 14, 'text-anchor': 'middle', class: 'ch-text' }, ln)));
    });
    mount(sel, s);
  }

  // 折線／斜率圖：x 為少數幾個條件，每條線一個系列
  function slope(sel, o) {
    const W = 760, H = o.height || 340, left = 54, right = o.right || 200, y0 = 24, bottom = 40;
    const xs = o.x, min = o.min, max = o.max;
    const sx = i => left + (xs.length === 1 ? 0 : i * (W - left - right) / (xs.length - 1));
    const sy = v => H - bottom - ((v - min) / (max - min)) * (H - bottom - y0);
    const s = svgRoot(W, H, o.title);
    (o.ticks || [min, (min + max) / 2, max]).forEach(t => {
      s.appendChild(el('line', { x1: left, x2: W - right + 10, y1: sy(t), y2: sy(t), class: 'ch-grid' }));
      s.appendChild(el('text', { x: left - 8, y: sy(t) + 4, 'text-anchor': 'end', class: 'ch-muted' }, fmt(t, o.tickDecimals, o.unit)));
    });
    if (o.ref !== undefined) {
      s.appendChild(el('line', { x1: left, x2: W - right + 10, y1: sy(o.ref), y2: sy(o.ref), stroke: 'var(--ink)', 'stroke-dasharray': '4 3' }));
      s.appendChild(el('text', { x: left + 4, y: sy(o.ref) - 6, class: 'ch-muted' }, o.refLabel || ''));
    }
    xs.forEach((name, i) => s.appendChild(el('text', { x: sx(i), y: H - 14, 'text-anchor': 'middle', class: 'ch-text' }, name)));
    const ends = [];
    o.series.forEach(x => {
      const col = x.color || (x.hl ? 'var(--accent)' : 'var(--grey)');
      const pts = x.values.map((v, i) => v === null ? null : [sx(i), sy(v)]).filter(Boolean);
      const path = el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: col, 'stroke-width': x.hl ? 2.6 : 1.6 });
      s.appendChild(path);
      x.values.forEach((v, i) => {
        if (v === null) return;
        const c = el('circle', { cx: sx(i), cy: sy(v), r: x.hl ? 4 : 3, fill: col });
        tip(c, `${x.name} · ${xs[i]}：${fmt(v, o.decimals, o.unit)}`);
        s.appendChild(c);
      });
      const lastI = x.values.length - 1 - [...x.values].reverse().findIndex(v => v !== null);
      ends.push({ y: sy(x.values[lastI]), x: sx(lastI), text: `${x.name} ${fmt(x.values[lastI], o.decimals, o.unit)}`, col, hl: x.hl });
    });
    // 末端標籤錯開
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    const overflow = ends.length ? ends[ends.length - 1].y - (H - bottom) : 0;
    if (overflow > 0) ends.forEach(e => e.y -= overflow);
    ends.forEach(e => s.appendChild(el('text', { x: e.x + 10, y: e.y + 4, class: e.hl ? 'ch-text' : 'ch-muted', 'font-weight': e.hl ? 700 : 400, style: `fill:${e.col}` }, e.text)));
    mount(sel, s);
  }

  // 散佈圖
  function scatter(sel, o) {
    const W = 760, H = o.height || 360, left = 56, right = 24, y0 = 20, bottom = 46;
    const sx = v => left + ((v - o.xmin) / (o.xmax - o.xmin)) * (W - left - right);
    const sy = v => H - bottom - ((v - o.ymin) / (o.ymax - o.ymin)) * (H - bottom - y0);
    const s = svgRoot(W, H, o.title);
    (o.xticks || []).forEach(t => {
      s.appendChild(el('line', { x1: sx(t), x2: sx(t), y1: y0, y2: H - bottom, class: 'ch-grid' }));
      s.appendChild(el('text', { x: sx(t), y: H - bottom + 16, 'text-anchor': 'middle', class: 'ch-muted' }, fmt(t, o.xdec, o.xunit)));
    });
    (o.yticks || []).forEach(t => {
      s.appendChild(el('line', { x1: left, x2: W - right, y1: sy(t), y2: sy(t), class: 'ch-grid' }));
      s.appendChild(el('text', { x: left - 8, y: sy(t) + 4, 'text-anchor': 'end', class: 'ch-muted' }, fmt(t, o.ydec, o.yunit)));
    });
    s.appendChild(el('text', { x: (W + left) / 2, y: H - 8, 'text-anchor': 'middle', class: 'ch-text' }, o.xLabel || ''));
    const yl = el('text', { x: 14, y: (H - bottom + y0) / 2, 'text-anchor': 'middle', class: 'ch-text', transform: `rotate(-90 14 ${(H - bottom + y0) / 2})` }, o.yLabel || '');
    s.appendChild(yl);
    (o.refs || []).forEach(r => {
      if (r.y !== undefined) s.appendChild(el('line', { x1: left, x2: W - right, y1: sy(r.y), y2: sy(r.y), stroke: 'var(--ink)', 'stroke-dasharray': '4 3' }));
      if (r.x !== undefined) s.appendChild(el('line', { x1: sx(r.x), x2: sx(r.x), y1: y0, y2: H - bottom, stroke: 'var(--ink)', 'stroke-dasharray': '4 3' }));
      if (r.label) s.appendChild(el('text', { x: r.x !== undefined ? sx(r.x) + 4 : left + 6, y: r.y !== undefined ? sy(r.y) - 6 : y0 + 10, 'text-anchor': 'start', class: 'ch-muted' }, r.label));
    });
    o.points.forEach(p => {
      const c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: p.r || 5, fill: p.color || 'var(--grey)', 'fill-opacity': 0.9 });
      tip(c, `${p.label}：${o.xLabel} ${p.x}，${o.yLabel} ${p.y}`);
      s.appendChild(c);
      if (p.label) s.appendChild(el('text', { x: sx(p.x) + (p.dx || 8), y: sy(p.y) + (p.dy || 4), 'text-anchor': p.anchor || 'start', class: 'ch-muted' }, p.label));
    });
    mount(sel, s);
  }

  // 橫向堆疊：每列拆成幾段
  function stack(sel, o) {
    const W = 760, lw = o.labelWidth || 150, rh = 34, top = 34;
    const H = top + o.rows.length * rh + 10;
    const s = svgRoot(W, H, o.title);
    let lx = lw + 10;
    o.parts.forEach(p => {
      s.appendChild(el('rect', { x: lx, y: 8, width: 11, height: 11, rx: 2, fill: p.color }));
      s.appendChild(el('text', { x: lx + 16, y: 18, class: 'ch-text' }, p.name));
      lx += 30 + p.name.length * 12.5;
    });
    o.rows.forEach((r, i) => {
      const y = top + i * rh, total = r.values.reduce((a, b) => a + b, 0);
      s.appendChild(el('text', { x: lw, y: y + rh / 2 + 4, 'text-anchor': 'end', class: 'ch-text' }, r.label));
      let x = lw + 10;
      r.values.forEach((v, j) => {
        const w = (v / total) * (W - lw - 30);
        const rect = el('rect', { x, y: y + 6, width: Math.max(0, w - 1), height: rh - 12, fill: o.parts[j].color });
        tip(rect, `${r.label} · ${o.parts[j].name}：${v}`);
        s.appendChild(rect);
        if (w > 30) s.appendChild(el('text', { x: x + w / 2, y: y + rh / 2 + 4, 'text-anchor': 'middle', class: 'ch-val', style: 'fill:var(--surface)' }, String(v)));
        x += w;
      });
    });
    mount(sel, s);
  }

  window.Charts = { hbar, grouped, slope, scatter, stack };
})();
