// js/slider.js
// Lightweight accessible slider with autoplay, keyboard and swipe support.
// Exposes minimal API via window.__productSlider

const root = document.querySelector(".product-slider");
if (!root) {
  // nothing to initialize
  // (export nothing in plain script context)
} else {
  const imgs = Array.from(root.querySelectorAll(".ps-img"));
  const thumbs = Array.from(root.querySelectorAll(".ps-thumb"));
  const leftBtn = root.querySelector(".ps-left");
  const rightBtn = root.querySelector(".ps-right");
  const frame = root.querySelector(".ps-frame");

  // If no images, nothing to do
  if (imgs.length === 0) {
    // show placeholder maybe
    console.warn("Slider: no .ps-img elements found");
  }

  let index = 0;
  let autoplay = true;
  const intervalMs = 4500;
  let timer = null;

  function setActive(i) {
    if (i < 0) i = imgs.length - 1;
    if (i >= imgs.length) i = 0;
    index = i;
    imgs.forEach((img, idx) => {
      img.datasetActive = idx === index ? "true" : "false";
      img.id = `ps-main-img-${idx}`;
    });
    thumbs.forEach((t, idx) => {
      t.setAttribute("aria-selected", idx === index ? "true" : "false");
    });
  }

  function show(i, options = {}) {
    if (!imgs.length) return;
    setActive(i);
    if (options.focus && thumbs[index]) thumbs[index].focus();
  }

  function next() {
    show(index + 1);
    restartTimer();
  }
  function prev() {
    show(index - 1);
    restartTimer();
  }

  function restartTimer() {
    if (!autoplay) return;
    stopTimer();
    timer = setInterval(() => show(index + 1), intervalMs);
  }
  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // initial show
  show(0);

  // arrows
  if (leftBtn) leftBtn.addEventListener("click", prev);
  if (rightBtn) rightBtn.addEventListener("click", next);

  // thumbnails click & keyboard
  thumbs.forEach((t) => {
    t.addEventListener("click", () => {
      const i = parseInt(t.dataset.index || "0", 10);
      show(i, { focus: true });
      restartTimer();
    });
    t.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        t.click();
      }
    });
  });

  // keyboard navigation on frame
  if (frame) {
    frame.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " " || e.key === "Spacebar") {
        autoplay = !autoplay;
        if (autoplay) restartTimer();
        else stopTimer();
      }
    });
  }

  // swipe support (touch)
  let startX = null;
  let startY = null;
  if (frame) {
    frame.addEventListener(
      "touchstart",
      (e) => {
        stopTimer();
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
      },
      { passive: true }
    );

    frame.addEventListener(
      "touchend",
      (e) => {
        if (startX === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next();
          else prev();
        }
        startX = null;
        startY = null;
        restartTimer();
      },
      { passive: true }
    );
  }

  // pause autoplay on hover/focus
  root.addEventListener("mouseenter", stopTimer);
  root.addEventListener("mouseleave", () => {
    if (autoplay) restartTimer();
  });
  root.addEventListener("focusin", stopTimer);
  root.addEventListener("focusout", () => {
    if (autoplay) restartTimer();
  });

  // start autoplay
  restartTimer();

  // expose basic API
  window.__productSlider = {
    goTo: (i) => show(i),
    next,
    prev,
    stop: stopTimer,
    start: restartTimer,
    getIndex: () => index,
  };
}
