// Guard mathematical functions against float precision edge roundoff
const safeSqrt = x => Math.sqrt(Math.max(0, x));
const safeAsin = x => Math.asin(Math.max(-1, Math.min(1, x)));

const SHAPES = {
  circle:    {f: x => safeSqrt(1 - x * x),
              F: x => (x * safeSqrt(1 - x * x) + safeAsin(x)) / 2,
              G: x => x - x ** 3 / 3, a: -1, b: 1,
              range: "Valid: −1 ≤ x ≤ 1"},
  quarter:   {f: x => safeSqrt(1 - x * x),
              F: x => (x * safeSqrt(1 - x * x) + safeAsin(x)) / 2,
              G: x => x - x ** 3 / 3, a: 0, b: 1,
              range: "Valid: −1 ≤ x ≤ 1"},
  semi:      {f: x => safeSqrt(4 - x * x),
              F: x => (x * safeSqrt(4 - x * x)) / 2 + 2 * safeAsin(x / 2),
              G: x => 4 * x - x ** 3 / 3, a: -2, b: 2,
              range: "Valid: −2 ≤ x ≤ 2"},
  ellipse:   {f: x => safeSqrt(1 - x * x / 4),
              F: x => (x / 2) * safeSqrt(1 - x * x / 4) + safeAsin(x / 2),
              G: x => x - x ** 3 / 12, a: -2, b: 2,
              range: "Valid: −2 ≤ x ≤ 2"},
  line:      {f: x => x + 1, F: x => x * x / 2 + x,
              G: x => x ** 3 / 3 + x * x + x, a: 0, b: 2,
              range: "Valid: any real x"},
  cone:      {f: x => x, F: x => x * x / 2,
              G: x => x ** 3 / 3, a: 0, b: 2,
              range: "Valid: any real x"},
  parabola:  {f: x => x * x, F: x => x ** 3 / 3,
              G: x => x ** 5 / 5, a: 0, b: 2,
              range: "Valid: any real x"},
  cubic:     {f: x => x ** 3, F: x => x ** 4 / 4,
              G: x => x ** 7 / 7, a: 0, b: 1,
              range: "Valid: any real x"},
  quartic:   {f: x => x ** 4, F: x => x ** 5 / 5,
              G: x => x ** 9 / 9, a: 0, b: 1,
              range: "Valid: any real x"},
  hyperbola: {f: x => (x !== 0 ? 1 / x : NaN), F: x => Math.log(Math.abs(x)),
              G: x => -1 / x, a: 1, b: 4,
              range: "Valid: x > 0 only (cannot include 0)"},
  sine:      {f: Math.sin, F: x => -Math.cos(x),
              G: x => x / 2 - Math.sin(2 * x) / 4, a: 0, b: Math.PI,
              range: "Valid: any real x"},
  cosine:    {f: Math.cos, F: x => Math.sin(x),
              G: x => x / 2 + Math.sin(2 * x) / 4, a: 0, b: Math.PI / 2,
              range: "Valid: any real x"},
  exp:       {f: Math.exp, F: x => Math.exp(x),
              G: x => Math.exp(2 * x) / 2, a: 0, b: 1,
              range: "Valid: any real x"},
  log:       {f: x => (x > 0 ? Math.log(x) : NaN),
              F: x => x * Math.log(x) - x,
              G: x => x * Math.log(x) ** 2 - 2 * x * Math.log(x) + 2 * x, a: 1, b: Math.E,
              range: "Valid: x > 0 only"},
  sqrt:      {f: x => (x >= 0 ? Math.sqrt(x) : NaN), F: x => (2 / 3) * x ** 1.5,
              G: x => x * x / 2, a: 0, b: 4,
              range: "Valid: x ≥ 0 only"}
};

const METHODS = {
  trap: {name: "Trapezoidal", k: 1},
  s13:  {name: "Simpson 1/3", k: 2},
  s38:  {name: "Simpson 3/8", k: 3}
};

const $ = id => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
let inputMode = "func"; // "func" or "values"
let lastGraph = null;
let calcTarget = "area"; // "area" or "volume"

// Theme handling
function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    $("themeIcon").textContent = "☀️";
    $("themeText").textContent = "Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    $("themeIcon").textContent = "🌙";
    $("themeText").textContent = "Dark";
  }
}

const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme = prefersDark ? "dark" : "light";
// Storage may be unavailable for a directly opened local file.
try { currentTheme = localStorage.getItem("cm_calc_theme") || currentTheme; } catch (e) {}
applyTheme(currentTheme === "dark");

$("themeBtn").addEventListener("click", () => {
  currentTheme = (currentTheme === "dark" ? "light" : "dark");
  try { localStorage.setItem("cm_calc_theme", currentTheme); } catch (e) {}
  applyTheme(currentTheme === "dark");
  redrawGraph();
});

function colors() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    isDark: isDark,
    bg: isDark ? "#151d2f" : "#f1f5f9",
    txt: isDark ? "#f8fafc" : "#0f172a",
    mut: isDark ? "#94a3b8" : "#64748b",
    brd: isDark ? "#334155" : "#cbd5e1",
    axis: isDark ? "#64748b" : "#475569",
    grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    // Original function curve: high-contrast royal blue
    funcCurve: isDark ? "#60a5fa" : "#1d4ed8",
    // Trapezoidal rule: crisp emerald
    trapStroke: isDark ? "#34d399" : "#059669",
    trapFill1: isDark ? "rgba(52, 211, 153, 0.22)" : "rgba(16, 185, 129, 0.20)",
    trapFill2: isDark ? "rgba(52, 211, 153, 0.32)" : "rgba(16, 185, 129, 0.30)",
    // Simpson 1/3: warm amber / orange
    s13Stroke: isDark ? "#fbbf24" : "#d97706",
    s13Fill: isDark ? "rgba(251, 191, 36, 0.25)" : "rgba(217, 119, 6, 0.22)",
    // Simpson 3/8: vibrant purple
    s38Stroke: isDark ? "#a78bfa" : "#7c3aed",
    s38Fill: isDark ? "rgba(167, 139, 250, 0.25)" : "rgba(124, 58, 237, 0.22)",
    // Sample points:
    pointFill: isDark ? "#38bdf8" : "#0284c7",
    pointBorder: isDark ? "#0f172a" : "#ffffff",
    partitionLine: isDark ? "rgba(255, 255, 255, 0.40)" : "rgba(15, 23, 42, 0.35)",
    partitionDashed: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(15, 23, 42, 0.22)"
  };
}

// Lagrange interpolation through (xs, ys) at evaluation point x
function lagrange(xs, ys, x) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    let t = ys[i];
    for (let j = 0; j < xs.length; j++) {
      if (j !== i) t *= (x - xs[j]) / (xs[i] - xs[j]);
    }
    s += t;
  }
  return s;
}

// Reject incomplete tokens; accept decimal numbers and scientific notation.
function readNumber(text) {
  const value = String(text).trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function parseMeasurements(text) {
  if (!text.trim()) throw new Error("Enter at least two measured values.");
  const values = text.trim().split(/[\s,]+/).map(readNumber);
  if (values.some(value => !Number.isFinite(value)))
    throw new Error("Every measured value must be a complete, finite number.");
  if (values.length < 2 || values.length > 1001)
    throw new Error("Enter 2 to 1001 measured values (1 to 1000 intervals).");
  return values;
}

function checkDomain(shape, a, b) {
  if ((shape === "circle" || shape === "quarter") && (a < -1 || b > 1))
    throw new Error("Circle limits must be within [-1, 1].");
  if ((shape === "semi" || shape === "ellipse") && (a < -2 || b > 2))
    throw new Error("Semicircle / ellipse limits must be within [-2, 2].");
  if ((shape === "hyperbola" || shape === "log") && a <= 0)
    throw new Error("This function requires strictly positive limits.");
  if (shape === "sqrt" && a < 0)
    throw new Error("Square root requires nonnegative limits.");
}

function checkRule(method, n) {
  if (!Object.prototype.hasOwnProperty.call(METHODS, method)) throw new Error("Select a valid integration method.");
  if (!Number.isInteger(n) || n < 1 || n > 1000)
    throw new Error("Use an integer number of intervals from 1 to 1000.");
  if (method === "s13" && n % 2 !== 0)
    throw new Error("Simpson's 1/3 rule requires an even number of intervals (n = " + n + " is odd).");
  if (method === "s38" && n % 3 !== 0)
    throw new Error("Simpson's 3/8 rule requires intervals to be a multiple of 3 (n = " + n + " is not divisible by 3).");
}

function integrateValues(ys, h, method) {
  const n = ys.length - 1;
  checkRule(method, n);
  if (!Number.isFinite(h) || h <= 0 || ys.some(y => !Number.isFinite(y)))
    throw new Error("Values must be finite and spacing must be positive.");
  // Interior weights: trapezoidal 2; Simpson 1/3 4,2; Simpson 3/8 3,3,2.
  let sum = ys[0] + ys[n];
  let result;
  if (method === "trap") {
    for (let i = 1; i < n; i++) sum += 2 * ys[i];
    result = (h / 2) * sum;
  } else if (method === "s13") {
    for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * ys[i];
    result = (h / 3) * sum;
  } else {
    for (let i = 1; i < n; i++) sum += (i % 3 === 0 ? 2 : 3) * ys[i];
    result = (3 * h / 8) * sum;
  }
  if (!Number.isFinite(result)) throw new Error("Result exceeds the numerical range.");
  return result;
}

function fmt(v) {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) < 1e-9) return "0.0000";
  return v.toFixed(4);
}

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = cv.getBoundingClientRect();
  const w = rect.width || 640;
  const h = 360;
  cv.width = w * dpr;
  cv.height = h * dpr;
  ctx.resetTransform && ctx.resetTransform();
  ctx.scale(dpr, dpr);
  return { W: w, H: h };
}

// Display helpful message on canvas when inputs are invalid
function drawInvalidMessage(msg) {
  const { W, H } = setupCanvas();
  const c = colors();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  const bw = Math.min(W - 40, 520);
  const bh = 130;
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;

  ctx.fillStyle = c.isDark ? "#1e293b" : "#ffffff";
  ctx.strokeStyle = c.isDark ? "#475569" : "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10);
  else ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Calculator", W / 2, by + 40);

  ctx.fillStyle = c.mut;
  ctx.font = "13px system-ui, sans-serif";
  // Fit long validation messages into the graph card on small screens.
  const words = msg.split(" ");
  let line = "", lineY = by + 65;
  for (const word of words) {
    if (ctx.measureText(line + word).width > bw - 20 && line) {
      ctx.fillText(line.trim(), W / 2, lineY);
      line = ""; lineY += 16;
    }
    line += word + " ";
  }
  ctx.fillText(line.trim(), W / 2, lineY);

  ctx.fillStyle = c.txt;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("Adjust inputs, then click Calculate.", W / 2, by + 115);
  ctx.textAlign = "start";
}

// Render clean, informative graph legend
function drawLegend(W, H, c, isGivenValues, approxLabel, approxColor) {
  const items = [];
  if (!isGivenValues) {
    items.push({ type: "line", label: "Original Function f(x)", color: c.funcCurve });
  }
  items.push({ type: "box", label: approxLabel, color: approxColor });
  items.push({ type: "point", label: "Sample Points (xᵢ, yᵢ)", color: c.pointFill });

  const pad = 10;
  const itemH = 18;
  const legW = Math.min(W - 20, 310);
  const legH = items.length * itemH + pad * 2;
  const legX = Math.max(10, W - legW - 14);
  const legY = 14;

  ctx.save();
  ctx.fillStyle = c.isDark ? "rgba(30, 41, 59, 0.90)" : "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = c.brd;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(legX, legY, legW, legH, 6);
  else ctx.rect(legX, legY, legW, legH);
  ctx.fill();
  ctx.stroke();

  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  items.forEach((item, idx) => {
    const iy = legY + pad + idx * itemH + itemH / 2;
    const ix = legX + 12;

    if (item.type === "line") {
      ctx.strokeStyle = item.color;
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ix + 20, iy);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (item.type === "box") {
      ctx.fillStyle = item.color;
      ctx.fillRect(ix, iy - 5, 20, 10);
      ctx.strokeStyle = item.color;
      ctx.strokeRect(ix, iy - 5, 20, 10);
    } else if (item.type === "point") {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(ix + 10, iy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.pointBorder;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.fillStyle = c.txt;
    ctx.fillText(item.label, ix + 28, iy);
  });
  ctx.restore();
}

function interpolationBounds(xs, ys, method) {
  let low = Math.min(0, ...ys), high = Math.max(0, ...ys);
  const groupSize = METHODS[method].k;
  for (let start = 0; start < ys.length - 1; start += groupSize) {
    const groupX = xs.slice(start, start + groupSize + 1);
    const groupY = ys.slice(start, start + groupSize + 1);
    for (let step = 0; step <= 60; step++) {
      const x = groupX[0] + (groupX[groupSize] - groupX[0]) * step / 60;
      const y = lagrange(groupX, groupY, x);
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
  }
  return { low, high };
}

function drawArea(F, a, b, n, method) {
  const { W, H } = setupCanvas();
  const c = colors();
  const L = 60, R = 28, T = 28, B = 45;
  const X = x => L + ((x - a) / (b - a)) * (W - L - R);

  const h = (b - a) / n;
  let lo = 0, hi = 0;
  for (let i = 0; i <= 300; i++) {
    const y = F(a + (b - a) * (i / 300));
    if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  for (let i = 0; i <= n; i++) {
    const y = F(a + i * h);
    if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  }
  const boundX = Array.from({length: n + 1}, (_, i) => a + i * h);
  const bounds = interpolationBounds(boundX, boundX.map(F), method);
  lo = Math.min(lo, bounds.low); hi = Math.max(hi, bounds.high);
  if (hi - lo < 1e-9) hi = lo + 1;
  const pad = (hi - lo) * 0.14;
  lo -= pad; hi += pad;
  const Y = y => H - B - ((y - lo) / (hi - lo)) * (H - T - B);

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const gy = Y(lo + (hi - lo) * (i / 5));
    ctx.beginPath(); ctx.moveTo(L, gy); ctx.lineTo(W - R, gy); ctx.stroke();
  }

  // Draw Axes
  const y0 = Y(0);
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(L, y0); ctx.lineTo(W - R, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, H - B); ctx.stroke();

  // Axis labels
  ctx.fillStyle = c.mut;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("x", W - R - 6, y0 - 8);
  ctx.fillText("y = f(x)", L + 8, T + 12);
  ctx.fillText("0", L - 16, y0 + 4);

  // Sample nodes
  const xs = [], ys = [];
  for (let i = 0; i <= n; i++) {
    const x = a + i * h;
    xs.push(x);
    ys.push(F(x));
  }

  // Draw Original Continuous Function Curve in contrasting royal blue
  ctx.strokeStyle = c.funcCurve;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const x = a + (b - a) * (i / 300);
    const px = X(x), py = Y(F(x));
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Numerical approximation visualization
  if (method === "trap") {
    // Trapezoidal: Draw each trapezoid individually with straight line chords and vertical partitions
    for (let i = 0; i < n; i++) {
      const x1 = xs[i], x2 = xs[i + 1];
      const y1 = ys[i], y2 = ys[i + 1];

      ctx.beginPath();
      ctx.moveTo(X(x1), y0);
      ctx.lineTo(X(x1), Y(y1));
      ctx.lineTo(X(x2), Y(y2));
      ctx.lineTo(X(x2), y0);
      ctx.closePath();
      ctx.fillStyle = (i % 2 === 0) ? c.trapFill1 : c.trapFill2;
      ctx.fill();

      // Top straight chord
      ctx.strokeStyle = c.trapStroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(X(x1), Y(y1));
      ctx.lineTo(X(x2), Y(y2));
      ctx.stroke();

      // Vertical partition boundary
      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(x1), y0);
      ctx.lineTo(X(x1), Y(y1));
      ctx.stroke();
    }
    // Rightmost vertical boundary
    ctx.strokeStyle = c.partitionLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(xs[n]), y0);
    ctx.lineTo(X(xs[n]), Y(ys[n]));
    ctx.stroke();

  } else if (method === "s13") {
    // Simpson's 1/3: Group in pairs (2 intervals, 3 points), actual quadratic interpolation curve
    for (let s = 0; s < n; s += 2) {
      const subX = [xs[s], xs[s + 1], xs[s + 2]];
      const subY = [ys[s], ys[s + 1], ys[s + 2]];

      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      const steps = 30;
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[2] - subX[0]) * (t / steps);
        ctx.lineTo(X(x), Y(lagrange(subX, subY, x)));
      }
      ctx.lineTo(X(subX[2]), y0);
      ctx.closePath();
      ctx.fillStyle = c.s13Fill;
      ctx.fill();

      // Top quadratic curve
      ctx.strokeStyle = c.s13Stroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[2] - subX[0]) * (t / steps);
        const px = X(x), py = Y(lagrange(subX, subY, x));
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Solid vertical boundary at group ends
      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      ctx.lineTo(X(subX[0]), Y(subY[0]));
      ctx.moveTo(X(subX[2]), y0);
      ctx.lineTo(X(subX[2]), Y(subY[2]));
      ctx.stroke();

      // Dashed vertical line at midpoint
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = c.partitionDashed;
      ctx.beginPath();
      ctx.moveTo(X(subX[1]), y0);
      ctx.lineTo(X(subX[1]), Y(subY[1]));
      ctx.stroke();
      ctx.setLineDash([]);
    }

  } else if (method === "s38") {
    // Simpson's 3/8: Group in triplets (3 intervals, 4 points), actual cubic interpolation curve
    for (let s = 0; s < n; s += 3) {
      const subX = [xs[s], xs[s + 1], xs[s + 2], xs[s + 3]];
      const subY = [ys[s], ys[s + 1], ys[s + 2], ys[s + 3]];

      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      const steps = 40;
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[3] - subX[0]) * (t / steps);
        ctx.lineTo(X(x), Y(lagrange(subX, subY, x)));
      }
      ctx.lineTo(X(subX[3]), y0);
      ctx.closePath();
      ctx.fillStyle = c.s38Fill;
      ctx.fill();

      // Top cubic curve
      ctx.strokeStyle = c.s38Stroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[3] - subX[0]) * (t / steps);
        const px = X(x), py = Y(lagrange(subX, subY, x));
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Solid vertical boundary at group ends
      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      ctx.lineTo(X(subX[0]), Y(subY[0]));
      ctx.moveTo(X(subX[3]), y0);
      ctx.lineTo(X(subX[3]), Y(subY[3]));
      ctx.stroke();

      // Dashed vertical lines at interior partition points
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = c.partitionDashed;
      ctx.beginPath();
      ctx.moveTo(X(subX[1]), y0);
      ctx.lineTo(X(subX[1]), Y(subY[1]));
      ctx.moveTo(X(subX[2]), y0);
      ctx.lineTo(X(subX[2]), Y(subY[2]));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw Sample Points
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.arc(X(xs[i]), Y(ys[i]), 4, 0, Math.PI * 2);
    ctx.fillStyle = c.pointFill;
    ctx.fill();
    ctx.strokeStyle = c.pointBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Labeled axes endpoints
  ctx.fillStyle = c.txt;
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillText("a = " + fmt(a), X(a) - 14, H - B + 22);
  ctx.fillText("b = " + fmt(b), X(b) - 22, H - B + 22);

  if (n <= 8) {
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = c.mut;
    for (let i = 1; i < n; i++) {
      ctx.fillText("x" + i, X(xs[i]) - 6, H - B + 18);
    }
  }

  // Legend
  const approxLabel = (method === "trap" ? "Trapezoidal Chords" : (method === "s13" ? "Simpson 1/3 Parabolas" : "Simpson 3/8 Cubics"));
  const approxColor = (method === "trap" ? c.trapStroke : (method === "s13" ? c.s13Stroke : c.s38Stroke));
  drawLegend(W, H, c, false, approxLabel + " (group: " + METHODS[method].k + ")", approxColor);
}

function drawVolume(F, a, b, n, method) {
  const { W, H } = setupCanvas();
  const c = colors();
  const L = 30, R = 30;
  const X = x => L + (x - a) / (b - a) * (W - L - R);
  const cy = H / 2;

  let rmax = 0;
  for (let i = 0; i <= 300; i++) {
    const y = Math.abs(F(a + (b - a) * i / 300));
    if (Number.isFinite(y)) rmax = Math.max(rmax, y);
  }
  if (rmax < 1e-9) rmax = 1;
  const sc = (H / 2 - 36) / rmax;

  ctx.clearRect(0, 0, W, H);

  // Axis of rotation
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(L, cy); ctx.lineTo(W - R, cy); ctx.stroke();
  ctx.setLineDash([]);

  // Silhouette of the solid
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = a + (b - a) * (i / 200);
    const r = Math.abs(F(x)) * sc;
    i === 0 ? ctx.moveTo(X(x), cy - r) : ctx.lineTo(X(x), cy - r);
  }
  for (let i = 200; i >= 0; i--) {
    const x = a + (b - a) * (i / 200);
    ctx.lineTo(X(x), cy + Math.abs(F(x)) * sc);
  }
  ctx.closePath();
  ctx.fillStyle = c.isDark ? "rgba(96, 165, 250, 0.16)" : "rgba(37, 99, 235, 0.14)";
  ctx.fill();
  ctx.strokeStyle = c.funcCurve;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Disks at interval boundaries
  const h = (b - a) / n;
  const k = METHODS[method].k;
  const methodColor = method === "trap" ? c.trapStroke : method === "s13" ? c.s13Stroke : c.s38Stroke;
  const dx = (W - L - R) / n;
  const rx = Math.max(2, dx * 0.32);

  for (let i = 0; i <= n; i++) {
    const x = a + h * i;
    const r = Math.abs(F(x)) * sc;
    if (r > 1) {
      const isGroupBoundary = (i % k === 0);
      ctx.beginPath();
      ctx.ellipse(X(x), cy, rx, r, 0, 0, Math.PI * 2);

      if (isGroupBoundary) {
        ctx.fillStyle = method === "trap" ? c.trapFill1 : method === "s13" ? c.s13Fill : c.s38Fill;
        ctx.fill();
        ctx.strokeStyle = methodColor;
        ctx.lineWidth = 1.4;
      } else {
        ctx.fillStyle = c.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
        ctx.fill();
        ctx.strokeStyle = c.axis;
        ctx.lineWidth = 0.8;
      }
      ctx.stroke();
    }
  }

  ctx.fillStyle = c.mut;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("a = " + fmt(a), X(a) - 10, H - 10);
  ctx.fillText("b = " + fmt(b), X(b) - 20, H - 10);
  ctx.fillText(METHODS[method].name + " (groups of " + k + " intervals)", L + 6, 38);
  ctx.fillText("Solid of Revolution: V = π ∫ [f(x)]² dx (Rotated about x-axis)", L + 6, 20);
}

function drawValuesGraph(xs, ys, method, isVolume = false) {
  const { W, H } = setupCanvas();
  const c = colors();
  const L = 60, R = 28, T = 28, B = 45;
  const n = ys.length - 1;
  const a = xs[0], b = xs[n];
  const X = x => L + ((x - a) / (b - a)) * (W - L - R);

  let lo = 0, hi = 0;
  for (const y of ys) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const bounds = interpolationBounds(xs, ys, method);
  lo = Math.min(lo, bounds.low); hi = Math.max(hi, bounds.high);
  if (hi - lo < 1e-9) hi = lo + 1;
  const pad = (hi - lo) * 0.14;
  lo -= pad; hi += pad;
  const Y = y => H - B - ((y - lo) / (hi - lo)) * (H - T - B);

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const gy = Y(lo + (hi - lo) * (i / 5));
    ctx.beginPath(); ctx.moveTo(L, gy); ctx.lineTo(W - R, gy); ctx.stroke();
  }

  // Axes
  const y0 = Y(0);
  ctx.strokeStyle = c.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(L, y0); ctx.lineTo(W - R, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, H - B); ctx.stroke();

  ctx.fillStyle = c.mut;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("x", W - R - 6, y0 - 8);
  ctx.fillText(isVolume ? "r² (squared radii)" : "y (measured)", L + 8, T + 12);
  ctx.fillText("0", L - 16, y0 + 4);

  // Numerical approximation visualization (NO invented continuous original curve)
  if (method === "trap") {
    for (let i = 0; i < n; i++) {
      const x1 = xs[i], x2 = xs[i + 1];
      const y1 = ys[i], y2 = ys[i + 1];

      ctx.beginPath();
      ctx.moveTo(X(x1), y0);
      ctx.lineTo(X(x1), Y(y1));
      ctx.lineTo(X(x2), Y(y2));
      ctx.lineTo(X(x2), y0);
      ctx.closePath();
      ctx.fillStyle = (i % 2 === 0) ? c.trapFill1 : c.trapFill2;
      ctx.fill();

      ctx.strokeStyle = c.trapStroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(X(x1), Y(y1));
      ctx.lineTo(X(x2), Y(y2));
      ctx.stroke();

      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(x1), y0);
      ctx.lineTo(X(x1), Y(y1));
      ctx.stroke();
    }
    ctx.strokeStyle = c.partitionLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(xs[n]), y0);
    ctx.lineTo(X(xs[n]), Y(ys[n]));
    ctx.stroke();

  } else if (method === "s13") {
    for (let s = 0; s < n; s += 2) {
      const subX = [xs[s], xs[s + 1], xs[s + 2]];
      const subY = [ys[s], ys[s + 1], ys[s + 2]];

      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      const steps = 30;
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[2] - subX[0]) * (t / steps);
        ctx.lineTo(X(x), Y(lagrange(subX, subY, x)));
      }
      ctx.lineTo(X(subX[2]), y0);
      ctx.closePath();
      ctx.fillStyle = c.s13Fill;
      ctx.fill();

      ctx.strokeStyle = c.s13Stroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[2] - subX[0]) * (t / steps);
        const px = X(x), py = Y(lagrange(subX, subY, x));
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      ctx.lineTo(X(subX[0]), Y(subY[0]));
      ctx.moveTo(X(subX[2]), y0);
      ctx.lineTo(X(subX[2]), Y(subY[2]));
      ctx.stroke();

      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = c.partitionDashed;
      ctx.beginPath();
      ctx.moveTo(X(subX[1]), y0);
      ctx.lineTo(X(subX[1]), Y(subY[1]));
      ctx.stroke();
      ctx.setLineDash([]);
    }

  } else if (method === "s38") {
    for (let s = 0; s < n; s += 3) {
      const subX = [xs[s], xs[s + 1], xs[s + 2], xs[s + 3]];
      const subY = [ys[s], ys[s + 1], ys[s + 2], ys[s + 3]];

      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      const steps = 40;
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[3] - subX[0]) * (t / steps);
        ctx.lineTo(X(x), Y(lagrange(subX, subY, x)));
      }
      ctx.lineTo(X(subX[3]), y0);
      ctx.closePath();
      ctx.fillStyle = c.s38Fill;
      ctx.fill();

      ctx.strokeStyle = c.s38Stroke;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t <= steps; t++) {
        const x = subX[0] + (subX[3] - subX[0]) * (t / steps);
        const px = X(x), py = Y(lagrange(subX, subY, x));
        t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = c.partitionLine;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(X(subX[0]), y0);
      ctx.lineTo(X(subX[0]), Y(subY[0]));
      ctx.moveTo(X(subX[3]), y0);
      ctx.lineTo(X(subX[3]), Y(subY[3]));
      ctx.stroke();

      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = c.partitionDashed;
      ctx.beginPath();
      ctx.moveTo(X(subX[1]), y0);
      ctx.lineTo(X(subX[1]), Y(subY[1]));
      ctx.moveTo(X(subX[2]), y0);
      ctx.lineTo(X(subX[2]), Y(subY[2]));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw measured sample points
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.arc(X(xs[i]), Y(ys[i]), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = c.pointFill;
    ctx.fill();
    ctx.strokeStyle = c.pointBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = c.txt;
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.fillText("x₀ = " + fmt(a), X(a) - 10, H - B + 22);
  ctx.fillText("xₙ = " + fmt(b), X(b) - 20, H - B + 22);

  // Legend (NO original function)
  const approxLabel = (method === "trap" ? "Trapezoidal Chords" : (method === "s13" ? "Simpson 1/3 Parabolas" : "Simpson 3/8 Cubics"));
  const approxColor = (method === "trap" ? c.trapStroke : (method === "s13" ? c.s13Stroke : c.s38Stroke));
  drawLegend(W, H, c, true, approxLabel, approxColor);
}

function updateSteps(ys, h, n, method, approx, unit, isArea, exact, refVal) {
  const endSum = ys[0] + ys[n];
  let formulaStr = "";
  let subCalcStr = "";

  if (method === "trap") {
    formulaStr = "I ≈ (h / 2) × [ (y₀ + yₙ) + 2(y₁ + y₂ + ... + yₙ₋₁) ]";
    let sumMid = 0;
    for (let i = 1; i < n; i++) sumMid += ys[i];
    subCalcStr = `(${fmt(h)} / 2) × [ (${fmt(endSum)}) + 2 × (${fmt(sumMid)}) ] = ${fmt((h / 2) * (endSum + 2 * sumMid))}`;
  } else if (method === "s13") {
    formulaStr = "I ≈ (h / 3) × [ (y₀ + yₙ) + 4 ∑ y_odd + 2 ∑ y_even ]";
    let sumOdd = 0, sumEven = 0;
    for (let i = 1; i < n; i++) {
      if (i % 2 === 1) sumOdd += ys[i];
      else sumEven += ys[i];
    }
    subCalcStr = `(${fmt(h)} / 3) × [ (${fmt(endSum)}) + 4 × (${fmt(sumOdd)}) + 2 × (${fmt(sumEven)}) ] = ${fmt((h / 3) * (endSum + 4 * sumOdd + 2 * sumEven))}`;
  } else {
    formulaStr = "I ≈ (3h / 8) × [ (y₀ + yₙ) + 3 ∑ y_(not div 3) + 2 ∑ y_(div 3) ]";
    let sumNot3 = 0, sumDiv3 = 0;
    for (let i = 1; i < n; i++) {
      if (i % 3 !== 0) sumNot3 += ys[i];
      else sumDiv3 += ys[i];
    }
    subCalcStr = `(3 × ${fmt(h)} / 8) × [ (${fmt(endSum)}) + 3 × (${fmt(sumNot3)}) + 2 × (${fmt(sumDiv3)}) ] = ${fmt((3 * h / 8) * (endSum + 3 * sumNot3 + 2 * sumDiv3))}`;
  }

  let errorHtml = "";
  if (exact !== null && Number.isFinite(exact)) {
    errorHtml = `<div>Exact analytical value = <strong>${fmt(exact)}</strong> (Absolute Error |Δ| = <strong>${fmt(Math.abs(approx - exact))}</strong>)</div>`;
  } else if (refVal !== null && Number.isFinite(refVal)) {
    errorHtml = `<div>User reference value = <strong>${fmt(refVal)}</strong> (Difference from reference |Δ| = <strong>${fmt(Math.abs(approx - refVal))}</strong>)</div>`;
  } else {
    errorHtml = `<div>Exact reference: <em>Not available for discrete measured data</em></div>`;
  }

  const isVolume = !isArea;
  let html = `
    <div class="step-box">
      <div class="step-title">1. Formula Used:</div>
      <div class="step-formula">${formulaStr}</div>
    </div>
    <div class="step-box">
      <div class="step-title">2. Given Parameters:</div>
      ${isVolume ? "<div>The ordinates used below are squared radii: yᵢ = rᵢ².</div>" : ""}
      <div>Interval count <strong>n = ${n}</strong>, Step spacing <strong>h = ${fmt(h)}</strong></div>
      <div>End points sum (y₀ + yₙ) = ${fmt(ys[0])} + ${fmt(ys[n])} = <strong>${fmt(endSum)}</strong></div>
    </div>
    <div class="step-box">
      <div class="step-title">3. Main Substitution:</div>
      <div class="step-formula">${subCalcStr}</div>
      ${isVolume ? `<div>Volume = π × Integral = π × ${fmt(approx / Math.PI)} = <strong>${fmt(approx)}</strong></div>` : ""}
    </div>
    <div class="step-box">
      <div class="step-title">4. Final Answer &amp; Accuracy:</div>
      <div>Approximation = <strong>${fmt(approx)} ${unit}</strong></div>
      ${errorHtml}
    </div>
  `;
  $("stepsBody").innerHTML = html;
}

function getEffectiveN() {
  if (inputMode === "func") {
    const n = readNumber($("n").value);
    return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 0;
  } else {
    try { return parseMeasurements($("yValues").value).length - 1; }
    catch (e) { return 0; }
  }
}

function updateMethodCompatibility() {
  const n = getEffectiveN();
  const optTrap = $("optTrap");
  const optS13 = $("optS13");
  const optS38 = $("optS38");

  if (!optTrap || !optS13 || !optS38) return;

  optTrap.textContent = "Trapezoidal rule (Any n ≥ 1)";

  if (n > 0) {
    if (n % 2 === 0) {
      optS13.textContent = `Simpson's 1/3 rule (n = ${n} is even ✓)`;
    } else {
      optS13.textContent = `Simpson's 1/3 rule (n = ${n} is odd — INVALID ✗)`;
    }

    if (n % 3 === 0) {
      optS38.textContent = `Simpson's 3/8 rule (n = ${n} is divisible by 3 ✓)`;
    } else {
      optS38.textContent = `Simpson's 3/8 rule (n = ${n} not div by 3 — INVALID ✗)`;
    }
  } else {
    optS13.textContent = "Simpson's 1/3 rule (requires n even)";
    optS38.textContent = "Simpson's 3/8 rule (requires n multiple of 3)";
  }
}

function redrawGraph() {
  if (lastGraph) lastGraph();
  else drawInvalidMessage($("meta").textContent);
}

function clearResults(message) {
  lastGraph = null;
  $("result").textContent = "—";
  $("meta").textContent = message;
  $("rows").innerHTML = "";
  $("stepsBody").innerHTML = "";
  $("note").textContent = "";
  $("thExact").textContent = "Exact / Reference Value";
  $("thDiff").textContent = "Error / Difference";
  drawInvalidMessage(message);
}

function onInputChange() {
  $("err").textContent = "";
  clearResults("Inputs changed. Click Calculate to update results.");
  updateMethodCompatibility();
}

function applyDefaults() {
  const S = SHAPES[$("shape").value];
  $("a").value = S.a;
  $("b").value = S.b;
  $("range").textContent = S.range;
  updateMethodCompatibility();
}

function run() {
  const err = $("err");
  err.textContent = "";
  $("result").classList.remove("outdated");

  const method = $("method").value;

  try {
    let ys = [];
    let xs = [];
    let h = 0;
    let n = 0;
    let exact = null;
    let isArea = true;
    let scale = 1;
    let refVal = null;

    if (inputMode === "func") {
      const S = SHAPES[$("shape").value];
      const a = readNumber($("a").value);
      const b = readNumber($("b").value);
      n = readNumber($("n").value);

      if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b)
        throw new Error("Enter limits with lower limit a < upper limit b.");
      if (!Number.isInteger(n) || n < 1 || n > 1000)
        throw new Error("Number of intervals n must be an integer from 1 to 1000.");

      // VALIDATE SELECTED METHOD FIRST
      checkRule(method, n);
      checkDomain($("shape").value, a, b);

      isArea = (calcTarget === "area");
      const g = isArea ? S.f : (x => S.f(x) * S.f(x));
      scale = isArea ? 1 : Math.PI;
      exact = isArea ? (S.F(b) - S.F(a)) : Math.PI * (S.G(b) - S.G(a));

      if (!Number.isFinite(exact)) throw new Error("Exact value exceeds the numerical range.");
      h = (b - a) / n;
      for (let i = 0; i <= n; i++) {
        const x = i === n ? b : a + i * h;
        if (!Number.isFinite(x) || (i > 0 && x <= xs[i - 1]))
          throw new Error("Limits cannot represent distinct finite sample points.");
        const y = g(x);
        if (!Number.isFinite(y))
          throw new Error("The function is undefined at x = " + x.toFixed(3) + ". See valid range.");
        xs.push(x);
        ys.push(y);
      }

      const approx = integrateValues(ys, h, method) * scale;
      if (!Number.isFinite(approx)) throw new Error("Result exceeds the numerical range.");
      const unit = isArea ? "square units" : "cubic units";

      $("result").textContent = fmt(approx) + " " + unit;
      $("meta").textContent = (isArea ? "Area" : "Volume") + " of " +
        $("shape").selectedOptions[0].text + " on [" + a + ", " + b + "] with " +
        METHODS[method].name + " (n = " + n + ", h = " + fmt(h) + "). Exact analytical value: " + fmt(exact) + ".";

      // Table headers
      $("thExact").textContent = "Exact Analytical Value";
      $("thDiff").textContent = "Absolute Error |Δ|";

      // Comparison table
      const rows = $("rows");
      rows.innerHTML = "";
      for (const key of Object.keys(METHODS)) {
        const tr = document.createElement("tr");
        if (key === method) tr.className = "sel";
        const tdName = document.createElement("td");
        tdName.innerHTML = METHODS[key].name + (key === method ? " <span class='sel-tag'>Selected</span>" : "");
        const tdVal = document.createElement("td");
        tdVal.className = "num";
        const tdExact = document.createElement("td");
        tdExact.className = "num";
        const tdErr = document.createElement("td");
        tdErr.className = "num";

        try {
          checkRule(key, n);
          const v = integrateValues(ys, h, key) * scale;
          tdVal.textContent = fmt(v);
          tdExact.textContent = fmt(exact);
          tdErr.textContent = fmt(Math.abs(v - exact));
        } catch (e) {
          tdVal.innerHTML = `<span class="incompatible-tag">Incompatible (n = ${n})</span>`;
          tdExact.textContent = "—";
          tdErr.textContent = "—";
        }
        tr.append(tdName, tdVal, tdExact, tdErr);
        rows.appendChild(tr);
      }

      $("note").textContent = isArea
        ? "The shaded area shows the approximating polynomial strips: straight chords for the Trapezoidal rule, parabolas for Simpson's 1/3, and cubics for Simpson's 3/8."
        : "The solid is formed by rotating the curve about the x-axis. The discs mark the slices used in the numerical integration: V = π ∫ f(x)² dx.";

      lastGraph = () => isArea ? drawArea(S.f, a, b, n, method) : drawVolume(S.f, a, b, n, method);
      lastGraph();
      updateSteps(ys, h, n, method, approx, unit, isArea, exact, null);

    } else {
      // Given Values Mode
      const rawText = $("yValues").value.trim();
      if (!rawText) throw new Error("Please enter measured y-values.");
      const parsed = parseMeasurements(rawText);
      ys = parsed;
      n = ys.length - 1;

      h = readNumber($("hVal").value);
      if (!Number.isFinite(h) || h <= 0)
        throw new Error("Step spacing h must be a positive number.");

      // Check optional user reference value
      const rawRef = $("refVal") ? $("refVal").value.trim() : "";
      if (rawRef !== "") {
        const pRef = readNumber(rawRef);
        if (!Number.isFinite(pRef)) throw new Error("Reference must be a finite number.");
        refVal = pRef;
      }

      $("valStats").textContent = "Points: " + ys.length + " values (n = " + n + " intervals, h = " + fmt(h) + ")";

      // VALIDATE SELECTED METHOD FIRST
      checkRule(method, n);

      for (let i = 0; i <= n; i++) {
        const x = i * h;
        if (!Number.isFinite(x) || (i > 0 && x <= xs[i - 1]))
          throw new Error("Spacing cannot represent distinct finite sample points.");
        xs.push(x);
      }

      isArea = calcTarget === "area";
      if (!isArea && ys.some(y => y < 0)) throw new Error("Measured radii must be nonnegative.");
      // Measured volume: integrate squared radii and multiply by pi.
      if (!isArea) ys = ys.map(y => y * y);
      scale = isArea ? 1 : Math.PI;
      const approx = integrateValues(ys, h, method) * scale;
      if (!Number.isFinite(approx)) throw new Error("Result exceeds the numerical range.");
      const unit = isArea ? "square units" : "cubic units";

      $("result").textContent = fmt(approx) + " " + unit;
      let metaText = (isArea ? "Area integral of " : "Volume from measured radii at ") + ys.length + " measured points with " +
        METHODS[method].name + " (n = " + n + ", h = " + fmt(h) + ").";
      if (refVal !== null) {
        metaText += " Reference benchmark: " + fmt(refVal) + " (Difference = " + fmt(Math.abs(approx - refVal)) + ").";
      } else {
        metaText += " Exact analytical result is not available for discrete measured data.";
      }
      $("meta").textContent = metaText;

      // Table headers
      $("thExact").textContent = refVal !== null ? "Reference Value (User)" : "Exact Analytical Result";
      $("thDiff").textContent = refVal !== null ? "Difference from Reference |Δ|" : "Error (unavailable)";

      // Comparison table
      const rows = $("rows");
      rows.innerHTML = "";
      for (const key of Object.keys(METHODS)) {
        const tr = document.createElement("tr");
        if (key === method) tr.className = "sel";
        const tdName = document.createElement("td");
        tdName.innerHTML = METHODS[key].name + (key === method ? " <span class='sel-tag'>Selected</span>" : "");
        const tdVal = document.createElement("td");
        tdVal.className = "num";
        const tdRef = document.createElement("td");
        tdRef.className = "num";
        const tdErr = document.createElement("td");
        tdErr.className = "num";

        try {
          checkRule(key, n);
          const v = integrateValues(ys, h, key) * scale;
          tdVal.textContent = fmt(v);
          if (refVal !== null) {
            tdRef.textContent = fmt(refVal) + " (Reference)";
            tdErr.textContent = fmt(Math.abs(v - refVal));
          } else {
            tdRef.innerHTML = "<span class='unavailable'>Not available — measured data</span>";
            tdErr.innerHTML = "<span class='unavailable'>Not available — measured data</span>";
          }
        } catch (e) {
          tdVal.innerHTML = `<span class="incompatible-tag">Incompatible (n = ${n})</span>`;
          tdRef.textContent = "—";
          tdErr.textContent = "—";
        }
        tr.append(tdName, tdVal, tdRef, tdErr);
        rows.appendChild(tr);
      }

      $("note").textContent = refVal !== null
        ? "Note: The difference is evaluated against the optional reference value you provided, not assumed mathematical truth. Graph displays piecewise interpolation through measured nodes."
        : "Note: The exact analytical result is unknown for discrete measured data. Graph displays the measured points connected by interpolating pieces for the chosen numerical rule.";

      lastGraph = () => drawValuesGraph(xs, ys, method, !isArea);
      lastGraph();
      if (!isArea) $("note").textContent += " Volume uses measured radii: V = π ∫ r² dx. Graph shows the r² integrand.";
      updateSteps(ys, h, n, method, approx, unit, isArea, null, refVal);
    }

  } catch (e) {
    err.textContent = e.message;
    clearResults(e.message);
  }
}

// Mode switching
$("inModeFunc").addEventListener("click", () => {
  inputMode = "func";
  $("inModeFunc").classList.add("on");
  $("inModeValues").classList.remove("on");
  $("fieldsFunc").style.display = "block";
  $("fieldsValues").style.display = "none";
  updateMethodCompatibility();
  run();
});

$("inModeValues").addEventListener("click", () => {
  inputMode = "values";
  $("inModeValues").classList.add("on");
  $("inModeFunc").classList.remove("on");
  $("fieldsFunc").style.display = "none";
  $("fieldsValues").style.display = "block";
  updateMethodCompatibility();
  run();
});

$("modeArea").addEventListener("click", () => {
  calcTarget = "area";
  $("modeArea").classList.add("on");
  $("modeVol").classList.remove("on");
  run();
});

$("modeVol").addEventListener("click", () => {
  calcTarget = "volume";
  $("modeVol").classList.add("on");
  $("modeArea").classList.remove("on");
  run();
});

$("shape").addEventListener("change", () => { applyDefaults(); onInputChange(); run(); });
$("a").addEventListener("input", onInputChange);
$("b").addEventListener("input", onInputChange);
$("n").addEventListener("input", onInputChange);
$("method").addEventListener("change", () => { updateMethodCompatibility(); run(); });

function updateMeasuredStats() {
  try {
    const points = parseMeasurements($("yValues").value);
    $("valStats").textContent = "Points: " + points.length + " (n = " + (points.length - 1) +
      ", h = " + fmt(readNumber($("hVal").value)) + ")";
  } catch (e) {
    $("valStats").textContent = e.message;
  }
  onInputChange();
}

$("yValues").addEventListener("input", updateMeasuredStats);
$("hVal").addEventListener("input", updateMeasuredStats);

if ($("refVal")) {
  $("refVal").addEventListener("input", onInputChange);
}

$("calc").addEventListener("click", run);
window.addEventListener("resize", redrawGraph);

applyDefaults();
run();
