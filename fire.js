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
  const FS = `precision highp float;
uniform vec2 C;uniform float U,T,H;uniform vec3 M,E;
float h(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f*=f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+1.),f.x),f.y),f.z);}
float b(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+.17;a*=.5;}return v;}
vec3 ramp(float x){return M*pow(vec3(clamp(x,0.,1.)),E);}
float hs(float s){return fract(sin(s*91.7)*43758.5);}
void main(){
vec2 p0=(gl_FragCoord.xy-C)/U;
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
        this.U = { C: u("C"), U: u("U"), T: u("T"), H: u("H"), M: u("M"), E: u("E") };
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
  // R G B multipliers, then R G B exponents.
  const draw = (g, f, x0 = 0, x1 = g.cv.width) => {
    const { gl, U } = g, r = f.ramp;
    gl.scissor(x0, 0, x1 - x0, g.cv.height);
    gl.uniform2f(U.C, f.cx, f.cy);
    gl.uniform1f(U.U, f.unit);
    gl.uniform1f(U.T, f.time);
    gl.uniform1f(U.H, f.heat);
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
      if (onStage && gap && q === 1 && document.readyState === "complete" && ++frames > 30) {
        slow += gap;
        if (frames === 90 && slow / 60 > 20) { q = 0.6; fit(); }
      }
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

    /* ---- Burning cursor. Hover a flame and the cursor turns into a flame of
       that color, fully alight after 1 s; its core is where clicks land. It then
       grows with every second of hover, up to 5× at 5 s. It keeps burning 3 s for
       every second of hover (30 s at most), then goes out within 1 s and the
       normal cursor comes back. Its light shows the wall behind the page. Mouse only. ---- */
    const PER = 3, MAX = 30000, OUT = 1000, GROW = 5;
    /* Easter eggs on the wall: what the orange flame shows broken, the blue
       flame shows fixed, in the same spot. Each sits in the empty band above a
       section: [which section, 0 = left / 1 = right, broken, fixed]. */
    const EGGS = [
      [0, 0, "// TODO: fix before launch", "// fixed before launch"],
      [1, 1, 'const key = "sk_live_…"', "const key = env.STRIPE_KEY"],
      [2, 0, "500 Internal Server Error", "200 OK"],
      [2, 1, '"it works on my machine"', '"it works on every machine"'],
      [3, 1, "WHERE id = ${input}", "WHERE id = $1"],
      [4, 0, "if (user.isAdmin || true)", "if (user.isAdmin)"],
      [5, 1, "catch (e) {}", "catch (e) { report(e) }"],
      [6, 0, "Tests: 0 passed", "Tests: 142 passed"],
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
      const egg = EGGS.map(([, side, broken, fixed]) => {
        const el = document.createElement("div");
        el.className = side ? "egg egg--end" : "egg";
        [["bug", broken], ["fix", fixed]].forEach(([k, text]) => {
          const face = document.createElement("span");
          face.className = "egg__" + k;
          face.innerHTML = ICON[k];
          face.append(text);
          el.append(face);
        });
        return eggs.appendChild(el);
      });
      // Put each egg in the middle of the band above its section, at the
      // column's left or right edge. Again whenever the page changes size.
      const place = () => {
        const secs = document.querySelectorAll("main > .section, main > .contact");
        const col = document.querySelector("main .wrap");
        if (!col) return;
        const r = col.getBoundingClientRect(), cs = getComputedStyle(col);
        const left = r.left + parseFloat(cs.paddingLeft);
        const width = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        EGGS.forEach(([s, side], i) => {
          const sec = secs[s];
          egg[i].hidden = !sec;
          if (!sec) return;
          const pad = parseFloat(getComputedStyle(sec).paddingTop);
          egg[i].style.left = `${left + side * width}px`;
          egg[i].style.top = `${sec.getBoundingClientRect().top + scrollY + pad * 0.45}px`;
        });
      };
      place();
      new ResizeObserver(place).observe(document.body);
      wall.append(paper, eggs);
      document.body.append(wall, c.cv);
      const cf = { heat: 0, time: 2, ramp: fires[0].ramp };
      const fitc = (w, h, max) => { c.size(w, h, max); cf.cx = c.cv.width / 2; cf.cy = c.cv.height / 3; cf.unit = c.cv.width / 10; };
      fitc(120, 144, 1.5);

      const root = document.documentElement;
      let x = 0, y = 0, px = 0, v = 0, lean = 0, away = false, hidden = false;
      let from = 0, a = 0, held = 0, until = 0, m = 1, grown = 1, res = 1;
      // Hide the normal cursor only while the flame is big enough to aim with.
      const hide = (on) => { if (on !== hidden) root.classList.toggle("is-burning", (hidden = on)); };
      addEventListener("pointermove", (e) => {
        if (e.pointerType === "mouse") { x = e.clientX; y = e.clientY; away = false; }
      }, { passive: true });
      document.addEventListener("mouseout", (e) => { if (!e.relatedTarget) away = true; });

      fires.forEach((f) => {
        f.orb.addEventListener("pointerenter", (e) => {
          if (e.pointerType !== "mouse") return;
          from = performance.now();
          held = a; grown = m; // a cursor that is still burning carries on from where it is
          cf.ramp = f.ramp;
          wall.dataset.flame = f.ice ? "ice" : "fire";
          wake();
        });
        f.orb.addEventListener("pointerleave", () => {
          if (!from) return;
          const now = performance.now();
          until = Math.max(until, now + Math.min((now - from) * PER, MAX));
          held = a; grown = m;
          from = 0;
        });
      });

      burn = (now, dt) => {
        const d = from ? (now - from) / 1000 : 0;
        // a: how alight the cursor is, 0 to 1. m: how big it has grown, 1× to 5×.
        a = from ? Math.max(held, 1 - (1 - Math.min(d, 1)) ** 2)
          : now < until ? held
          : now < until + OUT ? held * (1 - (now - until) / OUT)
          : 0;
        m = from ? Math.max(grown, Math.min(Math.max(d, 1), GROW)) : grown;
        hide(!away && a > 0.25);
        if (!a) { m = grown = 1; c.cv.style.opacity = wall.style.opacity = 0; return false; }
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

    // The cursor's context is made the first time a mouse enters the stage:
    // most visitors never hover a flame, and a context takes up to 130 ms to
    // make. The cursor fades in over a second, which hides the wait. Its canvas
    // gets its size first, so it is allocated once.
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) stage.addEventListener("pointerenter", () => {
      const ccv = document.createElement("canvas");
      const d = Math.min(devicePixelRatio || 1, 1.5);
      ccv.width = Math.round(120 * d); ccv.height = Math.round(144 * d);
      const c = make(ccv);
      const go = () => {
        if (!c.ready()) return requestAnimationFrame(go);
        if (!c.init()) return;
        cursor(c);
        // Already on a flame by now? Light up as if the mouse had just arrived.
        fires.forEach((f) => { if (f.orb.matches(":hover")) f.orb.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" })); });
      };
      if (c) go();
    }, { once: true });
  }
})();
