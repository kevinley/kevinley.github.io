/* Progressive enhancement only: the page is complete without this file.
   Reveal, step lines, self-check result + email, copy address, WebGL fire. */
(() => {
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
    const n = open && `${open.length} of 10 left unticked`;
    const count = open ? n + "." + (open.length ? "\nThe ones I couldn't tick:\n" + open.map((t) => "- " + t).join("\n") : "") : tpl.dataset.nocount;
    const body = tpl.content.textContent.trim().replace("{count}", () => count).replace(/\r?\n/g, "\r\n");
    const q = `?subject=${encodeURIComponent(open ? `App review (${n})` : "App review")}&body=${encodeURIComponent(body)}`;
    mails.forEach((a) => { a.href = a.href.split("?")[0] + q; });
  };
  setMail();

  /* ---- Self-check ---- */
  const check = $("[data-check]");
  if (check) {
    const boxes = $$("input", check);
    const n = $(".check__n", check);
    const tally = () => {
      const open = boxes.filter((b) => !b.checked);
      n.textContent = open.length;
      check.dataset.band = open.length < 3 ? 0 : open.length < 6 ? 1 : 2;
      setMail(open.map((b) => b.labels[0].textContent));
    };
    check.addEventListener("change", tally);
    // "?" until the first tick, unless the browser restored earlier ticks.
    if (boxes.some((b) => b.checked)) tally(); else n.textContent = "?";
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
        copy.textContent = "Copied";
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

  /* ---- Fire: one WebGL canvas per orb; hover/tap raises "heat". Reduced
     motion draws one still frame; without WebGL the CSS fireball stays.
     Starts once the page has loaded and the browser is idle. ---- */
  const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}";
  const FS = `precision highp float;
uniform vec2 R;uniform float T,H;uniform vec3 M,E;
float h(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f*=f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+1.),f.x),f.y),f.z);}
float b(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+.17;a*=.5;}return v;}
vec3 ramp(float x){return M*pow(vec3(clamp(x,0.,1.)),E);}
float hs(float s){return fract(sin(s*91.7)*43758.5);}
void main(){
vec2 p0=(gl_FragCoord.xy-R*vec2(.5,.3333))/(R.x/10.);
vec2 p=p0/(1.+.18*H);
float t=T;
vec2 q=p+(vec2(b(vec3(p*1.7,t*.6)),b(vec3(p*1.7+5.2,t*.6)))-.5)*(.5+.1*H);
float r=length(q),u=max(q.y,0.);
float f=b(vec3(q.x*2.3,q.y*1.7-t*2.6,t*.4));
float e=.6+.5*f+min(u,1.8)*(f*(1.6+.5*H)-.35);
float k=clamp(1.-r/e,0.,1.);
k=pow(k,.65)*smoothstep(0.,.35,k)*(.7+.6*f)+(1.-smoothstep(0.,.5,r))*.3;
k*=1.-smoothstep(2.,3.2,r);
vec3 c=ramp(k*(1.+.12*H))+ramp(.4)*exp(-dot(p0,p0)*.8)*(.35+.15*H);
for(int i=0;i<28;i++){float s=float(i);if(hs(s+11.)>.3+.3*H)continue;
float l=fract(t*(.22+.2*hs(s))+hs(s+3.));
vec2 o=vec2((hs(s+7.)-.5)*(1.3+.3*H)+sin(t*3.+s)*.14*l,.2+l*(2.8+.8*H));
c+=ramp(.9)*(1.-smoothstep(0.,.045+.008*H,length(p0-o)))*(1.-l)*(.6+.4*H);}
vec2 v=gl_FragCoord.xy/R;
c*=smoothstep(0.,.1,v.x)*(1.-smoothstep(.9,1.,v.x))*smoothstep(0.,.1,v.y)*(1.-smoothstep(.9,1.,v.y));
vec3 o=1.-exp(-c*1.5);o+=(h(vec3(gl_FragCoord.xy,T*60.))-.5)/128.*smoothstep(0.,.03,o.r+o.g+o.b);
gl_FragColor=vec4(o,1.);}`;

  const draw = (f, t) => {
    const { gl } = f;
    gl.uniform2f(f.R, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(f.T, t);
    gl.uniform1f(f.H, f.heat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const ignite = () => {
    const fires = orbs.map((orb) => {
      const cv = document.createElement("canvas");
      const gl = cv.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
      if (!gl) return null;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(pr, 0, "a");
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const u = (k) => gl.getUniformLocation(pr, k);
      const v = getComputedStyle(orb).getPropertyValue("--gl").trim().split(/\s+/).map(Number);
      gl.uniform3f(u("M"), v[0], v[1], v[2]);
      gl.uniform3f(u("E"), v[3], v[4], v[5]);
      cv.className = "orb__gl";
      orb.querySelector(".orb__fire").appendChild(cv);
      orb.classList.add("has-gl");
      const f = { orb, gl, R: u("R"), T: u("T"), H: u("H"), heat: 0, time: 2 };
      new ResizeObserver(() => {
        const d = Math.min(devicePixelRatio || 1, 1.5);
        cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d;
        gl.viewport(0, 0, cv.width, cv.height);
        draw(f, f.time); // draw before the next paint, so the flame never blinks out
      }).observe(cv);
      return f;
    }).filter(Boolean);

    if (!fires.length || reduce) return;
    let running = false, raf = 0, visible = true, last = 0;
    const tick = (now) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      fires.forEach((f) => {
        const hot = f.orb.matches(":hover") || f.orb.classList.contains("is-open") ? 1 : 0;
        // Build up slowly (~1.5s), fall back fast (~0.25s).
        const rate = hot > f.heat ? 2 : 14;
        f.heat += (hot - f.heat) * Math.min(dt * rate, 1);
        // Each fire keeps its own clock, so heat changes speed, never jumps time.
        f.time += dt * (1 + 0.3 * f.heat);
        draw(f, f.time);
      });
      raf = running ? requestAnimationFrame(tick) : (last = 0);
    };
    const set = () => { running = visible && !document.hidden; if (running && !raf) raf = requestAnimationFrame(tick); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; set(); }).observe(stage);
    document.addEventListener("visibilitychange", set);
  };

  if (orbs.length) {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    const later = () => idle(ignite, { timeout: 1500 });
    if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
  }
})();
