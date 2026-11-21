/* WebGL fire for the two hero flames, and the burning cursor. script.js loads
   this once the page is done: nothing here is content. Reduced motion draws one
   still frame and skips the cursor; without WebGL the CSS fireballs stay. */
(() => {
  const stage = document.querySelector("[data-stage]");
  if (!stage) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

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
gl_FragColor=vec4(o,max(o.r,max(o.g,o.b)));}`;
  // Alpha = brightness. The hero canvases have no alpha channel and blend with
  // screen; the cursor canvas keeps it, so the flame still shows on white buttons.

  /* ---- One fire = one canvas with its own WebGL context ---- */
  const make = (cv, alpha = false) => {
    const gl = cv.getContext("webgl", { alpha, antialias: false, powerPreference: "low-power" });
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
    return {
      cv, gl, R: u("R"), T: u("T"), H: u("H"), heat: 0, time: 2,
      // "--gl" ramp: R G B multipliers, then R G B exponents
      color(v) { gl.uniform3f(u("M"), v[0], v[1], v[2]); gl.uniform3f(u("E"), v[3], v[4], v[5]); },
      size(w, h, max = 1.5) {
        const d = Math.min(devicePixelRatio || 1, max);
        cv.width = w * d; cv.height = h * d;
        gl.viewport(0, 0, cv.width, cv.height);
      },
    };
  };
  const draw = (f) => {
    const { gl } = f;
    gl.uniform2f(f.R, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(f.T, f.time);
    gl.uniform1f(f.H, f.heat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /* ---- The two hero flames ---- */
  const fires = [...stage.querySelectorAll(".orb")].map((orb) => {
    const f = make(document.createElement("canvas"));
    if (!f) return null;
    f.orb = orb;
    f.ice = !!orb.closest(".flame--ice");
    f.ramp = getComputedStyle(orb).getPropertyValue("--gl").trim().split(/\s+/).map(Number);
    f.color(f.ramp);
    f.cv.className = "orb__gl";
    orb.querySelector(".orb__fire").appendChild(f.cv);
    orb.classList.add("has-gl");
    // Draw before the next paint, so the flame never blinks out.
    new ResizeObserver(() => { f.size(f.cv.clientWidth, f.cv.clientHeight); draw(f); }).observe(f.cv);
    return f;
  }).filter(Boolean);
  if (!fires.length || reduce) return;

  /* ---- One loop for everything: runs while the flames are on screen or the
     cursor burns, and never in a background tab ---- */
  let raf = 0, last = 0, onStage = true, burn = null;
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (onStage) fires.forEach((f) => {
      const hot = f.orb.matches(":hover") || f.orb.classList.contains("is-open") ? 1 : 0;
      // Build up slowly (~1.5s), fall back fast (~0.25s).
      f.heat += (hot - f.heat) * Math.min(dt * (hot > f.heat ? 2 : 14), 1);
      // Each fire keeps its own clock, so heat changes speed, never jumps time.
      f.time += dt * (1 + 0.3 * f.heat);
      draw(f);
    });
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
  const c = matchMedia("(hover: hover) and (pointer: fine)").matches && make(document.createElement("canvas"), true);
  if (c) {
    const wall = document.createElement("div");
    const paper = document.createElement("div");
    wall.className = "wall";
    paper.className = "wall__paper";
    c.cv.className = "cursor-fire";
    wall.setAttribute("aria-hidden", "true");
    c.cv.setAttribute("aria-hidden", "true");
    wall.append(paper);
    document.body.append(wall, c.cv);
    c.size(120, 144);

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
        c.color(f.ramp);
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
      if (Math.ceil(m) !== res) { res = Math.ceil(m); c.size(120 * res, 144 * res, res > 2 ? 1 : 1.5); }
      // Lean the flame away from the way the mouse moves.
      if (dt) v += ((x - px) / dt - v) * Math.min(dt * 10, 1);
      px = x;
      lean += (Math.max(-30, Math.min(30, v * 0.025)) - lean) * Math.min(dt * 12, 1);
      c.heat = a;
      c.time += dt * (1 + 0.3 * a);
      draw(c);
      const on = away ? 0 : 1;
      const t = now / 1000;
      c.cv.style.transform = `translate3d(${x}px,${y}px,0) skewX(${lean.toFixed(2)}deg) scale(${(m * (0.1 + 0.9 * a)).toFixed(3)})`;
      c.cv.style.opacity = on * Math.min(1, a * 2);
      // The light grows with the flame; the paper scales back the other way so it stays put.
      const k = 1 + (m - 1) * 0.3, ly = y - 6 * m;
      wall.style.transform = `translate3d(${x}px,${ly}px,0) scale(${k.toFixed(3)})`;
      paper.style.transform = `scale(${(1 / k).toFixed(4)}) translate3d(${-x}px,${-ly}px,0)`;
      wall.style.opacity = on * a * (0.88 + 0.07 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29 + 1));
      return true;
    };
  }

  new IntersectionObserver(([e]) => { onStage = e.isIntersecting; wake(); }).observe(stage);
  document.addEventListener("visibilitychange", wake);
})();
