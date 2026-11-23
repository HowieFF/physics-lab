'use strict';

const element = id => document.getElementById(id);
const instrument = element('caliper');
const enlarged = element('caliper-scale');
const slider = element('caliper-position');
const sample = element('caliper-sample');
const status = element('caliper-status');
const feedback = element('caliper-feedback');
const answer = element('caliper-answer');
const hint = element('caliper-hint');
const reading = element('caliper-reading');
const precision = element('caliper-precision');
const mode = element('caliper-mode');
const sampleSets = {
  external: { cylinder: 2340, block: 4120, plate: 1280, zero: 0 },
  internal: { cylinder: 3260, block: 5680, plate: 1840, zero: 0 },
  depth: { cylinder: 3520, block: 6240, plate: 2160, zero: 0 },
};
const sampleNames = {
  external: ['试件 A · 圆柱', '试件 B · 量块', '试件 C · 薄板'],
  internal: ['试件 A · 圆环', '试件 B · 套筒', '试件 C · 方孔'],
  depth: ['试件 A · 盲孔', '试件 B · 深槽', '试件 C · 台阶孔'],
};
let samples = sampleSets.external;
let divisions = 20;
let vernierPitch = 0.95;
const initialPosition = 5000;
const maximum = 15000;
let division = 5;
const overviewZoom = 4;
let detailZoom = 28;
let position = initialPosition;
let showingReading = false;
let drag = null;

function text(ctx, value, x, y, size = 16, color = '#cfddd7', align = 'left') {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
}

function line(ctx, x1, y1, x2, y2, color = '#263d41', width = 1.2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function rectangle(ctx, x, y, width, height, fill, radius = 0) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function metal(ctx, y, height) {
  const fill = ctx.createLinearGradient(0, y, 0, y + height);
  fill.addColorStop(0, '#7d989b');
  fill.addColorStop(0.35, '#d0dcd8');
  fill.addColorStop(1, '#718c8f');
  return fill;
}

function shape(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#b0c4c3';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function parts() {
  const whole = Math.floor(position / 100);
  const aligned = (position % 100) / division;
  return { whole, aligned };
}

function drawOverview() {
  const ctx = instrument.getContext('2d');
  const origin = 160;
  const jaw = origin + position / 100 * overviewZoom;
  const steel = metal(ctx, 100, 250);
  ctx.clearRect(0, 0, 960, 400);
  ctx.save();
  if (mode.value === 'depth') {
    ctx.translate(14, 90);
    ctx.scale(0.61, 0.61);
  } else if (divisions === 50) {
    ctx.translate(14, 20);
    ctx.scale(0.88, 0.88);
  }
  if (mode.value === 'internal' && sample.value !== 'zero') {
    const width = samples[sample.value] / 100 * overviewZoom;
    ctx.beginPath();
    ctx.roundRect(129, 68, width + 32, 94, 16);
    ctx.roundRect(145, 83, width, 65, 5);
    ctx.fillStyle = '#c39358';
    ctx.fill('evenodd');
  }

  // The measuring faces share the same zero as the main and vernier scales.
  shape(ctx, [[145,95],[145,132],[151,132],[151,151],[164,170],[177,170],[158,128]], steel);
  shape(ctx, [[jaw-15,95],[jaw-15,132],[jaw-21,132],[jaw-21,151],[jaw-34,170],[jaw-47,170],[jaw-28,128]], steel);
  rectangle(ctx, 128, 167, 750, 44, metal(ctx, 167, 44), 3);
  if (mode.value !== 'depth') rectangle(ctx, 874, 177, 22, 20, '#537175', 2);
  line(ctx, origin, 196, 860, 196);
  for (let mm = 0; mm <= 170; mm += 1) {
    const x = origin + mm * overviewZoom;
    line(ctx, x, 196, x, mm % 10 === 0 ? 181 : mm % 5 === 0 ? 186 : 190);
    if (mm % 10 === 0 && mm <= 150) text(ctx, mm, x, 176, 11, '#20383b', 'center');
  }
  // External fixed jaw, with its right face at the main-scale origin.
  shape(ctx, [[128,205],[160,205],[160,338],[150,351],[128,289]], steel);
  // Moving external jaw has its left measuring face at the vernier zero.
  shape(ctx, [[jaw,205],[jaw+35,205],[jaw+35,282],[jaw+13,339],[jaw,351]], steel);

  if (mode.value === 'external' && sample.value !== 'zero') {
    const width = samples[sample.value] / 100 * overviewZoom;
    const color = ctx.createLinearGradient(origin, 0, origin + width, 0);
    color.addColorStop(0, '#b8874e');
    color.addColorStop(0.4, '#edc88e');
    color.addColorStop(1, '#b17e45');
    rectangle(ctx, origin, 280, width, 43, color, sample.value === 'cylinder' ? 10 : 2);
    text(ctx, '试件', origin + width / 2, 369, 15, '#edc88e', 'center');
  }

  const frameWidth = Math.max(151, (divisions - 1) * overviewZoom + 64);
  const grip = jaw + frameWidth - 56;
  const overviewVernierZoom = overviewZoom;
  rectangle(ctx, jaw - 10, 202, frameWidth, 49, metal(ctx, 202, 49), 4);
  line(ctx, jaw - 5, 211, jaw + (divisions - 1) * overviewZoom + 5, 211);
  for (let tick = 0; tick <= divisions; tick += 1) {
    const x = jaw + tick * vernierPitch * overviewVernierZoom;
    line(ctx, x, 211, x, tick % 5 === 0 ? 230 : 222);
    if (tick % 5 === 0) text(ctx, tick, x, 241, 11, '#20383b', 'center');
  }
  rectangle(ctx, grip, 209, 34, 34, '#365756', 4);
  for (let x = grip + 4; x < grip + 32; x += 4) line(ctx, x, 213, x, 239, '#89a29b');
  rectangle(ctx, jaw + 91, 151, 22, 15, '#526d70', 3);
  line(ctx, jaw + 93, 156, jaw + 110, 156, '#c4d5cc');
  text(ctx, `0–150 mm · ${(division / 100).toFixed(2)} mm`, 730, 280, 16, '#9fb8b2', 'center');

  line(ctx, 146, 112, 110, 46, '#7e9e96');
  text(ctx, '内测量爪', 110, 30, 17, '#cfddd7', 'center');
  line(ctx, 143, 308, 87, 311, '#7e9e96');
  text(ctx, '外测量爪', 78, 288, 17, '#cfddd7', 'center');
  line(ctx, 720, 165, 720, 124, '#7e9e96');
  text(ctx, '主尺', 720, 110, 17, '#cfddd7', 'center');
  line(ctx, jaw + 102, 151, jaw + 102, 91, '#7e9e96');
  text(ctx, '紧固螺钉', jaw + 102, 76, 17, '#cfddd7', 'center');
  line(ctx, grip + 17, 250, grip + 17, 284, '#7e9e96');
  text(ctx, '尺框', grip + 17, 300, 17, '#cfddd7', 'center');
  line(ctx, jaw + 49, 251, jaw + 49, 264, '#7e9e96');
  text(ctx, '游标', jaw + 49, 278, 17, '#cfddd7', 'center');
  if (mode.value === 'depth') {
    const end = 878 + position / 100 * overviewZoom;
    if (sample.value !== 'zero') {
      const floor = 878 + samples[sample.value] / 100 * overviewZoom;
      rectangle(ctx, 878, 133, floor - 878 + 20, 30, '#be945d', 2);
      rectangle(ctx, 878, 215, floor - 878 + 20, 30, '#be945d', 2);
      rectangle(ctx, floor, 133, 20, 112, '#be945d', 2);
      text(ctx, '孔底', floor + 10, 275, 23, '#e9c78d', 'center');
      line(ctx, 878, 119, 878, 254, '#d4ef98', 2);
      text(ctx, '基准面', 862, 102, 23, '#d4ef98', 'center');
    }
    rectangle(ctx, 878, 185, end - 878, 8, '#d0dfdb', 1);
    line(ctx, 878 + (end - 878) / 2, 194, 878 + (end - 878) / 2, 306, '#7e9e96');
    text(ctx, '深度尺', 878 + (end - 878) / 2, 326, 23, '#cfddd7', 'center');
  }
  ctx.restore();
}

function detailGeometry() {
  const whole = Math.floor(position / 100);
  return {
    origin: 126 - whole * detailZoom,
    zero: 126 + (position % 100) / 100 * detailZoom,
    whole,
  };
}

function drawDetail() {
  const ctx = enlarged.getContext('2d');
  const { origin, zero, whole } = detailGeometry();
  const { aligned } = parts();
  const ink = '#213b3e';
  ctx.clearRect(0, 0, 960, 270);
  text(ctx, '主尺 / mm', 30, 26, 19);
  text(ctx, '游标 / 格序号', 30, 241, 18);
  rectangle(ctx, 24, 47, 912, 82, metal(ctx, 47, 82), 5);
  line(ctx, 24, 126, 936, 126, ink, 1.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(24, 47, 912, 82);
  ctx.clip();
  const start = Math.max(0, whole - Math.ceil(110 / detailZoom));
  for (let mm = start; mm <= Math.min(150, whole + Math.ceil(820 / detailZoom)); mm += 1) {
    const x = origin + mm * detailZoom;
    line(ctx, x, 126, x, mm % 5 === 0 ? 78 : 94, ink, mm % 5 === 0 ? 2 : 1.2);
    if (detailZoom >= 22 || mm % 5 === 0) text(ctx, mm, x, 65, 15, ink, 'center');
  }
  ctx.restore();

  rectangle(ctx, zero - 19, 135, divisions * vernierPitch * detailZoom + 39, 76, metal(ctx, 135, 76), 5);
  line(ctx, zero - 12, 138, zero + divisions * vernierPitch * detailZoom + 12, 138, ink, 1.5);
  for (let tick = 0; tick <= divisions; tick += 1) {
    const x = zero + tick * vernierPitch * detailZoom;
    line(ctx, x, 138, x, tick % 5 === 0 ? 178 : 164, ink, tick % 5 === 0 ? 2 : 1.2);
    if (tick % 5 === 0) text(ctx, tick, x, 194, 17, ink, 'center');
  }
  // Reveal the aligned line only when the learner asks for the reading.
  if (showingReading) {
    const x = zero + aligned * vernierPitch * detailZoom;
    line(ctx, x, 95, x, 178, '#1c734e', 3);
    text(ctx, `第 ${aligned} 格对齐`, 890, 241, 17, '#d4ef98', 'right');
  }
}

function render() {
  const closed = position === samples[sample.value];
  status.textContent = closed ? (sample.value === 'zero' ? '已闭合 · 零点对齐' : mode.value === 'internal' ? '已接触孔壁' : mode.value === 'depth' ? '已接触孔底' : '已接触试件') : '未接触';
  status.classList.toggle('contact', closed);
  slider.value = position;
  const { whole, aligned } = parts();
  reading.textContent = `主尺 ${whole} mm + 游标第 ${aligned} 格 × ${(division / 100).toFixed(2)} mm = ${(position / 100).toFixed(divisions === 10 ? 1 : 2)} mm`;
  reading.hidden = !showingReading;
  slider.setAttribute('aria-valuetext', showingReading ? `${(position / 100).toFixed(divisions === 10 ? 1 : 2)} 毫米` : status.textContent);
  drawOverview();
  drawDetail();
}

function setPosition(requested) {
  const target = samples[sample.value];
  const lower = sample.value !== 'zero' && mode.value === 'external' ? target : 0;
  const upper = sample.value !== 'zero' && mode.value !== 'external' ? target : maximum;
  const next = Math.max(lower, Math.min(upper, Math.round(requested / division) * division));
  if (next !== position) feedback.textContent = '';
  position = next;
  render();
}

function reset() {
  drag = null;
  showingReading = false;
  hint.textContent = '显示读数';
  hint.setAttribute('aria-expanded', 'false');
  answer.value = '';
  feedback.textContent = '';
  const target = samples[sample.value];
  setPosition(sample.value === 'zero' ? 1000 : mode.value === 'external' ? Math.max(initialPosition, target + 1000) : 0);
}

function pointerPoint(event, canvas) {
  const bounds = canvas.getBoundingClientRect();
  let x = (event.clientX - bounds.left) * canvas.width / bounds.width;
  let y = (event.clientY - bounds.top) * canvas.height / bounds.height;
  if (canvas === instrument && mode.value === 'depth') {
    x = (x - 14) / 0.61;
    y = (y - 90) / 0.61;
  } else if (canvas === instrument && divisions === 50) {
    x = (x - 14) / 0.88;
    y = (y - 20) / 0.88;
  }
  return { x, y };
}

function overSlider(canvas, point) {
  if (canvas === instrument) {
    const jaw = 160 + position / 100 * overviewZoom;
    return point.x >= jaw - 12 && point.x <= jaw + Math.max(151, (divisions - 1) * overviewZoom + 64) - 8 && point.y >= 149 && point.y <= 352;
  }
  const { zero } = detailGeometry();
  return point.x >= zero - 19 && point.x <= zero + divisions * vernierPitch * detailZoom + 20 && point.y >= 135 && point.y <= 211;
}

for (const canvas of [instrument, enlarged]) {
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const point = pointerPoint(event, canvas);
    if (!overSlider(canvas, point)) return;
    event.preventDefault();
    drag = { id: event.pointerId, canvas, x: point.x, remainder: 0 };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('turning');
  });
  canvas.addEventListener('pointermove', event => {
    const point = pointerPoint(event, canvas);
    if (drag?.canvas === canvas && drag.id === event.pointerId) {
      const zoom = canvas === instrument ? overviewZoom : detailZoom;
      const delta = drag.remainder + (point.x - drag.x) / zoom * 100 * (event.shiftKey ? 0.1 : 1);
      const applied = Math.trunc((delta + Math.sign(delta) * 1e-9) / division) * division;
      drag.remainder = delta - applied;
      drag.x = point.x;
      if (applied) setPosition(position + applied);
    } else if (!drag) {
      canvas.classList.toggle('draggable', overSlider(canvas, point));
    }
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (drag?.canvas !== canvas || drag.id !== event.pointerId) return;
    drag = null;
    canvas.classList.remove('turning');
  });
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || !event.deltaY || !overSlider(canvas, pointerPoint(event, canvas))) return;
    event.preventDefault();
    setPosition(position + Math.sign(event.deltaY) * division);
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    const steps = { ArrowLeft: -division, ArrowRight: division, Home: -maximum, End: maximum };
    if (!(event.key in steps)) return;
    event.preventDefault();
    setPosition(position + steps[event.key] * (event.shiftKey && event.key.startsWith('Arrow') ? 20 : 1));
  });
}

slider.addEventListener('input', () => setPosition(Number(slider.value)));
sample.addEventListener('change', reset);
element('caliper-reset').addEventListener('click', reset);
hint.addEventListener('click', () => {
  showingReading = !showingReading;
  hint.textContent = showingReading ? '隐藏读数' : '显示读数';
  hint.setAttribute('aria-expanded', String(showingReading));
  render();
});
element('caliper-form').addEventListener('submit', event => {
  event.preventDefault();
  feedback.className = 'feedback bad';
  const value = answer.value.trim();
  if (position !== samples[sample.value]) {
    feedback.textContent = sample.value === 'zero' ? '请先闭合卡尺，检查零点。' : mode.value === 'internal' ? '请向外张开内测量爪，直到接触孔壁。' : mode.value === 'depth' ? '请伸出深度尺，直到接触孔底。' : '请先让两侧测量面接触试件。';
  } else if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    feedback.textContent = '请输入毫米数值，最多保留两位小数。';
  } else if (Math.abs(Number(value) * 100 - position) < 1e-6) {
    feedback.className = 'feedback good';
    feedback.textContent = `读数正确，结果为 ${(position / 100).toFixed(divisions === 10 ? 1 : 2)} mm。`;
  } else {
    feedback.textContent = '检查游标零刻线左侧的主尺读数，再数出对齐的游标格序号。';
  }
});

function configure() {
  divisions = Number(precision.value);
  division = 100 / divisions;
  vernierPitch = (divisions - 1) / divisions;
  detailZoom = Math.min(28, 700 / (divisions - 1));
  samples = sampleSets[mode.value];
  slider.step = division;
  for (let index = 0; index < 3; index += 1) sample.options[index].textContent = sampleNames[mode.value][index];
  element('caliper-spec').textContent = `${divisions} 分度 · 分度值 ${(division / 100).toFixed(2)} mm`;
  element('caliper-principle').textContent = `游标的 ${divisions} 格等于主尺的 ${divisions - 1} mm，每格长 ${vernierPitch.toFixed(2)} mm，比主尺一格短 ${(division / 100).toFixed(2)} mm。`;
  element('caliper-howto').textContent = mode.value === 'external'
    ? '用外测量爪夹住试件；左移闭合，右移张开。'
    : mode.value === 'internal'
      ? '内测量爪已放入孔内；向右张开，让两侧外测量面接触孔壁。'
      : '尺身端面贴住孔口基准面；右移尺框伸出深度尺，直到探到孔底。';
  element('caliper-formula').textContent = `读数 = 主尺整毫米数 + 对齐格序号 × ${(division / 100).toFixed(2)} mm。结果保留 ${divisions === 10 ? '一' : '两'}位小数。`;
  element('caliper-scale-note').textContent = `先读游标零刻线左侧的主尺整毫米数，再找对齐的游标刻线。每格读数差 ${(division / 100).toFixed(2)} mm，放大窗口随尺框位置平移。`;
  element('caliper-title').textContent = `游标卡尺 · ${mode.value === 'external' ? '外径' : mode.value === 'internal' ? '内径' : '深度'}测量`;
  reset();
}
precision.addEventListener('change', configure);
mode.addEventListener('change', configure);
configure();
