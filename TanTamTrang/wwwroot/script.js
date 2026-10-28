function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.topnav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}
setActiveNav();
document.head.insertAdjacentHTML('beforeend', '<link rel="icon" type="image/png" href="images/favicon.png">');
/* Vertical face counter on the About and Poster pages.
   The rail draws a LOOP, not a line: face N-1 is followed by face 0, so the
   scale it stands for is one whole revolution and the divisor is N, not N-1.
   Dividing by N-1 pinned the last label to 100% — the very same point as 01
   at 0% — and then let the marker run 1/(N-1) of the rail PAST the bottom
   before it wrapped: 66px into empty space with seven faces, 132px with four.
   With N the marker stays inside [0,100%) on its own and 100% IS 0%, so the
   wrap needs no special case.
   The labels are built from the faces instead of being typed into the page,
   so the rail can no longer disagree with the cube about how many there are —
   poster.html had grown to seven faces while the stylesheet still positioned
   four, and 05, 06 and 07 had no `top` at all and piled up on top of 01. */
function buildRail(rail, n) {
  if (!rail) return null;
  const marker = rail.querySelector('.progress-marker');
  rail.querySelectorAll('.progress-label').forEach((el) => el.remove());
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'progress-label';
    s.textContent = String(i + 1).padStart(2, '0');
    s.style.top = (i / n * 100).toFixed(3) + '%';
    frag.appendChild(s);
  }
  rail.insertBefore(frag, marker);   // marker stays last so it paints on top
  return marker;
}

/* Headroom for the endless roll.
   maintainLoop() fakes an infinite scroll by silently jumping the scroll
   position two revolutions back whenever it comes within one revolution of
   either end of the spacer — and it refuses to do that unless the spacer is
   worth at least five revolutions, because with less there is nowhere safe to
   land. One revolution is `count` viewport-heights, so the height the spacer
   needs is a function of how many items are on the roll.
   It used to be a constant per page with the count of the day baked into it
   (24 viewport-heights for a four-face cube, 42 for a seven-work reel). Going
   from four posters to seven raised the requirement from 20 to 35 while the
   spacer stayed at 24, so the loop quietly switched itself off — no error, the
   scroll just ran to the bottom and stopped dead on the third poster.
   Derive it from the real count instead. Still expressed in vh, so it keeps
   following the viewport on resize exactly as the constant did. */
const SPACER_LOOPS = 8;             // revolutions of headroom; maintainLoop needs 5
function sizeLoopSpacer(spacer, count) {
  if (!spacer || !count) return;
  spacer.style.height = (count * SPACER_LOOPS * 100) + 'vh';
}

const aboutPage = document.querySelector('.about-page');
if (aboutPage) {
  const cube = document.getElementById('aboutCube');
  const faces = [...document.querySelectorAll('.cube-face')];
  const leftTitle = document.getElementById('leftTitle');
  const leftBody = document.getElementById('leftBody');
  const rightLabel = document.getElementById('rightLabel');
  const rightTitle = document.getElementById('rightTitle');
  const rightBody = document.getElementById('rightBody');
  const cvLink = document.getElementById('aboutCv');
  const count = document.getElementById('aboutCount');
  const marker = buildRail(document.querySelector('.progress-rail'), faces.length);
  sizeLoopSpacer(document.querySelector('.about-cube-spacer'), faces.length);

  const N_FACES = faces.length;

  /* One entry per cube face, in face order. An empty string means that line is
     not shown at all on that face (see updateText), rather than left standing
     as a blank gap in the column. `cv` puts the CV link in the right column.
     `long` marks a body that runs to a full paragraph. */
  const slides = [
    {
      lt: 'DESIGNER',
      lb: '',
      rl: '',
      rt: '',
      rb: 'I’m TanDao, a multidisciplinary designer interested in visual communication, experience design and 3D. My work is driven by concept, research and experimentation. I’m drawn to projects that allow me to explore unfamiliar subjects and translate them into distinctive visual outcomes rather than relying on aesthetics alone. I enjoy working across different disciplines because each one gives me a different way to develop an idea. Experience design has expanded the way I think about research, interaction and audience, while 3D is becoming an important part of how I want to build more ambitious visual worlds. Rather than being defined by one fixed style, I’m interested in developing a recognisable creative point of view. My long-term direction is Art Direction, with a focus on concept-led, multidisciplinary visual projects.',
      long: true,
      // set line for line as the approved layout breaks it, not left to wrap;
      // an empty string is the blank line between two paragraphs
      lines: [
        'I’m TanDao, a multidisciplinary designer',
        'interested in visual communication,',
        'experience design and 3D.',
        '',
        'My work is driven by concept, research and',
        'experimentation. I’m drawn to projects that',
        'allow me to explore unfamiliar subjects and',
        'translate them into distinctive visual',
        'outcomes rather than relying on aesthetics',
        'alone.',
        '',
        'I enjoy working across different disciplines',
        'because each one gives me a different way',
        'to develop an idea. Experience design has',
        'expanded the way I think about research,',
        'interaction and audience, while 3D is',
        'becoming an important part of how I want',
        'to build more ambitious visual worlds.',
        '',
        'Rather than being defined by one fixed style,',
        'I’m interested in developing a recognisable',
        'creative point of view.',
        '',
        'My long-term direction is Art Direction,',
        'with a focus on concept-led,',
        'multidisciplinary visual projects.'
      ]
    },
    {
      lt: 'RESUME',
      lb: '',
      rl: '',
      rt: '',
      rb: '',
      cv: true
    },
    {
      lt: 'BEYOND STILL',
      lb: 'Increasingly, the work lives across formats — stills, motion and interactive space.',
      rl: 'NOW',
      rt: 'DESIGN / MOTION / SPACE',
      rb: 'Currently expanding this practice into spatial and interactive visual work.'
    }
  ];

  let activeIndex = -1;
  let ticking = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = (i) => ((i % N_FACES) + N_FACES) % N_FACES;
  const STEP_DEG = 360 / N_FACES;
  // shortest circular distance between two face indices (handles the 4→0 wrap)
  const circDist = (a, b) => { const d = Math.abs(a - b) % N_FACES; return d > N_FACES / 2 ? N_FACES - d : d; };

  // Cube geometry: 4 faces 90° apart, pushed back by half the face height
  // so they meet edge-to-edge like a real box — same regular-polygon math
  // as the Works reel, just rotating around X (rolling) instead of Y (spinning).
  // The whole cube is then pushed forward by that same radius so the
  // frontal face sits exactly at the zone's natural (undistorted) plane.
  let radius = 0;
  let lastBoxW = 0, lastBoxH = 0;
  // NEVER measure the cube itself. It carries the live rotateX()/translateZ(),
  // so getBoundingClientRect() hands back the *projected* box (perspective
  // scales it too), not the layout box. Feeding that back in as the radius
  // makes the faces stop meeting at the edges and the cube visibly deforms.
  // On a phone the URL bar fires resize over and over mid-scroll, so the
  // error compounded on every one of them. The zone is untransformed.
  function cubeBox() {
    const zone = cube && cube.parentElement;
    if (zone) { const r = zone.getBoundingClientRect(); if (r.height) return r; }
    return { width: cube ? cube.offsetWidth : 0, height: cube ? cube.offsetHeight : 0 };
  }
  function layoutCube(force) {
    if (!cube) return;
    const b = cubeBox();
    if (!b.height) return;
    // a URL-bar nudge that did not actually change the box is not a relayout
    if (!force && Math.abs(b.width - lastBoxW) < 1 && Math.abs(b.height - lastBoxH) < 1) return;
    lastBoxW = b.width; lastBoxH = b.height;
    // NOTE: the About roll is deliberately NOT a sealed prism — three panels
    // at height/2 stand apart from each other, and that spacing is the look.
    // (The poster roll below does use the true apothem: it has seven faces,
    // which at this radius would cut through one another.)
    radius = b.height / 2;
    faces.forEach((f, i) => {
      f.dataset.baseTf = `rotateX(${(i * STEP_DEG).toFixed(2)}deg) translateZ(${(-radius).toFixed(1)}px)`;
      f.style.transform = f.dataset.baseTf;
    });
  }
  // Write one face's lines. A line with nothing to say on this face is taken out
  // of the layout entirely rather than left standing as a blank gap.
  function applySlide(s) {
    const put = (el, text) => {
      el.textContent = text;
      el.classList.toggle('is-empty', !text);
    };
    put(leftTitle, s.lt);
    put(leftBody, s.lb);
    put(rightLabel, s.rl);
    put(rightTitle, s.rt);
    if (s.lines) {
      // one unbreakable span per line, so the breaks are the ones in the layout
      // rather than wherever this column's width happens to fall
      rightBody.replaceChildren(...s.lines.map((t) => {
        const sp = document.createElement('span');
        sp.className = 'bio-line';
        sp.textContent = t;
        return sp;
      }));
      rightBody.classList.remove('is-empty');
    } else {
      put(rightBody, s.rb);
    }
    rightBody.classList.toggle('is-long', !!s.long);
    if (cvLink) cvLink.classList.toggle('is-empty', !s.cv);
  }

  /* On a phone the page stacks into three rows inside a fixed 100vh panel, and
     the cube gets whatever height the two copy blocks leave over. The faces no
     longer carry copy of a similar length - the Designer bio runs to fifteen
     lines, the Resume face is one link - so the cube row grew and shrank as the
     roll went past each face. And the cube's radius is only re-measured on
     resize, so a zone that changed size under it made the faces stop meeting.
     Reserve the tallest each column ever gets, once per layout: write every
     face's lines in, measure, put back exactly what was showing. It happens in
     one synchronous turn, so nothing is painted in between. Side by side on
     desktop the columns do not share a row with the cube, so it stands down. */
  const STACKED = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;
  const copyL = leftTitle.closest('.about-copy');
  const copyR = rightBody.closest('.about-copy');
  /* The bio is set three sizes up, and on a big screen it fits as it is. But
     this is a fixed 100vh panel - text that runs past its bottom edge cannot be
     scrolled to - and the column beside the cube is only ~256px wide on a
     1280x720 laptop, where the bio at full size came out 693px tall against
     570px of room: 103px of it hung off the bottom of the screen, and the
     overflowing row pushed the cube 72px down on that face only. On a phone
     it squeezed the cube to 81px wide.
     So the size is a ceiling, not a promise: step the bio down half a pixel at
     a time until its column fits the room it actually has, and never below
     the column's ordinary body size. On a phone that room is what
     is left once the cube keeps at least CUBE_MIN_SHARE of the panel. */
  const stick = copyR ? copyR.closest('.about-stick') : null;
  const CUBE_MIN_SHARE = 0.36;
  function reserveCopyHeight() {
    if (!copyL || !copyR || !stick) return;
    copyL.style.minHeight = '';
    copyR.style.minHeight = '';
    rightBody.style.removeProperty('--bio-size');
    const stacked = !!(STACKED && STACKED.matches);
    const els = [leftTitle, leftBody, rightLabel, rightTitle, rightBody, cvLink].filter(Boolean);
    // innerHTML, not textContent: the bio is made of line spans
    const saved = els.map((el) => [el.innerHTML, el.className]);

    const cs = window.getComputedStyle(stick);
    const rowH = stick.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const gap = parseFloat(cs.rowGap) || 0;

    /* Heights are read unrounded and the reservation rounded UP. offsetHeight
       floors, and Arial's line boxes land on fractions (the bio block is
       329.375px): a floored reservation came out a third of a pixel short on
       exactly the face that needed it most, the cube row took up the slack,
       and the cube changed width by a pixel from one face to the next. */
    const tall = (el) => el.getBoundingClientRect().height;
    let hL = 0;
    slides.forEach((sl) => { applySlide(sl); hL = Math.max(hL, tall(copyL)); });

    const budget = stacked ? rowH - hL - gap * 2 - rowH * CUBE_MIN_SHARE : rowH;
    const bio = slides.find((sl) => sl.long);
    if (bio) {
      applySlide(bio);
      const ceil = parseFloat(window.getComputedStyle(rightBody).fontSize) || 0;
      // the floor is the column's ordinary body size (10px, 9px on short phones):
      // squeezed as far as it can go, the bio is never smaller than before
      const floor = Math.min(ceil, parseFloat(window.getComputedStyle(leftBody).fontSize) || ceil);
      let size = ceil;
      // the lines cannot wrap any more, so the column has to fit them across
      // as well as down: too wide shrinks the type just as too tall does
      const tooWide = () => rightBody.scrollWidth > rightBody.clientWidth + 1;
      while ((tall(copyR) > budget || tooWide()) && size - 0.5 >= floor) {
        size -= 0.5;
        rightBody.style.setProperty('--bio-size', size + 'px');
      }
    }

    let hR = 0;
    if (stacked) slides.forEach((sl) => { applySlide(sl); hR = Math.max(hR, tall(copyR)); });

    // Put back only what measuring changed. Rewriting an unchanged column
    // anyway replaced its elements - the CV buttons among them - and anything
    // bound to the old ones (the CV viewer's click) went with them.
    els.forEach((el, k) => {
      if (el.innerHTML !== saved[k][0]) el.innerHTML = saved[k][0];
      el.className = saved[k][1];
    });
    if (stacked) {
      copyL.style.minHeight = Math.ceil(hL) + 'px';
      copyR.style.minHeight = Math.ceil(hR) + 'px';
    }
  }
  reserveCopyHeight();
  layoutCube(true);
  // the web font arriving re-wraps the bio, so measure again once it has
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { reserveCopyHeight(); layoutCube(); renderAbout(); });
  }

  function updateText(i) {
    if (i === activeIndex) return;
    activeIndex = i;

    const textEls = [leftTitle, leftBody, rightLabel, rightTitle, rightBody, cvLink].filter(Boolean);
    textEls.forEach(el => el.classList.add('text-fade-out'));

    setTimeout(() => {
      applySlide(slides[i]);
      // no face counter on this page any more; the rail on the right still counts
      if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N_FACES).padStart(2, '0');
      textEls.forEach(el => el.classList.remove('text-fade-out'));
    }, 120);
  }

  // One full revolution = N_FACES viewport-heights of scroll, exactly like
  // the Works reel — scrolling by any exact multiple of that spins the cube
  // whole turns (visually identical), so the position can be silently
  // re-centred near either end of the spacer for an endless roll.
  function maintainLoop() {
    const vh = viewH();
    const period = N_FACES * vh;
    const maxScroll = document.documentElement.scrollHeight - vh;
    const buffer = period * 1;
    const y = window.scrollY;
    if (maxScroll < period * 5) return;
    if (y < buffer) {
      window.scrollTo({ top: y + period * 2, left: 0, behavior: 'instant' });
    } else if (y > maxScroll - buffer) {
      window.scrollTo({ top: y - period * 2, left: 0, behavior: 'instant' });
    }
  }

  let snapTimer = null;
  let snapRAF = null;
  let programmaticY = null;
  // A fling keeps firing scroll events with gaps in them; snapping after only
  // 70ms would start while the momentum is still running and fight it, which
  // is what made the roll judder on a phone. Wait longer on touch, and never
  // snap while a finger is still down.
  const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const SNAP_DELAY = COARSE ? 190 : 70;
  const SNAP_DURATION = 190;
  let touchDown = false;
  // The mobile URL bar changes innerHeight mid-scroll. Recomputing f = scrollY/vh
  // against a viewport that just moved makes the roll jump a whole step, so hold
  // the height steady while a scroll is in flight and re-sync once it settles.
  let vhRef = window.innerHeight;
  let lastVW = window.innerWidth;
  let lastScrollT = 0;
  const viewH = () => vhRef || window.innerHeight;

  function cancelSnap() {
    if (snapRAF) { cancelAnimationFrame(snapRAF); snapRAF = null; }
  }

  function animateScrollTo(targetY, duration) {
    cancelSnap();
    if (!Number.isFinite(targetY)) return;
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 0.5) return;
    programmaticY = Math.round(startY);
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const y = startY + delta * eased;
      programmaticY = Math.round(y);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      snapRAF = p < 1 ? requestAnimationFrame(step) : null;
      if (p >= 1) programmaticY = null;
    }
    snapRAF = requestAnimationFrame(step);
  }

  // Once the user stops scrolling, roll the rest of the way so the nearest
  // face lands dead-on instead of stopping mid-roll.
  function snapToNearest() {
    if (touchDown) return;
    const vh = viewH();
    const targetF = Math.round(window.scrollY / vh);
    animateScrollTo(targetF * vh, SNAP_DURATION);
  }

  function renderAbout() {
    ticking = false;

    const vh = viewH();
    const f = window.scrollY / vh;
    if (!Number.isFinite(f)) return;

    const nearest = wrap(Math.round(f));
    updateText(nearest);

    if (marker) {
      let cyclePos = f % N_FACES;
      if (cyclePos < 0) cyclePos += N_FACES;
      marker.style.top = `${(cyclePos / N_FACES * 100).toFixed(2)}%`;
    }

    if (cube) {
      cube.style.transform = `translateZ(${radius.toFixed(1)}px) rotateX(${(-f * STEP_DEG).toFixed(2)}deg)`;
    }

    faces.forEach((f2, i) => {
      const d = circDist(f, i);
      // dim faces as they roll away from front-facing (skip identical writes —
      // restyling a filter on a preserve-3d child is expensive on mobile)
      const br = lerp(1, 0.45, clamp(d, 0, 1)).toFixed(2);
      if (f2.dataset.br !== br) { f2.dataset.br = br; f2.style.filter = `brightness(${br})`; }
    });

    maintainLoop();
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(renderAbout);
      ticking = true;
    }
    lastScrollT = performance.now();
    if (touchDown) return;               // let the fling finish on its own
    if (programmaticY === null || Math.abs(window.scrollY - programmaticY) > 2) {
      cancelSnap();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapToNearest, SNAP_DELAY);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  function onViewportChange() {
    const w = window.innerWidth;
    const scrolling = performance.now() - lastScrollT < 250;
    // a real resize (rotation, window drag) resyncs the held height; a URL-bar
    // nudge in the middle of a scroll does not
    if (w !== lastVW || !scrolling) { lastVW = w; vhRef = window.innerHeight; }
    reserveCopyHeight();
    layoutCube();
    renderAbout();
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', () => {
    lastVW = -1;
    setTimeout(() => { onViewportChange(); layoutCube(true); renderAbout(); }, 120);
  });
  window.addEventListener('touchstart', () => {
    touchDown = true; cancelSnap(); clearTimeout(snapTimer);
  }, { passive: true });
  window.addEventListener('touchend', () => {
    touchDown = false; clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToNearest, SNAP_DELAY);
  }, { passive: true });
  window.addEventListener('touchcancel', () => { touchDown = false; }, { passive: true });
  renderAbout();
}


/* =========================================================
   POSTER — ROLLING CUBE  (same mechanism as the About page)
   Four posters on the four vertical faces of a fixed cube; the
   wheel rolls it around X. A tall spacer gives the scroll room,
   the position is silently re-centred near either end so the
   roll loops forever, and once the wheel stops the nearest face
   snaps dead-on. Left/right copy swaps per face.
   ========================================================= */
(function () {
  const page = document.querySelector('.poster-cube-page');
  if (!page) return;

  const cube  = document.getElementById('posterCube');
  const faces = [...page.querySelectorAll('.cube-face')];
  const elTitle = document.getElementById('pcTitle');
  const elBody  = document.getElementById('pcBody');
  const elTag   = document.getElementById('pcTag');
  const elNote  = document.getElementById('pcNote');
  const elCount = document.getElementById('pcCount');
  if (!cube || faces.length < 3) return;

  const marker  = buildRail(page.querySelector('.progress-rail'), faces.length);
  sizeLoopSpacer(page.querySelector('.about-cube-spacer'), faces.length);
  const N_FACES = faces.length;

  const slides = [
    {
      title: 'TRUNG THU',
      body:  'Mid-autumn festival poster — soft light, warm colour, a little astronaut for scale.',
      tag:   'FESTIVAL / ILLUSTRATION',
      note:  'Made for Trung Thu — one frame, warm and quiet.'
    },
    {
      title: 'OCTOPUS IN THE DARK',
      body:  'Editorial poster study — a glowing silhouette, halftone texture, circular type running through it.',
      tag:   'EDITORIAL / TYPE',
      note:  'A study in silhouette, halftone and type on a curve.'
    },
    {
      title: 'INTO THE FOREST',
      body:  'Soundtrack poster — a photo-composite of a fox mid-leap through forest god-rays, reaching for a small burning flower.',
      tag:   'SOUNDTRACK / COMPOSITE',
      note:  'Composited light — rays, particles, one warm accent.'
    },
    {
      title: 'CƠM TẤM',
      body:  'Paper-collage food poster — Saigon landmarks torn from old newsprint, gathered around a plate of broken rice.',
      tag:   'FOOD / COLLAGE',
      note:  'Newsprint, landmarks and a plate — the taste of a city.'
    },
    {
      title: 'MADE IN VIETNAM',
      body:  'Product poster — gold type on lacquer red, with two pairs of chopsticks standing in for the letters they interrupt.',
      tag:   'PRODUCT / TYPOGRAPHY',
      note:  'The hand completes the word — craft as the letterform.'
    },
    {
      title: 'VÒNG XOÁY TUYỆT VỌNG',
      body:  'Environmental poster — Vietnam held inside a blackened globe, bound in chain, one smokestack still running.',
      tag:   'ENVIRONMENT / AWARENESS',
      note:  'Two colours only: red for the warning, black for the cost.'
    },
    {
      title: 'LOOKING',
      body:  'Duotone type study — a kitten pushing out from behind oversized outlined letters, framed by heavy quote marks.',
      tag:   'TYPE / DUOTONE',
      note:  'Green on green, with the animal reading the line back at you.'
    }
  ];

  let activeIndex = -1;
  let ticking = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = (i) => ((i % N_FACES) + N_FACES) % N_FACES;
  const STEP_DEG = 360 / N_FACES;
  const circDist = (a, b) => { const d = Math.abs(a - b) % N_FACES; return d > N_FACES / 2 ? N_FACES - d : d; };

  let radius = 0;
  let lastBoxW = 0, lastBoxH = 0;
  // NEVER measure the cube itself. It carries the live rotateX()/translateZ(),
  // so getBoundingClientRect() hands back the *projected* box (perspective
  // scales it too), not the layout box. Feeding that back in as the radius
  // makes the faces stop meeting at the edges and the cube visibly deforms.
  // On a phone the URL bar fires resize over and over mid-scroll, so the
  // error compounded on every one of them. The zone is untransformed.
  function cubeBox() {
    const zone = cube && cube.parentElement;
    if (zone) { const r = zone.getBoundingClientRect(); if (r.height) return r; }
    return { width: cube ? cube.offsetWidth : 0, height: cube ? cube.offsetHeight : 0 };
  }
  function layoutCube(force) {
    if (!cube) return;
    const b = cubeBox();
    if (!b.height) return;
    // a URL-bar nudge that did not actually change the box is not a relayout
    if (!force && Math.abs(b.width - lastBoxW) < 1 && Math.abs(b.height - lastBoxH) < 1) return;
    lastBoxW = b.width; lastBoxH = b.height;
    // Apothem of a regular N-sided prism whose faces are b.height tall.
    // height/2 is only the answer for N = 4, where tan(45deg) = 1. With seven
    // faces that radius is barely half what it needs to be and the panels
    // drive straight through one another. Identical at four, correct at any.
    radius = (b.height / 2) / Math.tan(Math.PI / N_FACES);
    faces.forEach((f, i) => {
      f.dataset.baseTf = `rotateX(${(i * STEP_DEG).toFixed(2)}deg) translateZ(${(-radius).toFixed(1)}px)`;
      f.style.transform = f.dataset.baseTf;
    });
  }
  layoutCube(true);

  function updateText(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    const els = [elTitle, elBody, elTag, elNote].filter(Boolean);
    els.forEach(el => el.classList.add('text-fade-out'));
    setTimeout(() => {
      const s = slides[i] || slides[0];
      if (elTitle) elTitle.textContent = s.title;
      if (elBody)  elBody.textContent  = s.body;
      if (elTag)   elTag.textContent   = s.tag;
      if (elNote)  elNote.textContent  = s.note;
      if (elCount) elCount.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(N_FACES).padStart(2, '0');
      els.forEach(el => el.classList.remove('text-fade-out'));
    }, 120);
  }

  function maintainLoop() {
    const vh = viewH();
    const period = N_FACES * vh;
    const maxScroll = document.documentElement.scrollHeight - vh;
    const buffer = period * 1;
    const y = window.scrollY;
    if (maxScroll < period * 5) return;
    if (y < buffer) {
      window.scrollTo({ top: y + period * 2, left: 0, behavior: 'instant' });
    } else if (y > maxScroll - buffer) {
      window.scrollTo({ top: y - period * 2, left: 0, behavior: 'instant' });
    }
  }

  let snapTimer = null;
  let snapRAF = null;
  let programmaticY = null;
  // A fling keeps firing scroll events with gaps in them; snapping after only
  // 70ms would start while the momentum is still running and fight it, which
  // is what made the roll judder on a phone. Wait longer on touch, and never
  // snap while a finger is still down.
  const COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const SNAP_DELAY = COARSE ? 190 : 70;
  const SNAP_DURATION = 190;
  let touchDown = false;
  // The mobile URL bar changes innerHeight mid-scroll. Recomputing f = scrollY/vh
  // against a viewport that just moved makes the roll jump a whole step, so hold
  // the height steady while a scroll is in flight and re-sync once it settles.
  let vhRef = window.innerHeight;
  let lastVW = window.innerWidth;
  let lastScrollT = 0;
  const viewH = () => vhRef || window.innerHeight;

  function cancelSnap() {
    if (snapRAF) { cancelAnimationFrame(snapRAF); snapRAF = null; }
  }

  function animateScrollTo(targetY, duration) {
    cancelSnap();
    if (!Number.isFinite(targetY)) return;
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 0.5) return;
    programmaticY = Math.round(startY);
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const y = startY + delta * eased;
      programmaticY = Math.round(y);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      snapRAF = p < 1 ? requestAnimationFrame(step) : null;
      if (p >= 1) programmaticY = null;
    }
    snapRAF = requestAnimationFrame(step);
  }

  function snapToNearest() {
    if (touchDown) return;
    const vh = viewH();
    const targetF = Math.round(window.scrollY / vh);
    animateScrollTo(targetF * vh, SNAP_DURATION);
  }

  function renderPoster() {
    ticking = false;
    const vh = viewH();
    const f = window.scrollY / vh;
    if (!Number.isFinite(f)) return;

    updateText(wrap(Math.round(f)));

    if (marker) {
      let cyclePos = f % N_FACES;
      if (cyclePos < 0) cyclePos += N_FACES;
      marker.style.top = `${(cyclePos / N_FACES * 100).toFixed(2)}%`;
    }

    cube.style.transform = `translateZ(${radius.toFixed(1)}px) rotateX(${(-f * STEP_DEG).toFixed(2)}deg)`;

    faces.forEach((f2, i) => {
      const d = circDist(f, i);
      const br = lerp(1, 0.45, clamp(d, 0, 1)).toFixed(2);
      if (f2.dataset.br !== br) { f2.dataset.br = br; f2.style.filter = `brightness(${br})`; }
    });

    maintainLoop();
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(renderPoster);
      ticking = true;
    }
    lastScrollT = performance.now();
    if (touchDown) return;               // let the fling finish on its own
    if (programmaticY === null || Math.abs(window.scrollY - programmaticY) > 2) {
      cancelSnap();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapToNearest, SNAP_DELAY);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  function onViewportChange() {
    const w = window.innerWidth;
    const scrolling = performance.now() - lastScrollT < 250;
    // a real resize (rotation, window drag) resyncs the held height; a URL-bar
    // nudge in the middle of a scroll does not
    if (w !== lastVW || !scrolling) { lastVW = w; vhRef = window.innerHeight; }
    layoutCube();
    renderPoster();
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', () => {
    lastVW = -1;
    setTimeout(() => { onViewportChange(); layoutCube(true); renderPoster(); }, 120);
  });
  window.addEventListener('touchstart', () => {
    touchDown = true; cancelSnap(); clearTimeout(snapTimer);
  }, { passive: true });
  window.addEventListener('touchend', () => {
    touchDown = false; clearTimeout(snapTimer);
    snapTimer = setTimeout(snapToNearest, SNAP_DELAY);
  }, { passive: true });
  window.addEventListener('touchcancel', () => { touchDown = false; }, { passive: true });
  renderPoster();
})();








/* =========================================================
   RELEASE CLIPS — which size, and a fresh link when one runs out
   Every clip on the site is a GitHub release asset in two sizes: the
   1080p file under its own name and a 720p copy named -720.mp4, about
   half the weight. Phones and tablets, small windows, and any browser
   saving data or on a slow connection get the 720p copy: on those
   screens it looks the same and asks half as much of the network.
   Decided once per page - switching on resize would restart every clip.
   ========================================================= */
const CLIP_LITE = (function () {
  try {
    const c = navigator.connection;
    if (c && (c.saveData || /2g|3g/.test(c.effectiveType || ''))) return true;
    return window.matchMedia('(pointer: coarse), (max-width: 900px), (max-height: 560px)').matches;
  } catch (e) {
    return false;
  }
})();

function clipUrl(url) {
  return CLIP_LITE && url ? url.replace(/\.mp4(?=$|[?#])/, '-720.mp4') : url;
}

/* github.com never serves a release asset itself: it redirects to a signed
   link that stops working about half an hour later, and the player goes on
   using that link for every later request - so a clip left long enough
   errors the next time it needs a piece of the file, and an errored <video>
   never plays again. Asking github.com again gets a fresh link (the
   throwaway query keeps a cache from answering with the old redirect), and
   the clip resumes where it was. `st` holds the retry state, which backs off
   so a visitor who is simply offline is not caught in a loop of reloads.
   Returns false while it is still backing off. */
function refetchClip(v, base, st) {
  const t = performance.now();
  if (t < (st._retryAt || 0)) return false;
  st._fails = (st._fails || 0) + 1;
  st._retryAt = t + Math.min(30000, 1500 * Math.pow(2, st._fails - 1));
  const at = v.currentTime || 0;
  v.src = base + (base.indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now().toString(36);
  v.load();
  if (at > 0) {
    v.addEventListener('loadedmetadata', () => {
      if (v.duration && at < v.duration) v.currentTime = at;
    }, { once: true });
  }
  return true;
}


/* =========================================================
   HOME — INFINITE VIDEO REEL
   Muted, looping videos stacked one after another - a full window
   each in landscape, a 16:9 band each on upright screens. Each
   <video> is parked on a virtual loop (scrollY % period) so they
   just keep coming around forever; the tall spacer only exists
   to give the wheel / trackpad something real to move. Native
   colours, no filters. The scrollbar is hidden in CSS.
   ========================================================= */
(function () {
  const reel = document.getElementById('homeReel');
  if (!reel) return;

  const stage = document.getElementById('homeReelStage');
  const spacer = document.getElementById('homeReelSpacer');
  const slides = [...reel.querySelectorAll('.home-slide')];
  const N = slides.length;
  if (!stage || !spacer || !N) return;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const LOOPS = 40;            // how many full cycles the spacer holds
  const MID = LOOPS / 2;       // start cycle (middle of the spacer)
  let vh = window.innerHeight;
  let slideH = vh;             // one clip's height: the window, or a 16:9 band upright
  let offset = 0;              // where slide 0 sits when the reel is parked
  let period = N * vh;         // scroll distance for one full cycle
  let ticking = false;
  let carry = 0;               // sub-pixel glide the scroll position can't hold
  let leaving = false;         // a transition to another page has covered the screen

  /* Landscape: one clip per window, as ever. Upright screens: each clip is a
     band exactly as tall as its 16:9 picture across the full width, and the
     bands follow one another with nothing between them - a strip of film
     running up the screen, every frame whole. (There it used to be one clip
     per window too, the picture letterboxed across the middle over a blurred
     fill, which left well over half a screen between one clip and the next.)
     The strip parks with slide 0 across the middle, which is where the
     intro's last shot lands. "Upright" is the stylesheet's and the intro's
     own test, so all three always agree. */
  function sizeSpacer() {
    vh = window.innerHeight;
    const upright = window.matchMedia('(orientation: portrait)').matches;
    slideH = upright ? Math.ceil(window.innerWidth * 9 / 16) : vh;
    offset = upright ? Math.round((vh - slideH) / 2) : 0;
    period = N * slideH;
    spacer.style.height = (period * LOOPS) + 'px';
    // Sized here rather than by 100vh, which on a phone is the tallest the
    // viewport ever gets (toolbars tucked away). One pixel longer than the
    // spacing, so no hairline ever shows between two clips - the extra pixel
    // on top (see render). Hung below instead, the clip above slide 0 when
    // the reel comes round (slide 7, later in the page, so drawn over it)
    // laid its paused last row across the top of the screen.
    slides.forEach(s => { s.style.height = (slideH + 1) + 'px'; });
  }

  function safePlay(v) {
    if (!v || !v.paused) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }

  /* A clip that errors, or sits on screen with neither its picture nor its
     download moving, is fetched again from a fresh link - see refetchClip.
     Release links expire, even mid-loop, and that was "sometimes the videos
     don't run": a tab left open a while, a return to Home through the back
     button, a clip coming round again on the reel. */
  const STALL_MS = 8000;       // on screen, meant to be playing, nothing moving
  const now = () => performance.now();

  function touch(s) { s._moved = s._fetched = now(); }

  function revive(s) {
    const v = s._video;
    if (!v || !s._src || !refetchClip(v, s._src, s)) return;
    touch(s);
    if (s._want && !document.hidden) safePlay(v);
  }

  // Bind each <video> once: re-assert playback if the browser pauses a
  // clip that is still on screen (background tabs, power saving, etc.).
  slides.forEach(s => {
    const v = s._video = s.querySelector('video');
    if (!v) return;
    v.muted = true;
    s._src = clipUrl(v.getAttribute('src'));   // the 720p copy where that is the one to use
    if (s._src !== v.getAttribute('src')) v.src = s._src;
    s._lastTime = 0;
    touch(s);
    v.addEventListener('pause', () => {
      // Re-assert straight away only for a clip actually in view. A browser
      // that pauses silent clips outside the viewport (Safari does) would
      // otherwise be answered with play() the instant it paused one of the
      // clips running ahead, again and again; those are picked up by the
      // safety net below instead, and still have their data buffered.
      if (s._want && s._onScreen && !document.hidden && !v.error) safePlay(v);
    });
    v.addEventListener('error', () => { if (s._want && !document.hidden) revive(s); });
    v.addEventListener('progress', () => { s._fetched = now(); });
    v.addEventListener('timeupdate', () => {
      const d = v.currentTime - s._lastTime;
      if (d === 0) return;
      s._lastTime = v.currentTime;
      s._moved = now();
      if (d > 0 && d < 1) s._fails = 0;   // actually playing again, not just a seek
    });
  });

  function applyPlayback(slide, want, buffer) {
    if (want && !slide._want) touch(slide);   // its stall clock starts as it comes on screen
    slide._want = want;
    const v = slide._video;
    if (!v) return;
    if ((want || buffer) && v.preload !== 'auto') {
      // Start buffering in earnest. A clip that has never loaded is told to
      // now: preload="none" has it waiting for a play() that is not due yet.
      v.preload = 'auto';
      if (!want && v.readyState === 0 && !v.error) v.load();
    }
    if (want) {
      if (v.error) revive(slide);
      else safePlay(v);
    } else if (!v.paused) v.pause();
  }

  // Where slide i sits on screen, in [-slideH, period - slideH): from just
  // off the top to below the bottom. carry is the sub-pixel part of the glide
  // the scroll position cannot hold (see glideTick); folding it in is what
  // makes the motion smooth - transforms composite at sub-pixel precision,
  // scroll offsets do not.
  function slideY(i) {
    const y0 = window.scrollY + carry;
    return ((i * slideH + offset - y0 + slideH) % period + period) % period - slideH;
  }

  function render() {
    ticking = false;
    if (leaving) return;   // covered by a transition to another page
    for (let i = 0; i < N; i++) {
      const y = slideY(i);
      // one pixel up: that pixel lies over the bottom row of the clip above,
      // and whenever it is on screen its own clip is already playing
      slides[i].style.transform = 'translate3d(0,' + (y - 1).toFixed(1) + 'px,0)';
      /* A clip used to start only once it was on screen - and since it had not
         fetched a byte by then, it slid in as a still picture and began to
         move a moment after it arrived, every time. So a clip starts before it
         comes into view and stops only once it has gone off the top: it is
         buffering two clips' height below the bottom edge and already playing
         half a clip below it (the reel travels upward - in landscape that is
         sixteen and four seconds ahead at its own pace). Landscape never has
         more than three playing at once; an upright strip has as many as are
         on screen, plus the one about to be. */
      slides[i]._onScreen = y > -slideH && y < vh;
      applyPlayback(slides[i], y > -slideH && y < vh + slideH / 2, y < vh + slideH * 2);
    }
    maintainLoop();
  }

  function maintainLoop() {
    const max = document.documentElement.scrollHeight - vh;
    if (max < period * 6) return;
    const y = window.scrollY;
    if (y < period * 2 || y > max - period * 2) {
      // hop a whole number of cycles back toward the middle -> zero visual change
      const shift = Math.round((period * MID - y) / period) * period;
      if (shift) window.scrollTo({ top: y + shift, left: 0, behavior: 'instant' });
    }
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(render);
      ticking = true;
    }
  }

  // re-centre on a clean cycle boundary (slide 0 parked where the intro lands)
  function center() {
    sizeSpacer();
    carry = 0;
    window.scrollTo({ top: period * MID, left: 0, behavior: 'instant' });
    render();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    // keep the same point in the cycle across a viewport change
    const phase = period ? (window.scrollY % period) / period : 0;
    sizeSpacer();
    window.scrollTo({ top: period * MID + phase * period, left: 0, behavior: 'instant' });
    render();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  /* ---- self-scroll ------------------------------------------------------
     The reel glides on its own: ~one full-screen clip every SLIDE_MS.
     Any real input (wheel, touch, arrows) hands control back to the user;
     after RESUME_MS of stillness the glide picks up again. Delta-timed so
     a hidden tab or a loop hop never causes a jump.

     It stays perfectly still until the intro is off the screen. The intro
     ends by zooming bugs-home to full frame, and bugs-home is this reel's
     first slide — so the reel must be parked on that same slide, motionless,
     when the canvas dissolves away, or the illusion of one continuous shot
     dies the instant the handover happens. Then it holds only a beat - half a
     second - and eases up to speed over RAMP_MS rather than snapping into
     motion. (It used to hold two seconds and take 1.6 more to find its pace,
     so the reel seemed to sit there long after the intro had gone.)      */
  const SLIDE_MS = 8000;       // one screen's height every 4s (was 8s)
  const RESUME_MS = 2600;
  const HOLD_MS = 500;         // stillness after the intro hands the frame over
  const RAMP_MS = 700;         // time to reach full pace from a standstill
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let armed = false;           // intro is done and the hold has elapsed
  let glide = !reduceMotion;   // the user has not taken over
  let speed = 0;               // 0..1 of full pace
  let lastT = 0;
  let resumeTimer = 0;

  function pauseGlide() {
    glide = false;
    speed = 0;                 // yield to the user at once — only the return eases
    if (resumeTimer) clearTimeout(resumeTimer);
    if (!reduceMotion) resumeTimer = setTimeout(() => { glide = true; }, RESUME_MS);
  }

  ['wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach(ev =>
    window.addEventListener(ev, pauseGlide, { passive: true }));
  window.addEventListener('keydown', e => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) pauseGlide();
  });

  function glideTick(t) {
    const dt = lastT ? Math.min(t - lastT, 50) : 16;
    lastT = t;
    const want = armed && glide && !document.hidden && !leaving;
    if (!want) { carry = 0; window.requestAnimationFrame(glideTick); return; }

    if (speed < 1) speed = Math.min(1, speed + dt / RAMP_MS);
    // smoothstep: zero acceleration at both ends, so there is no kick as
    // the reel leaves the standstill and none as it reaches full pace
    const k = speed * speed * (3 - 2 * speed);

    /* A document scroll offset is a whole number of pixels — scrollTo simply
       refuses a fraction. Handing it scrollY + 1.14 every frame therefore
       moved it 1px and binned the 0.14, which cost 12% of the pace and, far
       worse, flattened the whole ramp: every step below 1px read as no
       movement at all, so the reel sat still and then snapped straight to
       full speed. So bank the fraction instead, spend it once it is worth a
       whole pixel, and let render() draw the remainder as a transform. */
    carry += (vh / SLIDE_MS) * dt * k;
    const whole = Math.floor(carry);
    if (whole >= 1) {
      carry -= whole;
      window.scrollTo({ top: window.scrollY + whole, left: 0, behavior: 'instant' });
    }
    render();
    window.requestAnimationFrame(glideTick);
  }
  window.requestAnimationFrame(glideTick);

  function armGlide() { armed = true; }

  /* Wait for the intro to report in, then hold. If there is no intro on the
     page at all (libraries blocked, a re-entry that skipped it) there is
     nothing to wait for, and the hard stop guarantees the reel is never
     left frozen because the intro failed to say it was done. */
  const introLayer = document.getElementById('canvas-container');
  if (!introLayer || getComputedStyle(introLayer).display === 'none') {
    setTimeout(armGlide, HOLD_MS);
  } else {
    const waitIntro = setInterval(() => {
      if (!window.introFinished) return;
      clearInterval(waitIntro);
      setTimeout(armGlide, HOLD_MS);
    }, 50);
    setTimeout(() => { clearInterval(waitIntro); armGlide(); }, 26000);
  }

  /* The intro's final act is bugs-home filling the frame, and slide 0 is
     that same clip — so put the two on the same frame just before the
     dissolve starts. Both frame it the same way and in the same place, so once
     the timecodes agree the cross-fade reads as one continuous shot
     instead of a cut to another take. */
  window.addEventListener('intro:handoff', (e) => {
    center();                                  // park exactly on slide 0
    const v = slides[0] && slides[0]._video;
    const t = e.detail && e.detail.time;
    if (!v || typeof t !== 'number' || !isFinite(t)) return;
    if (v.readyState < 2 || !v.duration || t < 0 || t >= v.duration) return;
    // Only jump to a point already downloaded: a seek that has to go and
    // fetch would stall on a blank frame, which is far worse than being a
    // couple of seconds out on a shot that looks the same either way.
    let ready = false;
    for (let i = 0; i < v.buffered.length; i++) {
      if (t >= v.buffered.start(i) && t <= v.buffered.end(i) - 0.15) { ready = true; break; }
    }
    if (!ready) return;
    if (Math.abs(v.currentTime - t) > 0.12) v.currentTime = t;
    safePlay(v);
  });

  center();
  // viewport height isn't final until layout settles — re-centre once it is
  window.addEventListener('load', center);
  // idle safety net: a clip on screen got paused, errored, or stalled with
  // nothing arriving - play the first, fetch the other two again
  setInterval(() => {
    if (document.hidden || leaving) return;
    const t = now();
    slides.forEach(s => {
      const v = s._video;
      if (!s._want || !v) return;
      if (v.error) revive(s);
      else if (!v.paused && t - s._moved > STALL_MS && t - s._fetched > STALL_MS) revive(s);
      else safePlay(v);
    });
  }, 900);

  // Back on the tab, or back on this page out of the back/forward cache: the
  // clips were never meant to move while away, so that is not a stall. One
  // whose link ran out meanwhile errors on its next request and is fetched
  // again from there.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) slides.forEach(touch); });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    slides.forEach(touch);
    render();
  });

  // Another page's transition has covered the screen (see the transition
  // controller): stop every clip and the glide. On a phone, up to six clips
  // decoding and a scroll every frame were fighting the wipe for the processor
  // with nothing left to show.
  window.addEventListener('page:leave', () => {
    leaving = true;
    slides.forEach(s => {
      s._want = false;
      if (s._video && !s._video.paused) s._video.pause();
    });
  });

  /* Autoplay can be refused outright - iOS in Low Power Mode, a data saver -
     and then every play() rejects until the visitor does something. A tap,
     click or key press is that permission, so ask again on each. */
  ['touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, () => {
    if (leaving) return;
    slides.forEach(s => { if (s._want && s._video && !s._video.error) safePlay(s._video); });
  }, { passive: true }));
})();


/* =========================
   V8 3D CREATIVE CODING (THREE.JS + GSAP)
   The original home intro: a cylinder of the transition images
   spins up, the featured one zooms to fill the screen, the 3D
   canvas fades out — then the infinite video reel underneath
   takes over.
   ========================= */
const canvasContainer = document.getElementById('canvas-container');
const webglCanvas = document.getElementById('webgl-canvas');

/* Fail-safe: whatever happens to the intro (a texture 404, a blocked
   library, a stalled GSAP timeline), never let its opaque black layers
   sit on top of the reel forever — but never pre-empt a healthy intro
   either, so when we do step in we FADE, we don't cut.
     - if the GSAP timeline never even started within 10s, the libs or
       textures are dead: dismiss now.
     - if it started but still hasn't finished after 20s, it's wedged:
       dismiss then. A normal run (even a slow one) finishes well inside
       that and clears these layers itself with its own 2s fade. */
function dismissIntroLayers() {
  if (window.introFinished) return;
  window.introFinished = true;
  [document.getElementById('canvas-container'),
   document.getElementById('camcorder-preloader')].forEach((el) => {
    if (!el || getComputedStyle(el).display === 'none') return;
    el.style.transition = 'opacity .8s ease';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 850);
  });
  if (window.animationFrameId) cancelAnimationFrame(window.animationFrameId);
  if (window.__introCleanup) window.__introCleanup();
}
/* In a background tab rAF is frozen, so GSAP never ticks and the timeline
   genuinely cannot start — that is not a wedged intro, it is a visitor who
   has not looked yet. Wait for them instead of burning the intro unseen. */
(function armIntroFailSafe() {
  setTimeout(() => {
    if (window.introStarted || window.introFinished) return;
    if (document.hidden) { armIntroFailSafe(); return; }
    dismissIntroLayers();
  }, 10000);
})();
(function armIntroHardStop() {
  setTimeout(() => {
    if (window.introFinished) return;
    if (document.hidden) { armIntroHardStop(); return; }
    dismissIntroLayers();
  }, 20000);
})();

if (canvasContainer && webglCanvas && window.THREE && window.gsap) {
  // 1. Setup Three.js Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.03); // Cinematic fog

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 0); // Camera is in the center of the cylinder

  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 3. Create the cylindrical carousel — every panel is a live video now.
  //    bugs-home sits at index 0: it is the panel parked in front of the
  //    camera on load, and the one that zooms out to fill the screen when
  //    the spin ends, exactly as the still hero used to.
  //
  //    These clips are served from this site, NOT from the Release CDN the
  //    reel below uses: release assets carry no Access-Control-Allow-Origin,
  //    so WebGL would refuse them as a tainted texture. They are small on
  //    purpose (~3 MB for all eight) because the intro is what the visitor
  //    waits on — the full-quality versions still stream in underneath.
  const MEDIA = [
    { src: 'media/intro/bugs-home.mp4',   poster: 'images/poster/bugs-home.jpg' },  // hero
    { src: 'media/intro/city-home.mp4',   poster: 'images/poster/city-home.jpg' },
    { src: 'media/intro/fish-home.mp4',   poster: 'images/poster/fish-home.jpg' },
    { src: 'media/intro/video-home.mp4',  poster: 'images/poster/video-home.jpg' },
    { src: 'media/intro/canyon-home.mp4', poster: 'images/poster/canyon-home.jpg' },
    { src: 'media/intro/mono-home.mp4',   poster: 'images/poster/mono-home.jpg' },
    { src: 'media/intro/ember-home.mp4',  poster: 'images/poster/ember-home.jpg' },
    { src: 'media/intro/c-works.mp4',     poster: 'images/poster/c-works.jpg' }
  ];

  const textureLoader = new THREE.TextureLoader();
  const totalImages = MEDIA.length;
  // Tang radius de khoang cach giua cac hinh rong hon
  const radius = Math.max(15, totalImages * 3.5);

  const carouselGroup = new THREE.Group();
  scene.add(carouselGroup);

  let introFinished = false; // Flag kiem soat hieu ung zoom dau trang
  const planes = [];
  const introVideos = [];
  const introTextures = [];

  const loadingPct = document.getElementById('load-pct');
  const preloader = document.getElementById('camcorder-preloader');

  // Every clip is 1920x1080, so the panel size is known up front — no need to
  // wait for a texture before the cylinder can exist. One shared geometry.
  const panelH = radius * 0.45;
  const panelW = panelH * (16 / 9);
  const panelGeo = new THREE.PlaneGeometry(panelW, panelH, 1, 1);

  /* On a phone held upright the camera saw less across than one panel is
     wide, so the cylinder spun by as an unreadable crop. Widen the vertical
     field of view just enough that the panel in front fits across the screen
     with a little air either side; any screen wide enough for that already
     keeps the 75deg the scene was composed at. */
  function fitFov() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const need = 2 * Math.atan((panelW * 1.12) / (2 * radius * aspect)) * 180 / Math.PI;
    camera.fov = Math.max(75, need);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  fitFov();

  // Off-screen but still laid out: display:none would let the browser suspend
  // decoding, and a suspended video hands WebGL a frozen frame.
  const videoHost = document.createElement('div');
  videoHost.setAttribute('aria-hidden', 'true');
  videoHost.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;' +
    'opacity:0;pointer-events:none;z-index:-1';
  document.body.appendChild(videoHost);

  let readyCount = 0;
  let launched = false;
  let heroVideo = null;
  // the intro clips were cut with -ss 0.5, so clip time + this = master time
  const INTRO_CLIP_OFFSET = 0.5;

  MEDIA.forEach((item, index) => {
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true
    });

    // Dam bao hinh chinh (index 0) luon hien thi de len cac hinh khac khi phong to
    if (index === 0) material.depthTest = false;

    const plane = new THREE.Mesh(panelGeo, material);
    if (index === 0) plane.renderOrder = 10;

    // Cong them Math.PI de hinh dau tien nam ngay truoc mat Camera khi moi load
    const angle = (index / totalImages) * Math.PI * 2 + Math.PI;
    plane.position.x = Math.sin(angle) * radius;
    plane.position.z = Math.cos(angle) * radius;
    // lookAt already aims the plane's front (+Z) straight at the camera in
    // the middle. The extra 180deg turn this used to carry span it round to
    // its BACK face, which side:DoubleSide rendered without complaint — as a
    // horizontal mirror. Never showed on the abstract stills; obvious the
    // moment real footage went on the panels.
    plane.lookAt(0, 0, 0);

    carouselGroup.add(plane);
    planes[index] = plane;

    // Poster first so a panel is never an empty black rectangle, then the
    // video takes the slot over the moment it has a decodable frame.
    textureLoader.load(item.poster, (t) => {
      if (material.userData.live) return;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      material.map = t;
      material.needsUpdate = true;
      introTextures.push(t);
    });

    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('loop', '');
    video.src = item.src;
    videoHost.appendChild(video);
    introVideos.push(video);
    if (index === 0) heroVideo = video;

    let counted = false;
    const countIn = () => {
      if (counted) return;
      counted = true;
      readyCount++;
      if (loadingPct) loadingPct.innerText = Math.round((readyCount / totalImages) * 100);
      if (readyCount === totalImages) launch();
    };

    video.addEventListener('loadeddata', () => {
      if (!material.userData.live) {
        material.userData.live = true;
        const vt = new THREE.VideoTexture(video);
        vt.minFilter = THREE.LinearFilter;   // video frames are NPOT: no mipmaps
        vt.magFilter = THREE.LinearFilter;
        vt.generateMipmaps = false;
        vt.wrapS = vt.wrapT = THREE.ClampToEdgeWrapping;
        material.map = vt;
        material.needsUpdate = true;
        introTextures.push(vt);
      }
      video.play().catch(() => {});
      countIn();
    }, { once: true });

    // A dead clip must not hold the door shut — the poster carries that panel.
    video.addEventListener('error', countIn, { once: true });
    video.load();
  });

  // Free the decoders the moment the intro is done: the reel underneath has
  // eight videos of its own and does not need to share the GPU with these.
  window.__introCleanup = function () {
    introVideos.forEach((v) => {
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    });
    introVideos.length = 0;
    introTextures.forEach((t) => { try { t.dispose(); } catch (e) {} });
    introTextures.length = 0;
    if (videoHost.parentNode) videoHost.parentNode.removeChild(videoHost);
  };

  function launch() {
    if (launched) return;
    launched = true;

    const startIntro = () => {
      window.introStarted = true; // tell the fail-safe the timeline is live
      const tl = gsap.timeline();

      // Tinh toan ty le phong to vua khit man hinh (dua tren FOV va khoang cach)
      const vFov = camera.fov * Math.PI / 180;
      const visibleHeight = 2 * Math.tan(vFov / 2) * radius;
      const visibleWidth = visibleHeight * camera.aspect;

      const pW = panelW;
      const pH = panelH;

      const scaleY = visibleHeight / pH;
      const scaleX = visibleWidth / pW;
      // Upright screens show the reel's clips whole, so the hero lands whole
      // there too - fitted across rather than cropped - or the dissolve into
      // the reel would read as a cut instead of one continuous shot.
      const targetScale = window.matchMedia('(orientation: portrait)').matches
        ? Math.min(scaleX, scaleY)
        : Math.max(scaleX, scaleY) * 1.02; // Lay ty le lon hon va +2% bu goc canh

      // 1. Xoay cuc nhanh 2 vong voi nhip do gat va dien anh hon (expo)
      tl.to(carouselGroup.rotation, {
        y: Math.PI * 4,
        duration: 3.2,
        ease: "expo.inOut"
      });

      // 2. Anticipation: Phong nho (co lai) nhe hon de lay da truoc khi no tung ra
      tl.to(planes[0].scale, {
        x: 0.9, y: 0.9, z: 0.9,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.8");

      // 3. Phong to manh me ra vua khit man hinh
      tl.to(planes[0].scale, {
        x: targetScale, y: targetScale, z: targetScale,
        duration: 1.4,
        ease: "power4.inOut"
      });

      // 3b. Lift the fog off the hero as it fills the frame, so the clip lands
      //     at full brightness instead of half-swallowed by the cylinder haze.
      tl.to(scene.fog, {
        density: 0,
        duration: 1.4,
        ease: "power2.inOut"
      }, "<");

      // 4. Cho 0.1s roi fade out toan bo Canvas 3D (nen den) de lo dan video reel ben duoi
      tl.to("#canvas-container", {
        opacity: 0,
        duration: 2,
        ease: "power2.out",
        onStart: () => {
          // Tell the reel underneath which frame of bugs-home we are holding,
          // so its own copy can line up before this canvas dissolves away.
          window.dispatchEvent(new CustomEvent('intro:handoff', {
            detail: {
              time: heroVideo && isFinite(heroVideo.currentTime)
                ? heroVideo.currentTime + INTRO_CLIP_OFFSET : null
            }
          }));
        },
        onComplete: () => {
          introFinished = true; // Ket thuc intro 3D
          window.introFinished = true; // let the fail-safe know it's done

          // Intro xong -> nhuong lai cho video reel dang chay ben duoi
          canvasContainer.style.display = 'none';

          // Huy 3D animation loop de tiet kiem tai nguyen
          if (window.animationFrameId) {
            cancelAnimationFrame(window.animationFrameId);
          }
          if (window.__introCleanup) window.__introCleanup();
        }
      }, "+=0.1");
    };

    if (preloader) {
      gsap.to(preloader, {
        opacity: 0,
        duration: 1.5,
        delay: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          preloader.style.display = 'none';
          startIntro();
        }
      });
    } else {
      startIntro();
    }
  }

  // Never let one slow clip keep the visitor on the loading title: whatever
  // has arrived by now goes on stage, the rest keep their posters.
  setTimeout(launch, 6000);

  // Floating animation
  const clock = new THREE.Clock();

  function animate() {
    window.animationFrameId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (introFinished) {
      // Khi da vao trang home, tu dong cuon (xoay) khong co diem dung
      carouselGroup.rotation.y += 0.002;
    }

    // Add subtle floating effect to planes
    planes.forEach((plane, index) => {
      if (plane) {
        plane.position.y = Math.sin(elapsedTime * 0.8 + index) * 0.3;
      }
    });

    renderer.render(scene, camera);
  }
  animate();

  // Handle Resize
  window.addEventListener('resize', () => {
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

} else if (canvasContainer) {
  // Libraries blocked / offline: skip the 3D intro, just hide its layers.
  canvasContainer.style.display = 'none';
  const preloader = document.getElementById('camcorder-preloader');
  if (preloader) preloader.style.display = 'none';
}


/* ==========================================
   PAGE FADE
   The page fades in as it opens (theme.css) and fades out before a link
   to another page of the site is followed. Nothing else.
   ========================================== */

(function () {
  const FADE_MS = 300;
  let leaving = false;

  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link || leaving) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return;   // same page, e.g. a #hash

    e.preventDefault();
    leaving = true;
    document.documentElement.classList.add('pf-leave');
    setTimeout(() => {
      window.dispatchEvent(new Event('page:leave'));
      location.href = url.href;
    }, FADE_MS);
  });

  // Back/forward restores the page from cache - show it again.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    document.documentElement.classList.remove('pf-leave');
  });
})();

/* ==========================================
   WORKS PAGE TOGGLE
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
  const workRows = document.querySelectorAll('.work-row');
  workRows.forEach(row => {
    row.addEventListener('click', (e) => {
      // Prevent default only if they clicked the main row itself, 
      // but in this setup, the whole row is an <a> tag pointing to "#"
      const href = row.getAttribute('href');
      if (href === '#' || href === '') {
        e.preventDefault();
      }

      // Close others (accordion style) - optional but nice
      workRows.forEach(otherRow => {
        if (otherRow !== row) {
          otherRow.classList.remove('is-open');
        }
      });

      // Toggle current
      row.classList.toggle('is-open');
    });
  });
});

/* ==========================================
   WORKS — INSIDE-OUT LABEL CYLINDER
   All work images sit side by side on one rounded-rect
   "label" wrapped around a vertical cylinder, the way a
   label wraps a bottle. Instead of viewing it from outside
   (convex), the camera sits inside: the work directly ahead
   is flat and frontal, the rest curve away to the sides.
   Scrolling spins the cylinder around its vertical axis.
   ========================================== */
(function () {
  const reel = document.getElementById('worksReel');
  if (!reel) return;

  const ring = document.getElementById('reelRing');
  if (!ring) return;

  /* `bg` is the picture a frame is filled with and `bgPos` which part of it
     stays in view once it has been cut to the frame's shape - the same value
     goes to CSS object-position and to the reflection, so the water shows the
     part of the picture the frame shows. 3D/Video has none and stays
     plain.
     `desc` and `tags` are the two lines under the title and the three words in
     the corner of a resting frame. They are copy, not structure - written to
     fit the layout, and meant to be replaced with the real words. */
  const WORKS = [
    { name: 'Arachnid',         role: 'Photography',      img: 'images/spider-bw.jpg',      caption: 'Experience Design', link: 'experience-design.html',
      bg: 'images/ex-works.png',              bgPos: '50% 50%',
      desc: 'Interaction studies', years: '2024 — 2026', tags: ['Interactions', 'Products', 'And ideas'] },
    { name: 'Jurassic Era',     role: 'Exhibition',       img: 'images/dino-01.jpg',        caption: '3D/Video', link: '3d-video.html',
      desc: 'Motion and volume',   years: '2024 — 2026', tags: ['Frames', 'Depth', 'Movement'] },
    { name: 'Fossil Structure', role: 'Visual Study',     img: 'images/dino-02.jpg',        caption: 'Photography', link: 'photography.html',
      bg: 'images/spider-bw.jpg',             bgPos: '50% 50%',
      desc: 'Thirty-four frames',  years: '2024 — 2026', tags: ['Moments', 'Perspectives', 'Stories'] },
    { name: 'Night Mirror',     role: 'Self Portrait',    img: 'images/about-user-01.png',  caption: 'Poster', link: 'poster.html',
      // 15%, not centre: centred, the cover crop took the T off TRUNG THU
      bg: 'images/trungthu-works-poster.png', bgPos: '15% 50%',
      desc: 'Visual experiments',  years: '2024 — 2026', tags: ['Paper', 'Type', 'Colour'] },
    { name: 'Fogged Glass',     role: 'Photography',      img: 'images/about-user-02.png',  caption: 'Typography', link: 'typography.html',
      // 0%: the Esquire wordmark runs past the right edge of the scan already,
      // so the crop is spent on the right and the E stays whole
      bg: 'images/book/p02.jpg',              bgPos: '0% 50%',
      desc: 'Letterform studies',  years: '2024 — 2026', tags: ['Letters', 'Layouts', 'Expressions'] },
    { name: 'Thermal Study',    role: 'Experiment',       img: 'images/about-user-03.png',  caption: 'Calendar', link: 'calendar.html',
      bg: 'images/calendar-works.gif',        bgPos: '50% 50%',
      desc: 'Twelve months',       years: '2024 — 2026', tags: ['Days', 'Grids', 'Seasons'] },
    { name: 'Digital Art',      role: 'Drawing / Vector', img: 'images/digital-art-01.png', caption: 'Digital Art', link: 'digital-art.html',
      bg: 'images/digital-art-05.png',        bgPos: '18% 50%',
      desc: 'Drawn and vectored',  years: '2024 — 2026', tags: ['Pixels', 'Brushes', 'Worlds'] }
  ];
  const N = WORKS.length;
  const totalWorks = N;
  sizeLoopSpacer(reel.querySelector('.reel-scroll-spacer'), N);
  const STEP_DEG = 360 / N;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm180 = (deg) => ((deg + 180) % 360 + 360) % 360 - 180;

  /* Frame / surface / title are three separate layers on purpose.
     .reel-card       is the frame: it owns the border and clips its children,
                      and nothing is ever allowed to move it.
     .reel-card-water is the surface the pointer disturbs - one canvas for the
                      whole reel, not one per frame (see below).
     .reel-card-body  holds every word on the frame and is the one element
                      the cursor zooms and leans, so the number, the title and
                      the footer row can never fall out of step.
     The frames carry no photograph: each is a flat panel behind a white
     hairline, and what appears inside is the water the cursor stirs up plus
     the writing. WORKS still carries its `img` paths so the
     pictures can be put back in one line, but nothing requests them now - no
     image element is built at all, so the reel downloads nothing. */
  /* Numbering starts on the work the reel opens centred on and counts to the
     right from there, so the frame you land on is 01. Derived from the same
     lookup that decides where the reel starts (see FEATURED_IDX below), so the
     two can never drift apart and start the count on a different frame than
     the one on screen. */
  const NUM_START = Math.max(0, WORKS.findIndex((w) => w.name === 'Night Mirror'));

  const cards = [];
  const bgImgs = [];   // by frame index; the water reads these for its reflections
  WORKS.forEach((w, wi) => {
    const c = document.createElement('div');
    c.className = 'reel-card';

    if (w.bg) {
      /* The frame's picture. An <img> rather than a CSS background so it can
         decode off the main thread and so object-fit does the fitting: cover
         fills the frame edge to edge whatever shape the file is. The portrait
         pieces lose a sliver at the sides; the two landscape ones give up about
         half their width, and bgPos says which half.
         It is the bottom of the frame's own stack - under the shade, under the
         water the cursor stirs, under the words - so nothing that already
         happens on a frame changes, it just happens over a picture. */
      c.classList.add('has-bg');
      const im = document.createElement('img');
      im.className = 'reel-card-bg';
      im.alt = '';
      im.decoding = 'async';
      im.draggable = false;
      if (w.bgPos) im.style.objectPosition = w.bgPos;
      im.src = w.bg;
      c.appendChild(im);
      const shade = document.createElement('div');
      shade.className = 'reel-card-shade';
      c.appendChild(shade);
      bgImgs[wi] = im;
    }

    if (w.caption) {
      /* Everything written on a frame lives in one element, and that one
         element is what zooms and leans under the cursor. Number, title and
         footer therefore cannot drift out of step with each other: it is not
         three effects kept in sync, it is one transform. */
      const body = document.createElement('div');
      body.className = 'reel-card-body';

      const n = (((wi - NUM_START) % totalWorks) + totalWorks) % totalWorks + 1;
      const num = document.createElement('div');
      num.className = 'wk-num';
      num.innerHTML = '<b></b><span></span>';
      num.firstChild.textContent = String(n).padStart(2, '0');
      num.lastChild.textContent = ' / ' + String(totalWorks).padStart(2, '0');
      body.appendChild(num);

      const mid = document.createElement('div');
      mid.className = 'wk-mid';
      const title = document.createElement('h2');
      title.className = 'wk-title';
      title.textContent = w.caption;
      mid.appendChild(title);
      const rule = document.createElement('span');
      rule.className = 'wk-rule';
      mid.appendChild(rule);
      const desc = document.createElement('p');
      desc.className = 'wk-desc';
      desc.appendChild(document.createTextNode(w.desc || ''));
      desc.appendChild(document.createElement('br'));
      desc.appendChild(document.createTextNode(w.years || ''));
      mid.appendChild(desc);
      body.appendChild(mid);

      // The three words a resting frame shows, and the row the centred one
      // shows instead. Both are always in the DOM and cross-fade, so a frame
      // arriving at the centre trades one for the other rather than popping.
      const tags = document.createElement('p');
      tags.className = 'wk-tags';
      (w.tags || []).forEach((t, ti) => {
        if (ti) tags.appendChild(document.createElement('br'));
        tags.appendChild(document.createTextNode(t));
      });
      body.appendChild(tags);

      const ex = document.createElement('div');
      ex.className = 'wk-explore';
      const exLabel = document.createElement('span');
      exLabel.textContent = w.link ? 'Explore' : 'In progress';
      ex.appendChild(exLabel);
      ex.insertAdjacentHTML('beforeend',
        '<svg class="wk-arrow" viewBox="0 0 46 8" aria-hidden="true">' +
        '<path d="M0 4h42M38 1l4 3-4 3"/></svg>');
      body.appendChild(ex);

      c.appendChild(body);
    }

    ring.appendChild(c);
    cards.push(c);
  });

  /* ---- the water ---------------------------------------------------------
     A height field, not a picture: every cell is pulled towards the average
     of its four neighbours and away from where it was a tick ago, which is
     the wave equation written out one cell at a time. The border row and
     column are never written, so they stand as walls and the rings bounce
     back off the inside of the frame the way they do in a tray.

     Three things keep it cheap:
       - ONE canvas for the whole reel, moved into whichever frame is frontal.
         Seven surfaces would be seven of everything for six frames nobody can
         reach.
       - The loop is not permanent. A splash starts it; it stops itself once
         the surface goes flat again, and clears the canvas on the way out.
       - Nothing is ever measured. The pointer arrives with offsetX/offsetY,
         which the browser has already mapped through the frame's own 3D
         transform, so the ripple lands under the cursor without a single
         getBoundingClientRect().
     The grid is small on purpose - it is stretched over the frame by CSS, and
     the upscale is what makes the rings read as soft water rather than pixels. */
  const hoverFX = !!(window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Read once, never per frame. offsetX/offsetY arrive relative to the frame's
     PADDING box, so the border has to come off the card size before the
     pointer can be turned into a grid coordinate - otherwise thickening the
     border quietly shifts every ripple away from the cursor. */
  const FRAME_BORDER = cards.length
    ? (parseFloat(window.getComputedStyle(cards[0]).borderTopWidth) || 0) : 0;

  const WATER_COLS = 116;
  const WATER_DAMP = 0.990;   // how fast the surface settles
  /* Two different things make the surface "calm", and they pull apart:
     WATER_DAMP and the stroke power decide how violently it moves, the gain
     only decides how brightly the result is drawn. Dropping the power is what
     took the chop out; dropping the gain as well just made the ripples
     disappear. So the disturbance stays small and the gain carries it back up
     to something you can actually see. */
  const WATER_GAIN = 150;     // slope of the surface -> brightness
  /* Slope alone draws only the EDGES of a wave, which is why the surface came
     out as thin bright filaments with black between them - correct for a taut
     film, wrong for something that should read as a body of liquid. Adding a
     share of the displacement itself fills the moving mass in, and that is
     what turns wisps into water with substance. */
  const WATER_BODY = 120;     // displacement -> brightness
  const WATER_RADIUS = 5;     // cells; a wider dip makes a longer, fatter wave
  const WATER_DROP = 0.016;   // energy per drop laid along a stroke
  /* When the surface is quieter than this the loop shuts down and wipes the
     canvas. It has to be derived from the drop size, not written as a number:
     it used to be a flat 0.045 from back when a drop carried 0.6, so calming
     the water to 0.030 per drop put every ripple BELOW the threshold - the
     loop decided the frame was already still and killed it half a second in.
     Rings stopped travelling at all and the effect collapsed into a smudge
     that followed the cursor. Tie it to the drop and it cannot drift again. */
  const WATER_FLAT = WATER_DROP * 0.12;
  let waterRows = 155;
  let waterPrev = null;       // heights this tick
  let waterCur = null;        // heights last tick
  let waterCanvas = null;
  let waterCtx = null;
  let waterPix = null;
  let waterRAF = null;
  let waterIdle = 0;
  let lastWX = -1;
  let lastWY = -1;

  function waterAlloc() {
    if (!hoverFX || !CARD_W || !CARD_H) return;
    const rows = Math.max(40, Math.min(240, Math.round(WATER_COLS * (CARD_H / CARD_W))));
    if (waterCanvas && rows === waterRows) return;   // nothing changed shape
    waterRows = rows;
    const n = WATER_COLS * waterRows;
    waterPrev = new Float32Array(n);
    waterCur = new Float32Array(n);
    if (!waterCanvas) {
      waterCanvas = document.createElement('canvas');
      waterCanvas.className = 'reel-card-water';
      waterCanvas.setAttribute('aria-hidden', 'true');
      waterCtx = waterCanvas.getContext('2d');
    }
    waterCanvas.width = WATER_COLS;
    waterCanvas.height = waterRows;
    waterPix = waterCtx.createImageData(WATER_COLS, waterRows);
    // The surface is white throughout and only ever changes its alpha, so the
    // frame's black shows through wherever the water is flat.
    const d = waterPix.data;
    for (let i = 0; i < n; i++) { d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; }
  }

  function waterStop() {
    if (waterRAF !== null) { window.cancelAnimationFrame(waterRAF); waterRAF = null; }
    if (waterPrev) { waterPrev.fill(0); waterCur.fill(0); }
    if (waterPix && waterCtx) {
      const d = waterPix.data;
      for (let i = 3; i < d.length; i += 4) d[i] = 0;
      waterCtx.putImageData(waterPix, 0, 0);
    }
    lastWX = lastWY = -1;
  }

  function waterDrop(px, py, power) {
    if (!waterPrev) return;
    const cx = Math.round((px / Math.max(1, CARD_W - FRAME_BORDER * 2)) * (WATER_COLS - 1));
    const cy = Math.round((py / Math.max(1, CARD_H - FRAME_BORDER * 2)) * (waterRows - 1));
    // A wide, soft dip rather than a poke. The width of the dip sets the
    // wavelength of everything that comes off it, so a narrow one gives thin
    // quick ripples and a broad one gives the long, heavy swell that reads as
    // thicker liquid.
    const R = WATER_RADIUS, R2 = R * R, FALL = R2 + 2;
    for (let y = -R; y <= R; y++) {
      const yy = cy + y;
      if (yy < 1 || yy >= waterRows - 1) continue;
      for (let x = -R; x <= R; x++) {
        const xx = cx + x;
        if (xx < 1 || xx >= WATER_COLS - 1) continue;
        const d2 = x * x + y * y;
        if (d2 > R2) continue;
        waterPrev[yy * WATER_COLS + xx] -= power * (1 - d2 / FALL);
      }
    }
    waterIdle = 0;
    if (waterRAF === null) waterRAF = window.requestAnimationFrame(waterTick);
  }

  function waterTick() {
    const W = WATER_COLS, H = waterRows;
    const a = waterPrev, b = waterCur;

    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++) {
        b[i] = ((a[i - 1] + a[i + 1] + a[i - W] + a[i + W]) * 0.5 - b[i]) * WATER_DAMP;
      }
    }
    waterPrev = b; waterCur = a;               // the new heights become "now"

    const h = waterPrev, d = waterPix.data;
    let peak = 0;
    for (let y = 1; y < H - 1; y++) {
      let i = y * W + 1;
      for (let x = 1; x < W - 1; x++, i++) {
        // Two terms. The slope is the light catching the tilt of the surface
        // - that is what makes it read as water and not as a stain. The body
        // is the displaced mass underneath it, and without that term the
        // frame only ever shows the creases between waves.
        let v = ((h[i - 1] - h[i + 1]) + (h[i - W] - h[i + W])) * WATER_GAIN;
        if (v < 0) v = -v * 0.42;              // far side of each ridge, kept faint
        const m = h[i] < 0 ? -h[i] : h[i];
        v += m * WATER_BODY;
        d[i * 4 + 3] = v > 255 ? 255 : v;
        if (m > peak) peak = m;
      }
    }
    waterCtx.putImageData(waterPix, 0, 0);

    waterIdle++;
    if (peak < WATER_FLAT && waterIdle > 24) { waterStop(); return; }
    waterRAF = window.requestAnimationFrame(waterTick);
  }

  /* Drops are laid along the path at a fixed spacing, and each one carries the
     same small amount of energy. Both halves of that matter:

     - Fixed SPACING is what stops a quick flick shattering. The step count
       used to be capped at eight however far the pointer had travelled, so a
       200px flick in one frame laid eight craters 25px apart - and a crater is
       only three cells wide. Measured on the old build: a 205px flick left
       sixteen dead gaps along its own stroke, alpha falling to nothing between
       the blobs. That bead of separate holes is what read as broken water.
     - Fixed energy PER DROP means a stroke costs what its length costs, not
       what its speed costs. Sweeping fast and sweeping slow across the same
       path now disturb the surface by the same amount, which is both what
       water does and the reason a fast move no longer erupts. */
  const WATER_STEP_PX = 2.5;   // one drop per 2.5px of path
  const WATER_STEP_MAX = 72;   // ceiling, so one freak jump cannot stall a frame

  function waterStroke(px, py) {
    if (lastWX < 0) {
      waterDrop(px, py, WATER_DROP * 3);
      lastWX = px; lastWY = py;
      return;
    }
    const dx = px - lastWX, dy = py - lastWY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.4) return;
    const steps = Math.max(1, Math.min(WATER_STEP_MAX, Math.round(dist / WATER_STEP_PX)));
    for (let k = 1; k <= steps; k++) {
      waterDrop(lastWX + dx * (k / steps), lastWY + dy * (k / steps), WATER_DROP);
    }
    lastWX = px; lastWY = py;
  }

  /* ---- the water -----------------------------------------------------------
     A still surface the frames stand in: a sheet of very faint light where
     they meet it, one mirrored copy of each frame, and just enough movement
     that it reads as liquid rather than as a mirror.

     The cheap part is the geometry. A frame is a flat rectangle turned only
     about the Y axis, so it projects to a trapezoid whose LEFT AND RIGHT EDGES
     STAY VERTICAL - only their heights differ. Two edges to work out per frame
     instead of four corners, and the mirrored copy lays down as strips between
     them. None of it measures the DOM: the numbers come from the same values
     that place the frame, so a frame and its reflection cannot drift apart.

     The mirror line is each frame's own foot, not one line across the screen.
     Frames further round the ring stand higher up the picture, and reflecting
     them all about a single line would leave the near ones floating. */
  const reflect = document.getElementById('reelReflect');
  const rctx = reflect ? reflect.getContext('2d') : null;
  const DEG = Math.PI / 180;
  const REFLECT_SCALE = 0.5;      // canvas resolution against css pixels
  const REFLECT_ALPHA = 0.34;     // how much of a frame the water gives back
  const REFLECT_TINT = '46,46,46';
  const REFLECT_STRIP = 6;        // css px per mirrored strip
  const REFLECT_FPS = 30;         // the surface is nearly still; 60 buys nothing
  const REFLECT_MIN_W = 901;      // matches the stylesheet's own cut-off
  /* Sway, in px, at the deepest visible part of a reflection. It has to reach
     ZERO at the waterline: that is the one place the reflection touches the
     frame it belongs to, and any movement there detaches the two - the
     reflection reads as a separate grey shape sliding about beneath the frame
     instead of as the frame given back. */
  const WOBBLE_DEEP = 7.0;
  const SURFACE_ALPHA = 0.038;    // the sheet of light on the plane itself
  let REF_H = 0;
  let REF_SURF = 0;        // canvas y where the open surface begins
  // the two side edges of one reflection, kept between ticks so the loop is
  // not handing the collector four arrays a frame
  const edgeLX = [], edgeLY = [], edgeRX = [], edgeRY = [];
  let refGrad = null;
  let refRAF = null;
  let refLast = 0;
  let refActive = false;   // is there water on this screen at all
  let refLeaving = false;  // a transition to another page has covered the screen
  const refStill = !!(window.matchMedia &&
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function reflectAlloc() {
    if (!rctx) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    /* The canvas starts at the frames' centre line rather than at any one
       frame's foot: the feet sit at different heights and the highest of them
       moves as the ring turns, so anchoring to one would mean resizing the
       canvas mid-spin. Everything above the surface is simply never drawn. */
    REF_H = Math.max(1, Math.round(vh - CY));
    reflect.style.height = REF_H + 'px';
    const cw = Math.max(1, Math.round(vw * REFLECT_SCALE));
    const ch = Math.max(1, Math.round(REF_H * REFLECT_SCALE));
    if (reflect.width !== cw || reflect.height !== ch) {
      reflect.width = cw;
      reflect.height = ch;
    }
    // draw in css pixels and let the canvas be half of them
    rctx.setTransform(REFLECT_SCALE, 0, 0, REFLECT_SCALE, 0, 0);
    /* Where the surface begins. The frontal frame's foot is the nearest point
       of it, but the frames beside it stand further back and therefore HIGHER
       up the picture - about four fifths of the way down - so the sheet has to
       start there or their reflections would begin above the water.
       A gradient pads its end stops outwards, so the transparent stop above
       the surface is not optional: without it the wash filled the whole canvas
       and hung between the frames like fog. */
    const base = CARD_H * 0.5 * FRONT_MAG * 0.78;
    REF_SURF = base;
    const b = Math.max(0, Math.min(0.96, base / REF_H));
    const g = rctx.createLinearGradient(0, 0, 0, REF_H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(b, 'rgba(255,255,255,0)');
    g.addColorStop(Math.min(1, b + 0.02), 'rgba(255,255,255,' + SURFACE_ALPHA.toFixed(4) + ')');
    g.addColorStop(Math.min(1, b + (1 - b) * 0.34), 'rgba(255,255,255,' + (SURFACE_ALPHA * 0.4).toFixed(4) + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    refGrad = g;
  }

  /* ---- what the water gives back of a picture --------------------------------
     A frame with a picture in it has to reflect the picture, or the water is
     showing a grey slab under a poster. Each picture is cut to the frame's own
     shape once - cover, at the same bgPos the <img> uses - and stored upside
     down, so row 0 of the texture is the picture's foot, the row that touches
     the water. The strips below then map it with one affine transform each:
     a strip is a thin quad with vertical sides, which an affine map covers to
     well under a pixel, and its two edges carry their own heights so the
     picture foreshortens with the frame instead of being pasted on flat.
     An animated picture is re-cut a few times a second while it is in view, so
     its reflection keeps moving with it; a still one is cut once. */
  const TEX_W = 240;
  const TEX_ANIM_MS = 160;
  const texCanvases = [];
  const texPatterns = [];
  const texStamp = [];
  const texMatrix = (typeof DOMMatrix === 'function') ? new DOMMatrix() : null;
  const PATTERN_TF = !!texMatrix && typeof CanvasPattern !== 'undefined' &&
                     typeof CanvasPattern.prototype.setTransform === 'function';

  function bgFraction(pos) {
    const m = String(pos || '').match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
    return m ? [parseFloat(m[1]) / 100, parseFloat(m[2]) / 100] : [0.5, 0.5];
  }

  function texHeight() { return Math.round(TEX_W * CARD_RATIO); }

  /* The picture zooms and drifts under the cursor (see .reel-card-bg in the
     stylesheet), so its reflection has to as well - a reflection that holds
     still while the thing it reflects moves is exactly the mismatch the water
     was rebuilt to get rid of. CSS does the easing for the <img>; this follows
     the same targets with an exponential of about the same feel (the zoom's
     620ms curve settles like tau 150ms, the drift's 260ms like tau 65ms) so the
     two travel together. */
  const BG_ZOOM = 1.08;      // keep in step with .reel-card-bg:hover scale
  const BG_DRIFT = 0.025;    // ...and with its translate, as a fraction of the frame
  let hoverOn = false;
  let hoverTX = 0;
  let hoverTY = 0;
  let bgLastT = 0;
  let bgK = 1, bgX = 0, bgY = 0;   // bgMotion's answer for the frame just asked about
  const bgZoom = [], bgSX = [], bgSY = [];
  function bgMotion(i, dt) {
    const on = hoverOn && hoverFX && !refStill && i === frontIdx;
    const tz = on ? BG_ZOOM : 1;
    const tx = on ? -hoverTX * BG_DRIFT : 0;
    const ty = on ? -hoverTY * BG_DRIFT : 0;
    const az = dt ? 1 - Math.exp(-dt / 150) : 1;
    const at = dt ? 1 - Math.exp(-dt / 65) : 1;
    const z0 = bgZoom[i] === undefined ? 1 : bgZoom[i];
    const x0 = bgSX[i] || 0, y0 = bgSY[i] || 0;
    bgK = bgZoom[i] = z0 + (tz - z0) * az;
    bgX = bgSX[i] = x0 + (tx - x0) * at;
    bgY = bgSY[i] = y0 + (ty - y0) * at;
  }

  function buildTexture(i) {
    const im = bgImgs[i];
    if (!rctx || !im || !im.complete || !im.naturalWidth) return null;
    const TH = texHeight();
    let cv = texCanvases[i];
    if (!cv) { cv = document.createElement('canvas'); texCanvases[i] = cv; }
    if (cv.width !== TEX_W || cv.height !== TH) { cv.width = TEX_W; cv.height = TH; }
    const g = cv.getContext('2d');
    const W = im.naturalWidth, H = im.naturalHeight;
    // the same arithmetic as object-fit: cover
    let cw, ch;
    if (H / W < TH / TEX_W) { ch = H; cw = H * TEX_W / TH; }
    else { cw = W; ch = W * TH / TEX_W; }
    const f = bgFraction(WORKS[i] && WORKS[i].bgPos);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, TEX_W, TH);
    g.setTransform(1, 0, 0, -1, 0, TH);            // upside down: row 0 is the foot
    g.drawImage(im, (W - cw) * f[0], (H - ch) * f[1], cw, ch, 0, 0, TEX_W, TH);
    g.setTransform(1, 0, 0, 1, 0, 0);
    texPatterns[i] = rctx.createPattern(cv, 'no-repeat');
    texStamp[i] = performance.now();
    return texPatterns[i];
  }

  function texFor(i, now) {
    if (!PATTERN_TF || !bgImgs[i]) return null;
    const pat = texPatterns[i];
    const moving = /\.gif(\?|$)/i.test((WORKS[i] && WORKS[i].bg) || '');
    if (!pat || (moving && now && now - (texStamp[i] || 0) > TEX_ANIM_MS)) {
      return buildTexture(i) || pat || null;
    }
    return pat;
  }

  /* ---- the breeze -----------------------------------------------------------
     A light wind across the water, blowing from the back left towards the
     front right. It never stops and never turns round, it just freshens and
     eases: its speed is a base plus two slow cosines that never add up to more
     than the base, so it varies between a tenth of that speed and nearly
     double.
     Nothing here keeps state between frames. The distance the wind has pushed
     the water is the integral of that speed, written out - so the ripples are a
     pure function of the clock and move at exactly the same pace whether the
     loop is drawing at 30fps, at 60 during a spin, or has just been woken from
     a hidden tab. `gust` is the same speed rescaled to 0..1. */
  const WIND_SPEED = 26;             // px/s across the nearest water, on average
  let WIND_DIST = 0;
  let WIND_GUST = 0.5;
  function windAt(ms) {
    const t = ms / 1000;
    WIND_DIST = WIND_SPEED * (t +
      0.55 * Math.sin(0.21 * t) / 0.21 +
      0.35 * (Math.sin(0.083 * t + 1.1) - Math.sin(1.1)) / 0.083);
    const g = 0.5 + 0.5 * (0.55 * Math.cos(0.21 * t) + 0.35 * Math.cos(0.083 * t + 1.1)) / 0.9;
    WIND_GUST = g < 0 ? 0 : g > 1 ? 1 : g;
  }

  /* How far the reflection is pushed sideways at (x, y), `d` deep into the
     water - still 0 at the surface, where the reflection meets its frame.
     The first wave is the wind's: its crests run diagonally, and the breeze
     carries them down and to the right, so each strip's two edges catch it at
     different moments and the reflection shears a little as it passes. The
     second is the water's own slow sway. A gust roughens both. */
  function wobble(x, y, T, d) {
    if (d <= 0) return 0;
    const w = WIND_DIST * 0.02;
    return (Math.sin(y * 0.055 + x * 0.011 - w) * 0.62 + Math.sin(y * 0.019 - T * 0.73) * 0.38) *
           WOBBLE_DEEP * d * (0.75 + 0.5 * WIND_GUST);
  }

  /* Cat's paws: short, faint crests the breeze drives across the open water.
     Each one has a fixed place in depth (far ones sit near the top of the water
     and are small and slow, near ones low, longer and quicker - perspective),
     a length, a starting point and a rhythm on which it catches the light and
     loses it again. The field is seeded once; where each crest is at any
     moment comes from the wind's distance, not from stored positions. */
  const CRESTS = 54;
  const crest = new Float32Array(CRESTS * 4);
  {
    let seed = 20260910;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let q = 0; q < CRESTS; q++) {
      crest[q * 4] = rnd();            // depth, 0 far .. 1 near
      crest[q * 4 + 1] = rnd();        // length
      crest[q * 4 + 2] = rnd();        // starting point across the water
      crest[q * 4 + 3] = rnd();        // how quickly it glints
    }
  }

  function reflectDraw(now) {
    if (!rctx || !REF_H) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const halfW = vw / 2;
    rctx.clearRect(0, 0, vw, REF_H);
    if (refGrad) { rctx.fillStyle = refGrad; rctx.fillRect(0, 0, vw, REF_H); }

    const T = now * 0.0011;
    windAt(now);
    const dtBg = (now && bgLastT) ? Math.min(100, Math.max(0, now - bgLastT)) : 0;
    if (now) bgLastT = now;
    for (let i = 0; i < cards.length; i++) {
      const pres = PRES[i] || 0;
      if (pres < 0.02) continue;
      const s = SCL[i] || 1;
      const rel = norm180(RING_ANGLE - i * STEP_DEG);
      const a = rel * DEG, ca = Math.cos(a), sa = Math.sin(a);
      const f = -rel * RING_FACE * DEG, cf = Math.cos(f), sf = Math.sin(f);
      const hw = CARD_W * 0.5 * s, hh = CARD_H * 0.5 * s;

      let xL = 0, hL = 0, xR = 0, hR = 0;
      for (let k = 0; k < 2; k++) {
        // one vertical edge of the frame, carried through the same transform
        // list the stylesheet applies: scale, face-back, out to the ring,
        // round by the ring's angle, then forward towards the camera
        const x = k ? hw : -hw;
        const X0 = x * cf, Z0 = -x * sf - RADIUS;
        const X1 = X0 * ca + Z0 * sa;
        const Z1 = -X0 * sa + Z0 * ca + FORWARD;
        const m = PERSP / (PERSP - Z1);
        if (m <= 0) { hL = 0; hR = 0; break; }
        if (k) { xR = halfW + X1 * m; hR = hh * m; }
        else   { xL = halfW + X1 * m; hL = hh * m; }
      }
      if (!hL || !hR) continue;
      if (xR < xL) { const tx = xL, th = hL; xL = xR; hL = hR; xR = tx; hR = th; }

      /* THE MIRROR. Each vertical edge is turned about ITS OWN foot, not about
         one line drawn across the frame.

         Reflecting in a flat horizontal surface leaves x and z untouched and
         sends world height Y to 2*Yw - Y, so the reflected point keeps the very
         same perspective factor m as the point it came from. Substitute that
         back into the projection and it says: on screen, mirror about the line
         CY + Yw*m. The two edges of a turned frame stand at different distances
         and so carry different m - which means DIFFERENT MIRROR LINES, and each
         edge's line lands exactly on that edge's own foot.
         Averaging the two, as this did before, mirrors each edge about a line
         that is not its own. The reflection then meets the frame on neither
         side: it rides up over the foot at the near edge and hangs off it at
         the far one, by half the difference between them. On the frames beside
         the centre that is tens of pixels, and it is why the reflection did not
         look like it belonged to the frame.

         Mirrored about its own foot, an edge that runs from CY + h (foot) up to
         CY - h (top) comes back running from CY + h down to CY + 3h. Same
         height on screen as the frame - which is right, and not the same thing
         as "the same height in the world": a flat mirror gives back exactly the
         projected height it was given, at the same x. */
      const footL = CY + hL, footR = CY + hR;
      if (footL > vh && footR > vh) continue;
      // Fresnel, near enough: the water gives most back where it is seen at a
      // glancing angle - up near the frame - and least where you are looking
      // straight down into it, at the bottom of the screen. That is also what
      // keeps the reflection from being cut off by the edge of the viewport.
      const fadeL = Math.max(60, vh - footL);
      const fadeR = Math.max(60, vh - footR);
      const dv = REFLECT_STRIP / Math.max(1, hL + hR);
      const pat = texFor(i, now);
      const TH = pat ? texHeight() : 0;
      if (pat) bgMotion(i, dtBg); else { bgK = 1; bgX = 0; bgY = 0; }

      // the frame's lower border, given back. No sway: this is the waterline.
      rctx.strokeStyle = 'rgba(255,255,255,' + (0.12 * pres).toFixed(4) + ')';
      rctx.lineWidth = 2;
      rctx.beginPath();
      rctx.moveTo(xL, footL - CY);
      rctx.lineTo(xR, footR - CY);
      rctx.stroke();

      edgeLX.length = 0; edgeLY.length = 0; edgeRX.length = 0; edgeRY.length = 0;
      for (let v = 0; v < 1; v += dv) {
        const v2 = Math.min(1, v + dv);
        const y0l = CY + hL * (1 + 2 * v);
        const y0r = CY + hR * (1 + 2 * v);
        const y1l = CY + hL * (1 + 2 * v2);
        const y1r = CY + hR * (1 + 2 * v2);
        const dL = (y0l - footL) / fadeL;
        const dR = (y0r - footR) / fadeR;
        const d = (dL + dR) * 0.5;
        if (d >= 1) break;
        const k = 1 - d;
        const alpha = REFLECT_ALPHA * pres * k * k * Math.sqrt(k);
        if (alpha < 0.004) break;
        // each edge sways on its own phase and by its own depth, so the strip
        // shears a little instead of sliding as a rigid block
        const wl = wobble(xL, y0l, T, dL);
        const wr = wobble(xR, y0r, T, dR);
        if (pat) {
          /* texture (tx, ty) -> canvas (x, y) for this strip. Row ty = v*TH of
             the upside-down texture is the part of the picture that sits v of
             the way up the frame; across the strip x runs edge to edge, y
             follows the slant between the two feet, and down the strip each
             texture row spans (hL + hR) / TH screen pixels - the average of the
             two edges' own rates, which differ by far less than a pixel over
             one strip. */
          /* With the picture zoomed by k about the frame's centre and moved by
             (sx, sy) of the frame, a point u across the picture sits at
             0.5 + (u - 0.5)k + sx across the frame, and the same again up it
             with sy counted the other way - down the screen is towards the foot,
             which in the water is towards the waterline. At k = 1, s = 0 this
             is exactly the unzoomed mapping. */
          const xl = xL + wl, xr = xR + wr;
          const W = xr - xl, Hs = hL + hR, slant = y0r - y0l;
          const off = 0.5 - 0.5 * bgK;
          texMatrix.a = bgK * W / TEX_W;
          texMatrix.b = bgK * slant / TEX_W;
          texMatrix.c = 0;
          texMatrix.d = bgK * Hs / TH;
          texMatrix.e = xl + (off + bgX) * W;
          texMatrix.f = (y0l - CY) + (off + bgX) * slant + (off - bgY - v) * Hs;
          pat.setTransform(texMatrix);
          rctx.globalAlpha = alpha;
          rctx.fillStyle = pat;
        } else {
          rctx.fillStyle = 'rgba(' + REFLECT_TINT + ',' + alpha.toFixed(4) + ')';
        }
        rctx.beginPath();
        rctx.moveTo(xL + wl, y0l - CY);
        rctx.lineTo(xR + wr, y0r - CY);
        rctx.lineTo(xR + wobble(xR, y1r, T, dR), y1r - CY + 0.6);
        rctx.lineTo(xL + wobble(xL, y1l, T, dL), y1l - CY + 0.6);
        rctx.fill();
        if (pat) rctx.globalAlpha = 1;
        edgeLX.push(xL + wl); edgeLY.push(y0l - CY);
        edgeRX.push(xR + wr); edgeRY.push(y0r - CY);
      }

      /* The frame's own two sides, given back. Without them the reflection is
         a soft grey mass that reads as a shadow; with them it reads as the
         frame. They follow the same wobble as the strips they were collected
         from, so the whole reflection sways as one piece, and the fade is a
         gradient along the stroke rather than a stroke per strip. */
      if (edgeLX.length > 1) {
        const last = edgeLY.length - 1;
        const ge = rctx.createLinearGradient(0, edgeLY[0], 0, edgeLY[last]);
        ge.addColorStop(0, 'rgba(255,255,255,' + (0.10 * pres).toFixed(4) + ')');
        ge.addColorStop(1, 'rgba(255,255,255,0)');
        rctx.strokeStyle = ge;
        rctx.lineWidth = 1.6;
        rctx.beginPath();
        rctx.moveTo(edgeLX[0], edgeLY[0]);
        for (let q = 1; q <= last; q++) rctx.lineTo(edgeLX[q], edgeLY[q]);
        rctx.stroke();
        rctx.beginPath();
        rctx.moveTo(edgeRX[0], edgeRY[0]);
        for (let q = 1; q <= last; q++) rctx.lineTo(edgeRX[q], edgeRY[q]);
        rctx.stroke();
      }
    }

    /* The breeze on the open water. This replaces four long glints that only
       slid back and forth: those read as light on glass, not as wind. */
    const band = REF_H - REF_SURF;
    if (band > 12) {
      const span = vw + 240;           // crests leave on the right, come back on the left
      for (let q = 0; q < CRESTS; q++) {
        const o = q * 4;
        const r = crest[o];
        const tw = Math.sin(T * (0.9 + 1.4 * crest[o + 3]) + crest[o + 2] * 6.2832);
        if (tw <= 0) continue;           // between glints
        const sc = 0.35 + 0.65 * r;      // perspective: the near water is bigger and quicker
        const a = (0.014 + 0.05 * WIND_GUST) * sc * tw;
        if (a < 0.003) continue;
        const y = REF_SURF + 6 + Math.pow(r, 1.7) * (band - 12);
        const len = (14 + 70 * crest[o + 1]) * sc * (0.55 + 0.9 * WIND_GUST);
        let x = (crest[o + 2] * span + WIND_DIST * sc) % span;
        if (x < 0) x += span;
        rctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(4) + ')';
        rctx.fillRect(x - 120, y, len, 0.8 + 0.9 * sc);
      }
    }
  }

  function reflectTick(now) {
    refRAF = window.requestAnimationFrame(reflectTick);
    if (now - refLast < 1000 / REFLECT_FPS) return;   // a still surface does not need 60
    refLast = now;
    reflectDraw(now);
  }

  function reflectStop() {
    if (refRAF !== null) { window.cancelAnimationFrame(refRAF); refRAF = null; }
  }

  /* The one place that decides whether the surface is moving. A hidden tab, a
     screen too narrow for the frames to stand on anything, or a reader who has
     asked for less movement all end the same way: the loop stops. Under
     reduced motion the water is still drawn - it just holds one frame, redrawn
     from render() as the ring turns. */
  function reflectSync() {
    if (!rctx) return;
    if (window.innerWidth < REFLECT_MIN_W || document.hidden || refLeaving) {
      refActive = false;
      reflectStop();
      return;
    }
    refActive = true;
    if (refStill) { reflectStop(); reflectDraw(0); return; }
    if (refRAF === null) { refLast = 0; refRAF = window.requestAnimationFrame(reflectTick); }
  }
  document.addEventListener('visibilitychange', reflectSync);
  // leaving for another page: nothing of this one shows under its transition
  window.addEventListener('page:leave', () => { refLeaving = true; reflectSync(); waterStop(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) { refLeaving = false; reflectSync(); } });
  bgImgs.forEach((im, i) => {
    if (!im) return;
    im.addEventListener('load', () => {
      texPatterns[i] = null;
      if (refActive) reflectDraw(performance.now());
    });
  });

  /* ---- the word behind the reel -----------------------------------------
     The frame at the centre also writes its name across the back wall, huge
     and nearly the colour of the room. Re-triggering the animation means
     taking the class off, forcing a reflow to flush it, and putting it back -
     without that read the browser coalesces both changes and nothing plays. */
  const ghostWord = document.getElementById('reelGhostWord');
  /* Two copies of the word stacked, not one. The sharp copy is masked away
     below its own midline and the blurred copy is masked away above it, so
     the letters go soft on the way down. It has to be two SIBLINGS: a mask on
     an element clips its pseudo-elements and children too, so a ::after
     carrying the blurred copy would be cut away by the very mask that fades
     the sharp one out. */
  const ghostSharp = ghostWord && ghostWord.querySelector('.reel-ghost-sharp');
  const ghostBlur = ghostWord && ghostWord.querySelector('.reel-ghost-blur');
  /* Same problem as the titles, one scale up: the word runs on one line, so a
     fixed size means a long name is simply wider than the screen and loses a
     letter off each end. Measured rather than guessed at, because the answer
     depends on the word - POSTER and EXPERIENCE DESIGN want very different
     sizes to fill the same width. */
  function fitGhost() {
    if (!ghostWord || !ghostSharp || !ghostSharp.textContent) return;
    ghostWord.style.fontSize = '';
    const avail = window.innerWidth * 0.94;
    const need = ghostWord.getBoundingClientRect().width;
    if (!need || need <= avail) return;
    const base = parseFloat(window.getComputedStyle(ghostWord).fontSize) || 0;
    if (base) ghostWord.style.fontSize = (base * (avail / need)) + 'px';
  }
  function setGhost(text) {
    if (!ghostWord || !ghostSharp || !text) return;
    if (ghostSharp.textContent === text) return;
    ghostSharp.textContent = text;
    if (ghostBlur) ghostBlur.textContent = text;
    fitGhost();
    ghostWord.classList.remove('is-in');
    void ghostWord.offsetWidth;
    ghostWord.classList.add('is-in');
  }

  /* ---- pager ------------------------------------------------------------- */
  const dotsWrap = document.getElementById('reelDots');
  const dots = [];
  if (dotsWrap) {
    WORKS.forEach((w, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reel-dot';
      b.setAttribute('aria-label', w.caption || ('Work ' + (i + 1)));
      b.addEventListener('click', () => goToIndex(i));
      dotsWrap.appendChild(b);
      dots.push(b);
    });
  }
  function setDot(i) {
    for (let k = 0; k < dots.length; k++) dots[k].classList.toggle('is-on', k === i);
  }
  // Shortest way round: the ring is a loop, so stepping from the last work to
  // the first is one turn forward, not six back.
  function goToIndex(i) {
    const vh = window.innerHeight;
    const cur = Math.round(window.scrollY / vh);
    let delta = i - (((cur % N) + N) % N);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    if (!delta) return;
    animateScrollTo((cur + delta) * vh, 460);
  }
  document.querySelectorAll('.reel-arrow').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vh = window.innerHeight;
      const cur = Math.round(window.scrollY / vh);
      animateScrollTo((cur + (+btn.dataset.step || 0)) * vh, 460);
    });
  });

  /* A title is one word as often as not, and a word cannot wrap. PHOTOGRAPHY
     at the stylesheet's size is wider than the frame it sits in, and the frame
     clips its children, so the last letters were simply cut off inside the
     card. Measure what the line needs against what the frame gives and scale
     the type down by exactly that ratio - text width is linear in font size,
     so one correction lands it. Runs on layout, not per frame. */
  function fitTitle(el) {
    if (!el) return;
    el.style.fontSize = '';
    const need = el.scrollWidth, have = el.clientWidth;
    if (!have || need <= have) return;
    const base = parseFloat(window.getComputedStyle(el).fontSize) || 0;
    if (base) el.style.fontSize = Math.max(12, base * (have / need)) + 'px';
  }

  // Size the cards + ring radius so the "label" wraps around the cylinder
  // (regular N-gon inscribed radius for the given card width), pulled out
  // a bit further so neighbouring works sit further apart.
  let RADIUS = 0;
  let FORWARD = 0;
  let CARD_W = 0;      // frontal card size, kept from layout() so the pointer
  let CARD_H = 0;      // drift never has to measure anything at move time
  let LAID_VH = 0;     // viewport height the current layout was built for
  let DROP = 0;        // how far below centre the ring sits, so the wall word shows
  let CY = 0;          // screen y of the frames' centre line
  let PERSP = 0;       // focal length in px, as handed to the scene
  let RING_ANGLE = 0;  // where the ring is pointing, published by render()
  const PRES = [];     // per-frame presence and scale, likewise - the water
  const SCL = [];      // reads them rather than measuring the DOM
  const RING_SPREAD = 1.18;    // how far the ring is pushed out from the faces
  const RING_FORWARD = 0.46;   // how far the whole ring is carried towards the camera
  /* Focal length per unit of card width. Fixing the perspective in the
     stylesheet instead made the scene change SHAPE with the screen: a fixed
     distance against a shrinking ring means the ring sits relatively further
     away, the outer pair tucks in, and below about 1100px the frames started
     overlapping their neighbours by up to 19px - which read as a collision
     rather than depth once every frame was given the same presence. Scaling
     the camera with the ring makes the whole composition one shape at any
     size, so the gaps stay proportional and never cross zero. */
  const PERSPECTIVE_PER_W = 3.617;
  const scene = document.getElementById('reelScene');
  /* Seven frames on a ring puts the outer pair 103 degrees off dead-ahead -
     past square, so they present an edge two thirds of a finger wide and, but
     for DoubleSide, would be showing their backs. Turning each frame partway
     back towards the camera keeps the ring's arrangement while letting all
     five read as frames. 0 would be a bare cylinder, 1 would be five flat
     cards in a row with no ring at all. */
  const RING_FACE = 0.34;

  /* ---- what the composition measures, per unit of card width ---------------
     Everything below is a pure ratio because the camera scales with the ring:
     double the card and the whole picture doubles. Measured at 1600x900 and
     again at 1024x768 and they agreed to three decimals, which is the proof
     that the scene really is one shape at every size.
       SPREAD3  the three facing frames, outer edge to outer edge - the pair
                beyond them is no longer shown, so this is what has to fit.
                (The five-frame span was 3.717 by the same measurement, which
                is why dropping to three buys the frame nearly half again its
                width on the same screen.)
       FRONT_MAG  how much the perspective magnifies the frontal frame. It sits
                  nearer the camera than the ring's axis by (radius - forward),
                  so this is derived rather than typed: mistyping it would
                  silently mis-budget the vertical room below. */
  const SPREAD3_PER_W = 2.542;
  const RING_K = 1 / (2 * Math.tan(Math.PI / N));            // inradius per unit width
  const FRONT_MAG = PERSPECTIVE_PER_W /
                    (PERSPECTIVE_PER_W + RING_K * RING_SPREAD * (1 - RING_FORWARD));

  /* ---- the vertical budget -------------------------------------------------
     The frames no longer sit dead centre: they are carried down far enough for
     the word on the back wall to clear their tops. On a 1366x768 laptop - the
     commonest screen there is - the word was showing 0px above the frames, so
     the feature simply did not exist there. The drop is a share of the height
     rather than a fixed number of pixels so it stays the same picture on any
     screen, and the frame size is then solved against what is LEFT rather than
     assumed to fit. */
  const REEL_DROP = 0.055;                 // share of the viewport height
  /* One proportion, held everywhere. It used to be a range - 1.5 preferred,
     squashing to 1.28 when a screen had width to spare but no height - and the
     effect was that most 16:9 screens got a chunky frame instead of the tall
     one the design is drawn around. Measured off the reference: a frame 369px
     across and 564px tall, which is 1.53. So the frame keeps its shape and
     gets SMALLER when the height runs out, rather than getting wider. */
  const CARD_RATIO = 1.5;
  const W_COMFORT = 300;   // css width below which a frame stops being readable
  const W_CAP = 560;       // ceiling, so a huge monitor does not get a poster

  function layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Phones get a wider card: a third of a narrow viewport is a sliver that is
    // hard to read and hard to tap, and there is no room for neighbours anyway.
    const narrow = vw <= 700;
    LAID_VH = vh;

    /* Where the frames sit, and therefore how much room they have. The drop is
       what makes the wall word visible, and it is spent out of the bottom of
       the budget - so it has to be paid for here rather than discovered later
       as frames sitting on top of the pager. */
    DROP = vh * REEL_DROP;
    const cy = vh / 2 + DROP;                       // centre of the frames
    CY = cy;
    /* Both bands are a share of the height with a floor under them, and the
       floor itself gives way on a very short screen. A flat 92px "clear of the
       pager" was a pixel short of the pager's own 91px band on a 1920x720
       window - the frame landed 1px above the arrows - and a floor that never
       yields would take a landscape phone's whole viewport and leave an 87px
       frame. */
    const headRoom = Math.min(vh * 0.14, Math.max(74, vh * 0.085));
    const footRoom = Math.min(vh * 0.19, Math.max(118, vh * 0.145));
    // rendered height the frontal frame may take, converted back to css px
    const hRoom = 2 * Math.min(cy - headRoom, vh - footRoom - cy) / FRONT_MAG;

    /* Three frames across, and the frame is as wide as that allows. Sizing for
       five was what kept them small: the same screen holds three frames
       1.46x wider, because the span is 2.542 card-widths instead of 3.717.
       W_COMFORT is the floor under it - past that point the frame stops being
       readable, so it holds that size and lets its neighbours run past the
       edges instead of everything shrinking together. */
    const edge = Math.max(24, vw * 0.03);
    const wThree = (vw - edge * 2) / SPREAD3_PER_W;
    let w = narrow
      ? Math.min(vw * 0.70, 300)
      : Math.min(Math.max(wThree, W_COMFORT), W_CAP);

    /* ...and then the height has its say. On nearly every 16:9 screen it is the
       height that binds, not the width: a short wide window (1920x800, or any
       laptop carrying three toolbars) has room across it and none down it. The
       frame narrows to keep its proportion rather than filling that width -
       w only ever goes DOWN here, so the width fit above still holds. */
    w = Math.min(w, hRoom / CARD_RATIO);
    const h = w * CARD_RATIO;
    /* Seven faces on a ring means at most five can ever face the camera - the
       other two are round the back. Getting all five ON SCREEN is a matter of
       how hard the perspective magnifies the outermost pair: they sit nearest
       the camera, so a short focal length throws them sideways off the edges.
       A wider ring plus a shallower push forward keeps them in frame without
       shrinking the frontal card, which is why both numbers moved together. */
    const radius = (w / (2 * Math.tan(Math.PI / N))) * RING_SPREAD;
    RADIUS = radius;
    CARD_W = w;
    CARD_H = h;
    PERSP = w * PERSPECTIVE_PER_W;
    /* The side arrows sit in the margin outside the frames. On a wide screen
       the stylesheet's own inset puts them where they were asked for; once the
       frames reach towards the edges (about 1100px and below) that inset would
       put the arrows on top of the side frames - 39px over them at 1024 - so
       they move out into whatever margin is left, and only sit over a frame
       when there is no margin at all (a phone, where the side frames already
       run off the screen). */
    {
      const sideGap = (vw - w * SPREAD3_PER_W) / 2;       // screen edge to the side frame
      const preferred = Math.min(96, Math.max(12, vw * 0.045));
      const inset = Math.max(6, Math.min(preferred, sideGap - 56 - 12));
      document.documentElement.style.setProperty('--reel-arrow-inset', inset.toFixed(1) + 'px');
    }
    if (scene) {
      scene.style.perspective = PERSP.toFixed(0) + 'px';
      /* Carry the ring down by DROP. Padding moves the flex centre by half of
         what is added, and the vanishing point has to travel with it: leave
         perspective-origin at the middle of the screen and the frames are
         suddenly being looked down on, which bends the whole composition
         instead of simply lowering it. Moving both is the same picture, put
         lower on the page. */
      scene.style.paddingTop = (DROP * 2).toFixed(1) + 'px';
      scene.style.perspectiveOrigin = '50% calc(50% + ' + DROP.toFixed(1) + 'px)';
    }
    // grid follows the frame's proportions, otherwise a ring drawn on a
    // 3:4 grid and stretched over a tall phone frame comes out an ellipse
    waterAlloc();
    FORWARD = radius * RING_FORWARD;   // brings the frontal work forward to screen centre
    reflectAlloc();
    reflectSync();

    cards.forEach((c, i) => {
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      c.style.marginLeft = (-w / 2) + 'px';
      c.style.marginTop = (-h / 2) + 'px';
      // base position around the ring — render() adds a per-frame scale()
      // on top of this so the frontal work grows and the sides shrink.
      // Negated angle (vs. plain i*STEP_DEG) mirrors the arrangement so the
      // scroll-to-spin direction reads correctly — see render()'s matching sign.
      c.dataset.baseTf = 'rotateY(' + (-i * STEP_DEG).toFixed(2) + 'deg) translateZ(' + (-radius).toFixed(1) + 'px)';
      c.style.transform = c.dataset.baseTf;
      fitTitle(c.querySelector('.wk-title'));

      // nothing to place for the title any more — it lives inside the frame
      // and is centred by the frame itself.
    });
    return radius;
  }
  layout();
  window.addEventListener('resize', () => {
    /* Scroll is counted in pixels but the reel counts in viewport-heights, so a
       change of height leaves the ring stranded between two frames - measured a
       30px overlap between neighbours after one resize, which reads as frames
       colliding rather than as depth. Re-express the same frame in the new
       height. programmaticY marks it as ours so the scroll it causes is not
       mistaken for the user and answered with a second snap. */
    const f = LAID_VH ? Math.round(window.scrollY / LAID_VH) : 0;
    layout();
    fitGhost();
    const y = f * window.innerHeight;
    if (Math.abs(window.scrollY - y) > 1) {
      programmaticY = Math.round(y);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    }
    render();
  });

  // "Night Mirror" is the featured work — start the reel centred on it
  // instead of work #0, and stop the browser fighting that with its own
  // remembered scroll position on reload/back-navigation.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const FEATURED_IDX = NUM_START;   // same frame the numbering starts on
  if (FEATURED_IDX > 0) {
    window.scrollTo({ top: FEATURED_IDX * window.innerHeight, left: 0, behavior: 'instant' });
  }

  // One full revolution = N viewport-heights of scroll. Scrolling by any
  // exact multiple of that spins the ring by whole turns — visually
  // identical — so we can silently re-centre the scroll position whenever
  // it drifts near either end of the spacer, giving an endless loop in
  // both directions.
  function maintainLoop() {
    const vh = window.innerHeight;
    const period = N * vh;                   // scroll distance for one full 360° turn
    const maxScroll = document.documentElement.scrollHeight - vh;
    const buffer = period * 1;
    const y = window.scrollY;
    if (maxScroll < period * 5) return;      // spacer too short — skip
    // `behavior:'instant'` is required here — the page uses smooth scrolling
    // globally, which would otherwise animate this "invisible" re-centre
    // jump and make it visible.
    if (y < buffer) {
      window.scrollTo({ top: y + period * 2, left: 0, behavior: 'instant' });
    } else if (y > maxScroll - buffer) {
      window.scrollTo({ top: y - period * 2, left: 0, behavior: 'instant' });
    }
  }

  let ticking = false;
  let currentIdx = 0;                // work currently dead-centre — used to know what a click on the reel should open
  let frontIdx = -1;                 // which card currently carries .is-front
  let frontTitle = null;             // its title span, the one that leans
  let snapTimer = null;
  let snapRAF = null;
  let programmaticY = null;         // last y our own snap animation set — lets onScroll tell it apart from a real user scroll
  const SNAP_DELAY = 70;            // ms of no scroll movement before locking to the nearest work
  const SNAP_DURATION = 190;        // ms — fast, fixed-speed ease instead of the browser's slow default smooth-scroll

  function cancelSnap() {
    if (snapRAF) { cancelAnimationFrame(snapRAF); snapRAF = null; }
  }

  // Fixed-duration eased scroll, independent of distance, so the lock always
  // feels equally snappy — bypasses the page's global smooth-scroll (which
  // has no speed control and reads as sluggish for this).
  function animateScrollTo(targetY, duration) {
    cancelSnap();
    if (!Number.isFinite(targetY)) return;
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 0.5) return;
    // hold this steady immediately (not just once the first rAF tick lands)
    // so a still-pending scroll notification from just before doesn't get
    // mistaken for fresh user input and cancel the animation we're about to start
    programmaticY = Math.round(startY);
    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
      const y = startY + delta * eased;
      programmaticY = Math.round(y);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      snapRAF = p < 1 ? requestAnimationFrame(step) : null;
      if (p >= 1) programmaticY = null;
    }
    snapRAF = requestAnimationFrame(step);
  }

  // Once the user stops scrolling, snap the rest of the way so the nearest
  // work lands dead-centre instead of stopping mid-rotation.
  function snapToNearest() {
    if (dragging) return;   // never lock while the user is still actively dragging
    const vh = window.innerHeight;
    const targetF = Math.round(window.scrollY / vh);
    animateScrollTo(targetF * vh, SNAP_DURATION);
  }

  function render() {
    ticking = false;
    const vh = window.innerHeight;

    // one work = one viewport of scroll; the cylinder spins to match
    const f = window.scrollY / vh;
    if (!Number.isFinite(f)) return;
    const ringAngle = f * STEP_DEG;
    // Ring rotates the opposite way of before (paired with the negated angle
    // in each card's baseTf above) — same frontal index at the same scroll
    // position, but the spin direction reads correctly against scroll.
    ring.style.transform =
      'translate(-50%,-50%) translateZ(' + FORWARD.toFixed(1) + 'px) rotateY(' + (ringAngle).toFixed(2) + 'deg)';

    let bestIdx = 0;
    let bestAbs = 999;
    RING_ANGLE = ringAngle;

    cards.forEach((c, i) => {
      const rel = norm180(ringAngle - i * STEP_DEG);   // angle from dead-ahead
      const ad = Math.abs(rel);
      if (ad < bestAbs) { bestAbs = ad; bestIdx = i; }

      const t = clamp(ad / 92, 0, 1);
      const scale = lerp(1, 0.55, t);   // frontal work stays its normal size, side works shrink

      /* Every frame that is shown reads at full strength - size and the turn
         away from the camera carry the depth on their own, and dimming on top
         of that only made the side frames hard to read for no gain.
         What is left is a cut, and it now falls between the first ring of
         neighbours and the second. Seven faces put them at 51 and 103 degrees
         off dead-ahead: full presence holds to 62, past the pair that stays,
         and is gone by 88, before the pair that does not. The window is the
         one a frame crosses as it swings out towards the edge of the screen,
         so frames arrive and leave at the sides rather than appearing in the
         middle of the picture. */
      const tail = clamp((88 - ad) / 26, 0, 1);
      c.style.opacity = tail.toFixed(3);
      // the water needs both of these and must not go measuring for them
      PRES[i] = tail;
      SCL[i] = scale;
      // no brightness filter: one less compositing layer per frame, too
      if (c.style.filter) c.style.filter = '';
      /* The turn-back rides AFTER the ring placement in the transform list, so
         it spins the frame about its own centre where it already stands rather
         than moving it round the ring. NEGATIVE rel: the frame's net facing is
         already `rel`, so subtracting a share of it turns the frame towards
         the camera. Adding instead drives the outer pair past square until
         they show a broad mirrored back - which measured WIDER than the pair
         beside the centre, the giveaway that the sign was wrong. */
      c.style.transform = c.dataset.baseTf +
        ' rotateY(' + (-rel * RING_FACE).toFixed(2) + 'deg)' +
        ' scale(' + scale.toFixed(3) + ')';
    });

    /* The water is redrawn HERE, in the same turn that moved the frames, not
       left to its own loop to catch up on. The loop only runs at 30fps for the
       shimmer, and a frame that is spinning past covers real ground in the 33ms
       between two of its ticks - which showed up as the reflection trailing the
       frame it belongs to. Stamping refLast keeps the loop from drawing the
       same thing again a moment later. */
    if (refActive) {
      if (refStill) {
        reflectDraw(0);
      } else {
        const t = performance.now();
        refLast = t;
        reflectDraw(t);
      }
    }

    /* Only the frontal frame is interactive. .reel-scene is pointer-events:
       none, so this class is what lets one frame opt back in — hover then
       costs nothing per frame, because CSS :hover does the work rather than
       JS measuring cards against the cursor. Toggled only when the frontal
       work actually changes, not every frame. */
    if (bestIdx !== frontIdx) {
      const prevCard = cards[frontIdx];
      if (prevCard) prevCard.classList.remove('is-front');
      frontIdx = bestIdx;
      const nextCard = cards[frontIdx];
      frontTitle = nextCard ? nextCard.querySelector('.reel-card-body') : null;
      setGhost(WORKS[frontIdx] && WORKS[frontIdx].caption);
      setDot(frontIdx);
      if (nextCard) {
        nextCard.classList.add('is-front');
        // the single surface follows the frontal frame; anything still
        // rippling belonged to the frame we just left, so it goes flat
        if (waterCanvas && waterCanvas.parentNode !== nextCard) {
          waterStop();
          nextCard.insertBefore(waterCanvas, nextCard.firstChild);
        }
      }
    }

    currentIdx = bestIdx;
    reel.classList.toggle('reel-link-active', !!(WORKS[bestIdx] && WORKS[bestIdx].link));
    maintainLoop();
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(render);
      ticking = true;
    }
    // only react to real user scrolling — ignore the events our own snap
    // animation generates, so it doesn't keep re-triggering/cancelling itself.
    // Also stay quiet while actively dragging — pointerup triggers the snap
    // itself, so a mid-drag pause must not start a competing lock animation.
    if (!dragging && (programmaticY === null || Math.abs(window.scrollY - programmaticY) > 2)) {
      cancelSnap();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapToNearest, SNAP_DELAY);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- drag / swipe to rotate ----
  // Mouse: press and drag left-right — unchanged from before.
  // Touch: the gesture is axis-locked first. A mostly-vertical move is left to
  // the page (scrolling spins the ring anyway); a mostly-horizontal one is taken
  // over here. A quick flick carries on to the next work, and a finger that goes
  // down and up without moving is a tap that opens the centred work.
  let dragging = false;
  let dragMoved = false;        // did this pointerdown->up turn into an actual drag?
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScroll = 0;
  let touchGesture = false;     // this gesture came from a finger / pen
  let axisPending = false;      // touch: still deciding horizontal vs vertical
  let lastMoveX = 0;
  let lastMoveT = 0;
  let velocity = 0;             // smoothed horizontal px/ms
  const DRAG_SENSITIVITY = 3;   // mouse: px of virtual scroll per px of drag
  const CLICK_SLOP = 6;         // px of movement still treated as a plain click
  const AXIS_SLOP = 8;          // px before a touch gesture commits to an axis
  const FLICK_VELOCITY = 0.35;  // px/ms that counts as a flick

  // on a phone a comfortable ~45%-of-screen swipe should travel one whole work
  function touchSensitivity() {
    const s = window.innerHeight / Math.max(1, window.innerWidth * 0.45);
    return Math.max(2.5, Math.min(s, 8));
  }

  function openCentred() {
    const w = WORKS[currentIdx];
    if (w && w.link) window.location.href = w.link;
  }

  function beginDrag(e) {
    dragging = true;
    dragStartScroll = window.scrollY;
    cancelSnap();
    clearTimeout(snapTimer);
    reel.classList.add('is-dragging');
    if (reel.setPointerCapture) { try { reel.setPointerCapture(e.pointerId); } catch (err) {} }
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touchGesture = e.pointerType === 'touch' || e.pointerType === 'pen';
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastMoveX = e.clientX;
    lastMoveT = e.timeStamp || performance.now();
    velocity = 0;
    dragMoved = false;

    if (touchGesture) {
      // don't claim the gesture yet, and don't preventDefault — a vertical
      // swipe has to stay a normal page scroll (touch-action: pan-y)
      axisPending = true;
      dragging = false;
      dragStartScroll = window.scrollY;
      return;
    }

    beginDrag(e);
    e.preventDefault();
  }

  function onPointerMove(e) {
    // Reuses the listener the drag already installed rather than adding a
    // second one. offsetX/offsetY come in already mapped through the frame's
    // own 3D transform, so the splash lands under the cursor with nothing
    // measured; the target check is what keeps it to the frontal frame,
    // since that is the only card CSS lets the pointer reach.
    if (hoverFX && !dragging && e.target === cards[frontIdx]) {
      waterStroke(e.offsetX, e.offsetY);
      // -1..1 across the frame. Published as bare numbers; the CSS decides
      // what they mean and, crucially, only reads them while the frame is
      // hovered - so letting go unwinds the effect through the same easing
      // with nothing to reset here.
      /* Set on the FRAME, not on the words. Custom properties only inherit
         downwards, and they used to live on .reel-card-body - which the words
         could read and the picture, a sibling of it, never could. That is why
         the words zoomed and leant under the cursor while the picture behind
         them did not move at all. On the frame, both inherit them. */
      const nx = (e.offsetX / Math.max(1, CARD_W - FRAME_BORDER * 2)) * 2 - 1;
      const ny = (e.offsetY / Math.max(1, CARD_H - FRAME_BORDER * 2)) * 2 - 1;
      hoverTX = nx < -1 ? -1 : nx > 1 ? 1 : nx;
      hoverTY = ny < -1 ? -1 : ny > 1 ? 1 : ny;
      hoverOn = true;
      const fc = cards[frontIdx];
      fc.style.setProperty('--tx', hoverTX.toFixed(3));
      fc.style.setProperty('--ty', hoverTY.toFixed(3));
    } else {
      hoverOn = false;
      if (lastWX >= 0) lastWX = lastWY = -1;   // left the frame: next entry starts a fresh stroke
    }
    if (!dragging && !axisPending) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!Number.isFinite(dx)) return;

    if (axisPending) {
      if (Math.abs(dy) > AXIS_SLOP && Math.abs(dy) >= Math.abs(dx)) {
        axisPending = false;              // vertical — hand it back to the page
        return;
      }
      if (Math.abs(dx) > AXIS_SLOP) {
        axisPending = false;
        dragStartX = e.clientX;           // re-baseline at the take-over point
        dragMoved = true;                 // past the slop: this is a drag, not a tap
        beginDrag(e);
      } else {
        return;                           // still undecided
      }
    }

    const t = e.timeStamp || performance.now();
    if (t > lastMoveT) {
      const inst = (e.clientX - lastMoveX) / (t - lastMoveT);
      velocity = velocity * 0.7 + inst * 0.3;
      lastMoveX = e.clientX;
      lastMoveT = t;
    }

    const moved = e.clientX - dragStartX;
    if (Math.abs(moved) > CLICK_SLOP) dragMoved = true;
    const sens = touchGesture ? touchSensitivity() : DRAG_SENSITIVITY;
    const y = Math.max(0, dragStartScroll - moved * sens);
    programmaticY = Math.round(y);
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    if (!touchGesture) e.preventDefault();
  }

  function onPointerUp() {
    const wasPending = axisPending;
    axisPending = false;

    if (!dragging) {
      // finger down and up on the reel without ever picking an axis = a tap
      if (wasPending && touchGesture) openCentred();
      return;
    }

    dragging = false;
    reel.classList.remove('is-dragging');

    // a plain click (no real drag) on the frontal work opens its page, if it has one
    if (!dragMoved) { openCentred(); return; }

    // a quick flick keeps going instead of settling back to where it started
    if (touchGesture && Math.abs(velocity) > FLICK_VELOCITY) {
      const vh = window.innerHeight;
      const fromIdx = Math.round(dragStartScroll / vh);
      const dir = velocity < 0 ? 1 : -1;   // finger sweeps left -> next work
      let target = Math.round(window.scrollY / vh);
      target = dir > 0 ? Math.max(target, fromIdx + 1) : Math.min(target, fromIdx - 1);
      animateScrollTo(target * vh, SNAP_DURATION);
      return;
    }
    snapToNearest();
  }

  function onPointerCancel() {
    axisPending = false;
    if (!dragging) return;
    dragging = false;
    reel.classList.remove('is-dragging');
    snapToNearest();
  }

  reel.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  // leaving the window from over a frame sends no move that says so
  document.documentElement.addEventListener('pointerleave', () => { hoverOn = false; });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);

  render();
})();


/* =========================================================
   TYPOGRAPHY — SELF-TURNING BOOK(S)  (4-leaf flipbook)
   Runs on every `.book[data-prefix]` on the page. Pages come from
   data-prefix + data-from..data-to (zero-padded, .jpg) -> spreads.
   Four leaves in two stacks of two: right = [RT (turns next), RU],
   left = [LT (current left page), LU]. A turn rotates RT 0->-180deg
   (Web Animations API, compositor) and LEAVES it there — nothing
   snaps back. RT lifting uncovers RU, which already holds the next
   right page (set a full cycle earlier), so the right page never
   blinks or changes shadow at the hand-off. During the pause the
   leaf now at the BOTTOM of the left stack — occluded both ends —
   is silently carried to the bottom of the right stack and
   re-imaged for two turns ahead. Cast shadow + sheen ride the
   turn's own timeline and end fully transparent before touchdown.
   ========================================================= */
(function () {
  const books = [...document.querySelectorAll('.book[data-prefix]')];
  if (!books.length) return;

  const FLIP_MS = 1650;
  const HOLD_MS = 850;
  const EASE = 'cubic-bezier(.42,.03,.35,1)';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const setSrc = (el, src) => { if (el && el.getAttribute('src') !== src) el.src = src; };
  const decode = el => (el && el.decode ? el.decode().catch(() => {}) : Promise.resolve());

  function initBook(book) {
    const bpLeft  = book.querySelector('.book-page-left img');
    const bpRight = book.querySelector('.book-page-right img');
    const cast    = book.querySelector('.book-cast');
    const leaves  = [...book.querySelectorAll('.leaf')];
    const stage   = book.closest('.book-stage');
    const numEl   = stage && stage.querySelector('.book-num');
    const totalEl = stage && stage.querySelector('.book-total');
    if (!bpLeft || !bpRight || !cast || leaves.length < 4) return;

    const prefix = book.dataset.prefix;
    const from = parseInt(book.dataset.from, 10);
    const to   = parseInt(book.dataset.to, 10);
    const PAGES = [];
    for (let i = from; i <= to; i++) PAGES.push(prefix + String(i).padStart(2, '0') + '.jpg');
    const SPREADS = [];
    for (let i = 0; i + 1 < PAGES.length; i += 2) SPREADS.push({ left: PAGES[i], right: PAGES[i + 1] });
    const N = SPREADS.length;
    if (N < 4) return;                       // need >= 4 spreads for the 4-leaf recycle
    if (totalEl) totalEl.textContent = String(N).padStart(2, '0');

    const img   = (leaf, side) => leaf.querySelector('.leaf-' + side + ' img');
    const sheen = leaf => leaf.querySelector('.leaf-sheen');
    const spL = i => SPREADS[((i % N) + N) % N].left;
    const spR = i => SPREADS[((i % N) + N) % N].right;

    let cur = 0, pw = 0;
    let R = { LT: 0, LU: 1, RT: 2, RU: 3 };
    let gen = 0;               // bumped on every activate/deactivate; a stale cycle sees the mismatch and exits
    let active = false;        // in view -> running
    let paused = false;        // tab hidden -> idle without resetting
    let stopped = false;       // page unloading
    let curAnims = [];         // WAAPI animations of the turn currently in flight
    const measure = () => { pw = book.querySelector('.book-page-left').getBoundingClientRect().width; };

    PAGES.forEach(src => { const im = new Image(); im.src = src; decode(im); });

    function applyZ() {
      leaves[R.LT].style.zIndex = 40;
      leaves[R.LU].style.zIndex = 30;
      leaves[R.RT].style.zIndex = 20;
      leaves[R.RU].style.zIndex = 10;
    }

    function init() {
      measure();
      cur = 0;
      R = { LT: 0, LU: 1, RT: 2, RU: 3 };
      setSrc(img(leaves[R.LT], 'back'),  spL(0));
      setSrc(img(leaves[R.LT], 'front'), spR(-1));
      setSrc(img(leaves[R.LU], 'back'),  spL(-1));
      setSrc(img(leaves[R.LU], 'front'), spR(-2));
      setSrc(img(leaves[R.RT], 'front'), spR(0));
      setSrc(img(leaves[R.RT], 'back'),  spL(1));
      setSrc(img(leaves[R.RU], 'front'), spR(1));
      setSrc(img(leaves[R.RU], 'back'),  spL(2));
      leaves[R.LT].style.transform = leaves[R.LU].style.transform = 'rotateY(-180deg)';
      leaves[R.RT].style.transform = leaves[R.RU].style.transform = 'rotateY(0deg)';
      cast.style.opacity = '0';
      cast.style.transform = 'translateX(' + pw + 'px)';
      applyZ();
      if (numEl) numEl.textContent = '01';
      setSrc(bpLeft, spL(0));
      setSrc(bpRight, spR(0));
    }

    const dead = token => stopped || token !== gen || !active;

    async function turn(token) {
      const dur = reduce ? 1 : FLIP_MS;
      const flipLeaf = leaves[R.RT];
      flipLeaf.style.zIndex = 50;

      const aLeaf = flipLeaf.animate(
        [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }],
        { duration: dur, easing: EASE, fill: 'forwards' }
      );
      const aSheen = sheen(flipLeaf).animate(
        [{ opacity: 0 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0 }],
        { duration: dur, easing: 'ease-in-out' }
      );
      const aCast = cast.animate(
        [
          { opacity: 0,    transform: 'translateX(' + pw + 'px)',         offset: 0 },
          { opacity: 0.32, transform: 'translateX(' + (pw * 0.5) + 'px)',  offset: 0.38 },
          { opacity: 0.12, transform: 'translateX(' + (pw * 0.24) + 'px)', offset: 0.6 },
          { opacity: 0,    transform: 'translateX(' + (pw * 0.06) + 'px)', offset: 0.76 },
          { opacity: 0,    transform: 'translateX(0px)',                   offset: 1 }
        ],
        { duration: dur, easing: 'linear' }
      );
      curAnims = [aLeaf, aSheen, aCast];

      try { await aLeaf.finished; } catch (e) { return; }
      if (dead(token)) return;

      cur = (cur + 1) % N;
      if (numEl) numEl.textContent = String(cur + 1).padStart(2, '0');
      flipLeaf.style.transform = 'rotateY(-180deg)';
      aLeaf.cancel(); aSheen.cancel(); aCast.cancel();
      curAnims = [];

      const recycled = leaves[R.LU];
      R = { LT: R.RT, LU: R.LT, RT: R.RU, RU: R.LU };
      applyZ();

      setSrc(img(recycled, 'front'), spR(cur + 1));
      setSrc(img(recycled, 'back'),  spL(cur + 2));
      await Promise.all([decode(img(recycled, 'front')), decode(img(recycled, 'back'))]);
      if (dead(token)) return;
      recycled.style.transform = 'rotateY(0deg)';

      setSrc(bpLeft,  spL(cur));
      setSrc(bpRight, spR(cur));
    }

    async function runCycle(token) {
      init();                               // always start a fresh visit from spread 01
      await wait(HOLD_MS + 450);
      while (!dead(token)) {
        if (paused) { await wait(200); continue; }
        await turn(token);
        if (dead(token)) break;
        await wait(HOLD_MS);
      }
    }

    function activate() {
      if (active || stopped) return;
      active = true;
      gen++;
      runCycle(gen);
    }
    function deactivate() {
      if (!active) return;
      active = false;
      gen++;                                // any in-flight cycle now reads dead()===true
      curAnims.forEach(a => { try { a.cancel(); } catch (e) {} });
      curAnims = [];
      init();                               // reset to the initial spread + leaf layout
    }

    document.addEventListener('visibilitychange', () => { paused = document.hidden; });
    window.addEventListener('pagehide', () => { stopped = true; });

    init();                                 // static first paint: spread 01, not turning
    return { book, activate, deactivate, measure };
  }

  const ctrls = books.map(initBook).filter(Boolean);
  if (!ctrls.length) return;

  // don't let the browser drop us mid-page on reload — the mockups are meant to
  // be met by scrolling down to them
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Only ONE book runs at a time: the one whose middle is nearest the middle of
  // the viewport (and clearly on screen). Scroll to a book -> it starts from
  // spread 01; scroll away -> it stops and resets to spread 01.
  function pickActive() {
    const vh = window.innerHeight;
    let best = null, bestDist = Infinity;
    for (const c of ctrls) {
      const r = c.book.getBoundingClientRect();
      if (!r.height) continue;                                     // not laid out yet
      if (r.bottom <= vh * 0.2 || r.top >= vh * 0.8) continue;     // essentially off screen
      const d = Math.abs((r.top + r.bottom) / 2 - vh / 2);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    for (const c of ctrls) (c === best ? c.activate : c.deactivate)();
  }

  let scheduled = false;
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; pickActive(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { ctrls.forEach(c => c.measure()); pickActive(); });
  window.addEventListener('load', () => { ctrls.forEach(c => c.measure()); pickActive(); });
  pickActive();
})();


/* =========================================================
   POSTER — STAIRCASE GRID
   Each poster lifts in as it comes into view, the ones in a row a
   beat apart so the step down reads as it arrives. Without script
   (or an observer) they are simply there.
   ========================================================= */
(function () {
  const grid = document.querySelector('.pst-grid');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.pst-item')];
  // how many columns the stylesheet asks for at this width (--cols)
  const cols = () => Math.max(1, parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10) || 1);

  // Deal the posters into real columns, left to right in reading order, so
  // each one sits right under the one above it; redealt only when the
  // column count changes.
  let dealt = 0;
  function deal() {
    const n = cols();
    if (n === dealt) return;
    dealt = n;
    const colEls = [];
    for (let k = 0; k < n; k++) {
      const el = document.createElement('div');
      el.className = 'pst-col';
      colEls.push(el);
    }
    items.forEach((it, i) => colEls[i % n].appendChild(it));
    grid.querySelectorAll('.pst-col').forEach(el => el.remove());
    colEls.forEach(el => grid.appendChild(el));
    grid.classList.add('pst-cols');
  }
  deal();
  window.addEventListener('resize', deal);

  if (!('IntersectionObserver' in window)) return;
  grid.classList.add('pst-js');
  const io = new IntersectionObserver((entries) => {
    const n = cols();
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const k = items.indexOf(e.target) % n;
      e.target.style.transitionDelay = (k * 0.09).toFixed(2) + 's';
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach((it) => io.observe(it));
  // the delay is only for the arrival; clear it so hover and resize feel direct
  grid.addEventListener('transitionend', (e) => {
    if (e.target.classList && e.target.classList.contains('pst-item')) e.target.style.transitionDelay = '';
  });
})();

/* =========================================================
   CONTACT — COPY EMAIL
   The button next to the address puts it on the clipboard and says
   so for a moment. Where the clipboard is not allowed it selects the
   address instead, ready for Ctrl+C.
   ========================================================= */
(function () {
  const btn = document.querySelector('.ct-copy[data-copy]');
  if (!btn) return;
  const label = btn.textContent;
  let timer = null;
  const done = (text) => {
    btn.textContent = text;
    btn.classList.add('is-done');
    clearTimeout(timer);
    timer = setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 1600);
  };
  const selectLink = () => {
    const link = document.querySelector('.ct-email-link');
    if (!link || !window.getSelection) return;
    const r = document.createRange();
    r.selectNodeContents(link);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => done('COPIED'), () => { selectLink(); done('SELECTED'); });
    } else {
      selectLink();
      done('SELECTED');
    }
  });
})();

/* =========================================================
   EXPERIENCE DESIGN — PROJECT MENU
   Four buttons, one case study open at a time beneath them. The
   address carries the open one (#monster-within), so a project can
   be linked to and the back button steps between them.
   ========================================================= */
(function () {
  const tabs = [...document.querySelectorAll('.ed-tab[data-ed]')];
  if (!tabs.length) return;
  const art = (key) => document.getElementById('ed-' + key);
  const keys = tabs.map(t => t.getAttribute('data-ed')).filter(k => art(k));
  let current = null;

  function show(key, scroll) {
    if (!keys.includes(key)) key = null;
    if (key === current) return;
    current = key;
    tabs.forEach(t => {
      const on = t.getAttribute('data-ed') === key;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-expanded', on ? 'true' : 'false');
      const go = t.querySelector('.ed-tab-go');
      if (go) go.textContent = on ? 'OPEN' : 'OPEN ↓';
    });
    keys.forEach(k => {
      const a = art(k);
      a.hidden = k !== key;
      a.classList.remove('is-in');
    });
    if (!key) return;
    const a = art(key);
    void a.offsetWidth;                       // restart the arrival
    a.classList.add('is-in');
    if (scroll) a.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const fromHash = () => decodeURIComponent(location.hash.replace(/^#/, ''));
  tabs.forEach(t => t.addEventListener('click', () => {
    const key = t.getAttribute('data-ed');
    if (fromHash() !== key) history.pushState(null, '', '#' + key);
    show(key, true);
  }));
  window.addEventListener('popstate', () => show(fromHash(), false));
  show(fromHash(), !!fromHash());
})();

/* =========================================================
   PHOTOGRAPHY — FLIP LIGHTBOX
   Click a photo: it grows from its grid slot to full screen
   (translate + uniform scale, inverted then played). Close with
   the corner X, the backdrop, or Esc: it shrinks back to the
   same slot it came from. Scroll is locked while open so the
   slot stays put for the zoom-out.
   ========================================================= */
(function () {
  // the Poster page's staircase grid shares this lightbox
  const grid = document.querySelector('.photo-grid, .pst-grid');
  const lb = document.getElementById('photoLb');
  if (!grid || !lb) return;
  const frame = lb.querySelector('.photo-lb-frame');
  const lbImg = frame && frame.querySelector('img');
  const closeBtn = document.getElementById('photoLbClose');
  if (!frame || !lbImg || !closeBtn) return;

  const DUR = 470;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  let openFig = null;
  let busy = false;

  // Geometry for morphing the frame between its full-screen box and a grid slot.
  // The two never share an aspect ratio — the frame matches the picture (3:2),
  // the slot is a 4:3 (or 20:9 lead) cover-crop — so a single uniform scale can
  // not land on the slot: it used to finish ~11% short in height, and ~48% off
  // on the wide lead frame. That leftover gap is what you saw as a jolt the
  // instant the real thumbnail took over.
  //   frame -> scaled non-uniformly so it lands exactly ON the slot
  //   picture inside -> given the inverse scale
  // The two compose to exactly the uniform cover-scale the thumbnail itself
  // uses, so nothing is stretched at either end and the hand-off is seamless.
  function morph(fromRect, toRect) {
    const sx = toRect.width / fromRect.width;
    const sy = toRect.height / fromRect.height;
    const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
    const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
    const cover = Math.max(sx, sy);
    return {
      frame: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`,
      img: `scale(${(cover / sx).toFixed(5)}, ${(cover / sy).toFixed(5)})`
    };
  }

  let anims = [];
  function stopAnims() {
    anims.forEach(a => { try { a.cancel(); } catch (e) {} });
    anims = [];
  }
  function runMorph(fromTf, toTf) {
    stopAnims();
    frame.style.willChange = 'transform';
    lbImg.style.willChange = 'transform';
    const opts = { duration: DUR, easing: EASE, fill: 'forwards' };
    const a1 = frame.animate([{ transform: fromTf.frame }, { transform: toTf.frame }], opts);
    const a2 = lbImg.animate([{ transform: fromTf.img }, { transform: toTf.img }], opts);
    anims = [a1, a2];
    return a1;
  }
  const IDENTITY = { frame: 'none', img: 'none' };

  // fit the frame to the picture's largest box that fits inside the viewport
  // margins — so the enlarged image is never taller/wider than the screen
  function fitFrame() {
    const mx = Math.max(16, Math.min(window.innerWidth * 0.03, 72));
    const my = Math.max(16, Math.min(window.innerHeight * 0.05, 64));
    const availW = window.innerWidth - mx * 2;
    const availH = window.innerHeight - my * 2;
    const ar = (lbImg.naturalWidth && lbImg.naturalHeight)
      ? lbImg.naturalWidth / lbImg.naturalHeight : 3 / 2;
    let w = availW, h = availW / ar;
    if (h > availH) { h = availH; w = availH * ar; }
    frame.style.width = Math.round(w) + 'px';
    frame.style.height = Math.round(h) + 'px';
  }

  function open(fig) {
    if (busy || openFig) return;
    const thumb = fig.querySelector('img');
    if (!thumb) return;
    busy = true;
    openFig = fig;

    lbImg.src = thumb.getAttribute('data-full') || thumb.currentSrc || thumb.src;
    stopAnims();
    frame.style.transition = 'none';
    frame.style.transform = 'none';
    lbImg.style.transform = 'none';
    lb.classList.add('is-on');
    lb.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lb-lock');

    const play = () => {
      fitFrame();
      const full = frame.getBoundingClientRect();
      const slot = thumb.getBoundingClientRect();
      fig.classList.add('is-open');                  // empty the grid slot
      frame.style.transformOrigin = 'center center';
      lbImg.style.transformOrigin = 'center center';
      // start sitting exactly on the slot, play out to full screen
      runMorph(morph(full, slot), IDENTITY).finished
        .then(() => { frame.style.willChange = ''; lbImg.style.willChange = ''; busy = false; })
        .catch(() => { busy = false; });
    };

    if (lbImg.complete && lbImg.naturalWidth) requestAnimationFrame(play);
    else lbImg.addEventListener('load', () => requestAnimationFrame(play), { once: true });
  }

  function close() {
    if (busy || !openFig) return;
    busy = true;
    const fig = openFig;
    const thumb = fig.querySelector('img');
    const full = frame.getBoundingClientRect();
    const slot = thumb.getBoundingClientRect();

    // shrink from full screen down onto the slot, landing on it exactly
    const a = runMorph(IDENTITY, morph(full, slot));
    lb.classList.remove('is-on');                    // backdrop + X fade alongside

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Hand off in this order so nothing is ever visibly out of place:
      // the frame is sitting pixel-exact on the slot, so putting the real
      // thumbnail back and then emptying the frame is a pure content swap —
      // no geometry moves. Only once it holds nothing do we reset it.
      fig.classList.remove('is-open');
      lbImg.removeAttribute('src');
      stopAnims();
      frame.style.willChange = '';
      lbImg.style.willChange = '';
      frame.style.transform = 'none';
      lbImg.style.transform = 'none';
      frame.style.width = '';
      frame.style.height = '';
      lb.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('lb-lock');
      openFig = null;
      busy = false;
    };
    a.finished.then(finish).catch(finish);
    setTimeout(finish, DUR + 120);                   // safety net
  }

  grid.addEventListener('click', e => {
    const fig = e.target.closest('figure');
    if (fig && grid.contains(fig)) open(fig);
  });
  closeBtn.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openFig) close(); });
  window.addEventListener('resize', () => {
    if (openFig && !busy) {
      stopAnims();
      frame.style.transform = 'none';
      lbImg.style.transform = 'none';
      fitFrame();
    }
  });
})();

/* =========================================================
   ABOUT — CV VIEWER
   VIEW CV opens the CV over the page instead of sending the reader
   away. It grows out of the button itself - centre on centre, from the
   button's width to its own, fading up as it leaves - and shrinks back
   into it on close: the X, a click on the dark around it, or Esc. The
   page behind is locked while it is open, and the CV is sized to fit the
   screen whole (see .cv-lb-frame). A modified click (new tab, save link) is left to the browser,
   and without script the button simply opens the picture.
   ========================================================= */
(function () {
  const BTN = '.about-cv .cv-view';
  const lb = document.getElementById('cvLb');
  if (!lb || !document.querySelector(BTN)) return;
  // Looked up when needed, never held: the About copy is re-measured by
  // rewriting its columns, and a held button can be one no longer on the page.
  const button = () => document.querySelector(BTN);
  const onButtonEvent = (e) => !!(e.target && e.target.closest && e.target.closest(BTN));
  const scroller = lb.querySelector('.cv-lb-scroll');
  const frame = lb.querySelector('.cv-lb-frame');
  const img = frame && frame.querySelector('img');
  const closeBtn = document.getElementById('cvLbClose');
  if (!scroller || !frame || !img || !closeBtn) return;

  const SRC = button().getAttribute('href');
  const DUR = 520;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let isOpen = false;
  let busy = false;
  let anim = null;

  // Fetched as soon as the reader shows interest in the button, so by the
  // click it is usually decoded already.
  const load = () => { if (!img.getAttribute('src')) img.src = SRC; };
  ['pointerover', 'focusin', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, (e) => { if (onButtonEvent(e)) load(); }, { passive: true }));

  // The frame's transform that sets it on the button: centre on centre, as
  // wide as the button. Measured on the untransformed frame, with the viewer
  // scrolled wherever the reader has left it.
  function onButton() {
    const f = frame.getBoundingClientRect();
    const b = button().getBoundingClientRect();
    const k = b.width / Math.max(1, f.width);
    const dx = (b.left + b.width / 2) - (f.left + f.width / 2);
    const dy = (b.top + b.height / 2) - (f.top + f.height / 2);
    return 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
  }

  function run(keyframes) {
    if (anim) anim.cancel();
    frame.style.willChange = 'transform, opacity';
    anim = frame.animate(keyframes, { duration: reduce ? 1 : DUR, easing: EASE, fill: 'forwards' });
    return anim;
  }

  function settle() {
    if (anim) { anim.cancel(); anim = null; }
    frame.style.transform = '';
    frame.style.opacity = '';
    frame.style.willChange = '';
  }

  function open() {
    if (isOpen || busy) return;
    isOpen = busy = true;
    load();
    scroller.scrollTop = 0;
    const from = onButton();
    // parked on the button, invisible, until the picture is ready to show
    frame.style.transform = from;
    frame.style.opacity = '0';
    lb.style.transition = '';                      // undo the last close's hard hide,
    lb.style.visibility = '';                      // so the dark fades up as before
    lb.classList.add('is-on');
    lb.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lb-lock');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      settle();
      busy = false;
      closeBtn.focus({ preventScroll: true });
    };
    const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    Promise.race([decoded, new Promise((r) => setTimeout(r, 300))]).then(() => {
      if (done) return;
      const a = run([
        { transform: from, opacity: 0 },
        { opacity: 1, offset: 0.3 },
        { transform: 'none', opacity: 1 }
      ]);
      frame.style.transform = '';
      frame.style.opacity = '';
      a.finished.then(finish).catch(finish);
      setTimeout(finish, DUR + 200);               // safety net
    });
  }

  function close() {
    if (!isOpen || busy) return;
    busy = true;
    const to = onButton();
    lb.classList.remove('is-on');                  // the dark and the X fade alongside
    const a = run([
      { transform: 'none', opacity: 1 },
      { opacity: 1, offset: 0.7 },
      { transform: to, opacity: 0 }
    ]);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      /* Hide the viewer outright before the frame is put back. The stylesheet
         keeps it visible a little longer (its visibility waits out the fade of
         the dark behind it), and resetting the frame inside that window brought
         the CV back at full size for a moment - the flash after closing. Its
         transition goes too, or the stylesheet's delay would hold even this
         hide back; the dark has faded out by now anyway. The frame is left
         transparent as well, until the next open parks it on the button. */
      lb.style.transition = 'none';
      lb.style.visibility = 'hidden';
      settle();
      frame.style.opacity = '0';
      lb.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('lb-lock');
      isOpen = busy = false;
      const b = button();
      if (b) b.focus({ preventScroll: true });
    };
    a.finished.then(finish).catch(finish);
    setTimeout(finish, DUR + 200);                 // safety net
  }

  document.addEventListener('click', (e) => {
    if (!onButtonEvent(e)) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open();
  });
  closeBtn.addEventListener('click', close);
  // the dark around the CV closes it; the CV itself is for reading
  lb.addEventListener('click', (e) => {
    if (!frame.contains(e.target) && !closeBtn.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }   // keep focus in the viewer
  });
})();

/* ---- 3D / VIDEO page -------------------------------------------------------
   Each clip reveals as it scrolls into view and plays only while it is on
   screen; scrolled away, or with the tab in the background, it pauses. Two
   1080p loops decoding permanently would cost battery for footage nobody is
   looking at.
   Visibility is worked out from the two figures' positions on scroll and
   resize rather than with an IntersectionObserver. An observer delivers
   nothing until the page has rendered a frame, so a tab that opens in the
   background could leave both figures sitting at opacity 0 in their
   letterboxed clip until something woke it; two rectangles read on a
   throttled scroll are cheap and cannot go quiet. It also runs once on load,
   so the first clip is revealed without the reader having to scroll.
   play() returns a promise that rejects if the browser refuses to autoplay;
   that is swallowed, and the frame shows its first picture instead. */
(function () {
  const items = [...document.querySelectorAll('.vid-item')];
  if (!items.length) return;
  const vids = items.map((it) => it.querySelector('video'));
  const SHOWN = 0.2;          // share of a figure on screen that counts as "in view"

  const play = (v) => {
    if (!v || document.hidden || !v.paused || v.error) return;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  // These are release assets too: the 720p copy where that is the one to use,
  // and a fresh link when the one a clip holds runs out (see refetchClip).
  const shown = items.map(() => false);
  const retry = items.map(() => ({}));
  const revive = (i) => {
    const v = vids[i];
    if (v && shown[i] && !document.hidden && refetchClip(v, retry[i].base, retry[i])) play(v);
  };
  vids.forEach((v, i) => {
    if (!v) return;
    retry[i].base = clipUrl(v.getAttribute('src'));
    if (retry[i].base !== v.getAttribute('src')) v.src = retry[i].base;
    v.addEventListener('error', () => revive(i));
    v.addEventListener('playing', () => {
      retry[i]._fails = 0;
      items[i].classList.add('is-playing');
    });
    v.addEventListener('pause', () => items[i].classList.remove('is-playing'));
  });

  function sync() {
    pending = null;
    const vh = window.innerHeight;
    items.forEach((it, i) => {
      const r = it.getBoundingClientRect();
      const seen = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
      const inView = r.height > 0 && seen / Math.min(r.height, vh) >= SHOWN;
      const v = vids[i];
      shown[i] = inView;
      if (inView) {
        it.classList.add('is-in');        // reveal once; it stays revealed
        if (v && v.error) revive(i);
        else play(v);
      } else if (v && !v.paused) {
        v.pause();
      }
    });
  }
  let pending = null;
  const schedule = () => { if (pending === null) pending = setTimeout(sync, 80); };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) vids.forEach((v) => { if (v && !v.paused) v.pause(); });
    else sync();
  });
  sync();
})();
