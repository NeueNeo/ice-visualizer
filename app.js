/**
 * ICE VISUALIZER - Cyberpunk Neural Network Visualization
 * Built with Three.js and WebGL
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// === Configuration ===
const CONFIG = {
  nodeCount: 80,
  connectionDistance: 3.5,
  nodeSize: 0.08,
  coreSize: 0.15,
  fieldSize: 8,
  rotationSpeed: 0.0003,
  pulseSpeed: 0.02,
  colors: {
    cyan: 0x02d7f2,
    magenta: 0xff00aa,
    yellow: 0xffeb0b,
    white: 0xffffff,
    background: 0x000008
  }
};

// === Visualization Presets ===
const VIZ_PRESETS = {
  neural: {
    name: 'Neural Network',
    particleCount: 500,
    particleSize: 0.03,
    particleSpeed: 0.0002,
    nodeCount: 80,
    connectionDistance: 3.5,
    colors: { primary: 0x02d7f2, secondary: 0xff00aa, accent: 0xffeb0b }
  },
  storm: {
    name: 'Data Storm',
    particleCount: 2000,
    particleSize: 0.02,
    particleSpeed: 0.003,
    nodeCount: 40,
    connectionDistance: 2.5,
    colors: { primary: 0xff00aa, secondary: 0xffeb0b, accent: 0x02d7f2 }
  },
  constellation: {
    name: 'Constellation',
    particleCount: 300,
    particleSize: 0.05,
    particleSpeed: 0.0001,
    nodeCount: 50,
    connectionDistance: 5,
    colors: { primary: 0xffffff, secondary: 0x02d7f2, accent: 0xffeb0b }
  },
  swarm: {
    name: 'Swarm Intelligence',
    particleCount: 200,
    particleSize: 0.06,
    particleSpeed: 0.008,
    nodeCount: 30,
    connectionDistance: 4,
    colors: { primary: 0x00ff88, secondary: 0x02d7f2, accent: 0xff00aa }
  },
  matrix: {
    name: 'Matrix Rain',
    particleCount: 1000,
    particleSize: 0.025,
    particleSpeed: 0.002,
    nodeCount: 60,
    connectionDistance: 3,
    colors: { primary: 0x00ff00, secondary: 0x00aa00, accent: 0xffffff }
  }
};

// === Global Variables ===
let scene, camera, renderer, controls;
let nodes = [];
let connections = [];
let particleSystem;
let coreNode;
let time = 0;
let currentMode = 'orbit';
let currentViz = 'neural';
let frameCount = 0;
let lastTime = performance.now();
let addingNode = false;
let raycaster, mouse;

// Post-processing
let composer, bloomPass;
let bloomEnabled = true;
let pulsesEnabled = true;

// Data pulses
let dataPulses = [];

// Mouse interaction
let mouseWorld = new THREE.Vector3();
let mouseGravityStrength = 0.5;

// Recording
let isRecording = false;
let gifRecorder = null;
let recordedFrames = [];

// Export path
const EXPORT_PATH = '~/Desktop/';

// === Initialization ===
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(CONFIG.colors.background);
  scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.05);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Create scene elements
  createLights();
  createCoreNode();
  createNodes();
  createConnections();
  createParticles();

  // Update HUD
  updateHUD();

  // Raycaster for adding nodes
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Post-processing
  setupPostProcessing();
  
  // Initialize effect button states
  setTimeout(() => {
    document.getElementById('btn-bloom').classList.add('active');
    document.getElementById('btn-pulses').classList.add('active');
  }, 100);

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onCanvasClick);
  renderer.domElement.addEventListener('contextmenu', onRightClick);
  setupControls();

  // Start animation
  animate();
}

// === Post-Processing Setup ===
function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  // Bloom pass
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.4,  // radius
    0.85  // threshold
  );
  composer.addPass(bloomPass);
}

// === Lights ===
function createLights() {
  // Ambient light
  const ambient = new THREE.AmbientLight(0x111122, 0.5);
  scene.add(ambient);

  // Point lights for dramatic effect
  const light1 = new THREE.PointLight(CONFIG.colors.cyan, 2, 20);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(CONFIG.colors.magenta, 2, 20);
  light2.position.set(-5, -5, 5);
  scene.add(light2);

  const light3 = new THREE.PointLight(CONFIG.colors.yellow, 1, 15);
  light3.position.set(0, 8, 0);
  scene.add(light3);
}

// === Core Node (Central Hub) ===
function createCoreNode() {
  // Outer glow sphere
  const glowGeometry = new THREE.SphereGeometry(CONFIG.coreSize * 3, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: CONFIG.colors.cyan,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
  scene.add(glowSphere);

  // Core icosahedron
  const coreGeometry = new THREE.IcosahedronGeometry(CONFIG.coreSize, 1);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.cyan,
    emissive: CONFIG.colors.cyan,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2,
    wireframe: true
  });
  coreNode = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(coreNode);

  // Inner solid core
  const innerGeometry = new THREE.IcosahedronGeometry(CONFIG.coreSize * 0.6, 0);
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.yellow,
    emissive: CONFIG.colors.yellow,
    emissiveIntensity: 0.8,
    metalness: 1,
    roughness: 0
  });
  const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
  coreNode.add(innerCore);
}

// === Data Nodes ===
function createNodes() {
  const geometry = new THREE.OctahedronGeometry(CONFIG.nodeSize, 0);
  
  for (let i = 0; i < CONFIG.nodeCount; i++) {
    // Random position in spherical distribution
    const radius = CONFIG.fieldSize * (0.3 + Math.random() * 0.7);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    // Determine node type/color
    const colorChoice = Math.random();
    let color, emissiveIntensity;
    
    if (colorChoice < 0.5) {
      color = CONFIG.colors.cyan;
      emissiveIntensity = 0.3;
    } else if (colorChoice < 0.8) {
      color = CONFIG.colors.magenta;
      emissiveIntensity = 0.4;
    } else {
      color = CONFIG.colors.yellow;
      emissiveIntensity = 0.5;
    }

    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: emissiveIntensity,
      metalness: 0.9,
      roughness: 0.1
    });

    const node = new THREE.Mesh(geometry, material);
    node.position.set(x, y, z);
    
    // Store original position for animations
    node.userData = {
      originalPosition: new THREE.Vector3(x, y, z),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      color: color
    };

    scene.add(node);
    nodes.push(node);
  }
}

// === Connections Between Nodes ===
function createConnections() {
  const material = new THREE.LineBasicMaterial({
    color: CONFIG.colors.cyan,
    transparent: true,
    opacity: 0.3
  });

  // Connect nodes that are close enough
  for (let i = 0; i < nodes.length; i++) {
    // Connect to core
    const distToCore = nodes[i].position.length();
    if (distToCore < CONFIG.connectionDistance * 1.5) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        nodes[i].position.clone()
      ]);
      const line = new THREE.Line(geometry, material.clone());
      line.userData = { nodeIndex: i, toCore: true };
      scene.add(line);
      connections.push(line);
    }

    // Connect to nearby nodes
    for (let j = i + 1; j < nodes.length; j++) {
      const distance = nodes[i].position.distanceTo(nodes[j].position);
      
      if (distance < CONFIG.connectionDistance) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          nodes[i].position.clone(),
          nodes[j].position.clone()
        ]);
        const line = new THREE.Line(geometry, material.clone());
        line.userData = { nodeIndex1: i, nodeIndex2: j };
        scene.add(line);
        connections.push(line);
      }
    }
  }
}

// === Particle System ===
function createParticles() {
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorCyan = new THREE.Color(CONFIG.colors.cyan);
  const colorMagenta = new THREE.Color(CONFIG.colors.magenta);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // Random position in sphere
    const radius = CONFIG.fieldSize * 1.5 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    // Random color blend
    const mixRatio = Math.random();
    const color = colorCyan.clone().lerp(colorMagenta, mixRatio);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

// === Animation Loop ===
function animate() {
  requestAnimationFrame(animate);
  
  time += 0.016; // ~60fps
  frameCount++;

  // Update controls
  controls.update();

  // Rotate core
  if (coreNode) {
    coreNode.rotation.x += 0.005;
    coreNode.rotation.y += 0.008;
  }

  // Animate nodes based on mode
  animateNodes();

  // Animate connections
  animateConnections();

  // Animate particles based on visualization type
  animateParticles();
  
  // Apply mouse gravity to particles
  applyMouseGravity();
  
  // Animate data pulses
  if (pulsesEnabled) {
    animateDataPulses();
    // Spawn new pulses periodically
    if (frameCount % 30 === 0 && connections.length > 0) {
      spawnDataPulse();
    }
  }

  // Update FPS counter
  if (frameCount % 30 === 0) {
    const now = performance.now();
    const fps = Math.round(30000 / (now - lastTime));
    document.getElementById('fps').textContent = fps;
    lastTime = now;
  }

  // Render with post-processing or standard
  if (composer && bloomEnabled) {
    bloomPass.enabled = bloomEnabled;
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
  
  // Capture frame if recording
  if (isRecording) {
    captureFrame();
  }
}

// === Node Animation ===
function animateNodes() {
  nodes.forEach((node, index) => {
    const data = node.userData;
    
    switch (currentMode) {
      case 'orbit':
        // Gentle floating motion
        const floatOffset = Math.sin(time * data.speed + data.phase) * 0.1;
        node.position.y = data.originalPosition.y + floatOffset;
        break;
        
      case 'pulse':
        // Pulse from center
        const pulseScale = 1 + Math.sin(time * 2 - node.position.length() * 0.5) * 0.3;
        node.scale.setScalar(pulseScale);
        node.material.emissiveIntensity = 0.3 + Math.sin(time * 3 + data.phase) * 0.3;
        break;
        
      case 'expand':
        // Expand outward
        const expandFactor = 1 + Math.sin(time * 0.5) * 0.5;
        node.position.copy(data.originalPosition).multiplyScalar(expandFactor);
        break;
    }

    // Slow rotation
    node.rotation.x += 0.01;
    node.rotation.y += 0.01;
  });
}

// === Particle Animation ===
function animateParticles() {
  if (!particleSystem) return;
  
  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.geometry.attributes.velocity?.array;
  const preset = particleSystem.userData.preset;
  
  switch (currentViz) {
    case 'matrix':
      // Matrix rain falling effect
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += velocities ? velocities[i + 1] : -0.03;
        // Reset to top when below threshold
        if (positions[i + 1] < -10) {
          positions[i + 1] = 15;
          positions[i] = (Math.random() - 0.5) * 20;
          positions[i + 2] = (Math.random() - 0.5) * 20;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      break;
      
    case 'storm':
      // Chaotic storm movement
      for (let i = 0; i < positions.length; i += 3) {
        if (velocities) {
          positions[i] += velocities[i];
          positions[i + 1] += velocities[i + 1];
          positions[i + 2] += velocities[i + 2];
          
          // Bounce off bounds
          const radius = Math.sqrt(positions[i]**2 + positions[i+1]**2 + positions[i+2]**2);
          if (radius > 15) {
            velocities[i] *= -0.8;
            velocities[i + 1] *= -0.8;
            velocities[i + 2] *= -0.8;
          }
          
          // Add some turbulence
          velocities[i] += (Math.random() - 0.5) * 0.001;
          velocities[i + 1] += (Math.random() - 0.5) * 0.001;
          velocities[i + 2] += (Math.random() - 0.5) * 0.001;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      if (velocities) particleSystem.geometry.attributes.velocity.needsUpdate = true;
      particleSystem.rotation.y += preset.particleSpeed * 2;
      break;
      
    case 'swarm':
      // Flocking behavior (boids)
      const numBoids = positions.length / 3;
      const perceptionRadius = 3;
      const separationDist = 1;
      const maxSpeed = 0.03;
      const maxForce = 0.001;
      
      for (let i = 0; i < positions.length; i += 3) {
        const idx = i / 3;
        
        // Current position and velocity
        const px = positions[i], py = positions[i + 1], pz = positions[i + 2];
        let vx = velocities[i], vy = velocities[i + 1], vz = velocities[i + 2];
        
        // Flocking forces
        let sepX = 0, sepY = 0, sepZ = 0, sepCount = 0;
        let alignX = 0, alignY = 0, alignZ = 0, alignCount = 0;
        let cohX = 0, cohY = 0, cohZ = 0, cohCount = 0;
        
        // Check neighbors (sample for performance)
        for (let j = 0; j < positions.length; j += 3) {
          if (i === j) continue;
          
          const dx = positions[j] - px;
          const dy = positions[j + 1] - py;
          const dz = positions[j + 2] - pz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (dist < perceptionRadius && dist > 0) {
            // Separation
            if (dist < separationDist) {
              sepX -= dx / dist;
              sepY -= dy / dist;
              sepZ -= dz / dist;
              sepCount++;
            }
            // Alignment
            alignX += velocities[j];
            alignY += velocities[j + 1];
            alignZ += velocities[j + 2];
            alignCount++;
            // Cohesion
            cohX += positions[j];
            cohY += positions[j + 1];
            cohZ += positions[j + 2];
            cohCount++;
          }
        }
        
        // Apply forces
        if (sepCount > 0) {
          vx += (sepX / sepCount) * maxForce * 2;
          vy += (sepY / sepCount) * maxForce * 2;
          vz += (sepZ / sepCount) * maxForce * 2;
        }
        if (alignCount > 0) {
          vx += ((alignX / alignCount) - vx) * maxForce;
          vy += ((alignY / alignCount) - vy) * maxForce;
          vz += ((alignZ / alignCount) - vz) * maxForce;
        }
        if (cohCount > 0) {
          const targetX = cohX / cohCount - px;
          const targetY = cohY / cohCount - py;
          const targetZ = cohZ / cohCount - pz;
          vx += targetX * maxForce * 0.5;
          vy += targetY * maxForce * 0.5;
          vz += targetZ * maxForce * 0.5;
        }
        
        // Soft boundary - steer back toward center
        const distFromCenter = Math.sqrt(px * px + py * py + pz * pz);
        if (distFromCenter > 18) {
          vx -= px * 0.0003;
          vy -= py * 0.0003;
          vz -= pz * 0.0003;
        }
        
        // Limit speed
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (speed > maxSpeed) {
          vx = (vx / speed) * maxSpeed;
          vy = (vy / speed) * maxSpeed;
          vz = (vz / speed) * maxSpeed;
        }
        
        // Update velocity and position
        velocities[i] = vx;
        velocities[i + 1] = vy;
        velocities[i + 2] = vz;
        positions[i] += vx;
        positions[i + 1] += vy;
        positions[i + 2] += vz;
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
      particleSystem.geometry.attributes.velocity.needsUpdate = true;
      break;
      
    case 'constellation':
      // Gentle twinkling
      particleSystem.material.opacity = 0.7 + Math.sin(time * 2) * 0.2;
      particleSystem.rotation.y += preset.particleSpeed;
      break;
      
    default:
      // Neural network - slow rotation
      particleSystem.rotation.y += preset?.particleSpeed || 0.0002;
  }
}

// === Connection Animation ===
function animateConnections() {
  connections.forEach((line, index) => {
    // Pulse opacity
    const opacity = 0.2 + Math.sin(time * 2 + index * 0.1) * 0.15;
    line.material.opacity = opacity;

    // Update positions if nodes moved
    if (line.userData.toCore) {
      const node = nodes[line.userData.nodeIndex];
      const positions = line.geometry.attributes.position.array;
      positions[3] = node.position.x;
      positions[4] = node.position.y;
      positions[5] = node.position.z;
      line.geometry.attributes.position.needsUpdate = true;
    } else if (line.userData.nodeIndex1 !== undefined) {
      const node1 = nodes[line.userData.nodeIndex1];
      const node2 = nodes[line.userData.nodeIndex2];
      const positions = line.geometry.attributes.position.array;
      positions[0] = node1.position.x;
      positions[1] = node1.position.y;
      positions[2] = node1.position.z;
      positions[3] = node2.position.x;
      positions[4] = node2.position.y;
      positions[5] = node2.position.z;
      line.geometry.attributes.position.needsUpdate = true;
    }
  });
}

// === Window Resize ===
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  
  if (bloomPass) {
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
  }
}

// === Control Buttons ===
function setupControls() {
  // Animation mode buttons
  document.querySelectorAll('.control-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      
      if (mode === 'reset') {
        resetScene();
        return;
      }
      
      // Update active state
      document.querySelectorAll('.control-btn[data-mode]').forEach(b => {
        if (b.dataset.mode !== 'reset') b.classList.remove('active');
      });
      btn.classList.add('active');
      
      currentMode = mode;
      
      // Reset node scales when switching modes
      if (mode !== 'pulse') {
        nodes.forEach(node => node.scale.setScalar(1));
      }
    });
  });
  
  // Visualization preset dropdown
  document.getElementById('viz-select').addEventListener('change', (e) => {
    switchVisualization(e.target.value);
  });
  
  // Add node button
  document.getElementById('btn-add-node').addEventListener('click', () => {
    addingNode = !addingNode;
    document.getElementById('btn-add-node').classList.toggle('active', addingNode);
    document.getElementById('click-hint').classList.toggle('active', addingNode);
  });
  
  // Effect toggles
  document.getElementById('btn-bloom').addEventListener('click', (e) => {
    bloomEnabled = !bloomEnabled;
    e.target.classList.toggle('active', bloomEnabled);
  });
  
  document.getElementById('btn-pulses').addEventListener('click', (e) => {
    pulsesEnabled = !pulsesEnabled;
    e.target.classList.toggle('active', pulsesEnabled);
    // Clear existing pulses if disabled
    if (!pulsesEnabled) {
      dataPulses.forEach(p => scene.remove(p));
      dataPulses = [];
    }
  });
  
  // Export buttons
  document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
  document.getElementById('btn-record').addEventListener('click', toggleRecording);
  
  // Hide UI
  document.getElementById('btn-hide-ui').addEventListener('click', toggleUI);
}

// === Hide UI ===
let uiHidden = false;

function toggleUI() {
  uiHidden = !uiHidden;
  
  const huds = document.querySelectorAll('.hud');
  const controls = document.querySelector('.controls');
  const btn = document.getElementById('btn-hide-ui');
  
  if (uiHidden) {
    huds.forEach(h => {
      h.style.opacity = '0';
      h.style.pointerEvents = 'none';
    });
    controls.style.opacity = '0';
    controls.style.pointerEvents = 'none';
    // Keep button visible but minimal
    btn.style.position = 'fixed';
    btn.style.bottom = '20px';
    btn.style.right = '20px';
    btn.style.opacity = '0.3';
    btn.textContent = '◧ SHOW UI';
  } else {
    huds.forEach(h => {
      h.style.opacity = '1';
      h.style.pointerEvents = 'auto';
    });
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';
    btn.style.position = '';
    btn.style.bottom = '';
    btn.style.right = '';
    btn.style.opacity = '';
    btn.textContent = '◨ HIDE UI';
  }
}

// Press H to toggle UI
document.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') {
    toggleUI();
  }
});

// === Switch Visualization ===
function switchVisualization(vizKey) {
  const preset = VIZ_PRESETS[vizKey];
  if (!preset) return;
  
  currentViz = vizKey;
  
  // Update config
  CONFIG.nodeCount = preset.nodeCount;
  CONFIG.connectionDistance = preset.connectionDistance;
  CONFIG.colors.cyan = preset.colors.primary;
  CONFIG.colors.magenta = preset.colors.secondary;
  CONFIG.colors.yellow = preset.colors.accent;
  
  // Clear existing elements
  clearScene();
  
  // Recreate with new settings
  createCoreNode();
  createNodes();
  createConnections();
  createParticlesForPreset(preset);
  
  // Update lights
  updateLightsForPreset(preset);
  
  updateHUD();
}

// === Clear Scene ===
function clearScene() {
  // Remove nodes
  nodes.forEach(node => scene.remove(node));
  nodes = [];
  
  // Remove connections
  connections.forEach(conn => scene.remove(conn));
  connections = [];
  
  // Remove particles
  if (particleSystem) {
    scene.remove(particleSystem);
    particleSystem = null;
  }
  
  // Remove core
  if (coreNode) {
    scene.remove(coreNode);
    coreNode = null;
  }
}

// === Create Particles for Preset ===
function createParticlesForPreset(preset) {
  const particleCount = preset.particleCount;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  const colorPrimary = new THREE.Color(preset.colors.primary);
  const colorSecondary = new THREE.Color(preset.colors.secondary);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    if (currentViz === 'matrix') {
      // Matrix rain - spread in X/Z, full height in Y
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 20 - 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
      velocities[i3 + 1] = -0.02 - Math.random() * 0.03; // Fall speed
    } else if (currentViz === 'storm') {
      // Storm - chaotic sphere
      const radius = CONFIG.fieldSize * 2 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    } else if (currentViz === 'swarm') {
      // Swarm - spread out with random velocities for flocking
      const radius = CONFIG.fieldSize * 2.5 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      // Random initial velocity
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    } else {
      // Default spherical distribution
      const radius = CONFIG.fieldSize * 1.5 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }

    // Color blend
    const mixRatio = Math.random();
    const color = colorPrimary.clone().lerp(colorSecondary, mixRatio);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

  const material = new THREE.PointsMaterial({
    size: preset.particleSize,
    vertexColors: true,
    transparent: true,
    opacity: currentViz === 'constellation' ? 0.9 : 0.6,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.userData.preset = preset;
  scene.add(particleSystem);
}

// === Update Lights for Preset ===
function updateLightsForPreset(preset) {
  scene.children.forEach(child => {
    if (child.isPointLight) {
      if (child.position.x > 0) {
        child.color.setHex(preset.colors.primary);
      } else {
        child.color.setHex(preset.colors.secondary);
      }
    }
  });
}

// === Canvas Click Handler ===
function onCanvasClick(event) {
  if (!addingNode) return;
  
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Create a plane at z=0 to intersect with
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.setFromCamera(mouse, camera);
  
  const intersectPoint = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersectPoint);
  
  if (intersectPoint) {
    // Limit the position within bounds
    intersectPoint.x = Math.max(-10, Math.min(10, intersectPoint.x));
    intersectPoint.y = Math.max(-10, Math.min(10, intersectPoint.y));
    intersectPoint.z = (Math.random() - 0.5) * 4; // Add some depth variation
    
    // Don't allow nodes too close to center
    const distFromCenter = Math.sqrt(intersectPoint.x ** 2 + intersectPoint.y ** 2);
    if (distFromCenter < 2) {
      // Push node outward
      const angle = Math.atan2(intersectPoint.y, intersectPoint.x);
      intersectPoint.x = Math.cos(angle) * 2.5;
      intersectPoint.y = Math.sin(angle) * 2.5;
    }
    
    addNode(intersectPoint);
  }
}

// === Add New Node ===
function addNode(position) {
  const preset = VIZ_PRESETS[currentViz];
  const geometry = new THREE.OctahedronGeometry(CONFIG.nodeSize * 1.5, 0);
  
  // Use accent color for new nodes
  const color = preset.colors.accent;
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1
  });

  const node = new THREE.Mesh(geometry, material);
  node.position.copy(position);
  
  node.userData = {
    originalPosition: position.clone(),
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 0.5,
    color: color,
    isNew: true
  };

  // Spawn animation
  node.scale.setScalar(0);
  
  scene.add(node);
  nodes.push(node);
  
  // Animate spawn
  const targetScale = 1.5;
  const animateSpawn = () => {
    if (node.scale.x < targetScale) {
      node.scale.addScalar(0.1);
      requestAnimationFrame(animateSpawn);
    } else {
      node.scale.setScalar(targetScale);
    }
  };
  animateSpawn();
  
  // Connect to nearby nodes
  connectNewNode(node);
  
  updateHUD();
}

// === Connect New Node to Nearby Nodes ===
function connectNewNode(newNode) {
  const preset = VIZ_PRESETS[currentViz];
  const material = new THREE.LineBasicMaterial({
    color: preset.colors.accent,
    transparent: true,
    opacity: 0.5
  });

  // Connect to nearby existing nodes only (not to core)
  for (let i = 0; i < nodes.length - 1; i++) {
    const distance = newNode.position.distanceTo(nodes[i].position);
    
    if (distance < CONFIG.connectionDistance * 1.5) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        newNode.position.clone(),
        nodes[i].position.clone()
      ]);
      const line = new THREE.Line(geometry, material.clone());
      line.userData = { nodeIndex1: nodes.length - 1, nodeIndex2: i };
      scene.add(line);
      connections.push(line);
    }
  }
}

// === Reset Scene ===
function resetScene() {
  // Stop any recording
  if (isRecording) {
    stopRecording();
  }
  
  // Clear all pulses
  dataPulses.forEach(p => scene.remove(p));
  dataPulses = [];
  
  // Reset visualization to Neural Network
  currentViz = 'neural';
  document.getElementById('viz-select').value = 'neural';
  
  // Reset config to defaults
  const preset = VIZ_PRESETS.neural;
  CONFIG.nodeCount = preset.nodeCount;
  CONFIG.connectionDistance = preset.connectionDistance;
  CONFIG.colors.cyan = preset.colors.primary;
  CONFIG.colors.magenta = preset.colors.secondary;
  CONFIG.colors.yellow = preset.colors.accent;
  
  // Clear and rebuild entire scene
  clearScene();
  createCoreNode();
  createNodes();
  createConnections();
  createParticlesForPreset(preset);
  updateLightsForPreset(preset);
  
  // Reset camera
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 0, 0);
  controls.reset();
  
  // Reset mode to orbit
  currentMode = 'orbit';
  document.querySelectorAll('.control-btn[data-mode]').forEach(b => {
    if (b.dataset.mode !== 'reset') b.classList.remove('active');
  });
  document.querySelector('[data-mode="orbit"]').classList.add('active');
  
  // Reset effects to defaults
  bloomEnabled = true;
  pulsesEnabled = true;
  document.getElementById('btn-bloom').classList.add('active');
  document.getElementById('btn-pulses').classList.add('active');
  
  // Turn off add node mode
  addingNode = false;
  document.getElementById('btn-add-node').classList.remove('active');
  document.getElementById('click-hint').classList.remove('active');
  
  updateHUD();
}

// === Update HUD ===
function updateHUD() {
  document.getElementById('node-count').textContent = nodes.length;
  document.getElementById('connection-count').textContent = connections.length;
}

// === Mouse Move Handler ===
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update 3D mouse position for gravity
  raycaster.setFromCamera(mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  raycaster.ray.intersectPlane(plane, mouseWorld);
}

// === Apply Mouse Gravity to Particles ===
function applyMouseGravity() {
  if (!particleSystem || !mouseWorld) return;
  
  const positions = particleSystem.geometry.attributes.position.array;
  
  for (let i = 0; i < positions.length; i += 3) {
    const dx = mouseWorld.x - positions[i];
    const dy = mouseWorld.y - positions[i + 1];
    const dz = mouseWorld.z - positions[i + 2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (dist < 5 && dist > 0.1) {
      const force = mouseGravityStrength * 0.01 / (dist * dist);
      positions[i] += dx * force;
      positions[i + 1] += dy * force;
      positions[i + 2] += dz * force;
    }
  }
  
  particleSystem.geometry.attributes.position.needsUpdate = true;
}

// === Right-Click to Delete Node ===
function onRightClick(event) {
  event.preventDefault();
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodes);
  
  if (intersects.length > 0) {
    deleteNode(intersects[0].object);
  }
}

// === Delete Node ===
function deleteNode(node) {
  const nodeIndex = nodes.indexOf(node);
  if (nodeIndex === -1) return;
  
  // Remove associated connections
  const connectionsToRemove = connections.filter(conn => {
    const data = conn.userData;
    return data.nodeIndex === nodeIndex || 
           data.nodeIndex1 === nodeIndex || 
           data.nodeIndex2 === nodeIndex;
  });
  
  connectionsToRemove.forEach(conn => {
    scene.remove(conn);
    connections.splice(connections.indexOf(conn), 1);
  });
  
  // Remove node
  scene.remove(node);
  nodes.splice(nodeIndex, 1);
  
  // Update connection indices
  connections.forEach(conn => {
    const data = conn.userData;
    if (data.nodeIndex > nodeIndex) data.nodeIndex--;
    if (data.nodeIndex1 > nodeIndex) data.nodeIndex1--;
    if (data.nodeIndex2 > nodeIndex) data.nodeIndex2--;
  });
  
  updateHUD();
}

// === Data Pulses ===
function spawnDataPulse() {
  if (connections.length === 0) return;
  
  // Pick random connection
  const conn = connections[Math.floor(Math.random() * connections.length)];
  const positions = conn.geometry.attributes.position.array;
  
  const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
  const end = new THREE.Vector3(positions[3], positions[4], positions[5]);
  
  const preset = VIZ_PRESETS[currentViz];
  
  // Small, clean pulse using preset colors
  const geometry = new THREE.SphereGeometry(0.04, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: preset.colors.primary,
    transparent: true,
    opacity: 0.9
  });
  
  const pulse = new THREE.Mesh(geometry, material);
  pulse.position.copy(start);
  pulse.userData = {
    start: start.clone(),
    end: end.clone(),
    progress: 0,
    speed: 0.015 + Math.random() * 0.02
  };
  
  // Single subtle glow
  const glowGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: preset.colors.primary,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  pulse.add(glow);
  
  scene.add(pulse);
  dataPulses.push(pulse);
}

function animateDataPulses() {
  const toRemove = [];
  
  dataPulses.forEach(pulse => {
    pulse.userData.progress += pulse.userData.speed;
    
    if (pulse.userData.progress >= 1) {
      toRemove.push(pulse);
    } else {
      // Lerp position along connection
      const t = pulse.userData.progress;
      pulse.position.lerpVectors(pulse.userData.start, pulse.userData.end, t);
      
      // Fade out near end
      const fade = t < 0.7 ? 0.9 : 0.9 * (1 - (t - 0.7) / 0.3);
      pulse.material.opacity = fade;
      if (pulse.children[0]) {
        pulse.children[0].material.opacity = fade * 0.3;
      }
    }
  });
  
  // Remove completed pulses
  toRemove.forEach(pulse => {
    scene.remove(pulse);
    dataPulses.splice(dataPulses.indexOf(pulse), 1);
  });
}

// === Screenshot ===
function takeScreenshot() {
  showStatus('Capturing screenshot...');
  
  // Render one frame to ensure it's current
  if (composer && bloomEnabled) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
  
  // Get canvas data
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  // Create download link
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ice-visualizer-${timestamp}.png`;
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
  
  showStatus('Screenshot saved!', 'success');
}

// === GIF Recording ===
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  isRecording = true;
  recordedFrames = [];
  
  document.getElementById('record-indicator').classList.add('active');
  document.getElementById('btn-record').textContent = '⏹ STOP';
  document.getElementById('btn-record').classList.add('active');
  
  showStatus('Recording started... (max 5 seconds)');
  
  // Auto-stop after 5 seconds
  setTimeout(() => {
    if (isRecording) {
      stopRecording();
    }
  }, 5000);
}

function captureFrame() {
  if (!isRecording) return;
  
  // Capture every 3rd frame for smaller GIF
  if (frameCount % 3 !== 0) return;
  
  // Max 50 frames
  if (recordedFrames.length >= 50) {
    stopRecording();
    return;
  }
  
  const canvas = renderer.domElement;
  recordedFrames.push(canvas.toDataURL('image/png'));
}

function stopRecording() {
  isRecording = false;
  
  document.getElementById('record-indicator').classList.remove('active');
  document.getElementById('btn-record').textContent = '🔴 GIF';
  document.getElementById('btn-record').classList.remove('active');
  
  if (recordedFrames.length < 5) {
    showStatus('Recording too short', 'error');
    return;
  }
  
  showStatus('Processing GIF...');
  createGif();
}

function createGif() {
  // Use gif.js library
  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: 800,
    height: 450,
    workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
  });
  
  let loadedImages = 0;
  const totalImages = recordedFrames.length;
  
  recordedFrames.forEach((dataURL, index) => {
    const img = new Image();
    img.onload = () => {
      // Scale down for smaller file
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 450;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 800, 450);
      
      gif.addFrame(tempCanvas, { delay: 50, copy: true });
      loadedImages++;
      
      if (loadedImages === totalImages) {
        gif.on('finished', (blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `ice-visualizer-${timestamp}.gif`;
          
          const link = document.createElement('a');
          link.download = filename;
          link.href = URL.createObjectURL(blob);
          link.click();
          
          showStatus('GIF saved!', 'success');
          recordedFrames = [];
        });
        
        gif.render();
      }
    };
    img.src = dataURL;
  });
}

// === Status Display ===
function showStatus(message, type = '') {
  const el = document.getElementById('export-status');
  el.textContent = message;
  el.className = 'export-status active ' + type;
  
  setTimeout(() => {
    el.classList.remove('active');
  }, 3000);
}

// === Start ===
init();

console.log('%c ICE VISUALIZER ', 'background: #02d7f2; color: #000; font-size: 16px; font-weight: bold;');
console.log('%c Neural Network Online ', 'background: #ff00aa; color: #fff;');
