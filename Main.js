const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const peso = n => '₱' + n.toLocaleString('en-PH');

/* ---------- Toast ---------- */
let tt;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Nav + scroll reveal ---------- */
const burger = $('#burger'), menu = $('#menu');
burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
$$('#menu a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- 3D phone: drag rotation, views, idle sway ---------- */
const phone = $('#phone'), stage = $('#stage');
const VIEWS = { front: [-6, -14], rear: [-6, 166], side: [0, 78] };
const cur = { rx: -6, ry: -14 }, tgt = { rx: -6, ry: -14 };
let dragging = false, lx = 0, ly = 0, idleAt = 0;

stage.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', e => {
  if (!dragging) return;
  tgt.ry += (e.clientX - lx) * .6; tgt.rx = clamp(tgt.rx - (e.clientY - ly) * .4, -45, 45);
  lx = e.clientX; ly = e.clientY;
});
const endDrag = () => { dragging = false; idleAt = performance.now() + 2500; };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

function setView(v) {
  const [rx, ry] = VIEWS[v];
  tgt.rx = rx; tgt.ry = ry + 360 * Math.round((tgt.ry - ry) / 360); // shortest turn
  idleAt = performance.now() + 2500;
  $$('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
}
$$('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));

(function loop(now) {
  cur.rx += (tgt.rx - cur.rx) * .12; cur.ry += (tgt.ry - cur.ry) * .12;
  const sway = !RM && !dragging && now > idleAt ? Math.sin(now / 1200) * 10 : 0;
  phone.style.transform = `rotateX(${cur.rx}deg) rotateY(${cur.ry + sway}deg)`;
  requestAnimationFrame(loop);
})(0);

/* ---------- Colours (sample colours, not verified) ---------- */
const COLORS = [
  { name: 'Titanium Black', hex: '#3a3b40' }, { name: 'Pearl White', hex: '#e8e8ee' },
  { name: 'Ocean Blue', hex: '#1f5aa6' }, { name: 'Silver Gray', hex: '#9a9fab' },
];
let color = COLORS[0];
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'sw'; b.style.background = c.hex; b.title = c.name; b.setAttribute('aria-label', c.name);
  b.setAttribute('aria-pressed', i === 0);
  b.onclick = () => {
    color = c; phone.style.setProperty('--body', c.hex);
    $$('.sw').forEach(x => x.setAttribute('aria-pressed', x === b));
    $('#cname').textContent = c.name; $('#selc').textContent = c.name;
  };
  $('#swatches').appendChild(b);
});

/* ---------- Camera zoom (simulated digital zoom on a sample photo) ---------- */
const photo = $('#photo'), view = $('#view'), zr = $('#zr'), mark = $('#mark');
const ZOOMS = [.5, 1, 2, 3, 5, 10, 20, 50, 100];
ZOOMS.forEach(z => {
  const b = document.createElement('button'); b.className = 'chip'; b.dataset.z = z; b.textContent = z + '×';
  $('#zbtns').appendChild(b);
});
// scale = zoom * 2, so 0.5× shows the whole picture and 1× is the main-lens crop
let Z = .5, X = 0, Y = 0, F = null;
function paint() {
  const W = view.clientWidth, H = view.clientHeight, k = Z * 2;
  X = clamp(X, W * (1 - k), 0); Y = clamp(Y, H * (1 - k), 0);
  photo.style.transform = `translate(${X}px,${Y}px) scale(${k})`;
  $('#zv').textContent = (+Z.toFixed(1)) + '×';
  zr.value = Z;
  $$('#zbtns .chip, #lenses .chip').forEach(b => b.classList.remove('on'));
  $$('#zbtns .chip').forEach(b => b.classList.toggle('on', +b.dataset.z === Z));
  const lens = Z < 1 ? 0 : Z < 3.7 ? 1 : Z < 10 ? 2 : 3;
  $$('#lenses .chip')[lens].classList.add('on');
}
function setZoom(nz) {
  nz = clamp(nz, .5, 100);
  const W = view.clientWidth, H = view.clientHeight, p = F || { x: W / 2, y: H / 2 }, r = nz / Z;
  X = p.x - (p.x - X) * r; Y = p.y - (p.y - Y) * r; Z = nz; paint();
}
$$('#zbtns .chip, #lenses .chip').forEach(b => b.onclick = () => setZoom(+b.dataset.z));
zr.addEventListener('input', () => setZoom(+zr.value));
$('#reset').onclick = () => { F = null; mark.style.opacity = 0; Z = .5; X = Y = 0; setZoom(1); };

let pd = false, moved = 0, px = 0, py = 0;
view.addEventListener('pointerdown', e => { pd = true; moved = 0; px = e.clientX; py = e.clientY; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointermove', e => {
  if (!pd) return;
  const dx = e.clientX - px, dy = e.clientY - py; moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 4) { view.classList.add('drag'); X += dx; Y += dy; paint(); }
  px = e.clientX; py = e.clientY;
});
view.addEventListener('pointerup', e => {
  pd = false; view.classList.remove('drag');
  if (moved <= 4) { // click = choose the zoom centre
    const r = view.getBoundingClientRect(); F = { x: e.clientX - r.left, y: e.clientY - r.top };
    mark.style.left = F.x + 'px'; mark.style.top = F.y + 'px'; mark.style.opacity = 1;
    setTimeout(() => mark.style.opacity = 0, 1200);
  }
});
addEventListener('resize', paint);
Z = .5; setZoom(1);

/* ---------- Battery simulation ---------- */
let charging = false;
$('#charge').onclick = () => {
  if (charging) return; charging = true;
  const bat = $('.bat'), t0 = performance.now(), dur = RM ? 300 : 5000;
  bat.classList.add('charging'); $('#charge').textContent = 'Charging…';
  (function step(n) {
    const p = clamp((n - t0) / dur, 0, 1), v = Math.round(p * 100);
    $('#fill').style.width = v + '%'; $('#pct').textContent = v + '%';
    if (p < 1) return requestAnimationFrame(step);
    bat.classList.remove('charging'); $('#charge').textContent = 'Flash Charging'; charging = false;
  })(t0);
};

/* ---------- Specification tabs (only confirmed data; others marked) ---------- */
const NC = 'Not confirmed';
const SPECS = {
  Display: [['Size', '6.82 inches'], ['Panel', '2K AMOLED'], ['Resolution', '1216 x 2640 pixels'], ['Refresh rate', '120Hz']],
  Performance: [['Processor', 'Qualcomm Snapdragon 8 Elite Gen 5 (3 nm)'], ['GPU', 'Arm G1-Ultra'], ['RAM', '12GB or 16GB (sources differ)'], ['Storage', '512GB, up to 1TB']],
  Camera: [['Main', '200MP, f/1.9, Gimbal OIS'], ['Telephoto', '200MP, f/2.7, 3.7× zoom, OIS'], ['Ultra-wide', '50MP, f/2.0, OIS'], ['Extenders', 'ZEISS 200mm and 400mm (optional)']],
  Battery: [['Capacity', '6600mAh'], ['Wired', '100W vivos FlashCharge'], ['Wireless', '40W']],
  Software: [['OS', 'Android 16 with OriginOS 6'], ['Updates', 'Up to 5 years OS, 7 years security'], ['Connectivity', '5G, Wi-Fi 7, NFC, IR'], ['Security', 'Ultrasonic fingerprint scanner'], ['Audio', 'Stereo speakers']],
  Body: [['Dimensions', '150.6 x 71.9 x 8 mm (5.93 x 2.83 x 0.31 in)'], ['Weight', '190 g (6.70 oz)'], ['Water / dust', 'IP69']],
};
const tabs = $('#tabs'), panel = $('#panel');
function showTab(name) {
  $$('.chip', tabs).forEach(b => { const on = b.textContent === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  panel.innerHTML = SPECS[name].map(([k, v]) => `<div class="spec"><small>${k}</small>${v === NC ? `<span class="na">${v}</span>` : v}</div>`).join('');
}
Object.keys(SPECS).forEach(n => {
  const b = document.createElement('button'); b.className = 'chip'; b.textContent = n; b.setAttribute('role', 'tab');
  b.onclick = () => showTab(n); tabs.appendChild(b);
});
showTab('Display');

/* ---------- Configuration + cart (demo; no real purchase) ---------- */
const CONFIGS = [
  { name: '512GB · Phone only', price: 109999 },
  { name: '512GB · with 200mm ZEISS Telephoto Kit', price: 123998 },
  { name: '512GB · Photographer Kit', price: 149999 },
];
let cfg = CONFIGS[0], cart = 0;
function renderCfg() {
  $('#sel').textContent = cfg.name; $('#price').textContent = peso(cfg.price);
  $$('.opt').forEach((o, i) => o.setAttribute('aria-checked', CONFIGS[i] === cfg));
}
CONFIGS.forEach(c => {
  const b = document.createElement('button'); b.className = 'opt'; b.setAttribute('role', 'radio');
  b.innerHTML = `<span>${c.name}</span><b>${peso(c.price)}</b>`;
  b.onclick = () => { cfg = c; renderCfg(); };
  $('#opts').appendChild(b);
});
renderCfg();
$('#addCart').onclick = () => { cart++; $('#cc').textContent = cart; toast(`Added: ${cfg.name} (${color.name}) — demo cart`); };
$('#buyNow').onclick = () => toast('Demo page: no order placed. Please buy from vivos’s official channels.');