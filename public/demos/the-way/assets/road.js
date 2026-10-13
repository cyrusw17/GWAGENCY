// Hero scene: the road from the logo, running toward the cross at sunrise. three.js loads after the page
// is idle so the headline paints first; phones get fewer particles and a lower pixel ratio; the scene
// pauses off-screen and draws a single still frame for reduced motion.
const canvas = document.querySelector(".hero canvas");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const small = matchMedia("(max-width: 760px)").matches;

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

async function start() {
  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js");
  const hero = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1206, 18, 96);
  const camera = new THREE.PerspectiveCamera(small ? 62 : 52, 1, 0.1, 200);
  camera.position.set(0, 1.55, 6);

  // Road: asphalt with gold edge lines and white center dashes, drawn once to a small canvas
  const tex = (() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#0c0a09"; g.fillRect(0, 0, 128, 256);
    g.fillStyle = "#f5b301"; g.fillRect(6, 0, 5, 256); g.fillRect(117, 0, 5, 256);
    g.fillStyle = "#fff6dc"; g.fillRect(61, 20, 6, 110);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 14);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 140), new THREE.MeshBasicMaterial({ map: tex }));
  road.rotation.x = -Math.PI / 2; road.position.z = -62;
  scene.add(road);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshBasicMaterial({ color: 0x050403 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -60);
  scene.add(ground);

  // Light pooling on the road from the sunrise
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 140), new THREE.MeshBasicMaterial({
    map: glowTexture(THREE, [[0, "rgba(255,190,80,.55)"], [1, "rgba(255,120,20,0)"]], true),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, 0.005, -62);
  scene.add(sheen);

  // Sun disk and halo behind the cross
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE, [[0, "rgba(255,240,190,1)"], [0.18, "rgba(255,200,80,.95)"], [0.42, "rgba(255,122,24,.35)"], [1, "rgba(255,80,0,0)"]]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sun.scale.set(70, 70, 1); sun.position.set(0, 3, -110);
  scene.add(sun);

  // Mountains: two dark ridgelines, as in the logo
  const ridge = (pts, z, color) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], -1);
    for (const [x, y] of pts) s.lineTo(x, y);
    s.lineTo(pts[pts.length - 1][0], -1);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, fog: false }));
    m.position.z = z; scene.add(m); return m;
  };
  ridge([[-90, 0], [-62, 9], [-50, 5], [-38, 14], [-26, 6], [-14, 3], [-6, 0.4], [6, 0.4], [14, 4], [24, 11], [33, 6], [46, 15], [60, 7], [90, 0]], -100, 0x1c0b04);
  ridge([[-80, 0], [-52, 6], [-40, 3.5], [-28, 8], [-16, 2.2], [-7, 0.2], [7, 0.2], [18, 2.6], [30, 9], [42, 4], [56, 7.5], [80, 0]], -78, 0x0b0503);

  // The cross, standing where the road meets the light
  const cross = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd76a, fog: false });
  const v = new THREE.Mesh(new THREE.BoxGeometry(1.5, 12, 0.7), gold);
  const h = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.5, 0.7), gold);
  v.position.y = 6; h.position.y = 8.6; cross.add(v, h);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(THREE, [[0, "rgba(255,245,210,.9)"], [0.3, "rgba(255,200,80,.35)"], [1, "rgba(255,160,40,0)"]]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.set(34, 34, 1); halo.position.y = 7; cross.add(halo);
  cross.position.set(0, 0, -96);
  scene.add(cross);

  // Embers drifting up out of the dark
  const count = small ? 140 : 520;
  const pos = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 60;
    pos[i * 3 + 1] = Math.random() * 18;
    pos[i * 3 + 2] = -Math.random() * 90 + 4;
    speed[i] = 0.2 + Math.random() * 0.6;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(pg, new THREE.PointsMaterial({
    size: small ? 0.22 : 0.16, map: glowTexture(THREE, [[0, "rgba(255,230,160,1)"], [1, "rgba(255,140,30,0)"]]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffc04a,
  }));
  scene.add(embers);

  const size = () => {
    const w = hero.clientWidth, hgt = hero.clientHeight;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt; camera.updateProjectionMatrix();
  };
  size();
  addEventListener("resize", size);

  let mx = 0, my = 0;
  if (!small) addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  // Phones: tilt the camera up so the horizon and the cross sit below the headline
  const aimY = small ? 24 : 3.2;
  const clock = new THREE.Clock();
  let visible = true, raf = 0;
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const scroll = Math.min(scrollY / innerHeight, 1);
    tex.offset.y -= dt * (0.35 + scroll * 0.9);
    const p = pg.attributes.position.array;
    for (let i = 0; i < count; i++) {
      p[i * 3 + 1] += speed[i] * dt;
      p[i * 3] += Math.sin(t * 0.6 + i) * 0.004;
      if (p[i * 3 + 1] > 18) p[i * 3 + 1] = 0;
    }
    pg.attributes.position.needsUpdate = true;
    camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
    camera.position.y += (1.55 - my * 0.5 + scroll * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, aimY, -96);
    halo.material.opacity = 0.85 + Math.sin(t * 1.4) * 0.15;
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  if (reduce) { camera.lookAt(0, aimY, -96); renderer.render(scene, camera); canvas.classList.add("is-on"); return; }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  }).observe(hero);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden && hero.getBoundingClientRect().bottom > 0;
    if (visible && !raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
  canvas.classList.add("is-on");
}

// Radial (or, for the road sheen, vertical) gradient drawn to a canvas texture
function glowTexture(THREE, stops, linear = false) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = linear ? g.createLinearGradient(0, 0, 0, 128) : g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) grd.addColorStop(o, col);
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

if (canvas && hasWebGL()) {
  const go = () => start().catch(() => {});
  "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 400);
}
