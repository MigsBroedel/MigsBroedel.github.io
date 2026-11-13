(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const bind = (name, text) => $$(`[data-b="${name}"]`).forEach((el) => { el.textContent = text; });
  const hex = (n, w) => n.toString(16).toUpperCase().padStart(w, '0');
  const SIGNAL = '#FF3B0F', ALABASTER = 'rgba(229,228,226,.94)';
  // Language helpers from i18n.js; plain English if it failed to load.
  const I = window.I18N || { t: (x) => x, num: (x) => String(x), money: (v) => v.toFixed(2), on: () => {} };
  const T = I.t, N = I.num;

  /* ==========================================================================
     Hero: a working Rubik's cube drawn in halftone dots.
     The field and the pointer wake (heat -> glyph ramp, rings, lean) follow the
     bencho.dev "ASCII wake" block (Binary ramp); the cube model, renderer and
     controls are written for this site.
     ========================================================================== */
  const wcv = $('.wake');
  if (wcv) {
    const wrap = wcv.parentElement;
    const RAMP = [' ', '.', ':', '0', '1'], TOP = RAMP.length - 1;
    const COLD = 0.04, RING_S = 2.2, TRAIL = 1.2, REACH = 40, PULL = 30;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const hash = (k, n) => {
      let h = (k * 374761393 + n * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };

    /* ---- cube model: 26 cubies, each with stickers {n: normal, f: face colour} ---- */
    // halftone density per face colour; L is the orange face, drawn in the signal colour
    const FACE = { U: [1, 0], D: [0.6, 0], F: [0.8, 0], B: [0.32, 0], R: [0.46, 0], L: [0.85, 1] };
    const faceOf = (n) => (n[1] === 1 ? 'U' : n[1] === -1 ? 'D' : n[2] === 1 ? 'F' : n[2] === -1 ? 'B' : n[0] === 1 ? 'R' : 'L');
    let cubies = [];
    const solvedCube = () => {
      cubies = [];
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const p = [x, y, z], st = [];
        [0, 1, 2].forEach((ax) => { if (p[ax]) { const n = [0, 0, 0]; n[ax] = p[ax]; st.push({ n, f: faceOf(n) }); } });
        cubies.push({ p, st });
      }
    };
    // quarter turn of integer vector v about axis ax (0 x, 1 y, 2 z), dir +1/-1, right-handed
    const rotI = (v, ax, d) => {
      const [x, y, z] = v;
      if (ax === 0) return [x, -d * z, d * y];
      if (ax === 1) return [d * z, y, -d * x];
      return [-d * y, d * x, z];
    };
    const rotF = (v, ax, ang) => {
      const c = Math.cos(ang), s = Math.sin(ang), [x, y, z] = v;
      if (ax === 0) return [x, y * c - z * s, y * s + z * c];
      if (ax === 1) return [x * c + z * s, y, -x * s + z * c];
      return [x * c - y * s, x * s + y * c, z];
    };
    const applyMove = (m) => {
      for (const q of cubies) {
        if (q.p[m.ax] !== m.layer) continue;
        q.p = rotI(q.p, m.ax, m.dir);
        for (const t of q.st) t.n = rotI(t.n, m.ax, m.dir);
      }
    };
    const isSolved = () => {
      const seen = {};
      for (const q of cubies) for (const t of q.st) {
        const key = t.n.join(',');
        if (seen[key] && seen[key] !== t.f) return false;
        seen[key] = t.f;
      }
      return true;
    };
    solvedCube();

    /* ---- view ---- */
    const view = { yaw: -45, pitch: 35.26 };
    const D2R = Math.PI / 180;
    let vcY = 1, vsY = 0, vcP = 1, vsP = 0;
    const setView = () => { vcY = Math.cos(view.yaw * D2R); vsY = Math.sin(view.yaw * D2R); vcP = Math.cos(view.pitch * D2R); vsP = Math.sin(view.pitch * D2R); };
    // world -> camera: yaw about y, then pitch about x. Camera z > 0 faces the viewer.
    const cam = (v) => {
      const x1 = v[0] * vcY + v[2] * vsY, z1 = -v[0] * vsY + v[2] * vcY;
      return [x1, v[1] * vcP - z1 * vsP, v[1] * vsP + z1 * vcP];
    };

    /* ---- field (the ASCII wake) ---- */
    const st = { W: 0, H: 0, S: 0, cols: 0, rows: 0, cw: 0, ch: 0, ox: 0, oy: 0, font: '', ratio: 1,
      heat: new Float32Array(0), mask: new Float32Array(0), org: new Uint8Array(0),
      hx: -999, hy: -999, lx: NaN, ly: NaN, near: 0, inside: false, rings: [], deal: 0, tick: 0, raf: 0, dirty: true };
    const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
    const ids = document.createElement('canvas'), ictx = ids.getContext('2d', { willReadFrequently: true });
    const OFF = 0.5;   // offscreen raster at half the CSS resolution

    let anim = null; const queue = []; const history = [];
    let moves = 0;

    function rasterCube() {
      setView();
      const faces = [];
      for (const q of cubies) {
        const moving = anim && q.p[anim.ax] === anim.layer;
        const ang = moving ? anim.dir * (Math.PI / 2) * anim.e : 0;
        const tf = (v) => cam(moving ? rotF(v, anim.ax, ang) : v);
        // all six body faces (dark) + the stickers on top
        for (let ax = 0; ax < 3; ax++) for (const sg of [-1, 1]) {
          const n = [0, 0, 0]; n[ax] = sg;
          const nn = tf(n); if (nn[2] <= 0.001) continue;
          const sticker = q.st.find((t) => t.n[0] === n[0] && t.n[1] === n[1] && t.n[2] === n[2]);
          const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3;
          const quad = (half) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, w]) => {
            const v = [q.p[0] + n[0] * 0.5, q.p[1] + n[1] * 0.5, q.p[2] + n[2] * 0.5];
            v[a1] += u * half; v[a2] += w * half;
            return tf(v);
          });
          const body = quad(0.5), depth = body.reduce((s2, v) => s2 + v[2], 0) / 4;
          faces.push({ pts: body, depth, col: null });
          if (sticker) faces.push({ pts: quad(0.42), depth: depth + 1e-4, col: FACE[sticker.f], id: cubies.indexOf(q) * 8 + (ax * 2 + (sg > 0 ? 1 : 0)) + 1, n, q });
        }
      }
      faces.sort((f1, f2) => f1.depth - f2.depth);
      const w = off.width, h = off.height, S = st.S * OFF, cx = w / 2, cy = h / 2;
      octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillStyle = '#000'; octx.fillRect(0, 0, w, h);
      ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.fillStyle = '#000'; ictx.fillRect(0, 0, w, h);
      st.pick = new Map();
      for (const f of faces) {
        const path = (ctx) => { ctx.beginPath(); f.pts.forEach((v, i) => { const X = cx + v[0] * S, Y = cy - v[1] * S; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill(); };
        octx.fillStyle = f.col ? `rgb(${Math.round(f.col[0] * 255)},${f.col[1] ? 255 : 0},0)` : '#000';
        path(octx);
        ictx.fillStyle = f.col ? `rgb(${f.id & 255},${f.id >> 8},1)` : '#000';
        path(ictx);
        if (f.col) st.pick.set(f.id, f);
      }
      const data = octx.getImageData(0, 0, w, h).data;
      for (let j = 0; j < st.rows; j++) for (let i = 0; i < st.cols; i++) {
        const X = Math.min(w - 1, Math.floor((st.ox + (i + 0.5 + (j & 1) * 0.5) * st.cw) * OFF));
        const Y = Math.min(h - 1, Math.floor((st.oy + (j + 0.5) * st.ch) * OFF));
        const p = (Y * w + X) * 4, k = j * st.cols + i;
        st.mask[k] = data[p] / 255; st.org[k] = data[p + 1] > 128 ? 1 : 0;
      }
      st.dirty = false;
    }

    const build = () => {
      const r = wcv.getBoundingClientRect();
      if (!r.width) return;
      st.W = r.width; st.H = r.height;
      st.S = Math.min(st.W, st.H) * 0.44 / 2.6;
      const size = clamp(st.S / 7.4, 7, 12);
      st.ratio = Math.min(2, window.devicePixelRatio || 1);
      wcv.width = Math.round(st.W * st.ratio); wcv.height = Math.round(st.H * st.ratio);
      off.width = ids.width = Math.ceil(st.W * OFF); off.height = ids.height = Math.ceil(st.H * OFF);
      st.ch = size * 0.82; st.cw = size * 0.62;
      st.cols = Math.floor(st.W / st.cw - 0.5); st.rows = Math.floor(st.H / st.ch);
      st.font = `500 ${size}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
      st.heat = new Float32Array(st.cols * st.rows); st.mask = new Float32Array(st.cols * st.rows); st.org = new Uint8Array(st.cols * st.rows);
      st.ox = (st.W - st.cols * st.cw) / 2; st.oy = (st.H - st.rows * st.ch) / 2;
      st.dirty = true; rasterCube(); paint();
    };
    const radius = () => (12 + (REACH / 100) * 58) * (st.S / 50);

    const stamp = (x, y, rad, amt) => {
      x -= st.ox; y -= st.oy;
      const c0 = Math.max(0, Math.floor((x - rad) / st.cw)), c1 = Math.min(st.cols - 1, Math.ceil((x + rad) / st.cw));
      const r0 = Math.max(0, Math.floor((y - rad) / st.ch)), r1 = Math.min(st.rows - 1, Math.ceil((y + rad) / st.ch));
      const R2 = rad * rad;
      for (let j = r0; j <= r1; j++) {
        const dy = (j + 0.5) * st.ch - y;
        for (let i = c0; i <= c1; i++) {
          const dx = (i + 0.5) * st.cw - x, q = (dx * dx + dy * dy) / R2;
          if (q >= 1) continue;
          const t = 1 - q, k = j * st.cols + i;
          st.heat[k] = Math.min(1, st.heat[k] + amt * t * t);
        }
      }
    };

    function paint() {
      if (!st.cols) return;
      const g = wcv.getContext('2d');
      g.setTransform(st.ratio, 0, 0, st.ratio, 0, 0);
      g.clearRect(0, 0, st.W, st.H);
      const INK = 'rgba(229,228,226,.9)', SIG = '#FF3B0F';
      const dot = Math.min(st.cw, st.ch) * 0.44;
      g.font = st.font; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lean = (PULL / 100) * st.near, rad = radius(), far2 = (rad * 2) ** 2, R2 = rad * rad;
      const sc = st.S / 50;
      const rings = st.rings.map((r) => {
        const p = r.t / RING_S, e = 1 - Math.pow(1 - p, 3);
        return { x: r.x, y: r.y, R: (8 + e * 260) * sc, amp: 0.6 * (1 - p) * (1 - p) * Math.min(1, p * 6) };
      });
      const band = 24 * sc;
      const dotsI = [], dotsO = [], glI = [], glO = [], hot = [];
      for (let j = 0; j < st.rows; j++) {
        const y = st.oy + (j + 0.5) * st.ch;
        for (let i = 0; i < st.cols; i++) {
          const k = j * st.cols + i, m = st.mask[k];
          if (m <= 0.02) continue;
          const cx = st.ox + (i + 0.5 + (j & 1) * 0.5) * st.cw;
          let h = st.heat[k];
          if (st.near > 0.002) {
            const q = ((cx - st.hx) ** 2 + (y - st.hy) ** 2) / R2;
            if (q < 1) h = Math.max(h, 0.95 * st.near * (1 - q) * (1 - q));
          }
          for (const r of rings) {
            const d = (Math.hypot(cx - r.x, y - r.y) - r.R) / band;
            if (d > -2.5 && d < 2.5) h += r.amp * Math.exp(-d * d);
          }
          h *= 0.55 + 0.45 * m;
          const v = Math.min(1, h);
          let u = v * TOP + 0.5;
          if (h > COLD) u += (hash(k, st.deal) - 0.5) * 1.6 * Math.min(1, h * 2);
          const idx = clamp(Math.floor(u), 1, TOP);
          let x = cx, yy = y;
          if (lean > 0.002) {
            const dx = st.hx - x, dy = st.hy - yy, d2 = dx * dx + dy * dy;
            if (d2 < far2) {
              const f = 1 - d2 / far2, d = Math.sqrt(d2) || 1, mv = Math.min(d * 0.6, 14 * lean * f * f);
              x += (dx / d) * mv; yy += (dy / d) * mv;
            }
          }
          const o = st.org[k];
          if (h <= COLD || idx === 1) { (o ? dotsO : dotsI).push(x, yy, Math.max(0.45, dot * Math.sqrt(m))); continue; }
          if (idx === TOP && v > 0.8) { hot.push(x, yy); continue; }
          (o ? glO : glI).push(x, yy, idx);
        }
      }
      const drawDots = (arr, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < arr.length; i += 3) { g.moveTo(arr[i] + arr[i + 2], arr[i + 1]); g.arc(arr[i], arr[i + 1], arr[i + 2], 0, Math.PI * 2); } g.fill(); };
      const drawGl = (arr, col) => { g.fillStyle = col; for (let i = 0; i < arr.length; i += 3) g.fillText(RAMP[arr[i + 2]], arr[i], arr[i + 1]); };
      drawDots(dotsI, INK); drawDots(dotsO, SIG); drawGl(glI, INK); drawGl(glO, SIG);
      if (hot.length) { g.fillStyle = SIG; for (let i = 0; i < hot.length; i += 2) g.fillText(RAMP[TOP], hot[i], hot[i + 1]); }
    }

    const updateStatus = () => {
      bind('cubeMoves', String(moves));
      bind('cubeState', T(isSolved() ? 'Solved' : 'Scrambled'));
    };
    const queueMove = (m, record = true, dur = 0.32) => {
      queue.push({ ...m, dur: reduce ? 0 : dur, record });
      run();
    };
    const nextMove = () => {
      if (anim || !queue.length) return;
      const m = queue.shift();
      anim = { ...m, t: 0, e: 0 };
      if (m.record) { history.push({ ax: m.ax, layer: m.layer, dir: m.dir }); moves++; }
      else if (m.undo) { moves = Math.max(0, moves - 1); }
    };

    // One loop for everything: turns, the cooling wake, rings, the lean.
    const run = () => {
      if (st.raf) return;
      let prev = performance.now();
      const step = (t) => {
        const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
        nextMove();
        if (anim) {
          anim.t = anim.dur ? anim.t + dt / anim.dur : 1;
          const u = Math.min(1, anim.t);
          anim.e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
          st.dirty = true;
          if (u >= 1) { applyMove(anim); anim = null; updateStatus(); nextMove(); }
        }
        const keep = Math.exp((-dt * 3) / TRAIL);
        let warm = 0;
        for (let k = 0; k < st.heat.length; k++) {
          const h = st.heat[k] * keep;
          st.heat[k] = h < 0.003 ? 0 : h;
          if (h > warm) warm = h;
        }
        st.rings = st.rings.filter((r) => (r.t += dt) < RING_S);
        st.near += ((st.inside ? 1 : 0) - st.near) * (1 - Math.pow(0.004, dt));
        st.tick += dt;
        if (st.tick > 0.07) { st.tick = 0; st.deal++; }
        if (st.dirty) rasterCube();
        paint();
        const still = !anim && !queue.length && !st.dirty && warm === 0 && !st.rings.length && Math.abs((st.inside ? 1 : 0) - st.near) < 0.004;
        st.raf = still ? 0 : requestAnimationFrame(step);
      };
      st.raf = requestAnimationFrame(step);
    };

    /* ---- pointer: drag a sticker to turn its layer, drag elsewhere to orbit ---- */
    const where = (e) => { const r = wcv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const wake = (x, y) => {
      const rad = radius();
      if (Number.isNaN(st.lx)) { st.lx = x; st.ly = y; }
      const d = Math.hypot(x - st.lx, y - st.ly), n = Math.max(1, Math.ceil(d / (rad / 3)));
      for (let k = 1; k <= n; k++) { const f = k / n; stamp(st.lx + (x - st.lx) * f, st.ly + (y - st.ly) * f, rad, 0.5); }
      st.lx = x; st.ly = y; st.hx = x; st.hy = y; st.inside = true;
    };
    const pickAt = (x, y) => {
      if (st.dirty) rasterCube();
      const X = Math.floor(x * OFF), Y = Math.floor(y * OFF);
      if (X < 0 || Y < 0 || X >= ids.width || Y >= ids.height) return null;
      const d = ictx.getImageData(X, Y, 1, 1).data;
      if (!d[2]) return null;
      return st.pick.get(d[0] + (d[1] << 8)) || null;
    };
    // screen direction (y down) of a world axis vector under the current view
    const screenDir = (v) => { const c = cam(v); return [c[0], -c[1]]; };
    let drag = null;
    wrap.addEventListener('pointerdown', (e) => {
      const p = where(e);
      wrap.setPointerCapture(e.pointerId);
      const f = anim ? null : pickAt(p.x, p.y);
      drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, face: f, done: false, orbit: !f };
      st.rings.push({ x: p.x, y: p.y, t: 0 });
      run();
    });
    wrap.addEventListener('pointermove', (e) => {
      const p = where(e);
      if (e.pointerType === 'mouse' || drag) wake(p.x, p.y);
      if (drag) {
        if (drag.orbit) {
          view.yaw += (p.x - drag.x) * 0.45; view.pitch = clamp(view.pitch + (p.y - drag.y) * 0.45, -85, 85);
          st.dirty = true;
        } else if (!drag.done && Math.hypot(p.x - drag.x0, p.y - drag.y0) > 12) {
          // choose the face tangent that best matches the drag, then turn about n x t
          const { n, q } = drag.face, dx = p.x - drag.x0, dy = p.y - drag.y0, dl = Math.hypot(dx, dy);
          let best = null;
          for (let ax = 0; ax < 3; ax++) {
            if (n[ax]) continue;
            const t = [0, 0, 0]; t[ax] = 1;
            const sd = screenDir(t), sl = Math.hypot(sd[0], sd[1]) || 1;
            const dot = (sd[0] * dx + sd[1] * dy) / (sl * dl);
            if (!best || Math.abs(dot) > Math.abs(best.dot)) best = { ax, dot };
          }
          const t = [0, 0, 0]; t[best.ax] = Math.sign(best.dot) || 1;
          const a = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
          const ax = a[0] ? 0 : a[1] ? 1 : 2;
          queueMove({ ax, layer: q.p[ax], dir: a[ax] });
          drag.done = true;
        }
        drag.x = p.x; drag.y = p.y;
      }
      run();
    });
    const endDrag = () => { drag = null; };
    wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
    wrap.addEventListener('pointerleave', () => { st.inside = false; st.lx = NaN; run(); });

    /* ---- keyboard (only while the cube has focus) ---- */
    const KEYS = { U: [1, 1, -1], D: [1, -1, 1], R: [0, 1, -1], L: [0, -1, 1], F: [2, 1, -1], B: [2, -1, 1] };
    wrap.addEventListener('keydown', (e) => {
      const k = KEYS[e.key.toUpperCase()];
      if (k) { e.preventDefault(); queueMove({ ax: k[0], layer: k[1], dir: e.shiftKey ? -k[2] : k[2] }); return; }
      const v = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[e.key];
      if (v) { e.preventDefault(); view.yaw += v[0]; view.pitch = clamp(view.pitch + v[1], -85, 85); st.dirty = true; run(); }
    });

    $('#cubeScramble').addEventListener('click', () => {
      let lastAx = -1;
      for (let i = 0; i < 20; i++) {
        let ax; do { ax = (Math.random() * 3) | 0; } while (ax === lastAx);
        lastAx = ax;
        queueMove({ ax, layer: [-1, 1][(Math.random() * 2) | 0], dir: Math.random() < 0.5 ? 1 : -1 }, true, 0.13);
      }
    });
    // Solve by unwinding every recorded turn, newest first.
    $('#cubeSolve').addEventListener('click', () => {
      queue.length = 0;
      const n = history.length;
      for (let i = n - 1; i >= 0; i--) { const m = history[i]; queue.push({ ax: m.ax, layer: m.layer, dir: -m.dir, dur: reduce ? 0 : Math.max(0.09, 0.22 - n * 0.002), record: false, undo: true }); }
      history.length = 0;
      run();
    });

    new ResizeObserver(build).observe(wcv);
    if (document.fonts) document.fonts.load('500 12px "IBM Plex Mono"').then(() => { st.dirty = true; run(); }).catch(() => {});
    build(); updateStatus(); I.on(updateStatus);
    if (!reduce) setTimeout(() => { if (!st.cols) return; st.rings.push({ x: st.W / 2, y: st.H / 2, t: 0 }); run(); }, 600);
  }

  /* ---------- Raia: reconciliation ---------- */
  const L = [
    { id: 'a', no: '0412', label: 'Supplier invoice', amt: '-318.40', v: 318.40 },
    { id: 'b', no: '0519', label: 'Subscription', amt: '-89.90', v: 89.90 },
    { id: 'c', no: '0603', label: 'Client payment', amt: '+1,250.00', v: 1250 },
    { id: 'd', no: '0611', label: 'Client payment', amt: '+4,075.25', v: 4075.25 }
  ];
  const B = [
    { id: 'c', label: 'PIX RECEIVED', amt: '+1,250.00' },
    { id: 'a', label: 'TED SENT', amt: '-318.40' },
    { id: 'd', label: 'PIX RECEIVED', amt: '+4,075.25' },
    { id: 'b', label: 'CARD PURCHASE', amt: '-89.90' }
  ];
  // Two-step match: pick a ledger entry, then the bank line it pairs with.
  const matched = {};
  let picked = null, miss = null, hint = () => '', missT = 0;
  const autoTimers = [];

  const row = (parts) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'le';
    parts.forEach((p) => { const s = document.createElement('span'); s.textContent = p; el.appendChild(s); });
    return el;
  };

  const ledgerEls = L.map((r) => {
    const el = row([r.no, r.label, r.amt]);
    el.addEventListener('click', () => {
      if (matched[r.id]) { delete matched[r.id]; picked = null; hint = () => `${r.no} ${T('reopened')}`; }
      else if (picked === r.id) { picked = null; hint = () => ''; }
      else { picked = r.id; hint = () => `${T('Now pick the bank line for')} ${r.no}.`; }
      renderRec();
    });
    $('#ledger').appendChild(el);
    return el;
  });
  const bankEls = B.map((r) => {
    const el = row(['', r.label, r.amt]);
    el.firstChild.setAttribute('aria-hidden', 'true');
    el.addEventListener('click', () => {
      if (!picked || matched[r.id]) return;
      const entry = L.find((l) => l.id === picked);
      if (r.id === picked) { matched[r.id] = true; hint = () => `${entry.no} ${T('matched.')}`; picked = null; }
      else {
        miss = r.id; hint = () => `${T(r.label)} ${N(r.amt)} ${T('does not match')} ${entry.no}.`;
        clearTimeout(missT); missT = setTimeout(() => { miss = null; renderRec(); }, 700);
      }
      renderRec();
    });
    $('#bank').appendChild(el);
    return el;
  });

  function renderRec() {
    let openN = 0, openV = 0;
    L.forEach((r, i) => {
      const done = !!matched[r.id];
      if (!done) { openN++; openV += r.v; }
      ledgerEls[i].className = 'le ' + (done ? 'm' : picked === r.id ? 'h' : '');
      ledgerEls[i].setAttribute('aria-pressed', String(done || picked === r.id));
      ledgerEls[i].children[1].textContent = T(r.label); ledgerEls[i].children[2].textContent = N(r.amt);
      ledgerEls[i].setAttribute('aria-label', `${r.no} ${T(r.label)} ${N(r.amt)}, ${done ? T('matched') + ', ' + T('select to reopen') : picked === r.id ? T('selected') : T('open')}`);
    });
    B.forEach((r, i) => {
      const done = !!matched[r.id];
      const el = bankEls[i];
      el.className = 'le ' + (done ? 'm' : miss === r.id ? 'x' : '');
      el.disabled = done || !picked;
      el.firstChild.textContent = done ? '=' : miss === r.id ? '≠' : '';
      el.children[1].textContent = T(r.label); el.children[2].textContent = N(r.amt);
      el.setAttribute('aria-label', `${T(r.label)} ${N(r.amt)}, ${T(done ? 'matched' : 'unmatched')}`);
    });
    bind('open', I.money(openN === 0 ? 0 : openV));
    bind('openLabel', openN === 0 ? T('balance closed') : openN + ' ' + T('open'));
    bind('recHint', hint());
    $('.bal').classList.toggle('on', openN === 0);
  }

  const clearAuto = () => { autoTimers.splice(0).forEach(clearTimeout); };
  $('#autoRec').addEventListener('click', () => {
    clearAuto(); picked = null; hint = () => '';
    L.filter((r) => !matched[r.id]).forEach((r, i) => {
      autoTimers.push(setTimeout(() => { matched[r.id] = true; renderRec(); }, reduce ? 0 : 260 * (i + 1)));
    });
    renderRec();
  });
  $('#resetRec').addEventListener('click', () => {
    clearAuto(); Object.keys(matched).forEach((k) => delete matched[k]);
    picked = null; miss = null; hint = () => ''; renderRec();
  });
  renderRec(); I.on(renderRec);

  /* ---------- XoPlanilha: import + categorize ---------- */
  const X = [
    { raw: 'UBER *TRIP', amt: '-23.90', cat: 'Transport' },
    { raw: 'MERCADO EXTRA 0193', amt: '-187.42', cat: 'Groceries' },
    { raw: 'NETFLIX.COM', amt: '-55.90', cat: 'Recurring' },
    { raw: 'SALARIO 05/11', amt: '+3,200.00', cat: 'Recurring income' },
    { raw: 'TESOURO DIRETO', amt: '-400.00', cat: 'Investment' }
  ];
  let xo = X.length, xoT = null;
  const xoTags = X.map((r) => {
    const el = document.createElement('div');
    el.className = 'xo-row';
    const raw = document.createElement('span');
    raw.className = 'xo-raw';
    raw.textContent = r.raw;
    const amt = document.createElement('span');
    const tag = document.createElement('span');
    el.append(raw, amt, tag);
    $('#xoRows').appendChild(el);
    tag.amt = amt;
    return tag;
  });
  function renderXo() {
    X.forEach((r, i) => {
      const on = xo > i;
      xoTags[i].className = 'tag' + (on ? '' : ' off');
      xoTags[i].textContent = on ? T(r.cat) : '......';
      xoTags[i].amt.textContent = N(r.amt);
    });
    bind('xoStatus', `${xo} ${T('of')} ${X.length} ${T('categorized')}`);
  }
  $('#xoRun').addEventListener('click', () => {
    clearInterval(xoT);
    if (reduce) { xo = X.length; renderXo(); return; }
    xo = 0; renderXo();
    xoT = setInterval(() => { xo++; renderXo(); if (xo >= X.length) clearInterval(xoT); }, 380);
  });
  renderXo(); I.on(renderXo);

  /* ---------- CHIP-8: fetch / decode / execute trace ---------- */
  const prog = [
    { addr: 0x200, op: 0x6005, asm: 'LD V0, 0x05' },
    { addr: 0x202, op: 0x6103, asm: 'LD V1, 0x03' },
    { addr: 0x204, op: 0x8014, asm: 'ADD V0, V1' },
    { addr: 0x206, op: 0xA300, asm: 'LD I, 0x300' },
    { addr: 0x208, op: 0x7101, asm: 'ADD V1, 0x01' },
    { addr: 0x20A, op: 0x1204, asm: 'JP 0x204' }
  ];
  const c8 = { i: 0, phase: 0, v0: 0, v1: 0, ireg: 0 };
  let timer = null;
  const phaseEls = document.querySelectorAll('[data-phase]');
  const c8Rows = prog.map((r) => {
    const el = document.createElement('div');
    el.className = 'c8';
    const a = document.createElement('span'); a.textContent = hex(r.addr, 3);
    const o = document.createElement('span'); o.textContent = hex(r.op, 4);
    const s = document.createElement('span');
    el.append(a, o, s);
    $('#rows').appendChild(el);
    return { el, s };
  });

  function renderC8() {
    prog.forEach((r, idx) => {
      const on = idx === c8.i;
      c8Rows[idx].el.className = 'c8' + (on ? ' on' : '');
      c8Rows[idx].s.textContent = on && c8.phase === 0 ? '....' : r.asm;
    });
    phaseEls.forEach((el) => el.classList.toggle('on', Number(el.dataset.phase) === c8.phase));
    bind('pc', '0x' + hex(prog[c8.i].addr, 3));
    bind('v0', '0x' + hex(c8.v0, 2));
    bind('v1', '0x' + hex(c8.v1, 2));
    bind('ireg', '0x' + hex(c8.ireg, 3));
    bind('runLabel', T(timer ? 'Pause' : 'Run'));
  }

  function step() {
    if (c8.phase === 0) c8.phase = 1;
    else if (c8.phase === 1) {
      const op = prog[c8.i].op;
      if (op === 0x6005) c8.v0 = 0x05;
      else if (op === 0x6103) c8.v1 = 0x03;
      else if (op === 0x8014) c8.v0 = (c8.v0 + c8.v1) & 0xFF;
      else if (op === 0xA300) c8.ireg = 0x300;
      else if (op === 0x7101) c8.v1 = (c8.v1 + 1) & 0xFF;
      c8.phase = 2;
    } else {
      c8.phase = 0;
      c8.i = c8.i === 5 ? 2 : c8.i + 1;
    }
    renderC8();
  }
  const relangMisc = () => { renderC8(); const z = $('[data-b="zero"]'); if (z && /^0[.,]00$/.test(z.textContent)) z.textContent = I.money(0); };
  I.on(relangMisc); relangMisc();
  const start = () => { if (!timer) { timer = setInterval(step, 650); renderC8(); } };
  const stop = () => { clearInterval(timer); timer = null; renderC8(); };

  $('#toggleRun').addEventListener('click', () => (timer ? stop() : start()));
  $('#stepOnce').addEventListener('click', () => { stop(); step(); });
  $('#reset').addEventListener('click', () => { stop(); Object.assign(c8, { i: 0, phase: 0, v0: 0, v1: 0, ireg: 0 }); renderC8(); });
  renderC8();

  // Autorun the trace only while it is on screen.
  const cpu = $('.cpu');
  let userPaused = false;
  $('#toggleRun').addEventListener('click', () => { userPaused = !timer; });
  if (!reduce && cpu) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !userPaused) start();
      else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe(cpu);
  }

  /* ==========================================================================
     Raia diagram: a packet walks the document path
     ========================================================================== */
  const dg = $('.dg'), pk = $('.dg-pk');
  if (dg && pk && !reduce) {
    const route = ['e1', 'e3', 'e5', 'e6', 'e7'].map((id) => $('#' + id, dg));
    const lens = route.map((p) => p.getTotalLength());
    let seg = 0, segStart = 0, draft = 0, dvis = false;
    const SEG = 0.75;
    const io = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const step = (t) => {
      draft = 0;
      if (!dvis) return;
      if (!segStart) segStart = t;
      let u = (t - segStart) / 1000 / SEG;
      if (u >= 1) { seg = (seg + 1) % route.length; segStart = t; u = 0; }
      const pt = route[seg].getPointAtLength(io(u) * lens[seg]);
      pk.setAttribute('x', pt.x - 4); pk.setAttribute('y', pt.y - 4);
      draft = requestAnimationFrame(step);
    };
    new IntersectionObserver(([e]) => {
      dvis = e.isIntersecting;
      if (dvis && !draft) { segStart = 0; draft = requestAnimationFrame(step); }
    }).observe(dg);
  }

  /* ==========================================================================
     Smooth scroll + scroll-linked motion (GSAP, ScrollTrigger, Lenis)
     ========================================================================== */
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  // In-page links glide (or jump, with reduced motion) and move focus to the target.
  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (id === '#' || a.classList.contains('skip')) return;
    a.addEventListener('click', (ev) => {
      const target = $(id);
      if (!target) return;
      ev.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.1, easing: (x) => 1 - Math.pow(2, -10 * x) });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.replaceState(null, '', id);
    });
  });

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+=-';
  function decode(el) {
    const final = el.textContent;
    const len = final.length, dur = Math.min(700, 260 + len * 14);
    const t0 = performance.now();
    const run = (t) => {
      const u = Math.min(1, (t - t0) / dur), lock = Math.floor(u * len);
      let outS = final.slice(0, lock);
      for (let i = lock; i < len; i++) outS += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = outS;
      if (u < 1) requestAnimationFrame(run); else el.textContent = final;
    };
    requestAnimationFrame(run);
  }

  if (hasGsap && !reduce) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    const EX = 'expo.out';
    const once = (trigger, start = 'top 88%') => ({ trigger, start, once: true });

    // Ledger rules draw in from the left.
    $$('.draw').forEach((el) => {
      gsap.fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.1, ease: EX, scrollTrigger: once(el, 'top 94%') });
    });

    // Spec cells reveal with a hard clip-path wipe.
    $$('.cells:not(.cells--hero)').forEach((g) => {
      gsap.from(g.children, {
        clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: EX, stagger: 0.05,
        scrollTrigger: once(g), clearProps: 'clipPath'
      });
    });
    $$('.panel, .diagram').forEach((p) => {
      gsap.from(p, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: EX, scrollTrigger: once(p), clearProps: 'clipPath' });
    });

    // Section indexes count up; their labels decode once.
    $$('.sec-head').forEach((head) => {
      const idx = $('.idx', head), n = parseInt(idx.textContent, 10);
      ScrollTrigger.create({
        ...once(head, 'top 90%'),
        onEnter: () => {
          const o = { v: 0 };
          gsap.to(o, { v: n, duration: 0.5, ease: 'power2.out', onUpdate: () => { idx.textContent = String(Math.round(o.v)).padStart(2, '0'); } });
          $$('.dec', head).forEach(decode);
        }
      });
    });
    $$('.panel-h .dec').forEach((el) => ScrollTrigger.create({ ...once(el, 'top 92%'), onEnter: () => decode(el) }));

    // Diagram: edges draw, nodes wipe in, in reading order.
    if (dg) {
      const tl = gsap.timeline({ scrollTrigger: once(dg, 'top 80%') });
      tl.from($$('.dg-n', dg), { opacity: 0, duration: 0.4, ease: EX, stagger: 0.07 })
        .from($$('.dg-e', dg), { strokeDashoffset: 1, duration: 0.7, ease: EX, stagger: 0.08 }, 0.15);
    }

    // The closing balance counts down to zero as it arrives.
    const zero = $('[data-b="zero"]');
    if (zero) {
      ScrollTrigger.create({
        ...once(zero, 'top 95%'),
        onEnter: () => {
          const o = { v: 5733.55 };
          gsap.to(o, {
            v: 0, duration: 1.4, ease: EX,
            onUpdate: () => { zero.textContent = I.money(o.v); },
            onComplete: () => { zero.textContent = I.money(0); }
          });
        }
      });
    }
  }

  /* ==========================================================================
     Dock: shows after the hero, marks the section you're in
     ========================================================================== */
  const dock = $('.dock'), hero = $('.hero');
  if (dock && hero) {
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting;
      dock.classList.toggle('on', show);
      dock.inert = !show;
    }, { threshold: 0.02 }).observe(hero);
    const links = $$('.dock-a', dock);
    const secIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.setAttribute('aria-current', String(l.dataset.sec === e.target.id)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['work', 'think', 'writing', 'lab', 'about', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) secIO.observe(s); });
  }

  /* ==========================================================================
     Cursor: follows the pointer exactly; over a control it locks onto it
     as corner brackets. Fine pointers only.
     ========================================================================== */
  if (!reduce && window.matchMedia('(pointer: fine)').matches) {
    const cur = document.createElement('div');
    cur.className = 'cursor free is-hidden';
    cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    document.documentElement.classList.add('has-cursor');
    const SEL = 'a, button, .soc';
    let mx = -100, my = -100, target = null, pending = false;
    const place = () => {
      pending = false;
      const el = document.elementFromPoint(mx, my);
      const t = el && !el.closest('.wake-wrap') ? el.closest(SEL) : null;
      if (t !== target) { target = t; cur.classList.toggle('lock', !!t); cur.classList.toggle('free', !t); }
      if (t) {
        const r = t.getBoundingClientRect(), pad = 5;
        cur.style.width = `${r.width + pad * 2}px`; cur.style.height = `${r.height + pad * 2}px`;
        cur.style.transform = `translate3d(${r.left - pad}px, ${r.top - pad}px, 0)`;
      } else {
        cur.style.width = '10px'; cur.style.height = '10px';
        cur.style.transform = `translate3d(${mx - 5}px, ${my - 5}px, 0)`;
      }
    };
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(place); } };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      cur.classList.remove('is-hidden');
      schedule();
    }, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    window.addEventListener('blur', () => cur.classList.add('is-hidden'));
  }
})();
