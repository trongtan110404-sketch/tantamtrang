/* Spread viewer (typography.html, album-cover.html): one spread at a time,
   a short fade between them. Click the right page / → for next, the left
   page / ← for previous. Keyboard arrows work while the spread is focused.
   A .ty-thumbs row, if a book has one, gets a thumbnail per spread.

   Each .ty-book names its images as data-prefix + number + .jpg for the
   numbers data-from..data-to. Numbers are zero-padded to two digits
   (p02.jpg) unless data-pad says otherwise (data-pad="1": album1.jpg).
   data-single shows one image at a time instead of pairing two.
   data-zoom (with data-single): clicking the image opens it large in a
   lightbox that grows out of the image and shrinks back into it on close;
   the arrows then do the paging. */
(function () {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Zoom lightbox (one for the page, built on first use) ---- */
  let lb = null, lbImg = null, lbSource = null, lbBusy = false;
  const ZOOM_MS = reduced ? 0 : 420;
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'ty-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<div class="ty-lb-bg"></div><img class="ty-lb-img" alt="">' +
                   '<button class="ty-lb-close" type="button" aria-label="Close">&times;</button>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('.ty-lb-img');
    lb.addEventListener('click', closeZoom);            // backdrop, image or the × all close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) closeZoom();
    });
  }

  // Where the image sits when open: as large as fits, centred.
  function targetRect(img) {
    const ratio = img.naturalWidth / img.naturalHeight || 1;
    const maxW = window.innerWidth * 0.92, maxH = window.innerHeight * 0.9;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h };
  }

  // The transform that puts the open image exactly over `from`.
  const fromTransform = (from, to) =>
    'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ')';

  function openZoom(img) {
    if (lbBusy || !img.naturalWidth) return;
    if (!lb) buildLightbox();
    lbBusy = true;
    lbSource = img;
    const from = img.getBoundingClientRect();
    const to = targetRect(img);
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    Object.assign(lbImg.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
    lb.classList.add('is-open');
    document.documentElement.classList.add('ty-lb-lock');
    img.style.visibility = 'hidden';                    // the copy flies out of its place
    lbImg.animate([{ transform: fromTransform(from, to) }, { transform: 'none' }], { duration: ZOOM_MS, easing: EASE });
    lb.querySelector('.ty-lb-bg').animate([{ opacity: 0 }, { opacity: 1 }], { duration: ZOOM_MS, easing: 'ease' });
    lb.querySelector('.ty-lb-close').focus({ preventScroll: true });
    setTimeout(() => { lbBusy = false; }, ZOOM_MS);
  }

  function closeZoom() {
    if (lbBusy || !lb.classList.contains('is-open')) return;
    lbBusy = true;
    const from = lbSource.getBoundingClientRect();
    const to = lbImg.getBoundingClientRect();
    lbImg.animate([{ transform: 'none' }, { transform: fromTransform(from, to) }], { duration: ZOOM_MS, easing: EASE, fill: 'forwards' });
    lb.querySelector('.ty-lb-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: ZOOM_MS, easing: 'ease', fill: 'forwards' });
    setTimeout(() => {
      lb.classList.remove('is-open');
      lbImg.getAnimations().forEach((a) => a.cancel());
      lb.querySelector('.ty-lb-bg').getAnimations().forEach((a) => a.cancel());
      lbSource.style.visibility = '';
      document.documentElement.classList.remove('ty-lb-lock');
      const spread = lbSource.closest('.ty-spread');
      if (spread) spread.focus({ preventScroll: true });
      lbBusy = false;
    }, ZOOM_MS);
  }

  document.querySelectorAll('.ty-book').forEach((book) => {
    const prefix = book.dataset.prefix;
    const from = +book.dataset.from, to = +book.dataset.to;
    const digits = book.dataset.pad ? +book.dataset.pad : 2;
    const file = (n) => prefix + pad(n, digits) + '.jpg';
    const unit = book.dataset.unit || 'Page';
    // data-single: every PDF page is already a whole spread / landscape
    // page, so show one image at a time instead of pairing two.
    const single = book.hasAttribute('data-single');
    const step = single ? 1 : 2;
    const spreads = [];
    for (let p = from; p + step - 1 <= to; p += step) {
      spreads.push(single ? [file(p)] : [file(p), file(p + 1)]);
    }

    const spread = book.querySelector('.ty-spread');
    const [imgL, imgR] = book.querySelectorAll('.ty-page img');
    const full = book.querySelector('.ty-full');
    const num = book.querySelector('.ty-num');
    const prev = book.querySelector('.ty-prev');
    const next = book.querySelector('.ty-next');
    const thumbs = book.querySelector('.ty-thumbs');

    const thumbBtns = !thumbs ? [] : spreads.map((pair, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ty-thumb';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Spread ' + (i + 1));
      b.innerHTML = pair.map((src) => '<img loading="lazy" decoding="async" alt="" src="' + src + '">').join('');
      b.addEventListener('click', () => go(i));
      thumbs.appendChild(b);
      return b;
    });

    let cur = -1;
    function preload(i) {
      (spreads[i] || []).forEach((src) => { const im = new Image(); im.src = src; });
    }
    function go(i) {
      i = Math.max(0, Math.min(spreads.length - 1, i));
      if (i === cur) return;
      const first = cur < 0;
      cur = i;
      const show = () => {
        imgL.src = spreads[i][0];
        imgL.alt = unit + ' ' + (from + i * step);
        if (imgR) {
          imgR.src = spreads[i][1];
          imgR.alt = unit + ' ' + (from + i * step + 1);
        }
        if (full) full.href = spreads[i][0];
        spread.classList.remove('is-out');
      };
      if (first) show();
      else { spread.classList.add('is-out'); setTimeout(show, 180); }
      num.textContent = pad(i + 1);
      prev.disabled = i === 0;
      next.disabled = i === spreads.length - 1;
      thumbBtns.forEach((b, k) => b.setAttribute('aria-selected', k === i ? 'true' : 'false'));
      const t = thumbBtns[i];
      if (t && !first) thumbs.scrollTo({ left: t.offsetLeft - (thumbs.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
      preload(i + 1);
    }

    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));
    if (single && book.hasAttribute('data-zoom')) {
      // click the image to see it large; the arrows do the paging
      const page = book.querySelector('.ty-page-single');
      page.setAttribute('aria-label', 'View larger');
      page.addEventListener('click', () => openZoom(imgL));
    } else if (single) {
      // one page: its left half goes back, its right half goes forward
      const page = book.querySelector('.ty-page-single');
      page.addEventListener('click', (e) => {
        const r = page.getBoundingClientRect();
        go(e.clientX - r.left < r.width / 2 ? cur - 1 : cur + 1);
      });
    } else {
      book.querySelector('.ty-page-left').addEventListener('click', () => go(cur - 1));
      book.querySelector('.ty-page-right').addEventListener('click', () => go(cur + 1));
    }
    spread.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    });

    go(0);
  });
})();
