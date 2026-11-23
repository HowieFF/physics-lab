'use strict';

const byId = (id) => document.getElementById(id);
const instrument = byId('instrument');
const overview = instrument.getContext('2d');
const scale = byId('scale').getContext('2d');
const slider = byId('position');
const sample = byId('sample');
const status = byId('status');
const feedback = byId('feedback');
const answer = byId('answer');
const hint = byId('hint');
const reading = byId('reading');
const thickness = { sheet: 327.4, block: 784.7, rod: 1086.2, zero: 0 };
const opening = 1250;
const travel = 5;
const maxPosition = 2500;
const unitsPerTurn = 50;
let position = opening;
let drag = null;
let visualPosition = opening;
let animationFrame = null;
let ratchetSlip = 0;
let slipping = false;

function rect(ctx, x, y, w, h, fill, radius = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}

function line(ctx, x, y, endX, endY, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function label(ctx, content, x, y, color = '#e2ece5', size = 15, align = 'left', mono = false) {
  ctx.font = `${size}px ${mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(content, x, y);
}

function metal(ctx, y, h, colors) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  return gradient;
}

function drawInstrument() {
  const ctx = overview;
  const offset = visualPosition * travel / 100;
  const edge = 422 + offset;
  const center = 157;
  ctx.clearRect(0, 0, 780, 340);

  const frame = new Path2D('M170 137 H202 V169 H192 C190 232 227 259 313 258 C366 258 405 231 411 176 L446 179 C437 259 390 299 314 301 C220 303 161 268 155 191 C152 164 155 147 170 137 Z');
  ctx.shadowColor = '#0009';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = metal(ctx, 137, 166, [[0, '#557e74'], [.65, '#325b50'], [1, '#24473e']]);
  ctx.fill(frame);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#719486';
  ctx.lineWidth = 1.5;
  ctx.stroke(frame);
  ctx.strokeStyle = '#72968980';
  ctx.stroke(new Path2D('M168 183 C167 264 222 292 307 288 C376 287 418 256 432 190'));
  rect(ctx, 254, 270, 105, 21, '#1f3c33', 4);
  label(ctx, '0 – 25 mm', 306, 281, '#bcd2c4', 11, 'center', true);

  const steel = metal(ctx, center - 12, 24, [[0, '#6d8589'], [.35, '#e0e8e7'], [.58, '#aababc'], [1, '#4e676b']]);
  rect(ctx, 184, center - 12, 35, 24, steel, [4, 0, 0, 4]);
  rect(ctx, 219 + offset, center - 12, 181 - offset, 24, steel, [0, 4, 4, 0]);
  line(ctx, 219, center - 11, 219, center + 11, '#e3f0e9', 2);
  line(ctx, 219 + offset, center - 11, 219 + offset, center + 11, '#edf5ee', 2);

  if (sample.value !== 'zero') {
    const width = thickness[sample.value] * travel / 100;
    const height = sample.value === 'sheet' ? 67 : 54;
    rect(ctx, 219, center - height / 2, width, height,
      metal(ctx, center - height / 2, height, [[0, '#edc48a'], [.4, '#b9834c'], [1, '#d7ad72']]),
      sample.value === 'rod' ? 7 : 2);
  }

  rect(ctx, 345, center - 27, 228, 54,
    metal(ctx, center - 27, 54, [[0, '#70888d'], [.37, '#b8cacc'], [.55, '#aabfc0'], [1, '#50686c']]), 5);
  line(ctx, 422, center, edge, center, '#263d3d');
  for (let half = 0; half * travel / 2 <= offset; half += 1) {
    const x = 422 + half * travel / 2;
    const isWhole = half % 2 === 0;
    const tickLength = half % 10 === 0 ? 12 : 8;
    line(ctx, x, center, x, center + (isWhole ? tickLength : -8), '#364c4d');
    if (half % 10 === 0) label(ctx, half / 2, x, center + 21, '#162c30', 12, 'center', true);
  }

  rect(ctx, edge, center - 32, 155, 64,
    metal(ctx, center - 32, 64, [[0, '#72888a'], [.23, '#c4d5d4'], [.53, '#a2b8b8'], [1, '#536d70']]), 5);
  rect(ctx, edge + 49, center - 34, 108, 68,
    metal(ctx, center - 34, 68, [[0, '#344b50'], [.28, '#688285'], [.55, '#526c6e'], [1, '#2d4245']]), 6);
  for (let x = edge + 54; x <= edge + 150; x += 4) {
    line(ctx, x, center - 27, x, center + 27, '#172d3480');
  }
  rect(ctx, edge + 155, center - 18, 39, 36, steel, 5);
  rect(ctx, edge + 172, center - 19, 23, 38, '#476468', 4);
  for (let x = edge + 177; x < edge + 194; x += 4) {
    line(ctx, x, center - 15, x, center + 15, '#243a40');
  }
  drawRotatingScale(ctx, edge, center, 30, 23, 12);
  drawGrip(ctx, edge + 54, 100, center, 29);
  drawGrip(ctx, edge + 174, 20, center, 16, visualPosition + ratchetSlip);


  const guide = '#78948e';
  line(ctx, 196, 75, 196, 132, guide);
  label(ctx, '测砧', 196, 62, '#c4d3d0', 16, 'center');
  const spindleLabel = 264 + offset;
  line(ctx, spindleLabel, 100, spindleLabel, 139, guide);
  label(ctx, '测微螺杆', spindleLabel, 87, '#c4d3d0', 16, 'center');
  line(ctx, edge + 92, 96, edge + 92, 118, guide);
  label(ctx, '旋钮', edge + 92, 82, '#c4d3d0', 16, 'center');
  line(ctx, 386, 189, 386, 209, guide);
  label(ctx, '固定刻度', 386, 222, '#c4d3d0', 16, 'center');
  line(ctx, edge + 18, 192, edge + 18, 228, guide);
  label(ctx, '可动刻度', edge + 18, 243, '#c4d3d0', 16, 'center');
  line(ctx, edge + 183, 184, edge + 183, 201, guide);
  label(ctx, '微调旋钮', edge + 176, 216, '#c4d3d0', 16, 'center');
  line(ctx, 335, 300, 355, 320, guide);
  label(ctx, '尺架', 376, 322, '#c4d3d0', 16, 'center');
  if (sample.value !== 'zero') {
    const sampleX = 219 + thickness[sample.value] * travel / 200;
    line(ctx, sampleX, 195, sampleX, 215, guide);
    label(ctx, '试件', sampleX, 229, '#edc48a', 16, 'center');
  }
}

// Project the front half of the cylindrical scale as the thimble turns.
function drawRotatingScale(ctx, edge, axis, radius, length, fontSize) {
  const phase = visualPosition / unitsPerTurn * Math.PI * 2;
  for (let tick = 0; tick < unitsPerTurn; tick += 1) {
    const angle = phase - tick / unitsPerTurn * Math.PI * 2;
    const facing = Math.cos(angle);
    if (facing < 0.2) continue;
    const y = axis + Math.sin(angle) * radius;
    const major = tick % 5 === 0;
    line(ctx, edge, y, edge + (major ? length : length * 0.52), y, '#243c40');
    if (major) label(ctx, tick, edge + length + 4, y, '#243c40', fontSize, 'left', true);
  }
}

function drawGrip(ctx, x, width, axis, radius, rotation = visualPosition) {
  const phase = rotation / unitsPerTurn * Math.PI * 2;
  for (let ridge = 0; ridge < 20; ridge += 1) {
    const angle = phase - ridge / 20 * Math.PI * 2;
    if (Math.cos(angle) <= 0) continue;
    const y = axis + Math.sin(angle) * radius;
    line(ctx, x, y, x + width, y, '#b0c6c64d');
  }
}

function drawScale() {
  const ctx = scale;
  const edge = 428;
  const axis = 106;
  const zoom = 14.8;
  const gap = visualPosition / 100;
  ctx.clearRect(0, 0, 780, 200);
  label(ctx, '固定刻度  /  mm', 30, 22, '#b4c7c2', 17);
  label(ctx, '可动刻度', edge + 35, 22, '#b4c7c2', 17);

  rect(ctx, 30, 41, edge - 30, 129,
    metal(ctx, 41, 129, [[0, '#879fa1'], [.44, '#d0dedb'], [1, '#819b9d']]), [6, 0, 0, 6]);
  // The sleeve stays fixed while the thimble edge moves across its scale.
  const movingEdge = 48 + gap * zoom;
  line(ctx, 30, axis, edge, axis, '#243c40', 1.5);
  for (let half = 0; half <= 50; half += 1) {
    const x = 48 + half / 2 * zoom;
    const isWhole = half % 2 === 0;
    line(ctx, x, axis, x, axis + (isWhole ? 20 : -18), '#243c40', 1.5);
    if (half % 10 === 0) label(ctx, half / 2, x, axis + 41, '#243c40', 16, 'center', true);
  }
  rect(ctx, movingEdge, 34, 750 - movingEdge, 142,
    metal(ctx, 34, 142, [[0, '#829b9d'], [.48, '#dce6df'], [1, '#8aa1a3']]), [0, 8, 8, 0]);
  rect(ctx, movingEdge + 138, 34, 750 - movingEdge - 138, 142, '#405b5e', [0, 8, 8, 0]);
  drawGrip(ctx, movingEdge + 144, 750 - movingEdge - 150, axis, 65);
  drawRotatingScale(ctx, movingEdge, axis, 64, 52, 16);
  line(ctx, movingEdge, 34, movingEdge, 176, '#435d59', 1);
  line(ctx, movingEdge - 15, axis, movingEdge + 27, axis, '#385a3f', 2);
}


const mm = (value) => (value / 100).toFixed(3);

function render() {
  const atLimit = Math.abs(position - thickness[sample.value]) < 1e-6;
  const stateLabel = slipping ? '微调旋钮打滑 · 测力已限制' : atLimit ? (sample.value === 'zero' ? '已闭合' : '已接触') : '未接触';
  if (status.textContent !== stateLabel) status.textContent = stateLabel;
  status.classList.toggle('contact', atLimit);
  slider.value = position;

  const micrometers = Math.round(position * 10);
  const fixed = Math.floor(micrometers / 500) / 2;
  const rotating = (micrometers % 500) / 10;
  reading.textContent = `固定刻度 ${fixed} mm + 可动刻度 ${rotating.toFixed(1)} × 0.01 mm = ${mm(position)} mm`;
  slider.setAttribute('aria-valuetext', reading.hidden ? stateLabel : `${mm(position)} 毫米，${stateLabel}`);
  drawInstrument();
  drawScale();
}

function setPosition(requested, animate = false) {
  slipping = false;
  const next = Math.max(thickness[sample.value], Math.min(maxPosition, Math.round(requested * 10) / 10));
  if (next !== position) feedback.textContent = '';
  position = next;
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  if (!animate || visualPosition === position) {
    visualPosition = position;
    render();
    return;
  }
  const from = visualPosition;
  const start = performance.now();
  const duration = Math.min(700, Math.max(180, Math.abs(position - from) * 9));
  function advance(now) {
    const progress = Math.min(1, (now - start) / duration);
    visualPosition = from + (position - from) * progress;
    render();
    animationFrame = progress < 1 ? requestAnimationFrame(advance) : null;
  }
  animationFrame = requestAnimationFrame(advance);
}

function reset() {
  ratchetSlip = 0;
  answer.value = '';
  feedback.textContent = '';
  reading.hidden = true;
  hint.setAttribute('aria-expanded', 'false');
  hint.textContent = '显示读数';
  setPosition(opening);
}

slider.addEventListener('input', () => setPosition(Number(slider.value)));
sample.addEventListener('change', reset);
byId('reset').addEventListener('click', reset);
function pointerLocation(event) {
  const canvas = event.currentTarget;
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height,
  };
}

function knobAt(canvas, { x, y }) {
  if (canvas === instrument) {
    const edge = 422 + visualPosition * travel / 100;
    if (x >= edge + 172 && x <= edge + 201 && y >= 132 && y <= 182) return 'fine';
    if (x >= edge && x < edge + 157 && y >= 115 && y <= 199) return 'main';
    return null;
  }
  const edge = 48 + visualPosition / 100 * 14.8;
  return x >= edge && x <= 750 && y >= 34 && y <= 176 ? 'main' : null;
}

function turnKnob(part, delta) {
  const requested = position + delta;
  const limit = thickness[sample.value];
  setPosition(requested);
  if (part === 'fine' && requested < limit) {
    ratchetSlip += requested - limit;
    slipping = true;
    render();
  }
}

for (const canvas of [instrument, byId('scale')]) {
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    const point = pointerLocation(event);
    const part = knobAt(canvas, point);
    if (!part) return;
    event.preventDefault();
    drag = { id: event.pointerId, y: point.y, remainder: 0, part, canvas };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('turning');
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = pointerLocation(event);
    if (drag?.id === event.pointerId && drag.canvas === canvas) {
      // Fine adjustment uses lower pointer sensitivity, with the same screw pitch.
      const sensitivity = (drag.part === 'fine' ? 0.2 : 1) * (event.shiftKey ? 0.1 : 1);
      const delta = drag.remainder + (point.y - drag.y) * unitsPerTurn / 120 * sensitivity;
      const applied = Math.trunc((delta + Math.sign(delta) * 1e-9) * 10) / 10;
      drag.remainder = delta - applied;
      drag.y = point.y;
      if (applied) turnKnob(drag.part, applied);
    } else if (!drag) {
      canvas.classList.toggle('draggable', Boolean(knobAt(canvas, point)));
    }
  });
  canvas.addEventListener('lostpointercapture', (event) => {
    if (drag?.id !== event.pointerId || drag.canvas !== canvas) return;
    drag = null;
    canvas.classList.remove('turning');
  });
  canvas.addEventListener('wheel', (event) => {
    const part = knobAt(canvas, pointerLocation(event));
    if (!part || event.ctrlKey) return;
    event.preventDefault();
    turnKnob(part, event.deltaY * (event.shiftKey ? 0.01 : 0.1) * (part === 'fine' ? 0.2 : 1));
  }, { passive: false });
  canvas.addEventListener('keydown', (event) => {
    const steps = { ArrowUp: -1, ArrowDown: 1, PageUp: -50, PageDown: 50 };
    if (!(event.key in steps)) return;
    event.preventDefault();
    setPosition(position + steps[event.key] * (event.shiftKey ? 0.1 : 1), true);
  });
}


hint.addEventListener('click', () => {
  reading.hidden = !reading.hidden;
  hint.textContent = reading.hidden ? '显示读数' : '隐藏读数';
  hint.setAttribute('aria-expanded', String(!reading.hidden));
  render();
});

byId('answer-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = answer.value.trim();
  const correct = Math.abs(Number(value) * 100 - position) < 0.05;
  feedback.className = 'feedback bad';
  if (Math.abs(position - thickness[sample.value]) > 1e-6) {
    feedback.textContent = sample.value === 'zero' ? '请先将螺杆闭合。' : '请先让螺杆接触试件。';
  } else if (!/^\d+(?:\.\d{1,3})?$/.test(value)) {
    feedback.textContent = '请输入毫米数值，估读到三位小数。';
  } else if (correct) {
    feedback.className = 'feedback good';
    feedback.textContent = `读数正确，测量结果为 ${mm(position)} mm。`;
  } else {
    feedback.textContent = '再检查一下固定刻度的半毫米刻线，以及与基准线对齐的可动刻度刻线。';
  }
});

render();
