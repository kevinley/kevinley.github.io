/* Progressive enhancement only: the page is complete without this file.
   Reveal, step lines, self-check result + email, copy address, flame buttons.
   The WebGL fire and the burning cursor load later, from fire.js.
   Every word it writes comes from data-* attributes in the page, so the
   English, German and French pages share this one file. */
(() => {
  const me = document.currentScript; // to find fire.js next to it, from /de/ and /fr/ too
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---- Reveal ---- */
  const revealables = $$("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("is-revealed"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-revealed");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  }

  /* ---- Step lines: one passive listener, one custom property per line ---- */
  const rails = $$("[data-rail]");
  if (!reduce && rails.length) {
    let ticking = false;
    const update = () => {
      ticking = false;
      rails.forEach((r) => {
        const box = r.getBoundingClientRect();
        const p = Math.min(Math.max((innerHeight * 0.6 - box.top) / box.height, 0), 1);
        r.style.setProperty("--progress", (p * 100).toFixed(1) + "%");
      });
    };
    addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---- Mail buttons open the #mail-draft template, count filled in.
     CRLF line breaks for Outlook. ---- */
  const mails = $$("[data-mail]");
  const tpl = $("#mail-draft");
  const setMail = (open) => {
    if (!tpl) return;
    const d = tpl.dataset;
    const n = open && d.count.replace("{n}", open.length);
    const count = open ? n + "." + (open.length ? "\n" + d.list + "\n" + open.map((t) => "- " + t).join("\n") : "") : d.nocount;
    const body = tpl.content.textContent.trim().replace("{count}", () => count).replace(/\r?\n/g, "\r\n");
    const q = `?subject=${encodeURIComponent(open ? `${d.subject} (${n})` : d.subject)}&body=${encodeURIComponent(body)}`;
    mails.forEach((a) => { a.href = a.href.split("?")[0] + q; });
  };
  setMail();

  /* ---- Self-check ---- */
  const check = $("[data-check]");
  if (check) {
    const boxes = $$("input", check);
    const n = $(".check__n", check);
    const label = $(".check__label", check);
    const one = new Intl.PluralRules(document.documentElement.lang); // French counts 0 as singular
    const tally = (first) => {
      const open = boxes.filter((b) => !b.checked);
      n.textContent = open.length;
      label.textContent = label.dataset[one.select(open.length) === "one" ? "one" : "many"];
      if (first) return;
      check.dataset.band = open.length < 3 ? 0 : open.length < 6 ? 1 : 2;
      setMail(open.map((b) => b.labels[0].textContent));
    };
    check.addEventListener("change", () => tally());
    // Starts at 10. The line for your score and the count in the email wait for
    // the first tick, unless the browser restored earlier ticks.
    tally(!boxes.some((b) => b.checked));
  }

  /* ---- Copy the address, for people without a mail app ---- */
  const copy = $("[data-copy]");
  const mail = $(".mail");
  if (copy && mail && navigator.clipboard) {
    const label = copy.textContent;
    copy.hidden = false;
    copy.addEventListener("click", () => {
      const address = mail.href.slice(7).split("?")[0];
      navigator.clipboard.writeText(address).then(() => {
        copy.textContent = copy.dataset.done;
        setTimeout(() => { copy.textContent = label; }, 2000);
      }, () => { copy.textContent = address; }); // blocked: show it to select by hand
    });
  }

  /* ---- Hero flames ---- */
  const stage = $("[data-stage]");
  const orbs = stage ? $$(".orb", stage) : [];

  /* ---- Tap / click to open, Escape or outside tap to close ---- */
  const close = (except) => orbs.forEach((o) => {
    if (o === except) return;
    o.classList.remove("is-open");
    o.setAttribute("aria-expanded", "false");
  });
  orbs.forEach((orb) => {
    orb.setAttribute("aria-expanded", "false");
    orb.addEventListener("click", () => {
      const open = !orb.classList.contains("is-open");
      close(orb);
      orb.classList.toggle("is-open", open);
      orb.setAttribute("aria-expanded", String(open));
    });
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  addEventListener("pointerdown", (e) => { if (!e.target.closest(".orb, .skills")) close(); });

  /* ---- WebGL fire and the burning cursor live in fire.js, fetched once the
     page has loaded and the browser is idle. Without it the CSS fireballs stay. ---- */
  if (orbs.length) {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const fire = () => document.head.append(Object.assign(document.createElement("script"), { src: new URL("fire.js", me.src).href }));
    const later = () => idle(fire, { timeout: 1500 });
    if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
  }
})();
