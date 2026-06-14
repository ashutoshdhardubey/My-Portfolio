/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  ANTI-GRAVITY PORTFOLIO — Three.js 3D Scene
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  A cinematic, anti-gravity 3D scene featuring:
 *    • Floating curly brackets, coffee cup, data nodes
 *    • Skill orbit system (planetary rings)
 *    • Particle star-field
 *    • Mouse parallax + scroll-driven camera
 *    • Cinematic studio lighting (key/fill/rim)
 *
 *  Depends on THREE (global, loaded via CDN before this script).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/* ──────────────────────────── global scope guard ──────────────────────────── */
;(function () {
  'use strict';

  /* ============================  CONSTANTS  =============================== */
  const PARTICLE_COUNT  = 800;
  const SKILL_ITEMS     = ['Java', 'Python', 'ReactJS', 'PHP', 'SQL', 'C++', 'AWS'];
  const SKILL_COLORS    = [
    0xf89820, // Java   – orange
    0x3776ab, // Python – blue
    0x61dafb, // React  – cyan
    0x777bb4, // PHP    – purple
    0x00758f, // SQL    – teal
    0x00599c, // C++    – blue
    0xff9900, // AWS    – amber
  ];

  /* ===========================  STATE OBJECT  ============================= */
  const state = {
    renderer : null,
    scene    : null,
    camera   : null,
    clock    : null,
    container: null,
    raf      : null,

    /* interaction */
    mouse      : { x: 0, y: 0 },       // normalised –1…1
    mouseTarget: { x: 0, y: 0 },
    scrollY    : 0,
    scrollTarget: 0,

    /* groups — layered for parallax */
    heroGroup      : null,   // depth layer 1 (close, moves most)
    midGroup       : null,   // depth layer 2
    bgGroup        : null,   // depth layer 3 (far, moves least)
    skillOrbitGroup: null,
    particleSystem : null,

    /* animatable refs */
    brackets      : [],
    coffeeCup     : null,
    dataNodes     : [],
    dataLines     : null,
    floatingShapes: [],
    skillPlanets  : [],
    orbitRings    : [],
    steamParticles: null,

    /* flags */
    disposed: false,
  };

  /* ============================  UTILITIES  =============================== */

  /** Clamp a value between min and max. */
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  /** Linear interpolation. */
  const lerp = (a, b, t) => a + (a !== b ? (b - a) * t : 0);

  /** Create a smooth sine-based float offset. */
  const floatY = (time, speed, amp) => Math.sin(time * speed) * amp;

  /** Shorthand colour helper (hex int → THREE.Color). */
  const col = (hex) => new THREE.Color(hex);

  /* ═══════════════════════════════════════════════════════════════════════════
   *  1.  INIT
   * ═══════════════════════════════════════════════════════════════════════════ */
  function init(container) {
    if (!container) {
      console.error('[scene] No container element provided.');
      return;
    }
    state.container = container;
    state.disposed  = false;

    /* ─── Clock ─── */
    state.clock = new THREE.Clock();

    /* ─── Renderer ─── */
    state.renderer = new THREE.WebGLRenderer({
      antialias       : true,
      alpha           : true,
      powerPreference : 'high-performance',
    });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.toneMapping          = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure  = 1.2;
    state.renderer.outputColorSpace     = THREE.SRGBColorSpace;
    container.appendChild(state.renderer.domElement);

    /* ─── Scene ─── */
    state.scene = new THREE.Scene();
    state.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.018);   // subtle depth fog

    /* ─── Camera ─── */
    const aspect = container.clientWidth / container.clientHeight;
    state.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    state.camera.position.set(0, 0, 28);

    /* ─── Build world ─── */
    createParallaxGroups();
    createLights();
    createBrackets();
    createCoffeeCup();
    createDataNodes();
    createFloatingShapes();
    createSkillOrbit();
    createParticles();

    /* ─── Event listeners ─── */
    window.addEventListener('resize',    onResize,    { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll',    onScroll,    { passive: true });

    /* ─── Start render loop ─── */
    tick();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  2.  PARALLAX GROUPS
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createParallaxGroups() {
    state.heroGroup       = new THREE.Group();
    state.midGroup        = new THREE.Group();
    state.bgGroup         = new THREE.Group();
    state.skillOrbitGroup = new THREE.Group();

    state.scene.add(state.heroGroup);
    state.scene.add(state.midGroup);
    state.scene.add(state.bgGroup);
    state.scene.add(state.skillOrbitGroup);

    // Skill orbit is placed lower (second viewport section)
    state.skillOrbitGroup.position.set(0, -32, 0);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  3.  LIGHTING  — Cinematic Studio Setup
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createLights() {
    /* Ambient — very subtle warm wash */
    const ambient = new THREE.AmbientLight(0x1a1a2e, 0.3);
    state.scene.add(ambient);

    /* Key light — bright neon blue, from top-right */
    const key = new THREE.DirectionalLight(0x00d4ff, 1.8);
    key.position.set(8, 12, 6);
    key.castShadow = false;                      // shadows off for perf
    state.scene.add(key);

    /* Fill light — softer purple, from left */
    const fill = new THREE.DirectionalLight(0x7b2ff7, 0.9);
    fill.position.set(-10, 4, 4);
    state.scene.add(fill);

    /* Rim / edge light — crisp white from behind */
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(0, 0, -12);
    state.scene.add(rim);

    /* Point lights for local glow near hero objects */
    const glowA = new THREE.PointLight(0x00d4ff, 2.0, 18, 2);
    glowA.position.set(4, 2, 6);
    state.heroGroup.add(glowA);

    const glowB = new THREE.PointLight(0x7b2ff7, 1.6, 16, 2);
    glowB.position.set(-5, -1, 4);
    state.heroGroup.add(glowB);

    /* A warm accent on the coffee cup area */
    const glowC = new THREE.PointLight(0xff6b35, 1.0, 10, 2);
    glowC.position.set(6, -2, 5);
    state.heroGroup.add(glowC);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  4.  CURLY BRACKETS  { }
   *      — built with ExtrudeGeometry from custom 2D shapes
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createBracketShape(mirror) {
    const s = new THREE.Shape();
    const d = mirror ? -1 : 1;

    /* Artistic curly bracket outline */
    s.moveTo(0,  1.8);
    s.bezierCurveTo(d * 0.6,  1.8, d * 0.8,  1.2, d * 0.8,  0.7);
    s.bezierCurveTo(d * 0.8,  0.3, d * 1.2,  0.15, d * 1.4,  0);
    s.bezierCurveTo(d * 1.2, -0.15, d * 0.8, -0.3, d * 0.8, -0.7);
    s.bezierCurveTo(d * 0.8, -1.2, d * 0.6, -1.8, 0, -1.8);

    /* Slight inner offset for thickness illusion */
    s.lineTo(d * 0.05, -1.65);
    s.bezierCurveTo(d * 0.55, -1.65, d * 0.65, -1.1, d * 0.65, -0.65);
    s.bezierCurveTo(d * 0.65, -0.25, d * 1.05, -0.1, d * 1.2,  0);
    s.bezierCurveTo(d * 1.05,  0.1,  d * 0.65,  0.25, d * 0.65,  0.65);
    s.bezierCurveTo(d * 0.65,  1.1,  d * 0.55,  1.65, d * 0.05,  1.65);
    s.lineTo(0, 1.8);

    return s;
  }

  function createBrackets() {
    const extrudeSettings = {
      depth : 0.35,
      bevelEnabled : true,
      bevelThickness : 0.06,
      bevelSize      : 0.04,
      bevelSegments  : 3,
    };

    const mat = new THREE.MeshPhysicalMaterial({
      color       : 0x88ccff,
      metalness   : 0.8,
      roughness   : 0.2,
      clearcoat   : 1.0,
      clearcoatRoughness : 0.05,
      reflectivity : 1,
      envMapIntensity : 1.5,
    });

    /* left bracket  {  */
    const leftShape = createBracketShape(false);
    const leftGeo   = new THREE.ExtrudeGeometry(leftShape, extrudeSettings);
    leftGeo.center();
    const leftMesh  = new THREE.Mesh(leftGeo, mat);
    leftMesh.scale.set(1.8, 1.8, 1.8);
    leftMesh.position.set(-4.5, 1.5, 2);
    state.heroGroup.add(leftMesh);
    state.brackets.push(leftMesh);

    /* right bracket  }  */
    const rightShape = createBracketShape(true);
    const rightGeo   = new THREE.ExtrudeGeometry(rightShape, extrudeSettings);
    rightGeo.center();
    const rightMesh  = new THREE.Mesh(rightGeo, mat.clone());
    rightMesh.scale.set(1.8, 1.8, 1.8);
    rightMesh.position.set(4.5, 1.5, 2);
    state.heroGroup.add(rightMesh);
    state.brackets.push(rightMesh);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  5.  COFFEE CUP  — cylinder body + torus handle + steam particles
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createCoffeeCup() {
    const cupGroup = new THREE.Group();

    /* Glossy ceramic material */
    const ceramicMat = new THREE.MeshPhysicalMaterial({
      color      : 0xe8e0d8,
      metalness  : 0.0,
      roughness  : 0.15,
      clearcoat  : 0.8,
      clearcoatRoughness : 0.1,
      sheen      : 1,
      sheenColor : new THREE.Color(0xccbbaa),
    });

    /* Cup body — slightly tapered cylinder */
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.9, 32);
    const body    = new THREE.Mesh(bodyGeo, ceramicMat);
    cupGroup.add(body);

    /* Coffee surface inside */
    const coffeeMat = new THREE.MeshStandardMaterial({
      color     : 0x3b1e08,
      metalness : 0.1,
      roughness : 0.4,
    });
    const coffeeGeo = new THREE.CircleGeometry(0.50, 32);
    const coffee    = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.44;
    cupGroup.add(coffee);

    /* Handle — torus clipped to half */
    const handleGeo = new THREE.TorusGeometry(0.32, 0.06, 12, 24, Math.PI);
    const handle    = new THREE.Mesh(handleGeo, ceramicMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.62, 0.05, 0);
    cupGroup.add(handle);

    /* Saucer */
    const saucerGeo = new THREE.CylinderGeometry(0.75, 0.7, 0.08, 32);
    const saucer    = new THREE.Mesh(saucerGeo, ceramicMat);
    saucer.position.y = -0.49;
    cupGroup.add(saucer);

    /* Position cup in scene */
    cupGroup.scale.set(1.6, 1.6, 1.6);
    cupGroup.position.set(6, -2, 3);
    cupGroup.rotation.y = -0.3;
    state.heroGroup.add(cupGroup);
    state.coffeeCup = cupGroup;

    /* ─── Steam particles ─── */
    createSteamParticles(cupGroup);
  }

  function createSteamParticles(parent) {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const seeds     = new Float32Array(count);   // random phase offsets

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 0.4;   // x spread
      positions[i * 3 + 1] = Math.random() * 1.2 + 0.5;     // y above cup
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;   // z spread
      opacities[i]         = Math.random();
      seeds[i]             = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color       : 0xffffff,
      size        : 0.08,
      transparent : true,
      opacity     : 0.25,
      blending    : THREE.AdditiveBlending,
      depthWrite  : false,
    });

    const steam = new THREE.Points(geo, mat);
    parent.add(steam);
    state.steamParticles = { mesh: steam, seeds, count };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  6.  DATA NODES  — glowing spheres connected by lines
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createDataNodes() {
    const nodeCount = 7;
    const nodeMat   = new THREE.MeshPhysicalMaterial({
      color       : 0x00d4ff,
      emissive    : 0x00d4ff,
      emissiveIntensity : 1.5,
      metalness   : 0.2,
      roughness   : 0.3,
      transmission: 0.4,
      thickness   : 0.5,
      clearcoat   : 1,
    });

    const positions = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle  = (i / nodeCount) * Math.PI * 2;
      const radius = 1.8 + Math.random() * 1.2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.6;
      const z = (Math.random() - 0.5) * 2;
      positions.push(new THREE.Vector3(x, y, z));

      const size = 0.12 + Math.random() * 0.15;
      const geo  = new THREE.SphereGeometry(size, 16, 16);
      const mesh = new THREE.Mesh(geo, nodeMat.clone());
      mesh.position.copy(positions[i]);
      mesh.userData = { basePos: positions[i].clone(), phase: Math.random() * Math.PI * 2 };
      state.midGroup.add(mesh);
      state.dataNodes.push(mesh);
    }

    /* Connecting lines */
    const linePositions = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < 3.5) {
          linePositions.push(positions[i].x, positions[i].y, positions[i].z);
          linePositions.push(positions[j].x, positions[j].y, positions[j].z);
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color       : 0x00d4ff,
      transparent : true,
      opacity     : 0.2,
      blending    : THREE.AdditiveBlending,
    });
    state.dataLines = new THREE.LineSegments(lineGeo, lineMat);
    state.midGroup.add(state.dataLines);

    /* Position entire node network off to the left of hero */
    state.midGroup.position.set(-6, -1, -2);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  7.  FLOATING GEOMETRIC SHAPES  — icosahedrons & octahedrons
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createFloatingShapes() {
    const geometries = [
      new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.IcosahedronGeometry(0.4, 1),
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.TetrahedronGeometry(0.45, 0),
    ];

    /* Glass-like physical material */
    const glassMat = new THREE.MeshPhysicalMaterial({
      color        : 0x88aaff,
      metalness    : 0.0,
      roughness    : 0.05,
      transmission : 0.92,
      thickness    : 0.5,
      clearcoat    : 1,
      clearcoatRoughness : 0,
      ior          : 1.45,
      envMapIntensity: 1.0,
    });

    /* Wireframe overlay */
    const wireMat = new THREE.MeshBasicMaterial({
      color       : 0x00d4ff,
      wireframe   : true,
      transparent : true,
      opacity     : 0.15,
    });

    const spread = 14;
    const count  = 12;
    for (let i = 0; i < count; i++) {
      const geo   = geometries[i % geometries.length];
      const group = new THREE.Group();

      /* Solid glass mesh */
      const solid = new THREE.Mesh(geo, glassMat.clone());
      group.add(solid);

      /* Wireframe layer */
      const wire = new THREE.Mesh(geo, wireMat.clone());
      wire.scale.setScalar(1.02);
      group.add(wire);

      /* Random placement */
      group.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.6,
        (Math.random() - 0.5) * 8 - 6,
      );
      const s = 0.5 + Math.random() * 1.0;
      group.scale.setScalar(s);

      group.userData = {
        rotSpeed : new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2,
        ),
        floatPhase : Math.random() * Math.PI * 2,
        floatSpeed : 0.3 + Math.random() * 0.5,
        floatAmp   : 0.15 + Math.random() * 0.3,
      };

      state.bgGroup.add(group);
      state.floatingShapes.push(group);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  8.  SKILL ORBIT SYSTEM  — planetary ring layout
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createSkillOrbit() {
    const baseRadius = 4;
    const radiusStep = 1.4;

    SKILL_ITEMS.forEach((name, i) => {
      const orbitRadius = baseRadius + i * radiusStep * 0.35 + Math.sin(i) * 0.8;
      const speed       = 0.15 + i * 0.04;
      const startAngle  = (i / SKILL_ITEMS.length) * Math.PI * 2;

      /* ── Orbit ring (faint) ── */
      const ringGeo = new THREE.RingGeometry(orbitRadius - 0.02, orbitRadius + 0.02, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color       : 0x334466,
        transparent : true,
        opacity     : 0.15,
        side        : THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      state.skillOrbitGroup.add(ring);
      state.orbitRings.push(ring);

      /* ── Skill planet ── */
      const planetGeo = new THREE.SphereGeometry(0.45, 32, 32);
      const planetMat = new THREE.MeshPhysicalMaterial({
        color      : SKILL_COLORS[i],
        emissive   : SKILL_COLORS[i],
        emissiveIntensity : 0.5,
        metalness  : 0.3,
        roughness  : 0.4,
        clearcoat  : 0.6,
      });
      const planet = new THREE.Mesh(planetGeo, planetMat);

      /* Glow halo */
      const glowGeo = new THREE.SphereGeometry(0.58, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color       : SKILL_COLORS[i],
        transparent : true,
        opacity     : 0.12,
        blending    : THREE.AdditiveBlending,
        side        : THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      planet.add(glow);

      /* Initial position on orbit */
      planet.position.set(
        Math.cos(startAngle) * orbitRadius,
        0,
        Math.sin(startAngle) * orbitRadius,
      );

      planet.userData = {
        name,
        orbitRadius,
        speed,
        angle : startAngle,
      };

      state.skillOrbitGroup.add(planet);
      state.skillPlanets.push(planet);

      /* ── Label ── */
      createSkillLabel(planet, name, SKILL_COLORS[i]);
    });

    /* Tilt the entire orbit system for a 3D perspective */
    state.skillOrbitGroup.rotation.x = -0.45;
    state.skillOrbitGroup.rotation.z = 0.1;
  }

  /**
   * Creates a canvas-based sprite label floating above a skill planet.
   */
  function createSkillLabel(planet, text, color) {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px "SF Pro Display", "Inter", system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    /* Text glow */
    const c = new THREE.Color(color);
    ctx.shadowColor   = `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    ctx.shadowBlur    = 16;
    ctx.fillStyle     = '#ffffff';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map         : tex,
      transparent : true,
      opacity     : 0.85,
      depthWrite  : false,
      blending    : THREE.NormalBlending,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.y = 0.9;
    planet.add(sprite);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  9.  PARTICLE SYSTEM  — star-field background
   * ═══════════════════════════════════════════════════════════════════════════ */
  function createParticles() {
    const count     = PARTICLE_COUNT;
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const alphas    = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = (Math.random() - 0.5) * 40 - 10;

      sizes[i]   = Math.random() * 2.5 + 0.5;
      alphas[i]  = Math.random() * 0.6 + 0.1;

      velocities[i3]     = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));

    /* ── Custom ShaderMaterial for glow particles ── */
    const vertShader = `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (120.0 / -mvPosition.z);
        gl_Position  = projectionMatrix * mvPosition;
      }
    `;

    const fragShader = `
      varying float vAlpha;
      void main() {
        /* Soft circle with energy fall-off */
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float strength = 1.0 - smoothstep(0.0, 0.5, d);
        strength = pow(strength, 1.5);
        gl_FragColor = vec4(0.55, 0.82, 1.0, strength * vAlpha);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      vertexShader   : vertShader,
      fragmentShader : fragShader,
      transparent    : true,
      depthWrite     : false,
      blending       : THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geo, mat);
    state.scene.add(points);
    state.particleSystem = { mesh: points, velocities };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  10.  EVENT HANDLERS
   * ═══════════════════════════════════════════════════════════════════════════ */
  function onResize() {
    if (!state.container || state.disposed) return;
    const w = state.container.clientWidth;
    const h = state.container.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
  }

  function onMouseMove(e) {
    state.mouseTarget.x = (e.clientX / window.innerWidth)  * 2 - 1;
    state.mouseTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function onScroll() {
    state.scrollTarget = window.scrollY || window.pageYOffset || 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  11.  ANIMATION LOOP
   * ═══════════════════════════════════════════════════════════════════════════ */
  function tick() {
    if (state.disposed) return;
    state.raf = requestAnimationFrame(tick);

    const dt   = state.clock.getDelta();
    const time = state.clock.getElapsedTime();

    /* ─── Smooth mouse interpolation ─── */
    state.mouse.x = lerp(state.mouse.x, state.mouseTarget.x, 0.06);
    state.mouse.y = lerp(state.mouse.y, state.mouseTarget.y, 0.06);

    /* ─── Smooth scroll ─── */
    state.scrollY = lerp(state.scrollY, state.scrollTarget, 0.08);

    /* ─── Camera scroll offset ─── */
    const scrollNorm = state.scrollY * 0.01;
    state.camera.position.y = lerp(state.camera.position.y, -scrollNorm * 2.5, 0.06);
    state.camera.position.z = 28 - scrollNorm * 0.5;

    /* ─── Mouse parallax per depth layer ─── */
    // Hero (close) — moves most
    state.heroGroup.rotation.y = lerp(state.heroGroup.rotation.y, state.mouse.x * 0.08, 0.04);
    state.heroGroup.rotation.x = lerp(state.heroGroup.rotation.x, state.mouse.y * 0.05, 0.04);
    state.heroGroup.position.x = lerp(state.heroGroup.position.x, state.mouse.x * 1.2, 0.03);
    state.heroGroup.position.y = lerp(state.heroGroup.position.y, -state.mouse.y * 0.6, 0.03);

    // Mid layer
    state.midGroup.rotation.y = lerp(state.midGroup.rotation.y, state.mouse.x * 0.04, 0.03);
    state.midGroup.rotation.x = lerp(state.midGroup.rotation.x, state.mouse.y * 0.025, 0.03);

    // Background — moves least
    state.bgGroup.rotation.y = lerp(state.bgGroup.rotation.y, state.mouse.x * 0.015, 0.02);
    state.bgGroup.rotation.x = lerp(state.bgGroup.rotation.x, state.mouse.y * 0.01, 0.02);

    /* ─── Animate brackets ─── */
    state.brackets.forEach((b, i) => {
      const dir  = i === 0 ? 1 : -1;
      b.rotation.y = time * 0.15 * dir;
      b.rotation.x = Math.sin(time * 0.2 + i) * 0.1;
      b.position.y = 1.5 + floatY(time, 0.6, 0.4);
    });

    /* ─── Animate coffee cup ─── */
    if (state.coffeeCup) {
      state.coffeeCup.rotation.y = -0.3 + Math.sin(time * 0.3) * 0.08;
      state.coffeeCup.position.y = -2 + floatY(time, 0.4, 0.25);
    }

    /* ─── Animate steam ─── */
    if (state.steamParticles) {
      const posArr = state.steamParticles.mesh.geometry.attributes.position.array;
      for (let i = 0; i < state.steamParticles.count; i++) {
        const i3 = i * 3;
        posArr[i3 + 1] += 0.008;                                       // rise
        posArr[i3]     += Math.sin(time * 2 + state.steamParticles.seeds[i]) * 0.002; // sway

        /* Reset if too high */
        if (posArr[i3 + 1] > 2.0) {
          posArr[i3]     = (Math.random() - 0.5) * 0.4;
          posArr[i3 + 1] = 0.5;
          posArr[i3 + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      state.steamParticles.mesh.geometry.attributes.position.needsUpdate = true;
    }

    /* ─── Animate data nodes (orbit + pulse) ─── */
    state.dataNodes.forEach((node, i) => {
      const ud   = node.userData;
      const s    = 1 + Math.sin(time * 1.5 + ud.phase) * 0.25;
      node.scale.setScalar(s);
      node.position.x = ud.basePos.x + Math.sin(time * 0.3 + ud.phase) * 0.3;
      node.position.y = ud.basePos.y + Math.cos(time * 0.4 + ud.phase) * 0.2;
      node.material.emissiveIntensity = 1.0 + Math.sin(time * 2 + ud.phase) * 0.5;
    });

    /* ─── Animate floating shapes ─── */
    state.floatingShapes.forEach((g) => {
      const ud = g.userData;
      g.rotation.x += ud.rotSpeed.x * dt;
      g.rotation.y += ud.rotSpeed.y * dt;
      g.rotation.z += ud.rotSpeed.z * dt;
      g.position.y += Math.sin(time * ud.floatSpeed + ud.floatPhase) * ud.floatAmp * dt;
    });

    /* ─── Animate skill orbit ─── */
    state.skillPlanets.forEach((p) => {
      const ud = p.userData;
      ud.angle += ud.speed * dt;
      p.position.x = Math.cos(ud.angle) * ud.orbitRadius;
      p.position.z = Math.sin(ud.angle) * ud.orbitRadius;
      /* Subtle bob */
      p.position.y = Math.sin(time * 0.8 + ud.angle) * 0.15;
    });

    /* Slow auto-rotation of entire orbit */
    state.skillOrbitGroup.rotation.y += dt * 0.05;

    /* ─── Animate particles (slow drift) ─── */
    if (state.particleSystem) {
      const posArr = state.particleSystem.mesh.geometry.attributes.position.array;
      const vel    = state.particleSystem.velocities;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArr[i3]     += vel[i3];
        posArr[i3 + 1] += vel[i3 + 1];
        posArr[i3 + 2] += vel[i3 + 2];

        /* Wrap around bounds */
        if (posArr[i3]     >  30) posArr[i3]     = -30;
        if (posArr[i3]     < -30) posArr[i3]     =  30;
        if (posArr[i3 + 1] >  30) posArr[i3 + 1] = -30;
        if (posArr[i3 + 1] < -30) posArr[i3 + 1] =  30;
      }
      state.particleSystem.mesh.geometry.attributes.position.needsUpdate = true;
    }

    /* ─── Render ─── */
    state.renderer.render(state.scene, state.camera);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  12.  CLEANUP
   * ═══════════════════════════════════════════════════════════════════════════ */
  function cleanup() {
    state.disposed = true;

    if (state.raf) cancelAnimationFrame(state.raf);
    window.removeEventListener('resize',    onResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('scroll',    onScroll);

    /* Traverse and dispose all geometries / materials / textures */
    state.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else {
          disposeMaterial(obj.material);
        }
      }
    });

    state.renderer.dispose();

    /* Remove canvas from DOM */
    if (state.renderer.domElement && state.renderer.domElement.parentElement) {
      state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
    }
  }

  function disposeMaterial(mat) {
    if (!mat) return;
    /* Dispose any textures attached to the material */
    const texProps = [
      'map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap',
      'envMap', 'alphaMap', 'aoMap', 'displacementMap',
      'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap',
      'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
      'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap',
    ];
    texProps.forEach((prop) => {
      if (mat[prop]) mat[prop].dispose();
    });
    mat.dispose();
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   *  13.  EXPORT  — both global + ES module compatible
   * ═══════════════════════════════════════════════════════════════════════════ */
  const AntiGravityScene = { init, cleanup };

  /* Attach to global scope for <script> tag usage */
  if (typeof window !== 'undefined') {
    window.AntiGravityScene = AntiGravityScene;
  }

  /* Support ES module export if loaded as module */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AntiGravityScene;
  }

})();
