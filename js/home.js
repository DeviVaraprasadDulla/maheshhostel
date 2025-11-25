// js/home.js
(() => {
  // Helpers
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  // Year in footer
  const yearEl = byId("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Header shadow on scroll */
  (function headerScrollHandler() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const threshold = 8;
    function update() {
      const sc = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle("scrolled", sc > threshold);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  })();

  /* Mobile menu toggle (working hamburger) */
  (function mobileMenu() {
    const mobileBtn = byId("mobileMenuBtn");
    const nav = byId("nav");
    if (!mobileBtn || !nav) return;

    function setOpen(open) {
      if (open) {
        nav.classList.add("open");
        mobileBtn.setAttribute("aria-expanded", "true");
      } else {
        nav.classList.remove("open");
        mobileBtn.setAttribute("aria-expanded", "false");
      }
    }

    mobileBtn.addEventListener("click", () => {
      const isOpen = mobileBtn.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });

    // close when a nav link clicked on mobile
    Array.from(nav.querySelectorAll(".nav-list a")).forEach((a) =>
      a.addEventListener("click", () => {
        if (mobileBtn.getAttribute("aria-expanded") === "true") setOpen(false);
      })
    );

    // close on ESC
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") setOpen(false);
    });
  })();

  /* Hero slider (autoplay + touch + keyboard) */
  (function heroSlider() {
    const imgs = Array.from(document.querySelectorAll(".hs-img"));
    const dotsWrap = document.getElementById("hsDots");
    const prev = document.getElementById("hsPrev");
    const next = document.getElementById("hsNext");
    const frame = document.getElementById("hsFrame");
    if (!imgs.length) return;

    let idx = 0;
    const delay = 4500;
    let timer = null;
    let autoplay = true;

    function setSlide(i) {
      idx = (i + imgs.length) % imgs.length;
      imgs.forEach((img) => {
        const active = parseInt(img.dataset.index, 10) === idx;
        img.datasetActive = active ? "true" : "false";
        img.setAttribute("aria-hidden", active ? "false" : "true");
        img.style.opacity = active ? "1" : "0";
      });
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((d, di) =>
          d.setAttribute("aria-selected", di === idx ? "true" : "false")
        );
      }
    }

    function nextSlide() {
      setSlide(idx + 1);
      restart();
    }
    function prevSlide() {
      setSlide(idx - 1);
      restart();
    }
    function restart() {
      if (timer) clearInterval(timer);
      if (autoplay) timer = setInterval(() => setSlide(idx + 1), delay);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    // create dots
    if (dotsWrap) {
      imgs.forEach((img, i) => {
        const b = document.createElement("button");
        b.className = "hs-dot";
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", i === 0 ? "true" : "false");
        b.setAttribute("aria-label", `Slide ${i + 1}`);
        b.addEventListener("click", () => {
          setSlide(i);
          restart();
        });
        dotsWrap.appendChild(b);
      });
    }

    if (prev) prev.addEventListener("click", prevSlide);
    if (next) next.addEventListener("click", nextSlide);

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    });

    // pause on hover/focus
    const hsFrame = frame || document.getElementById("heroSlider");
    if (hsFrame) {
      hsFrame.addEventListener("mouseenter", stop);
      hsFrame.addEventListener("mouseleave", restart);
      hsFrame.addEventListener("focusin", stop);
      hsFrame.addEventListener("focusout", restart);
    }

    // touch support
    let startX = null,
      startY = null;
    if (hsFrame) {
      hsFrame.addEventListener(
        "touchstart",
        (ev) => {
          const t = ev.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          stop();
        },
        { passive: true }
      );
      hsFrame.addEventListener(
        "touchend",
        (ev) => {
          if (startX === null) return;
          const t = ev.changedTouches[0];
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) nextSlide();
            else prevSlide();
          }
          startX = null;
          startY = null;
          restart();
        },
        { passive: true }
      );
    }

    // init
    imgs.forEach((img, i) => {
      img.dataset.index = img.dataset.index ?? String(i);
      img.datasetActive = i === 0 ? "true" : "false";
      img.style.transition = "opacity .6s ease";
      img.style.opacity = i === 0 ? "1" : "0";
      img.setAttribute("aria-hidden", i === 0 ? "false" : "true");
    });

    setSlide(0);
    restart();
  })();

  /* Contact form: simple validation + simulated submit (replace with API) */
  (function contactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;
    const status = document.getElementById("contactStatus");
    const submit = document.getElementById("contactSubmit");
    const nameI = document.getElementById("contactName");
    const phoneI = document.getElementById("contactPhone");
    const msgI = document.getElementById("contactMsg");
    const errName = document.getElementById("errName");
    const errPhone = document.getElementById("errPhone");
    const errMsg = document.getElementById("errMsg");

    function validate() {
      let ok = true;
      errName.textContent = "";
      errPhone.textContent = "";
      errMsg.textContent = "";
      if (!nameI.value.trim()) {
        errName.textContent = "Please enter name.";
        ok = false;
      }
      const phone = phoneI.value.trim();
      if (!/^\+?\d{9,15}$/.test(phone)) {
        errPhone.textContent = "Enter a valid phone (digits only).";
        ok = false;
      }
      if (msgI.value && msgI.value.length > 500) {
        errMsg.textContent = "Message too long.";
        ok = false;
      }
      return ok;
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!validate()) return;
      if (submit) {
        submit.disabled = true;
        submit.textContent = "Sending...";
      }
      if (status) status.textContent = "";
      // Replace below with your POST API call
      try {
        // Simulate network
        await new Promise((r) => setTimeout(r, 900));
        if (status)
          status.textContent = "Message sent — we will call you soon.";
        form.reset();
        setTimeout(() => {
          if (status) status.textContent = "";
        }, 4000);
      } catch (err) {
        if (status) status.textContent = "Failed to send. Try again later.";
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Send Request";
        }
      }
    });
  })();
})();
