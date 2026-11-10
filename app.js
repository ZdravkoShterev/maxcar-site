(function () {
  const CARS = (window.CARS || []).map((c, i) => {
    // чисто заглавие: "BMW 228 I = 2024 = ..." -> модел + подзаглавие без служебните думи
    const sub = (c.sub || '').split('=').map(s => s.trim()).filter(Boolean)
      .filter(s => !/^(лизинг|гаранци[а-яА-Я]*)$/i.test(s));
    // кратък суфикс на модела (D, I, CDI…) е попаднал в подзаглавието – връщаме го към модела
    let make = c.make, model = c.model;
    if (make === 'Land' && /^Rover/i.test(model)) { make = 'Land Rover'; model = model.replace(/^Rover\s*/i, ''); }
    if (sub.length && sub[0].length <= 3 && !/^(4x4|top|топ|v6|v8)$/i.test(sub[0])) model += ' ' + sub.shift();
    return Object.assign({}, c, { order: i, make, model, subClean: sub.join(' · ') });
  });
  const $ = s => document.querySelector(s);
  const fmt = n => n.toLocaleString('bg-BG').replace(/ /g, ' ');
  const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const hpNum = h => (h.match(/\d+/) || [''])[0];

  const set = (s, v) => { const e = $(s); if (e) e.textContent = v; };
  set('#statCars', CARS.length); set('#statCars2', CARS.length); set('#yr', new Date().getFullYear());

  // снимки на началната страница
  const hero = CARS.slice().sort((a, b) => (b.price || 0) - (a.price || 0)).filter(c => c.photos[0]);
  const heroEl = $('#heroBg');
  if (heroEl) {
    const img = new Image();
    img.onload = () => heroEl.style.backgroundImage = 'url(assets/hero.jpg)';
    img.onerror = () => { if (hero[1]) heroEl.style.backgroundImage = `url(${hero[1].photos[0]})`; };
    img.src = 'assets/hero.jpg';
  }
  const pick = re => CARS.find(c => re.test(c.title));
  const lea = pick(/S 560/i) || hero[2];
  if ($('#leasingImg') && lea) $('#leasingImg').style.backgroundImage = `url(${lea.photos[1] || lea.photos[0]})`;
  const abt = pick(/GLE 63/i) || hero[3];
  if ($('#aboutImg') && abt) $('#aboutImg').style.backgroundImage = `url(${abt.photos[2] || abt.photos[0]})`;

  const card = c => `
      <button class="car" data-id="${c.id}">
        <div class="car__img">
          <img loading="lazy" src="${c.photos[0]}" alt="${esc(c.make + ' ' + c.model)}">
          ${c.fullmax ? '<span class="badge">TOP FULL MAX</span>' : ''}
        </div>
        <div class="car__body">
          <h3>${esc(c.make)} ${esc(c.model)}<small>${esc(c.subClean)}</small></h3>
          <div class="meta">
            ${c.year ? `<span>${c.year}</span>` : ''}
            ${c.km ? `<span>${fmt(c.km)} км</span>` : ''}
            ${c.fuel ? `<span>${esc(c.fuel)}</span>` : ''}
            ${c.hp ? `<span>${esc(c.hp)}</span>` : ''}
            ${c.gear ? `<span>${esc(c.gear)}</span>` : ''}
          </div>
          <div class="car__foot">
            <span class="price">${c.price ? fmt(c.price) + ' <small>€</small>' : 'Обади се'}</span>
            <span class="more">Детайли →</span>
          </div>
        </div>
      </button>`;

  // начална страница: подбрани коли
  if ($('#featGrid')) {
    const feat = CARS.filter(c => c.fullmax && c.price).sort((a, b) => b.price - a.price).slice(0, 6);
    $('#featGrid').innerHTML = feat.map(card).join('');
  }

  // начална страница: бърз избор по тип и марка
  const cnt = k => { const m = {}; CARS.forEach(c => { if (c[k]) m[c[k]] = (m[c[k]] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  if ($('#typeTiles')) {
    $('#typeTiles').innerHTML = cnt('body').filter(e => !/лимузин/i.test(e[0])).slice(0, 5)
      .map(([n, k]) => `<a class="tile" href="cars.html?body=${encodeURIComponent(n)}"><b>${esc(n)}</b><span>${k} в наличност</span></a>`).join('');
    $('#brandChips').innerHTML = cnt('make')
      .map(([n, k]) => `<a class="chip" href="cars.html?make=${encodeURIComponent(n)}">${esc(n)}<small>${k}</small></a>`).join('');
  }

  // страница „Автомобили“: филтри
  const fill = (sel, vals) => { const e = $(sel); if (e) vals.forEach(v => e.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`)); };
  const uniq = k => [...new Set(CARS.map(c => c[k]).filter(Boolean))].sort();
  fill('#fMake', uniq('make')); fill('#fFuel', uniq('fuel')); fill('#fGear', uniq('gear')); fill('#fBody', uniq('body'));

  const val = s => { const e = $(s); return e ? e.value : ''; };
  function match(c) {
    const q = val('#q').trim().toLowerCase();
    if (q && !(c.title + ' ' + c.make + ' ' + c.model).toLowerCase().includes(q)) return false;
    if (val('#fMake') && c.make !== val('#fMake')) return false;
    if (val('#fFuel') && c.fuel !== val('#fFuel')) return false;
    if (val('#fGear') && c.gear !== val('#fGear')) return false;
    if (val('#fBody') && c.body !== val('#fBody')) return false;
    const p = val('#fPrice');
    if (p) {
      const max = +p, min = max === 999999 ? 50000 : 0;
      if (!c.price || c.price > max || c.price <= min) return false;
    }
    if (val('#fYear') && (!c.year || c.year < +val('#fYear'))) return false;
    if (val('#fKm') && (!c.km || c.km > +val('#fKm'))) return false;
    if ($('#fFull') && $('#fFull').checked && !c.fullmax) return false;
    return true;
  }
  const sorters = {
    new: (a, b) => a.order - b.order,
    pa: (a, b) => (a.price || 1e9) - (b.price || 1e9),
    pd: (a, b) => (b.price || 0) - (a.price || 0),
    yd: (a, b) => (b.year || 0) - (a.year || 0),
    ka: (a, b) => (a.km || 1e9) - (b.km || 1e9),
  };
  function render() {
    const list = CARS.filter(match).sort(sorters[val('#fSort') || 'new']);
    set('#count', `Показани: ${list.length} от ${CARS.length}`);
    $('#empty').hidden = list.length > 0;
    $('#grid').innerHTML = list.map(card).join('');
  }
  if ($('#grid')) {
    ['#q', '#fMake', '#fFuel', '#fGear', '#fBody', '#fPrice', '#fYear', '#fKm', '#fSort', '#fFull'].forEach(s => $(s).addEventListener('input', render));
    $('#fReset').onclick = () => { document.querySelectorAll('.filters input,.filters select').forEach(e => e.type === 'checkbox' ? e.checked = false : e.value = e.id === 'fSort' ? 'new' : ''); render(); };
    // ?make=BMW от линк
    const qs = new URLSearchParams(location.search);
    if (qs.get('make')) $('#fMake').value = qs.get('make');
    if (qs.get('body')) $('#fBody').value = qs.get('body');
    render();
  }

  // модал
  let cur = null, idx = 0;
  function show(i) {
    idx = (i + cur.photos.length) % cur.photos.length;
    $('#gMain').src = cur.photos[idx];
    document.querySelectorAll('#gTh img').forEach((im, k) => im.classList.toggle('on', k === idx));
  }
  function open(id) {
    cur = CARS.find(c => c.id === id); if (!cur) return;
    $('#mMake').textContent = cur.make + (cur.fullmax ? ' · TOP FULL MAX' : '');
    $('#mTitle').textContent = `${cur.make} ${cur.model}` + (cur.subClean ? ' · ' + cur.subClean : '');
    $('#gMain').alt = $('#mTitle').textContent;
    $('#mPrice').innerHTML = cur.price ? fmt(cur.price) + ' €' : 'Цена: обади се';
    $('#gTh').innerHTML = cur.photos.map((p, k) => `<img loading="lazy" src="${p}" data-k="${k}" alt="Снимка ${k + 1}">`).join('');
    const rows = [['Година', cur.year], ['Пробег', cur.km ? fmt(cur.km) + ' км' : ''], ['Двигател', cur.fuel], ['Мощност', cur.hp],
      ['Кубатура', cur.cc], ['Скоростна кутия', cur.gear], ['Купе', cur.body], ['Цвят', cur.color], ['Евростандарт', cur.euro]]
      .filter(r => r[1]);
    $('#mSpec').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${esc(r[1])}</dd>`).join('');
    $('#mLink').href = cur.url;
    $('#mWa').href = 'https://wa.me/359895555335?text=' + encodeURIComponent('Здравейте, интересувам се от ' + cur.make + ' ' + cur.model + (cur.year ? ' ' + cur.year : '') + ' (' + cur.url + ')');
    $('#modal').hidden = false; document.body.style.overflow = 'hidden';
    show(0);
  }
  function close() { $('#modal').hidden = true; document.body.style.overflow = ''; }
  [$('#grid'), $('#featGrid')].filter(Boolean).forEach(g => g.addEventListener('click', e => { const b = e.target.closest('.car'); if (b) open(b.dataset.id); }));
  $('#gTh').addEventListener('click', e => { if (e.target.dataset.k) show(+e.target.dataset.k); });
  $('#gPrev').onclick = () => show(idx - 1); $('#gNext').onclick = () => show(idx + 1);
  document.querySelectorAll('[data-close]').forEach(el => el.onclick = close);
  document.addEventListener('keydown', e => {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // мобилно меню
  const nav = $('#nav');
  $('#burger').onclick = () => nav.classList.toggle('open');
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') nav.classList.remove('open'); });
})();
