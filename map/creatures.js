// Conshy Eats crew: original fantasy creatures (toon-shaded, ink outlines). One species per spot, tier = evolution stage.
// window.CREATURES.make(THREE, spot, grad) -> THREE.Group  (feet at y=0, faces +z; userData.body hops; userData.tick(dt,T) idle life)
// window.CREATURES.speciesOf(spot) -> species key; CREATURES.SPECIES -> {key:{name}}; CREATURES.FORMS -> form names per tier.
(function () {
  'use strict';
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const SPECIES = {
    emberfox: { name: 'Emberfox' }, bubblotter: { name: 'Bubblotter' }, fernfawn: { name: 'Fernfawn' }, sparkit: { name: 'Sparkit' },
    cragpup: { name: 'Cragpup' }, nimbowl: { name: 'Nimbowl' }, lumoth: { name: 'Lumoth' }, wyrmlet: { name: 'Wyrmlet' },
    wispurr: { name: 'Wispurr' }, honeycub: { name: 'Honeycub' }
  };
  const TIERF = { Common: 0, Uncommon: 1, Rare: 1, Unique: 2, Legendary: 3, Closed: 0 };
  const FORMS = { Common: 'Baby', Uncommon: 'Evolved', Rare: 'Evolved ★', Unique: 'Mystic', Legendary: 'Legendary' };

  function speciesOf(s) {
    const n = String(s.n || '').toLowerCase(), c = String(s.c || '').toLowerCase(), k = s.k, ent = (s.ent || []).map(e => e.type || e);
    if (/cigar|lounge|night|speakeasy/.test(n)) return 'wispurr';
    if (/boat|oyster|fish|seafood|crab|sushi/.test(n) || /seafood|fish|sushi/.test(c)) return 'bubblotter';
    if (/dunkin|donut|bagel|bake|bread|honey|federal/.test(n) || /bakery|donut/.test(c)) return 'honeycub';
    if (/rita|scoops|dairy queen|ice|gelato|sweet|dessert/.test(n) || /ice|dessert/.test(c) || k === 'ice_cream') return 'lumoth';
    if (/pizza|pizzeria|illiano|franzone|domino|roni|tomato/.test(n) || /pizza|italian/.test(c) || /lucca|totaro|pepperoncini/.test(n)) return 'cragpup';
    if (/coyote|limon|qdoba|taco|hot chicken|masala|greek|mezeh/.test(n) || /mexican|indian|greek|mediterranean|thai/.test(c)) return 'wyrmlet';
    if (/pho|noodle|saigon|win wah|dragon & phoenix|chiang/.test(n) || /chinese|vietnam|japanese|asian/.test(c)) return 'bubblotter';
    if (k === 'cafe' || /cafe|coffee|starbucks|feine|brunch|panera|salad|nudy|bagel/.test(n)) return 'fernfawn';
    if (ent.some(e => /live-music|games|trivia|karaoke|dj|comedy/.test(e))) return 'sparkit';
    if (k === 'bar' || k === 'pub' || /pub|tavern|saloon|brew|grill|wing|fingers|outback|steak|burger|mcdonald|whelihan/.test(n) || k === 'fast_food') return 'emberfox';
    if ((s.price || 1) >= 3) return 'nimbowl';
    return ['fernfawn', 'nimbowl', 'cragpup', 'emberfox'][hash(s.id) % 4];
  }

  // ---------- shared kit (geometries + materials are created once and reused by every creature) ----------
  let KIT = null;
  function kit(THREE, grad) {
    if (KIT && KIT.THREE === THREE) return KIT;
    const G = {
      sph: new THREE.SphereGeometry(1, 18, 12), sphLo: new THREE.SphereGeometry(1, 10, 8), cone: new THREE.ConeGeometry(1, 1, 12), cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
      tor: new THREE.TorusGeometry(1, .08, 6, 40), torFat: new THREE.TorusGeometry(1, .3, 8, 20), rock: new THREE.DodecahedronGeometry(1, 0), oct: new THREE.OctahedronGeometry(1, 0),
      box: new THREE.BoxGeometry(1, 1, 1), half: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    };
    G.cone.translate(0, .5, 0); G.cyl.translate(0, .5, 0); // grow up from the attach point
    const M = {}, toon = (c, flat) => { const k = c + (flat ? 'f' : ''); return M[k] || (M[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: grad })); };
    const B = {}, glow = (c, o = 1) => { const k = c + '|' + o; return B[k] || (B[k] = new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1 })); };
    const INK = new THREE.MeshBasicMaterial({ color: '#241f1c', side: THREE.BackSide });
    return KIT = { THREE, G, toon, glow, INK };
  }

  function make(THREE, spot, grad) {
    const K = kit(THREE, grad), { G, toon, glow, INK } = K;
    const sp = speciesOf(spot), tier = spot.tier || 'Common', f = TIERF[tier] ?? 0, rare = tier === 'Rare', r = rng(hash(spot.id || sp));
    const g = new THREE.Group(), body = new THREE.Group(), core = new THREE.Group(); g.add(body); body.add(core);
    const life = { eyes: [], wag: [], flick: [], flap: [], float: 0, blinkAt: 1 + r() * 4, ph: r() * 6 };
    // P(parent, geometry, color|material, pos, scale, rot, opts) -> mesh (with an ink hull unless ink:false)
    const P = (par, geo, col, p = [0, 0, 0], s = [1, 1, 1], rot = [0, 0, 0], o = {}) => {
      const mat = typeof col === 'string' ? (o.glow ? glow(col, o.op ?? 1) : toon(col, o.flat)) : col;
      const m = new THREE.Mesh(G[geo], mat); m.position.set(...p); m.scale.set(...(typeof s === 'number' ? [s, s, s] : s)); m.rotation.set(...rot); m.castShadow = !o.glow;
      if (o.ink !== false && !o.glow) { const k = new THREE.Mesh(G[geo], INK); k.scale.setScalar(1 + (o.inkW ?? .07)); m.add(k); }
      par.add(m); return m; };
    const grp = (par, p = [0, 0, 0], rot = [0, 0, 0]) => { const q = new THREE.Group(); q.position.set(...p); q.rotation.set(...rot); par.add(q); return q; };
    // big expressive eye: sclera, coloured iris, pupil, two highlights
    const eye = (par, x, y, z, sz, iris, o = {}) => { const e = grp(par, [x, y, z], [0, (o.turn || 0) + (x > 0 ? .18 : -.18), 0]);
      P(e, 'sph', '#FFFFFF', [0, 0, 0], [sz, sz * 1.22, sz * .55], [0, 0, 0], { inkW: .12 });
      P(e, 'sph', o.glowIris ? glow(iris) : toon(iris), [0, -sz * .08, sz * .38], [sz * .68, sz * .86, sz * .3], [0, 0, 0], { ink: false });
      P(e, 'sph', o.glowIris ? glow('#FFFFFF') : glow('#1C1714'), [0, -sz * .1, sz * .56], [sz * .36, sz * .5, sz * .16], [0, 0, 0], { ink: false, glow: true });
      P(e, 'sphLo', glow('#FFFFFF'), [sz * .26, sz * .34, sz * .62], [sz * .2, sz * .24, sz * .1], [0, 0, 0], { ink: false, glow: true });
      P(e, 'sphLo', glow('#FFFFFF'), [-sz * .18, -sz * .3, sz * .62], [sz * .1, sz * .12, sz * .06], [0, 0, 0], { ink: false, glow: true });
      if (o.lid) P(e, 'half', o.lid, [0, sz * .1, 0], [sz * 1.05, sz * .7, sz * .62], [-.35, 0, 0], { ink: false });
      life.eyes.push(e); return e; };
    const flame = (par, p, s, c1, c2, rot = [0, 0, 0]) => { const q = grp(par, p, rot); const a = P(q, 'cone', c1, [0, 0, 0], [s, s * 2.4, s], [0, 0, 0], { glow: true, op: .92 }); const b = P(q, 'cone', c2, [0, s * .1, 0], [s * .55, s * 1.5, s * .55], [0, 0, 0], { glow: true });
      life.flick.push(q); return q; };
    const halo = (y, c = '#F5CF4A', R = 5.5) => { const h = new THREE.Mesh(G.tor, glow(c)); h.position.set(0, y - R * .45, -3.4); h.rotation.set(-.22, 0, 0); h.scale.setScalar(R * .82); h.userData.spin = .5; g.add(h);
      const h2 = new THREE.Mesh(G.tor, glow(c, .45)); h2.scale.setScalar(.82); h.add(h2); for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(G.oct, glow('#FFF4C2')); const a = i / 6 * Math.PI * 2; d.position.set(Math.cos(a), Math.sin(a), 0); d.scale.setScalar(.09); h.add(d); } return h; };
    const orbit = (y, c, n = 4, R = 5.5, geo = 'oct', s = .45) => { const o = new THREE.Group(); o.position.y = y; o.userData.spin = 1.1; g.add(o);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, m = new THREE.Mesh(G[geo], glow(c)); m.position.set(Math.cos(a) * R, Math.sin(a * 2) * .8, Math.sin(a) * R); m.scale.setScalar(s); o.add(m); } return o; };
    const aura = (y, c, R) => { const a = new THREE.Mesh(G.sphLo, glow(c, .13)); a.position.y = y; a.scale.setScalar(R); a.renderOrder = -1; core.add(a); return a; };
    const rareRing = (y, R, c = '#F5CF4A') => P(core, 'torFat', c, [0, y, .2], [R, R, R * 1.4], [Math.PI / 2 - .25, 0, 0]);
    const hb = f === 0 ? 1.22 : 1; // babies: big heads
    const S = SPECIES_BUILD[sp];
    S({ THREE, K, P, grp, eye, flame, halo, orbit, aura, rareRing, core, g, life, f, rare, hb, r, toon, glow });
    g.scale.setScalar([0.95, 1.12, 1.12, 1.3][f] * (rare ? 1.06 : 1));
    body.userData.isBody = true; g.userData.body = body; g.userData.species = sp; g.userData.form = FORMS[tier] || 'Baby';
    // idle life: breathing, blinking, wagging, flames flickering, wings flapping, floaters bobbing
    g.userData.tick = (dt, T) => {
      const t = T + life.ph; core.scale.y = 1 + Math.sin(t * 2.1) * .025; core.scale.x = core.scale.z = 1 - Math.sin(t * 2.1) * .012;
      if (life.float) core.position.y = life.float + Math.sin(t * 1.6) * .6;
      life.blinkAt -= dt; const blink = life.blinkAt < 0 ? Math.max(.08, Math.abs(Math.sin((-life.blinkAt) * 22))) : 1; if (life.blinkAt < -.14) life.blinkAt = 2.5 + Math.random() * 3.5;
      life.eyes.forEach(e => e.scale.y = blink);
      life.wag.forEach((w, i) => w.o.rotation[w.ax] = w.base + Math.sin(t * w.sp + i) * w.amp);
      life.flick.forEach((q, i) => { const k = 1 + Math.sin(t * 13 + i * 2) * .08 + Math.sin(t * 7.3 + i) * .06; q.scale.set(1 / k, k, 1 / k); });
      life.flap.forEach((w, i) => w.o.rotation[w.ax] = w.base + Math.sin(t * w.sp) * w.amp * (i % 2 ? -1 : 1));
    };
    return g;
  }

  // ---------- the ten species. f: 0 baby, 1 evolved (Uncommon/Rare), 2 mystic (Unique: alt colours + glowing marks + orbit), 3 legendary ----------
  const SPECIES_BUILD = {
    emberfox(c) { const { P, grp, eye, flame, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#3D6FD6' : '#E9762B', cream = '#FFF1DC', dark = mystic ? '#1D3570' : '#7A2E12', f1 = mystic ? '#7FE3FF' : '#FF8A2A', f2 = mystic ? '#E9FBFF' : '#FFE27A';
      const leg = f ? 3.4 : 2.6, ty = leg + 1.6;
      P(core, 'sph', fur, [0, ty, 0], [2.5, 2.3, 3.4]); P(core, 'sph', cream, [0, ty - .5, 1.6], [1.7, 1.7, 1.6]);
      [[-1.4, 2], [1.4, 2], [-1.4, -1.9], [1.4, -1.9]].forEach(([x, z], i) => { const L = grp(core, [x, leg + .2, z]); P(L, 'cyl', fur, [0, -leg, 0], [.62, leg, .62]); P(L, 'sph', dark, [0, -leg + .1, .2], [.75, .5, .9]); life.wag.push({ o: L, ax: 'x', base: 0, amp: .04, sp: 2 + i }); });
      const H = grp(core, [0, ty + 2.4 * hb, 2.6]); const hr = 2.5 * hb;
      P(H, 'sph', fur, [0, 0, 0], [hr, hr * .92, hr]); P(H, 'sph', cream, [0, -hr * .38, hr * .6], [hr * .6, hr * .42, hr * .55]); P(H, 'sph', '#1C1714', [0, -hr * .22, hr * 1.08], [.38, .3, .3]);
      [-1, 1].forEach(sd => { const E = grp(H, [sd * hr * .55, hr * .55, -.2], [0, 0, -sd * (f ? .32 : .22)]); P(E, 'cone', fur, [0, 0, 0], [hr * .38, hr * (f ? 1.25 : .95), hr * .26]); P(E, 'cone', dark, [0, hr * .12, .12], [hr * .22, hr * .75, hr * .1], [0, 0, 0], { ink: false }); life.wag.push({ o: E, ax: 'z', base: E.rotation.z, amp: .05, sp: 1.3 });
        eye(H, sd * hr * .42, hr * .05, hr * .78, hr * .27, mystic ? '#3FD0FF' : '#8B3A12');
        P(H, 'cone', cream, [sd * hr * .85, -hr * .3, hr * .2], [hr * .25, hr * .5, hr * .2], [0, 0, -sd * 1.9]); });
      if (f) P(core, 'cone', cream, [0, ty + .6, 2.8], [1.4, 1.8, .9], [.9, 0, 0]);
      const tails = f === 3 ? 3 : f ? 2 : 1;
      for (let i = 0; i < tails; i++) { const sx = tails === 1 ? 0 : (i - (tails - 1) / 2) * 1.3, T = grp(core, [sx, ty + .2, -3], [-.6, sx * .25, 0]);
        P(T, 'sph', fur, [0, .9, -.8], [1.25, 1.6, 1.25]); P(T, 'sph', fur, [0, 2.6, -1.5], [1.45, 1.6, 1.4]); P(T, 'sph', cream, [0, 4.1, -1.6], [1.1, 1.1, 1.1]);
        flame(T, [0, 4.6, -1.6], .95, f1, f2); life.wag.push({ o: T, ax: 'z', base: 0, amp: .18, sp: 2.2 + i * .4 }); }
      if (f >= 2) [-1, 1].forEach(sd => P(core, 'torFat', mystic ? '#7FE3FF' : '#FFB347', [sd * 1.4, leg * .55, 2], [.75, .75, .75], [Math.PI / 2, 0, 0], { glow: true }));
      if (mystic) orbit(ty + 2, '#9FEFFF', 4, 5.5, 'oct', .5);
      if (rare) rareRing(ty + 1.4, 1.7);
      if (f === 3) { for (let i = 0; i < 9; i++) { const a = -1.25 + i * .31; flame(core, [Math.sin(a) * 2.3, ty + 1.7 + Math.cos(a) * .6, 1.4 + Math.cos(a) * .9], .55, f1, f2, [.4, 0, -a * .8]); } halo(ty + 6.4); aura(ty + 1, '#FFB347', 7); } },

    bubblotter(c) { const { P, grp, eye, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#E07AA8' : '#3E8FBF', belly = '#F5EBD6', dark = mystic ? '#8E3566' : '#1F4E73';
      const by = f ? 4.8 : 4; P(core, 'sph', fur, [0, by, 0], [2.4, 3.2, 2.2]); P(core, 'sph', belly, [0, by - .3, 1.1], [1.8, 2.6, 1.3]);
      [-1, 1].forEach(sd => { P(core, 'sph', dark, [sd * 1.3, .5, .9], [.9, .5, 1.2]); const A = grp(core, [sd * 2.1, by + 1.2, .9], [0, 0, sd * .6]); P(A, 'sph', fur, [0, -1, 0], [.65, 1.3, .65]); life.wag.push({ o: A, ax: 'z', base: sd * .6, amp: .12, sp: 1.8 }); });
      const H = grp(core, [0, by + 3.6 * hb, .3]), hr = 2.45 * hb; P(H, 'sph', fur, [0, 0, 0], [hr, hr * .9, hr * .95]); P(H, 'sph', belly, [0, -hr * .32, hr * .62], [hr * .62, hr * .45, hr * .5]); P(H, 'sph', '#1C1714', [0, -hr * .12, hr * 1.06], [.42, .3, .3]);
      [-1, 1].forEach(sd => { P(H, 'sph', dark, [sd * hr * .78, hr * .62, -.1], [.75, .75, .5]); eye(H, sd * hr * .4, hr * .14, hr * .76, hr * .26, mystic ? '#FF6FB0' : '#2E6B9A'); P(H, 'box', '#1C1714', [sd * hr * .62, -hr * .3, hr * .86], [.9, .08, .08], [0, 0, sd * .18], { ink: false }); });
      const T = grp(core, [0, 1.6, -1.8], [-.5, 0, 0]); P(T, 'sph', dark, [0, 0, -2.2], [1.3, .45, 2.8]); life.wag.push({ o: T, ax: 'y', base: 0, amp: .25, sp: 2.4 });
      if (f) { P(H, 'cone', mystic ? '#FFC6E0' : '#8FE3FF', [0, hr * .8, -.4], [.3, hr * .9, 1.4], [-.3, 0, 0]); [-1, 1].forEach(sd => P(core, 'cone', mystic ? '#FFC6E0' : '#8FE3FF', [sd * 2, by + .5, -1], [.25, 2, 1.2], [-.6, 0, sd * .9])); }
      const bub = new c.THREE.Group(); bub.userData.spin = .7; bub.position.y = by + 1; c.g.add(bub);
      for (let i = 0; i < (f ? 5 : 3); i++) { const a = i * 2.3, m = new c.THREE.Mesh(c.K.G.sphLo, c.glow(mystic ? '#FFD6EA' : '#D8F6FF', .55)); m.position.set(Math.cos(a) * (4 + i * .3), i * 1.2 - 1, Math.sin(a) * (4 + i * .3)); m.scale.setScalar(.45 + (i % 3) * .2); bub.add(m); }
      if (rare) rareRing(by + 2.6, 1.6);
      if (mystic) orbit(by + 3, '#FFB6DA', 4, 5, 'oct', .45);
      if (f === 3) { for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4; P(core, 'cone', '#BDF4FF', [Math.sin(a) * 2.2, by + 2.6, Math.cos(a) * -1.2 - .6], [.5, 2.6, .5], [-.9, 0, a * .5], { glow: true, op: .8 }); } halo(by + 7.6, '#9FF0FF'); aura(by + 1, '#7FE9FF', 7); } },

    fernfawn(c) { const { P, grp, eye, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#C4632E' : '#B88A5A', cream = '#FFF3DE', leaf = mystic ? '#F2B33D' : '#5FA84A', dark = '#4A3324';
      const leg = f ? 4.4 : 3.4, ty = leg + 1.4;
      P(core, 'sph', fur, [0, ty, 0], [2, 2.1, 3.1]); P(core, 'sph', cream, [0, ty - .7, .4], [1.5, 1.4, 2.3]);
      for (let i = 0; i < 5; i++) P(core, 'sphLo', cream, [(i % 2 ? .8 : -.7), ty + 1.9, 1.2 - i * .8], [.38, .14, .38], [0, 0, 0], { ink: false });
      [[-1.1, 1.8], [1.1, 1.8], [-1.1, -1.7], [1.1, -1.7]].forEach(([x, z]) => { P(core, 'cyl', fur, [x, .5, z], [.38, leg, .38]); P(core, 'sph', dark, [x, .45, z + .1], [.45, .45, .55]); });
      const N = grp(core, [0, ty + 1, 2], [.45, 0, 0]); P(N, 'cyl', fur, [0, 0, 0], [.85, 2.4, .85]);
      const H = grp(core, [0, ty + 3.4 * hb, 3.2]), hr = 2.1 * hb; P(H, 'sph', fur, [0, 0, 0], [hr, hr * .9, hr * 1.02]); P(H, 'sph', cream, [0, -hr * .4, hr * .7], [hr * .5, hr * .4, hr * .55]); P(H, 'sph', '#1C1714', [0, -hr * .25, hr * 1.18], [.32, .26, .26]);
      [-1, 1].forEach(sd => { const E = grp(H, [sd * hr * .8, hr * .45, -.2], [0, 0, -sd * 1.05]); P(E, 'sph', leaf, [0, hr * .7, 0], [hr * .32, hr * .75, hr * .14]); life.wag.push({ o: E, ax: 'z', base: E.rotation.z, amp: .1, sp: 1.6 }); eye(H, sd * hr * .43, hr * .1, hr * .76, hr * .3, mystic ? '#FFB347' : '#4E8A3C'); });
      if (f) [-1, 1].forEach(sd => { const A = grp(H, [sd * hr * .4, hr * .8, -.3], [0, 0, -sd * .35]); P(A, 'cyl', dark, [0, 0, 0], [.18, 2.4, .18]); P(A, 'cyl', dark, [0, 1.3, 0], [.14, 1.4, .14], [0, 0, -sd * .8]);
        [[0, 2.5, 0], [-sd * 1.1, 2.3, 0], [sd * .2, 1.5, 0]].forEach(p => P(A, 'sph', f === 3 ? '#F6B6C8' : leaf, p, [.55, .32, .45], [0, 0, 0], { glow: mystic })); });
      const T = grp(core, [0, ty + .6, -3], [-.9, 0, 0]); P(T, 'sph', leaf, [0, .8, 0], [.55, 1.1, .3]); life.wag.push({ o: T, ax: 'z', base: 0, amp: .3, sp: 3 });
      if (mystic) { [-1, 1].forEach(sd => P(core, 'torFat', '#FFE08A', [sd * 1.9, ty + .4, 0], [.9, .9, .9], [0, Math.PI / 2, 0], { glow: true })); orbit(ty + 2.5, '#FFD27A', 5, 5.5, 'sphLo', .4); }
      if (rare) rareRing(ty + 1.6, 1.25);
      if (f === 3) { for (let i = 0; i < 8; i++) P(core, 'sph', i % 2 ? '#F6B6C8' : '#FFF1F5', [Math.sin(i) * 1.6, ty + 1.9, 1.5 - i * .55], [.5, .35, .5], [0, 0, 0], { glow: true }); halo(ty + 7.3, '#FFE6A0', 4.6); aura(ty + 1.5, '#C8F5B0', 7); } },

    sparkit(c) { const { P, grp, eye, flame, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#7EE0C4' : '#F2C14E', tail = mystic ? '#FF7FB8' : '#7E5BD6', cream = '#FFF6DF', bolt = mystic ? '#FFFFFF' : '#FFF27A';
      const by = f ? 4 : 3.4; P(core, 'sph', fur, [0, by, 0], [2, 2.6, 2]); P(core, 'sph', cream, [0, by - .3, .95], [1.4, 1.9, 1.1]);
      [-1, 1].forEach(sd => { P(core, 'sph', fur, [sd * 1, .55, .7], [.75, .55, 1.05]); const A = grp(core, [sd * 1.7, by + 1, .9], [.4, 0, sd * .5]); P(A, 'sph', fur, [0, -.7, 0], [.5, 1, .5]); life.wag.push({ o: A, ax: 'x', base: .4, amp: .2, sp: 3 }); });
      const H = grp(core, [0, by + 3.4 * hb, .2]), hr = 2.6 * hb; P(H, 'sph', fur, [0, 0, 0], [hr, hr * .9, hr * .95]); P(H, 'sph', '#1C1714', [0, -hr * .22, hr * .98], [.3, .24, .24]);
      [-1, 1].forEach(sd => { const E = grp(H, [sd * hr * .5, hr * .6, 0], [0, 0, -sd * .3]); P(E, 'cone', fur, [0, 0, 0], [hr * .3, hr * (f ? 1.15 : .85), hr * .22]); P(E, 'cone', tail, [0, hr * (f ? .95 : .7), 0], [hr * .17, hr * .5, hr * .14], [0, 0, 0], { ink: false }); life.wag.push({ o: E, ax: 'z', base: E.rotation.z, amp: .08, sp: 2.5 });
        eye(H, sd * hr * .42, hr * .05, hr * .72, hr * .3, mystic ? '#FF4FA0' : '#3D2A8A');
        const ckg = grp(H, [sd * hr * .78, -hr * .32, hr * .5], [0, sd * .6, 0]); P(ckg, 'sph', '#FF5A5A', [0, 0, 0], [.55, .55, .25], [0, 0, 0], { glow: true }); life.flick.push(ckg); });
      const T = grp(core, [0, by - .4, -1.6], [-.25, 0, 0]); const n = f ? 6 : 5;
      for (let i = 0; i < n; i++) { const a = i / (n - 1); P(T, 'sph', tail, [0, a * (f ? 9 : 7.2), -1.4 - Math.sin(a * 3.1) * 2.4], [1.5 - a * .3, 1.4, 1.5 - a * .3]); }
      const B = grp(T, [0, f ? 9.9 : 8, -1.2]); [[0, 0, .5], [.6, 1, -.5], [0, 2, .5]].forEach(([x, y, rz]) => P(B, 'box', bolt, [x, y, 0], [.45, 1.3, .35], [0, 0, rz], { glow: true })); life.flick.push(B);
      life.wag.push({ o: T, ax: 'z', base: 0, amp: .1, sp: 1.7 });
      if (mystic) orbit(by + 3, '#FFFFFF', 5, 5, 'oct', .4);
      if (rare) rareRing(by + 1.9, 1.3);
      if (f === 3) { const T2 = grp(core, [0, by - .4, -1.6], [-.25, 0, .5]); for (let i = 0; i < 6; i++) { const a = i / 5; P(T2, 'sph', '#FFE27A', [0, a * 8, -1.4 - Math.sin(a * 3.1) * 2.2], [1.2 - a * .3, 1.2, 1.2 - a * .3]); } life.wag.push({ o: T2, ax: 'z', base: .5, amp: .1, sp: 1.9 });
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(core, 'box', '#FFF27A', [Math.cos(a) * 2.6, by + 2.2, Math.sin(a) * 2.6], [.35, 1.6, .3], [0, -a, .5], { glow: true }); } halo(by + 8.4, '#FFF27A', 4.8); aura(by + 1.5, '#FFF27A', 7); } },

    cragpup(c) { const { P, grp, eye, flame, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, stone = mystic ? '#3B3446' : '#A39486', rock = mystic ? '#241F2E' : '#7C6E62', ember = mystic ? '#5FFFD8' : '#FF8A2A', cream = '#EDE2D2';
      const leg = f ? 2.6 : 2, ty = leg + 1.7;
      P(core, 'sph', stone, [0, ty, 0], [2.7, 2.3, 3.1]); P(core, 'sph', cream, [0, ty - .6, 1.4], [1.9, 1.5, 1.5]);
      [[-1.5, 1.8], [1.5, 1.8], [-1.5, -1.7], [1.5, -1.7]].forEach(([x, z]) => { P(core, 'cyl', stone, [x, .4, z], [.8, leg, .8]); P(core, 'sph', rock, [x, .4, z + .2], [.95, .55, 1.05]); });
      const H = grp(core, [0, ty + 2.2 * hb, 2.4]), hr = 2.6 * hb; P(H, 'sph', stone, [0, 0, 0], [hr, hr * .88, hr]); P(H, 'sph', cream, [0, -hr * .38, hr * .62], [hr * .62, hr * .45, hr * .5]); P(H, 'sph', '#1C1714', [0, -hr * .18, hr * 1.06], [.5, .36, .36]);
      [-1, 1].forEach(sd => { const E = grp(H, [sd * hr * .85, hr * .3, 0], [0, 0, sd * .5]); P(E, 'sph', rock, [0, -hr * .45, 0], [hr * .32, hr * .62, hr * .18]); life.wag.push({ o: E, ax: 'z', base: sd * .5, amp: .08, sp: 1.4 }); eye(H, sd * hr * .4, hr * .1, hr * .76, hr * .27, mystic ? '#5FFFD8' : '#6B4A2E', { glowIris: mystic }); });
      const plates = f ? 5 : 3; for (let i = 0; i < plates; i++) P(core, 'rock', rock, [0, ty + 2 - (i % 2) * .2, 1.6 - i * (3.4 / plates)], [1.1 - i * .06, 1.2, .9], [i, i * .7, .3], { flat: true });
      if (f) for (let i = 0; i < 4; i++) P(core, 'box', ember, [(i % 2 ? 1 : -1) * 2.55, ty - .2 + (i > 1 ? .7 : 0), .8 - i * .9], [.15, .9, .5], [0, 0, (i % 2 ? -.4 : .4)], { glow: true });
      const T = grp(core, [0, ty + .4, -3], [-.8, 0, 0]); P(T, 'rock', rock, [0, .8, 0], [.8, 1, .8], [0, 0, 0], { flat: true }); life.wag.push({ o: T, ax: 'z', base: 0, amp: .35, sp: 4 });
      if (f) flame(T, [0, 1.7, 0], .5, ember, '#FFF1B0');
      if (mystic) orbit(ty + 2, '#5FFFD8', 4, 5.5, 'rock', .55);
      if (rare) rareRing(ty + 1.3, 1.6);
      if (f === 3) { for (let i = 0; i < 7; i++) P(core, 'cone', '#FFB347', [Math.sin(i * .9) * .9, ty + 2.4, 1.8 - i * .6], [.45, 2.4 + (i % 2) * .8, .45], [-.2, 0, Math.sin(i * .9) * .4], { glow: true, op: .9 }); halo(ty + 6.8); aura(ty + 1, '#FF9A3D', 7); } },

    nimbowl(c) { const { P, grp, eye, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fea = mystic ? '#283A7A' : '#9C8AD9', face = mystic ? '#C8D4FF' : '#FFF6E8', gold = '#E8B931', cloud = '#FFFFFF';
      const by = f ? 5.2 : 4.6; P(core, 'sph', fea, [0, by, 0], [3, 3.4 * (f ? 1.05 : 1), 2.8]); P(core, 'sph', face, [0, by + .6 + (hb - 1) * 2, 1.9], [2.4 * hb, 2.3 * hb, 1]);
      [-1, 1].forEach(sd => { eye(core, sd * 1.05 * hb, by + .9 + (hb - 1) * 2, 2.95, .95 * hb, mystic ? '#7FD8FF' : '#E8A21F', { lid: f ? fea : null });
        const W = grp(core, [sd * 2.9, by + 1.2, -.2], [0, 0, sd * .15]); P(W, 'sph', fea, [sd * .2, -1.4, 0], [.8, 2.5, 1.9]); if (f) for (let k = 0; k < 3; k++) P(W, 'cone', fea, [sd * .3, -3.3 - k * .2, .6 - k * .6], [.45, 1.4, .3], [Math.PI, 0, 0], { ink: false });
        life.flap.push({ o: W, ax: 'z', base: sd * .15, amp: .12, sp: 1.4 });
        P(core, 'cone', fea, [sd * 1.7, by + 3.2, .4], [.6, f ? 2.4 : 1.5, .4], [0, 0, -sd * .45]);
        P(core, 'sph', gold, [sd * .9, .4, .8], [.6, .35, .9]); });
      P(core, 'cone', gold, [0, by + .3 + (hb - 1) * 2, 2.6], [.42, 1, .35], [Math.PI + .5, 0, 0]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(core, 'sphLo', cloud, [Math.cos(a) * 2.6, .5, Math.sin(a) * 2.6], [1.2, .7, 1.2], [0, 0, 0], { ink: false }); }
      if (f) P(core, 'sph', face, [0, by - 1.4, 2.2], [1.4, 1.2, .6], [0, 0, 0], { ink: false });
      if (mystic) { for (let i = 0; i < 9; i++) P(core, 'oct', '#FFFFFF', [Math.sin(i * 2.1) * 2.6, by + Math.cos(i * 1.7) * 2.6, Math.cos(i * 2.1) * -1.8], [.15, .15, .15], [0, 0, 0], { glow: true }); orbit(by + 1, '#BFD3FF', 4, 5.5, 'oct', .45); }
      if (rare) rareRing(by - 2, 1.9);
      if (f === 3) { [-1, 1].forEach(sd => { const W = c.grp(core, [sd * 3, by + 1.6, -.8], [0, 0, sd * -.5]); for (let k = 0; k < 5; k++) P(W, 'sph', '#F2EEFF', [sd * (2 + k * 1.1), k * .5 - .5, 0], [1.3, .45, 1.6 - k * .15]); life.flap.push({ o: W, ax: 'z', base: sd * -.5, amp: .18, sp: 1.2 }); }); halo(by + 5.6, '#FFF1B0', 4.8); aura(by, '#D8D0FF', 7.5); } },

    lumoth(c) { const { P, grp, eye, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fluff = mystic ? '#D6E4FF' : '#F7E6EE', wing = mystic ? '#6F8CFF' : '#F4A3C4', spot = mystic ? '#FFFFFF' : '#FFE27A', dark = '#5A3A55';
      life.float = 1.6; const by = 4.6; P(core, 'sph', fluff, [0, by, 0], [1.8, 2.4, 1.8]); P(core, 'sph', '#FFFFFF', [0, by + 1.6, 0], [2.2, 1, 2.1], [0, 0, 0], { ink: false });
      const H = grp(core, [0, by + 3 * hb, .3]), hr = 2.1 * hb; P(H, 'sph', fluff, [0, 0, 0], [hr, hr * .92, hr]);
      [-1, 1].forEach(sd => { eye(H, sd * hr * .44, 0, hr * .72, hr * .34, mystic ? '#3D5BFF' : '#C2185B');
        const A = grp(H, [sd * hr * .35, hr * .8, .2], [-.3, 0, -sd * .35]); P(A, 'cyl', dark, [0, 0, 0], [.1, 2.2, .1], [0, 0, 0], { ink: false }); P(A, 'sph', wing, [0, 2.4, 0], [.45, .9, .2]); life.wag.push({ o: A, ax: 'z', base: -sd * .35, amp: .1, sp: 2.6 });
        const pairs = f === 3 ? 3 : 2; for (let k = 0; k < pairs; k++) { const W = grp(core, [sd * 1.4, by + 1 - k * 1.6, -.6], [0, sd * .35, 0]); const sz = (f ? 1.25 : 1) * (k ? .78 : 1);
          P(W, 'sph', wing, [sd * 3 * sz, 0, 0], [3 * sz, (k ? 1.5 : 2.2) * sz, .18], [0, 0, sd * (k ? -.35 : .25)]); P(W, 'sph', spot, [sd * 3.6 * sz, 0, .15], [.75 * sz, .75 * sz, .1], [0, 0, 0], { glow: mystic || f === 3, ink: false });
          life.flap.push({ o: W, ax: 'y', base: sd * .35, amp: .45, sp: 3.4 }); } });
      [-1, 1].forEach(sd => P(core, 'cyl', dark, [sd * .7, by - 2.6, .3], [.1, 1, .1], [0, 0, sd * .2], { ink: false }));
      if (mystic) orbit(by + 1, '#E3ECFF', 6, 5, 'sphLo', .3);
      if (rare) rareRing(by + 1.6, 1.5);
      if (f === 3) { halo(by + 6.2, '#FFE6A0', 4.4); aura(by + 1, '#FFD0E6', 7.5); orbit(by - 1, '#FFF4C2', 8, 4.5, 'sphLo', .22); } },

    wyrmlet(c) { const { P, grp, eye, flame, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, scale = mystic ? '#2FA37A' : '#D9533B', belly = '#F6D9A8', horn = '#FFF3DC', wingc = mystic ? '#8FF0C8' : '#F29E5B';
      const by = f ? 4.6 : 4; P(core, 'sph', scale, [0, by, 0], [2.4, 2.9, 2.4]); for (let i = 0; i < 4; i++) P(core, 'sph', belly, [0, by + 1.2 - i * .9, 1.6 - Math.abs(i - 1.5) * .15], [1.5 - Math.abs(i - 1.5) * .2, .45, .7], [0, 0, 0], { ink: false });
      [-1, 1].forEach(sd => { P(core, 'sph', scale, [sd * 1.3, .7, .5], [.95, .75, 1.3]); for (let k = 0; k < 3; k++) P(core, 'cone', horn, [sd * (1 + k * .35) - sd * .2, .3, 1.7], [.18, .6, .18], [Math.PI / 2, 0, 0], { ink: false });
        const A = grp(core, [sd * 2, by + .8, 1], [.3, 0, sd * .4]); P(A, 'sph', scale, [0, -.8, 0], [.55, 1.1, .55]); });
      const H = grp(core, [0, by + 3.4 * hb, .7]), hr = 2.4 * hb; P(H, 'sph', scale, [0, 0, 0], [hr, hr * .88, hr * .95]); P(H, 'sph', scale, [0, -hr * .3, hr * .75], [hr * .55, hr * .42, hr * .55]);
      [-1, 1].forEach(sd => { P(H, 'sphLo', '#3A1C14', [sd * .35, -hr * .2, hr * 1.25], [.18, .14, .1], [0, 0, 0], { ink: false }); eye(H, sd * hr * .45, hr * .12, hr * .66, hr * .28, mystic ? '#C6FF5A' : '#FFB21F');
        P(H, 'cone', horn, [sd * hr * .45, hr * .55, -hr * .3], [.4, f ? 2.4 : 1.5, .4], [-.9, 0, sd * -.25]);
        const W = grp(core, [sd * 1.5, by + 1.6, -1.4], [0, sd * -.4, 0]); const ws = f ? 1.5 : 1; P(W, 'sph', wingc, [sd * 2.2 * ws, .6, 0], [2.4 * ws, 1.6 * ws, .16], [0, 0, sd * .5]); P(W, 'cyl', scale, [0, 0, 0], [.22, 3.4 * ws, .22], [0, 0, -sd * 1.05]); life.flap.push({ o: W, ax: 'y', base: sd * -.4, amp: .35, sp: 2.8 }); });
      for (let i = 0; i < 4; i++) P(core, 'cone', horn, [0, by + 2.4 - i * 1.3, -1.9 + i * .1], [.35, 1, .35], [-1.2, 0, 0], { ink: false });
      const T = grp(core, [0, 1.6, -1.8], [-.2, 0, 0]); let tp = T; for (let i = 0; i < 4; i++) { const sg = grp(tp, [0, 0, i ? -1.3 : 0]); P(sg, 'sph', scale, [0, 0, -.6], [.9 - i * .15, .8 - i * .12, 1]); tp = sg; life.wag.push({ o: sg, ax: 'y', base: 0, amp: .2, sp: 2.2 }); }
      P(tp, 'cone', horn, [0, 0, -1.4], [.7, 1.4, .25], [-Math.PI / 2, 0, 0]);
      if (f) flame(H, [0, -hr * .25, hr * 1.35], .32, '#FF8A2A', '#FFE27A', [Math.PI / 2, 0, 0]);
      if (mystic) { for (let i = 0; i < 5; i++) P(core, 'box', '#C6FF5A', [(i % 2 ? .8 : -.8), by + 1.8 - i * .7, -2.3], [.2, .5, .1], [0, 0, i], { glow: true }); orbit(by + 2, '#C6FF5A', 4, 5.5, 'oct', .45); }
      if (rare) rareRing(by + 2, 1.5);
      if (f === 3) { for (let i = 0; i < 8; i++) { const a = -1.4 + i * .4; P(core, 'cone', horn, [Math.sin(a) * 2, by + 3.6 + Math.cos(a) * .5, -.8], [.35, 2, .35], [-.8, 0, a * .6]); } halo(by + 8.2, '#FFCF5A', 4.8); aura(by + 1, '#FF7A4A', 7.5); } },

    wispurr(c) { const { P, grp, eye, flame, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#EDEAFF' : '#4B4E8F', glowc = mystic ? '#C79BFF' : '#7FF0E8', dark = mystic ? '#9C8BD9' : '#2B2D5C';
      life.float = 1.2; const by = 5.2; P(core, 'sph', fur, [0, by, 0], [2.2, 2.3, 2.2]); P(core, 'cone', fur, [0, by - .6, 0], [2, 3.6, 2], [Math.PI, 0, 0], { ink: false });
      P(core, 'cone', glowc, [0, by - 2.8, 0], [1.3, 2.4, 1.3], [Math.PI, 0, 0], { glow: true, op: .45 });
      const H = grp(core, [0, by + 2.9 * hb, .3]), hr = 2.4 * hb; P(H, 'sph', fur, [0, 0, 0], [hr, hr * .86, hr * .95]);
      [-1, 1].forEach(sd => { const E = grp(H, [sd * hr * .55, hr * .5, 0], [0, 0, -sd * .25]); P(E, 'cone', fur, [0, 0, 0], [hr * .34, hr * (f ? 1.05 : .8), hr * .24]); P(E, 'cone', glowc, [0, hr * .12, .12], [hr * .18, hr * .55, hr * .08], [0, 0, 0], { glow: true });
        life.wag.push({ o: E, ax: 'z', base: E.rotation.z, amp: .07, sp: 1.2 });
        eye(H, sd * hr * .42, hr * .02, hr * .72, hr * .28, glowc, { glowIris: true, lid: f ? fur : null });
        for (let k = 0; k < 2; k++) P(H, 'box', glowc, [sd * hr * .95, -hr * .2 - k * .25, hr * .6], [1.1, .05, .05], [0, 0, sd * (k ? -.15 : .1)], { glow: true }); });
      const tails = f === 3 ? 3 : f ? 2 : 1; for (let i = 0; i < tails; i++) { const T = grp(core, [(i - (tails - 1) / 2) * 1.2, by - .5, -1.6], [-.4, 0, (i - (tails - 1) / 2) * .4]); P(T, 'cone', fur, [0, 0, 0], [.6, 4, .6], [0, 0, 0], { ink: false }); P(T, 'sphLo', glowc, [0, 4.1, 0], [.6, .6, .6], [0, 0, 0], { glow: true }); life.wag.push({ o: T, ax: 'z', base: T.rotation.z, amp: .22, sp: 1.8 + i * .3 }); }
      const w = new c.THREE.Group(); w.userData.spin = .8; w.position.y = by; c.g.add(w); for (let i = 0; i < (f ? 3 : 2); i++) { const a = i / 3 * Math.PI * 2, q = c.grp(w, [Math.cos(a) * 4.2, Math.sin(i) * .8, Math.sin(a) * 4.2]); flame(q, [0, 0, 0], .45, glowc, '#FFFFFF'); }
      if (mystic) orbit(by + 2, '#E8D6FF', 5, 5.2, 'oct', .35);
      if (rare) rareRing(by + 1.5, 1.4, glowc);
      if (f === 3) { P(H, 'torFat', '#FFF4C2', [0, hr * .45, hr * .7], [.6, .6, .6], [0, 0, .3], { glow: true }); for (let i = 0; i < 8; i++) { const a = -1.3 + i * .37; flame(core, [Math.sin(a) * 2.1, by + 1.6, Math.cos(a) * -1.4 + .4], .4, glowc, '#FFFFFF', [-.5, 0, a * .7]); } halo(by + 6.6, glowc, 4.6); aura(by, glowc, 7); } },

    honeycub(c) { const { P, grp, eye, halo, orbit, aura, rareRing, core, life, f, rare, hb } = c;
      const mystic = f === 2, fur = mystic ? '#D9628E' : '#C98A4B', cream = '#FFE9C7', honey = '#F5B82E', dark = mystic ? '#7A2448' : '#6B4423';
      const by = f ? 4.6 : 4; P(core, 'sph', fur, [0, by, 0], [2.7, 3, 2.5]); P(core, 'sph', cream, [0, by - .2, 1.2], [1.9, 2.3, 1.4]);
      [-1, 1].forEach(sd => { P(core, 'sph', fur, [sd * 1.3, .7, .6], [1, .8, 1.3]); P(core, 'sph', cream, [sd * 1.3, .55, 1.75], [.55, .45, .2], [0, 0, 0], { ink: false });
        const A = grp(core, [sd * 2.4, by + 1, .6], [.5, 0, sd * .3]); P(A, 'sph', fur, [0, -1, 0], [.75, 1.4, .75]); life.wag.push({ o: A, ax: 'x', base: .5, amp: .08, sp: 1.6 }); });
      const H = grp(core, [0, by + 3.7 * hb, .3]), hr = 2.7 * hb; P(H, 'sph', fur, [0, 0, 0], [hr, hr * .9, hr * .95]); P(H, 'sph', cream, [0, -hr * .35, hr * .7], [hr * .48, hr * .38, hr * .42]); P(H, 'sph', '#1C1714', [0, -hr * .22, hr * 1.08], [.5, .36, .36]);
      [-1, 1].forEach(sd => { P(H, 'sph', fur, [sd * hr * .75, hr * .65, 0], [.95, .95, .6]); P(H, 'sph', cream, [sd * hr * .75, hr * .65, .35], [.5, .5, .3], [0, 0, 0], { ink: false }); eye(H, sd * hr * .38, hr * .08, hr * .76, hr * .25, mystic ? '#FF5FA0' : '#5A3214'); });
      P(H, 'sphLo', honey, [hr * .25, -hr * .05, hr * .98], [.35, .45, .2], [0, 0, 0], { glow: true });
      if (f) { const pot = c.grp(core, [0, by - .1, 2.6]); P(pot, 'cyl', honey, [0, -1, 0], [1.3, 2, 1.3]); P(pot, 'torFat', '#B07A1E', [0, 1, 0], [1.3, 1.3, 1.3], [Math.PI / 2, 0, 0]); P(pot, 'sph', '#FFD45A', [0, 1.1, 0], [1.1, .4, 1.1], [0, 0, 0], { glow: true }); }
      const bees = new c.THREE.Group(); bees.userData.spin = 1.3; bees.position.y = by + 3; c.g.add(bees);
      for (let i = 0; i < (f ? 3 : 1); i++) { const a = i / 3 * Math.PI * 2, b = c.grp(bees, [Math.cos(a) * 4.6, Math.sin(i * 2) * .9, Math.sin(a) * 4.6]); P(b, 'sphLo', '#FFD43B', [0, 0, 0], [.55, .45, .7]); P(b, 'box', '#1C1714', [0, 0, 0], [1.12, .9, .16], [0, 0, 0], { ink: false }); P(b, 'sphLo', '#FFFFFF', [0, .45, 0], [.4, .2, .3], [0, 0, 0], { ink: false, glow: true }); }
      if (mystic) { for (let i = 0; i < 6; i++) P(core, 'cyl', '#FFE27A', [Math.cos(i) * 1.2, by + 1 - (i % 3) * .9, 2.25], [.32, .08, .32], [Math.PI / 2, 0, 0], { glow: true }); orbit(by + 2, '#FFE27A', 5, 5.4, 'oct', .4); }
      if (rare) rareRing(by + 2.2, 1.7);
      if (f === 3) { for (let i = 0; i < 9; i++) { const a = -1.4 + i * .35; P(core, 'cyl', honey, [Math.sin(a) * 2.6, by + 2.8 + Math.cos(a) * .6, -.4], [.6, .3, .6], [Math.PI / 2, 0, a], { glow: true }); } halo(by + 8.3, '#FFD45A', 4.8); aura(by + 1, '#FFC94A', 7.5); } }
  };

  window.CREATURES = { make, speciesOf, SPECIES, FORMS, TIERF };
})();
