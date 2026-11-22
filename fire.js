/* WebGL fire for the two hero flames, and the burning cursor. Each page loads
   this deferred, right after script.js, so the fire is there from the first
   frames; nothing here is content. Reduced motion draws one still frame and
   skips the cursor. Without fast WebGL the CSS fireballs show instead (.no-gl). */
(() => {
  const stage = document.querySelector("[data-stage]");
  if (!stage) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- The fire shader. One flame per draw: C is its core and U its ball
     radius, both in canvas pixels. Its frame runs 5 radii left and right of
     the core, 4 below and 8 above, and fades out at the frame's edges.
     Most of the frame is dark: the noise only runs within reach of the flame
     (|p| < 3.65; past that the flame and glow are zero), and the sparks only in
     the column they rise through. That is about a third of the GPU work of
     shading every pixel. Alpha = brightness, so the canvas is see-through where
     there is no flame (and the cursor flame still shows on white buttons). ---- */
  const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}";
  /* S stretches the flame upward (a falling flame trails a tail), and B is how
     far a landing burst has got, 0 to 1 (1 = no burst): sparks fly out of the
     core and a flash spreads and fades. */
  const FS = `precision highp float;
uniform vec2 C;uniform float U,T,H,S,B;uniform vec3 M,E;
float h(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f*=f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+1.),f.x),f.y),f.z);}
float b(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+.17;a*=.5;}return v;}
vec3 ramp(float x){return M*pow(vec3(clamp(x,0.,1.)),E);}
float hs(float s){return fract(sin(s*91.7)*43758.5);}
void main(){
vec2 p0=(gl_FragCoord.xy-C)/U;
if(p0.y>0.)p0.y/=S;
vec2 p=p0/(1.+.18*H);
float t=T;
vec3 c=vec3(0);
if(dot(p,p)<13.3){
vec2 q=p+(vec2(b(vec3(p*1.7,t*.6)),b(vec3(p*1.7+5.2,t*.6)))-.5)*(.5+.1*H);
float r=length(q),u=max(q.y,0.);
float f=b(vec3(q.x*2.3,q.y*1.7-t*2.6,t*.4));
float e=.6+.5*f+min(u,1.8)*(f*(1.6+.5*H)-.35);
float k=clamp(1.-r/e,0.,1.);
k=pow(k,.65)*smoothstep(0.,.35,k)*(.7+.6*f)+(1.-smoothstep(0.,.5,r))*.3;
k*=1.-smoothstep(2.,3.2,r);
c=ramp(k*(1.+.12*H))+ramp(.4)*exp(-dot(p0,p0)*.8)*(.35+.15*H);}
if(abs(p0.x)<1.1&&p0.y>.1&&p0.y<3.95)
for(int i=0;i<28;i++){float s=float(i);if(hs(s+11.)>.3+.3*H)continue;
float l=fract(t*(.22+.2*hs(s))+hs(s+3.));
vec2 o=vec2((hs(s+7.)-.5)*(1.3+.3*H)+sin(t*3.+s)*.14*l,.2+l*(2.8+.8*H));
c+=ramp(.9)*(1.-smoothstep(0.,.045+.008*H,length(p0-o)))*(1.-l)*(.6+.4*H);}
if(B<1.&&dot(p0,p0)<30.){float z=1.-pow(1.-B,3.),w=pow(1.-B,1.5);
c+=ramp(.75)*exp(-dot(p0,p0)/(.25+B*2.5))*(1.-B)*1.4;
for(int i=0;i<24;i++){float s=float(i)+40.,a=3.1416*(1.3*hs(s)-.15),sp=.9+1.5*hs(s+1.);
vec2 o=vec2(cos(a),sin(a))*sp*z*1.5-vec2(0.,B*B*1.2);
c+=ramp(.95)*(1.-smoothstep(0.,.06,length(p0-o)))*w*1.6;}}
vec2 v=vec2(p0.x*.1+.5,(p0.y+4.)/12.);
c*=smoothstep(0.,.1,v.x)*(1.-smoothstep(.9,1.,v.x))*smoothstep(0.,.1,v.y)*(1.-smoothstep(.9,1.,v.y));
vec3 o=1.-exp(-c*1.5);o+=(h(vec3(gl_FragCoord.xy,T*60.))-.5)/128.*smoothstep(0.,.03,o.r+o.g+o.b);
gl_FragColor=vec4(o,max(o.r,max(o.g,o.b)));}`;

  /* ---- A canvas with its own WebGL context and the fire shader.
     failIfMajorPerformanceCaveat: no context when WebGL would run on the CPU
     instead of a graphics chip. That fire costs seconds of blocked page on such
     machines (and in Lighthouse), so they get the CSS fireballs.
     KHR_parallel_shader_compile: the shader compiles off the main thread, and
     ready() says when it's done, so the page never waits for it.
     A context can take 10 to 130 ms to create, so the page makes only two: one
     for both hero flames, one for the cursor, later. ---- */
  const make = (cv) => {
    const gl = cv.getContext("webgl", { antialias: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
    if (!gl) return null;
    const par = gl.getExtension("KHR_parallel_shader_compile");
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, "a");
    gl.linkProgram(pr);
    const u = (k) => gl.getUniformLocation(pr, k);
    return {
      cv, gl,
      ready: () => !par || gl.getProgramParameter(pr, par.COMPLETION_STATUS_KHR),
      // Once ready: false if the shader failed, else set up to draw.
      init() {
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
        gl.useProgram(pr);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enable(gl.SCISSOR_TEST);
        this.U = { C: u("C"), U: u("U"), T: u("T"), H: u("H"), S: u("S"), B: u("B"), M: u("M"), E: u("E") };
        return true;
      },
      // CSS pixels in, canvas pixels out: device pixels (at most `max`) × k.
      // Unchanged sizes are skipped, because any resize clears the canvas.
      size(w, h, max = 1.5, k = 1) {
        const d = Math.min(devicePixelRatio || 1, max) * k;
        const W = Math.round(w * d), Hh = Math.round(h * d);
        if (cv.width !== W) cv.width = W;
        if (cv.height !== Hh) cv.height = Hh;
        gl.viewport(0, 0, W, Hh);
        return d;
      },
    };
  };
  // Draw one flame f into the strip x0 to x1 of context g. f.ramp is "--gl":
  // R G B multipliers, then R G B exponents. The intro's drop and landing move
  // (dy), grow, heat up (boom), stretch and burst the flame on top of that.
  const draw = (g, f, x0 = 0, x1 = g.cv.width) => {
    const { gl, U } = g, r = f.ramp;
    gl.scissor(x0, 0, x1 - x0, g.cv.height);
    gl.uniform2f(U.C, f.cx, f.cy + (f.dy || 0));
    gl.uniform1f(U.U, f.unit * (f.grow || 1));
    gl.uniform1f(U.T, f.time);
    gl.uniform1f(U.H, f.heat + (f.boom || 0));
    gl.uniform1f(U.S, f.stretch || 1);
    gl.uniform1f(U.B, f.burst ?? 1);
    gl.uniform3f(U.M, r[0], r[1], r[2]);
    gl.uniform3f(U.E, r[3], r[4], r[5]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---- The two hero flames share one canvas over the stage (.stage__gl).
     Each one draws in its own side of it, split halfway between the two. ---- */
  const cv = document.createElement("canvas");
  const g = make(cv);
  if (!g) { stage.classList.add("no-gl"); return; }
  const fires = [...stage.querySelectorAll(".orb")].map((orb) => ({ orb, ice: !!orb.closest(".flame--ice"), heat: 0, time: 2 }));
  const wait = () => {
    if (!g.ready()) return requestAnimationFrame(wait);
    if (g.init()) start(); else stage.classList.add("no-gl");
  };
  wait();

  function start() {
    let q = 1; // resolution; drops on devices that can't keep up (see tick)
    fires.forEach((f) => {
      f.ramp = getComputedStyle(f.orb).getPropertyValue("--gl").trim().split(/\s+/).map(Number);
      f.orb.classList.add("has-gl");
    });
    cv.className = "stage__gl";
    cv.setAttribute("aria-hidden", "true");
    // The flames drop in (see Intro), so the hands start empty and unlit.
    if (!reduce) {
      fires.forEach((f) => (f.dy = 1e5));
      stage.style.transition = "none";
      stage.style.setProperty("--fire-a", "0");
      stage.style.setProperty("--ice-a", "0");
      getComputedStyle(stage).opacity;
      stage.style.transition = "";
    }
    stage.append(cv);
    // Where each core is, measured where the browser has just laid out the page.
    const fit = () => {
      const box = cv.getBoundingClientRect();
      const at = fires.map((f) => f.orb.getBoundingClientRect());
      const d = g.size(box.width, box.height, 1.5, q);
      fires.forEach((f, i) => {
        const o = at[i];
        f.unit = o.width / 2 * d;
        f.cx = (o.left + o.width / 2 - box.left) * d;
        f.cy = (box.bottom - o.top - o.height / 2) * d;
      });
      fires.sort((a, b) => a.cx - b.cx).forEach((f, i, all) => {
        f.x0 = i ? Math.round((all[i - 1].cx + f.cx) / 2) : 0;
        f.x1 = i < all.length - 1 ? Math.round((f.cx + all[i + 1].cx) / 2) : cv.width;
      });
    };
    const render = () => fires.forEach((f) => draw(g, f, f.x0, f.x1));
    // Draw before the next paint, so the flames never blink out.
    new ResizeObserver(() => { fit(); render(); }).observe(cv);
    if (reduce) return;

    /* ---- One loop for everything: runs while the flames are on screen or the
       cursor burns, and never in a background tab ---- */
    let raf = 0, last = 0, onStage = true, burn = null, frames = 0, slow = 0;
    const tick = (now) => {
      const gap = last ? now - last : 0;
      const dt = Math.min(gap / 1000, 0.05);
      last = now;
      // Frames 30 to 90 on screen, once the page has loaded: if they average
      // under 50 per second, the chip can't keep up, so draw the hero flames at
      // 60% resolution from then on.
      if (onStage && !intro && gap && q === 1 && document.readyState === "complete" && ++frames > 30) {
        slow += gap;
        if (frames === 90 && slow / 60 > 20) { q = 0.6; fit(); }
      }
      if (intro) drop(now);
      if (fizz) fizzle(now);
      if (onStage) {
        fires.forEach((f) => {
          const hot = f.orb.matches(":hover") || f.orb.classList.contains("is-open") ? 1 : 0;
          // Build up slowly (~1.5s), fall back fast (~0.25s).
          f.heat += (hot - f.heat) * Math.min(dt * (hot > f.heat ? 2 : 14), 1);
          // Each fire keeps its own clock, so heat changes speed, never jumps time.
          f.time += dt * (1 + 0.3 * f.heat);
        });
        render();
      }
      const lit = burn ? burn(now, dt) : false;
      raf = (onStage || lit) && !document.hidden ? requestAnimationFrame(tick) : (last = 0);
    };
    const wake = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); };

    /* ---- Intro. With a mouse, the first time it enters the photo (or a key
       reaches a flame), the fire drops in from above the window, the ice right
       behind it; the hands have to be in view too, or it waits for them. Without
       a mouse, it happens when the hands come into view. They fall fast,
       speeding up like anything dropped, and trail a tail as they go. Each one
       explodes as it lands: the flame swells and flares, sparks burst out, a
       ring flies off, the light on the hand flashes and the photo jolts.
       While they fall, the canvas reaches up to the top of the window. ---- */
    const WAIT = 0.08, LAG = 0.22, BURST = 0.9; // seconds
    const mouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let intro = null, landed = false, then = null; // then: what waits for the landing
    const land = (f) => {
      const v = f.ice ? "--ice-a" : "--fire-a";
      stage.style.transition = "none";
      stage.style.setProperty(v, "1.8");
      getComputedStyle(stage).getPropertyValue(v); // flash now, then fade to normal
      stage.style.transition = "";
      stage.style.removeProperty(v);
      const ring = document.createElement("span");
      ring.className = "blast";
      ring.addEventListener("animationend", () => ring.remove());
      f.orb.append(ring);
      stage.animate([{ transform: "none" }, { transform: `translateY(${f.ice ? 3 : 5}px)` }, { transform: "none" }],
        { duration: 300, easing: "cubic-bezier(.2,.8,.3,1)" });
    };
    const drop = (now) => {
      if (!intro.at) intro.at = now;
      const t = (now - intro.at) / 1000 - WAIT;
      let busy = false;
      fires.forEach((f) => {
        const s = t - (f.ice ? LAG : 0);
        if (s < 0) { busy = true; return; }
        if (s < f.fall) {
          const k = s / f.fall;
          f.dy = f.dy0 * (1 - k * k);
          f.stretch = 1 + 1.6 * k;
          f.grow = 0.9;
          f.boom = 0.6;
          busy = true;
          return;
        }
        const l = s - f.fall;
        if (!f.landed) { f.landed = true; land(f); }
        f.dy = 0;
        f.stretch = 1;
        if (l < BURST) {
          f.grow = 1 + 0.75 * (l < 0.06 ? l / 0.06 : Math.exp(-(l - 0.06) * 7));
          f.boom = 3 * Math.exp(-l * 5);
          f.burst = l / BURST;
          busy = true;
        } else f.grow = f.boom = f.burst = undefined;
      });
      if (!busy) {
        intro = null;
        landed = true;
        cv.style.height = cv.style.transform = "";
        if (then) then(); else relight();
      }
    };
    const begin = () => {
      const r = cv.getBoundingClientRect(), d = cv.width / r.width;
      // Reach up to the top of the window. A transform, not top, so it's no layout shift.
      const ext = Math.max(0, Math.ceil(r.top));
      if (ext) { cv.style.height = `calc(6 * var(--orb) + ${ext}px)`; cv.style.transform = `translateY(${-ext}px)`; }
      fires.forEach((f) => {
        const o = f.orb.getBoundingClientRect();
        // Start 1.5 ball-radii above the window; the longer the fall, the longer it takes.
        const dist = o.top + o.height / 2 + o.width * 0.75;
        f.dy0 = dist * d;
        f.fall = 0.16 + 0.011 * Math.sqrt(Math.max(dist, 0));
      });
      intro = { at: 0 };
      wake();
    };
    // again: after a douse, the mouse has to come back onto the photo, even
    // if it is already on it.
    const watch = (again) => {
      let seen = false, near = !mouse, done = false;
      const go = () => {
        if (done || !seen || !near) return;
        done = true;
        io.disconnect();
        stage.removeEventListener("pointerenter", enter);
        stage.removeEventListener("focusin", enter);
        begin();
      };
      const enter = (e) => { if (e.pointerType !== "touch") { near = true; go(); } };
      // Seen: the whole fire ball is on screen.
      const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; go(); }, { threshold: 1 });
      io.observe(fires.find((f) => !f.ice).orb);
      if (mouse) {
        stage.addEventListener("pointerenter", enter);
        stage.addEventListener("focusin", enter);
        near = !again && stage.matches(":hover"); // already on the photo when the page finished loading
      }
    };
    if (document.readyState === "complete") watch(); else addEventListener("load", () => watch(), { once: true });

    /* ---- Douse, a secret: press X anywhere on the page (not in a form
       field) and both flames go out. Each flares once, sputters and shrinks
       into a thin wisp, a puff of smoke rises (.blast--smoke in styles.css),
       the light on the hands fades and a burning cursor goes out too. Then
       the hands wait empty, and the flames drop in again the next time the
       mouse enters the photo (without a mouse: right away). ---- */
    const KEY = "x", FIZZ = 0.7; // seconds
    let fizz = null, quench = null; // quench: puts out the cursor, once it exists
    const douse = () => {
      if (!landed || intro || fizz) return;
      landed = false;
      fizz = { at: 0 };
      if (quench) quench();
      fires.forEach((f) => {
        f.landed = false;
        const puff = document.createElement("span");
        puff.className = "blast blast--smoke";
        puff.addEventListener("animationend", () => puff.remove());
        f.orb.append(puff);
      });
      stage.style.setProperty("--fire-a", "0");
      stage.style.setProperty("--ice-a", "0");
      wake();
    };
    const fizzle = (now) => {
      if (!fizz.at) fizz.at = now;
      const k = Math.min((now - fizz.at) / 1000 / FIZZ, 1);
      fires.forEach((f) => {
        const flare = 1 + 0.3 * Math.sin(Math.min(k * 5, 1) * Math.PI);
        const sputter = 1 + 0.12 * Math.sin(k * 55 + (f.ice ? 2 : 0));
        f.grow = Math.max(0.02, flare * sputter * (1 - k) ** 1.6);
        f.stretch = 1 + 2.2 * k;
      });
      if (k < 1) return;
      fizz = null;
      fires.forEach((f) => { f.dy = 1e5; f.grow = f.stretch = undefined; });
      watch(true);
    };
    addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key.toLowerCase() === KEY) douse();
    });
    // Back in the hands with the mouse already on a flame: light the cursor
    // as if the mouse had just arrived.
    // Mouse only: a touched flame stays :hover on phones, and would light up.
    const relight = () => mouse && fires.forEach((f) => {
      if (f.orb.matches(":hover")) f.orb.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
    });

    /* ---- Burning cursor. Hover a flame and the cursor turns into a flame of
       that color, fully alight after 1 s; its core is where clicks land. It then
       grows with every second of hover, up to 5× at 5 s. It keeps burning 3 s for
       every second of hover (30 s at most), then goes out within 1 s and the
       normal cursor comes back. Its light shows the wall behind the page. On
       touch screens, holding a flame does the same with the finger (see Tap
       and hold). ---- */
    const PER = 3, MAX = 30000, OUT = 1000, GROW = 5;
    // Touch: how far above the finger the flame burns (px), so the finger
    // doesn't hide it, how big it may grow on a small screen, and how fast it
    // goes out once the finger lets go (ms).
    const LIFT = 60, GROW_TOUCH = 3, OUT_TOUCH = 350;
    // Touch only: the strips at the bottom and top that scroll while a finger
    // holds the flame there: their height (px, at most a quarter of the
    // window) and the speed at the window's edge (px/s), from 0 at the
    // strip's inner edge.
    const EDGE = 170, CRAWL = 260;
    /* Easter eggs on the wall: what the orange flame shows broken, the blue
       flame shows fixed, in the same spot. Most hide around the flames, a few
       further down. [where, broken, fixed]; where = spot + "-l" or "-r" (the
       column's left or right edge):
         top   beside the small line above the headline
         cap   beside "One hand breaks it. The other fixes it."
         hand  below the hands, beside the arms
         s2    the empty band above section 2 (0 = the first after the hero) */
    // The spots beside the caption and the hands are the tightest: short lines go there.
    const EGGS = [
      ["top-l", "// TODO: fix before launch", "// fixed before launch"],
      ["top-r", '"it works on my machine"', '"it works on every machine"'],
      ["cap-l", "Tests: 0 passed", "Tests: 142 passed"],
      ["cap-r", "WHERE id = ${input}", "WHERE id = $1"],
      ["hand-l", "catch (e) {}", "catch (e) { report(e) }"],
      ["hand-r", "if (user.isAdmin || true)", "if (user.isAdmin)"],
      ["s2-l", 'const key = "sk_live_…"', "const key = env.STRIPE_KEY"],
      ["s4-r", "500 Internal Server Error", "200 OK"],
    ];
    const ICON = {
      bug: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><ellipse cx="8" cy="9.5" rx="3.4" ry="4.4"/><path d="M8 5.5v8.5M6.2 5 4.8 3.2M9.8 5l1.4-1.8M4.6 8H2.2M4.8 11.2l-2 1.4M11.4 8h2.4M11.2 11.2l2 1.4"/></svg>',
      fix: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.6 6.4 12 13.2 4.4"/></svg>',
    };
    const cursor = (c) => {
      const wall = document.createElement("div");
      const paper = document.createElement("div");
      const eggs = document.createElement("div");
      wall.className = "wall";
      paper.className = "wall__paper";
      eggs.className = "wall__eggs";
      c.cv.className = "cursor-fire";
      wall.setAttribute("aria-hidden", "true");
      c.cv.setAttribute("aria-hidden", "true");
      const egg = EGGS.map(([where, broken, fixed]) => {
        const el = document.createElement("div");
        el.className = where.endsWith("-r") ? "egg egg--end" : "egg";
        [["bug", broken], ["fix", fixed]].forEach(([k, text]) => {
          const face = document.createElement("span");
          face.className = "egg__" + k;
          face.innerHTML = ICON[k];
          face.append(text);
          el.append(face);
        });
        return eggs.appendChild(el);
      });
      // Put each egg at its spot, on the column's left or right edge, in page
      // coordinates. An egg that doesn't fit its spot at this width stays
      // hidden rather than run into the page. Again whenever the page resizes.
      const place = () => {
        const q = (s) => document.querySelector(s);
        const col = q("main .wrap"), cap = q(".hero__caption"), top = q(".hero__eyebrow"), orb = q(".orb");
        if (!col) return;
        const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY }; };
        const cs = getComputedStyle(col), c = box(col);
        const L = c.l + parseFloat(cs.paddingLeft), R = c.r - parseFloat(cs.paddingRight);
        const secs = document.querySelectorAll("main > .section, main > .contact");
        // Around the photo the eggs may reach into the margin, up to 26 px from
        // the window's edge, so more of them fit on small laptops.
        const HL = Math.max(26, L - 48), HR = Math.min(document.documentElement.clientWidth - 26, R + 48);
        // A spot: [y, left edge, right edge, room from the left edge, room from the right edge].
        const beside = (b) => [(b.t + b.b) / 2, HL, HR, b.l - 24 - HL, HR - b.r - 24];
        const spot = (z) => {
          if (z === "top" && top) return beside(box(top));
          if (z === "cap" && cap) return beside(box(cap));
          if (z === "hand" && orb) {
            // The arms reach about a tenth of the photo's width in from its sides.
            const s = box(stage), o = box(orb), w = (s.r - s.l) * 0.1;
            return [(o.b + s.b) / 2, HL, HR, s.l + w - 16 - HL, HR - s.r + w - 16];
          }
          const sec = z[0] === "s" && secs[+z.slice(1)];
          if (!sec) return null;
          return [box(sec).t + parseFloat(getComputedStyle(sec).paddingTop) * 0.45, L, R, Infinity, Infinity];
        };
        EGGS.forEach(([where], i) => {
          const [z, side] = where.split("-"), s = spot(z), el = egg[i];
          el.hidden = !s;
          if (!s) return;
          const right = side === "r";
          el.style.left = `${right ? s[2] : s[1]}px`;
          el.style.top = `${s[0]}px`;
          // The label's 10 px padding hangs outside the edge, so it doesn't count.
          el.hidden = el.offsetWidth - 10 > (right ? s[4] : s[3]);
        });
      };
      wall.append(paper, eggs);
      document.body.append(wall, c.cv);
      place(); // in the page first, so the eggs have a width to measure
      new ResizeObserver(place).observe(document.body);
      const cf = { heat: 0, time: 2, ramp: fires[0].ramp };
      const fitc = (w, h, max) => { c.size(w, h, max); cf.cx = c.cv.width / 2; cf.cy = c.cv.height / 3; cf.unit = c.cv.width / 10; };
      fitc(120, 144, 1.5);

      const root = document.documentElement;
      let x = 0, y = 0, px = 0, v = 0, lean = 0, away = false, hidden = false;
      let from = 0, a = 0, held = 0, until = 0, m = 1, grown = 1, res = 1, sv = 0, sy = 0;
      // touch: lit by a finger; down: the finger is still on the screen; fy: the finger's height.
      let touch = false, down = false, fy = 0;
      // Hide the normal cursor only while the flame is big enough to aim with.
      const hide = (on) => { if (on !== hidden) root.classList.toggle("is-burning", (hidden = on)); };
      addEventListener("pointermove", (e) => {
        if (e.pointerType === "mouse") { x = e.clientX; y = e.clientY; away = false; }
      }, { passive: true });
      document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) away = true; });

      // Catch flame f, or let it go and let it burn down.
      const light = (f) => {
        from = performance.now();
        held = a; grown = m; // a cursor that is still burning carries on from where it is
        cf.ramp = f.ramp;
        wall.dataset.flame = f.ice ? "ice" : "fire";
        wake();
      };
      const unlight = () => {
        if (!from) return;
        const now = performance.now();
        until = Math.max(until, now + Math.min((now - from) * PER, MAX));
        held = a; grown = m;
        from = 0;
      };
      fires.forEach((f) => {
        f.orb.addEventListener("pointerenter", (e) => {
          // No flame in the hands (doused, or still falling), nothing to catch.
          if (e.pointerType !== "mouse" || !landed || down) return;
          touch = false;
          light(f);
        });
        f.orb.addEventListener("pointerleave", () => { if (!down) unlight(); });
      });
      // What Tap and hold drives: the flame burns LIFT px above the finger.
      const at = (X, Y) => { x = X; y = Y - LIFT; fy = Y; };
      tc = {
        start(f, X, Y) { touch = down = true; away = false; at(X, Y); px = x; v = 0; light(f); },
        move: at,
        // Let go: it goes out at once, shrinking as it fades (OUT_TOUCH).
        end() { down = false; from = 0; until = performance.now(); held = a; grown = m; },
      };

      /* Touch only, while the finger is on the screen (a mouse just moves the
         flame; the wheel scrolls). Near the bottom, scroll down; near the top,
         up. The finger counts, not the flame above it. The speed follows a
         smooth curve from 0 at the strip's inner edge to CRAWL at the window's
         edge, and the page eases into it and out of it (about 0.3 s), so it
         never starts or stops with a jerk. sy is where the page should be, in
         fractions of a pixel; it moves in device pixels, which keeps slow
         speeds smooth on sharp screens. */
      const scrollEdges = (dt) => {
        const edge = Math.min(EDGE, innerHeight / 4);
        const deep = Math.max(fy - (innerHeight - edge), 0) / edge - Math.max(edge - fy, 0) / edge; // -1 top … 1 bottom
        const live = touch && down && a > 0.25;
        const k = Math.min(Math.abs(deep), 1), want = live ? Math.sign(deep) * CRAWL * k * k * (3 - 2 * k) : 0;
        sv += (want - sv) * Math.min(dt * 7, 1);
        if (Math.abs(sv) < 0.5 && !want) { sv = 0; return; }
        if (Math.abs(scrollY - sy) > 2) sy = scrollY; // first frame, or the visitor scrolled
        const end = document.documentElement.scrollHeight - innerHeight;
        sy = Math.max(0, Math.min(end, sy + sv * dt));
        if (sy === 0 || sy === end) sv = 0;
        const px = Math.round(sy * devicePixelRatio) / devicePixelRatio;
        if (px !== scrollY) scrollTo({ top: px, behavior: "instant" });
      };

      // Doused: stop feeding it, so it goes out within OUT.
      quench = () => { from = 0; until = Math.min(until, performance.now()); held = a; grown = m; };

      burn = (now, dt) => {
        const d = from ? (now - from) / 1000 : 0;
        // a: how alight the cursor is, 0 to 1. m: how big it has grown, 1× to 5×.
        const out = touch ? OUT_TOUCH : OUT;
        a = from ? Math.max(held, 1 - (1 - Math.min(d, 1)) ** 2)
          : now < until ? held
          : now < until + out ? held * (1 - (now - until) / out)
          : 0;
        m = from ? Math.max(grown, Math.min(Math.max(d, 1), touch ? GROW_TOUCH : GROW)) : grown;
        hide(!away && a > 0.25);
        if (!a) { m = grown = 1; c.cv.style.opacity = wall.style.opacity = 0; return false; }
        scrollEdges(dt);
        // Stay sharp as it grows: more pixels per step, at 1 per CSS pixel past 2×.
        if (Math.ceil(m) !== res) { res = Math.ceil(m); fitc(120 * res, 144 * res, res > 2 ? 1 : 1.5); }
        // Lean the flame away from the way the mouse moves.
        if (dt) v += ((x - px) / dt - v) * Math.min(dt * 10, 1);
        px = x;
        lean += (Math.max(-30, Math.min(30, v * 0.025)) - lean) * Math.min(dt * 12, 1);
        cf.heat = a;
        cf.time += dt * (1 + 0.3 * a);
        draw(c, cf);
        const on = away ? 0 : 1;
        const t = now / 1000;
        c.cv.style.transform = `translate3d(${x}px,${y}px,0) skewX(${lean.toFixed(2)}deg) scale(${(m * (0.1 + 0.9 * a)).toFixed(3)})`;
        c.cv.style.opacity = on * Math.min(1, a * 2);
        // The light grows with the flame; the paper scales back the other way so it stays put.
        const k = 1 + (m - 1) * 0.3, ly = y - 6 * m;
        wall.style.transform = `translate3d(${x}px,${ly}px,0) scale(${k.toFixed(3)})`;
        paper.style.transform = `scale(${(1 / k).toFixed(4)}) translate3d(${-x}px,${-ly}px,0)`;
        // The eggs scroll with the page; the paper stays with the window.
        eggs.style.transform = `scale(${(1 / k).toFixed(4)}) translate3d(${-x}px,${-ly - scrollY}px,0)`;
        wall.style.opacity = on * a * (0.88 + 0.07 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29 + 1));
        return true;
      };
    };

    new IntersectionObserver(([e]) => { onStage = e.isIntersecting; wake(); }).observe(stage);
    document.addEventListener("visibilitychange", wake);

    /* ---- Tap and hold (touch screens): the burning cursor for a finger.
       Hold a flame for HOLD ms and a flame of that color lights just above the
       finger. It follows the finger, the page stops scrolling under it, and
       holding it near the top or bottom of the screen scrolls the page
       (EDGE, CRAWL). Let go and it goes out, shrinking as it fades. A quick
       tap still opens the skills, and a swipe that starts on a flame still
       scrolls. ---- */
    const HOLD = 400; // ms
    let hold = null, tc = null, swallow = 0; // tc: the cursor's touch controls, once it exists
    const letGo = () => {
      if (!hold) return;
      clearTimeout(hold.timer);
      // The tap a hold ends with mustn't open the skills.
      if (hold.on) { if (tc) tc.end(); swallow = performance.now() + 600; }
      hold = null;
    };
    fires.forEach((f) => {
      f.orb.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" || !landed || hold) return;
        arm(); // the hold covers the time the context takes
        const h = (hold = { f, id: e.pointerId, x: e.clientX, y: e.clientY, on: false });
        h.timer = setTimeout(() => { h.on = true; if (tc) tc.start(h.f, h.x, h.y); }, HOLD);
      });
      // Once lit, the finger moves the flame, not the page. Only on the flames:
      // a touchmove listener that can cancel makes every scroll it covers wait.
      f.orb.addEventListener("touchmove", (e) => { if (hold && hold.on) e.preventDefault(); }, { passive: false });
      f.orb.addEventListener("contextmenu", (e) => { if (hold) e.preventDefault(); });
    });
    addEventListener("pointermove", (e) => {
      if (!hold || e.pointerId !== hold.id) return;
      // Moved before it lit: a swipe, so leave it to the page.
      if (!hold.on) { if (Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) letGo(); return; }
      hold.x = e.clientX; hold.y = e.clientY;
      if (tc) tc.move(hold.x, hold.y);
    }, { passive: true });
    addEventListener("pointerup", (e) => { if (hold && e.pointerId === hold.id) letGo(); });
    addEventListener("pointercancel", (e) => { if (hold && e.pointerId === hold.id) letGo(); });
    addEventListener("click", (e) => {
      if (performance.now() > swallow || !e.target.closest || !e.target.closest(".orb")) return;
      swallow = 0;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);

    // The cursor's context is made the first time a mouse enters the stage, or
    // a finger touches a flame: most visitors never hover a flame, and a
    // context takes up to 130 ms to make. The cursor fades in over a second,
    // which hides the wait. Its canvas gets its size first, so it is allocated
    // once. The same mouse starts the intro, so the cursor waits until the
    // flames have landed: making it mid-fall would stutter the drop.
    let armed = false;
    if (mouse) stage.addEventListener("pointerenter", () => {
      if (!landed) { then = arm; return; }
      arm();
    }, { once: true });
    function arm() {
      then = null;
      if (armed) return;
      armed = true;
      const ccv = document.createElement("canvas");
      const d = Math.min(devicePixelRatio || 1, 1.5);
      ccv.width = Math.round(120 * d); ccv.height = Math.round(144 * d);
      const c = make(ccv);
      const go = () => {
        if (!c.ready()) return requestAnimationFrame(go);
        if (!c.init()) return;
        cursor(c);
        relight(); // already on a flame by now?
        if (hold && hold.on) tc.start(hold.f, hold.x, hold.y); // a finger held on while it was made
      };
      if (c) go();
    }
  }
})();
