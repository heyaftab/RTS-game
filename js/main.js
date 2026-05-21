// ═══════════════════════════════════════════════════════
//  RED ALERT 2 — MINI ENGINE
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

const clickSound = new Audio('Sounds/Clicking_Sound.mp3');
document.addEventListener('click', e => {
  if (e.target.closest('button')) {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }
});

const redLogo = new Image();
redLogo.src = 'assets/red_troop_logo.png';
const blueLogo = new Image();
blueLogo.src = 'assets/blue_troop_logo.png';
const redPowerplant = new Image();
redPowerplant.src = 'assets/Red_Power_Plant.png';
const bluePowerplant = new Image();
bluePowerplant.src = 'assets/Blue_Power_Plant.png';
const redMotherhall = new Image();
redMotherhall.src = 'assets/Red_Motherhall.png';
const blueMotherhall = new Image();
blueMotherhall.src = 'assets/Blue_Motherhall.png';
const redRefinery = new Image();
redRefinery.src = 'assets/Red_Refinery.png';
const blueRefinery = new Image();
blueRefinery.src = 'assets/Blue_Refinery.png';
const redBarrack = new Image();
redBarrack.src = 'assets/Red_Barrack.png';
const blueBarrack = new Image();
blueBarrack.src = 'assets/Blue_Barrack.png';
const redInfantry = new Image();
redInfantry.src = 'assets/Red_Infantry.png';
const blueInfantry = new Image();
blueInfantry.src = 'assets/Blue_Infantry.png';
const redRadar = new Image();
redRadar.src = 'assets/Red_Radar.png';
const blueRadar = new Image();
blueRadar.src = 'assets/Blue_Radar.png';
const redTesla = new Image();
redTesla.src = 'assets/Red_Tesla_Coil.png';
const blueTesla = new Image();
blueTesla.src = 'assets/Blue_Tesla_Coil.png';
const redTurret = new Image();
redTurret.src = 'assets/Red_Turret.png';
const blueTurret = new Image();
blueTurret.src = 'assets/Blue_Turret.png';
const mapImg = new Image();
mapImg.src = 'assets/Map.png';

const rhinoSprites = {
  soviet: Array.from({ length: 8 }, (_, i) => {
    const img = new Image();
    img.src = `assets/Rhino_Red_${i}.png`;
    img.addEventListener('load', () => stripBg(img));
    return img;
  }),
  allied: Array.from({ length: 8 }, (_, i) => {
    const img = new Image();
    img.src = `assets/Rhino_Blue_${i}.png`;
    img.addEventListener('load', () => stripBg(img));
    return img;
  }),
};

const rhinoSheet = {
  soviet: { img: new Image(), frames: [], ready: false },
  allied: { img: new Image(), frames: [], ready: false },
};

function sliceRhinoSheet(team) {
  const sheet = rhinoSheet[team];
  if (!sheet.img.naturalWidth || !sheet.img.naturalHeight) return;
  const frameCount = 8;
  const frameWidth = sheet.img.naturalWidth / frameCount;
  const frameHeight = sheet.img.naturalHeight;
  const frames = [];

  for (let i = 0; i < frameCount; i += 1) {
    const c = document.createElement('canvas');
    c.width = frameWidth;
    c.height = frameHeight;
    const cx = c.getContext('2d');
    cx.drawImage(sheet.img, frameWidth * i, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    const frame = new Image();
    frame.src = c.toDataURL('image/png');
    // ensure background is stripped for generated frames too
    frame.addEventListener('load', () => stripBg(frame));
    frames.push(frame);
  }

  sheet.frames = frames;
  sheet.ready = frames.length === frameCount;
}

function getRhinoSprite(isAlly, dir) {
  const teamKey = isAlly ? 'soviet' : 'allied';
  const sheet = rhinoSheet[teamKey];
  if (sheet.ready && sheet.frames[dir] && sheet.frames[dir].complete && sheet.frames[dir].naturalWidth > 0) {
    return sheet.frames[dir];
  }
  const alt = rhinoSprites[teamKey][dir];
  return alt && alt.complete && alt.naturalWidth > 0 ? alt : null;
}

function stripBg(img, thresh) {
  let working = false;
  function process() {
    if (working) return;
    working = true;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    let d;
    try {
      cx.drawImage(img, 0, 0);
      d = cx.getImageData(0, 0, c.width, c.height);
    } catch (err) {
      // Local file:// image reads can taint canvas. Keep the original sprite.
      return;
    }
    const t = thresh || 200;
    const data = d.data;
    const samples = [
      0,
      (c.width - 1) * 4,
      ((c.height - 1) * c.width) * 4,
      ((c.height - 1) * c.width + c.width - 1) * 4,
      Math.floor(c.width / 2) * 4,
      (Math.floor(c.height / 2) * c.width) * 4,
      (Math.floor(c.height / 2) * c.width + c.width - 1) * 4,
      ((c.height - 1) * c.width + Math.floor(c.width / 2)) * 4,
    ].map(i => [data[i], data[i + 1], data[i + 2]]);
    const seen = new Uint8Array(c.width * c.height);
    const queue = [];

    function isBackgroundPixel(idx) {
      if (data[idx + 3] === 0) return true;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > t && g > t && b > t) return true;
      return samples.some(([sr, sg, sb]) => {
        const dr = r - sr, dg = g - sg, db = b - sb;
        return Math.sqrt(dr * dr + dg * dg + db * db) < 42;
      });
    }

    function push(x, y) {
      if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
      const p = y * c.width + x;
      if (seen[p]) return;
      seen[p] = 1;
      if (isBackgroundPixel(p * 4)) queue.push(p);
    }

    for (let x = 0; x < c.width; x++) {
      push(x, 0);
      push(x, c.height - 1);
    }
    for (let y = 0; y < c.height; y++) {
      push(0, y);
      push(c.width - 1, y);
    }

    while (queue.length) {
      const p = queue.pop();
      data[p * 4 + 3] = 0;
      const x = p % c.width;
      const y = Math.floor(p / c.width);
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    cx.putImageData(d, 0, 0);
    img.src = c.toDataURL('image/png');
  }
  if (img.complete) process(); else img.addEventListener('load', process);
}
stripBg(redBarrack);
stripBg(blueBarrack);
stripBg(redInfantry);
stripBg(blueInfantry);
stripBg(redPowerplant);
stripBg(bluePowerplant);
stripBg(redRadar);
stripBg(blueRadar);
stripBg(redTesla);
stripBg(blueTesla);
stripBg(redTurret);
stripBg(blueTurret);

// Share processed images with sidebar
const sidebarImgMap = {
  'Red_Power_Plant.png': redPowerplant,
  'Red_Infantry.png': redInfantry,
  'Red_Barrack.png': redBarrack,
  'Red_Refinery.png': redRefinery,
  'Red_Radar.png': redRadar,
  'Red_Tesla_Coil.png': redTesla,
  'Red_Turret.png': redTurret,
};
function updateSidebarImgs() {
  document.querySelectorAll('.btn-img').forEach(img => {
    const name = img.src.split('/').pop();
    const srcImg = sidebarImgMap[name];
    if (srcImg && srcImg.complete && srcImg.naturalWidth > 0) {
      img.src = srcImg.src;
    }
  });
}
// Retry until images are processed
const sidebarInterval = setInterval(() => {
  updateSidebarImgs();
  const allDone = Object.values(sidebarImgMap).every(i => i.complete && i.naturalWidth > 0);
  if (allDone) clearInterval(sidebarInterval);
}, 100);

// ── DIFFICULTY ──────────────────────────────────────
let difficulty = null;
const DIFF = {
  easy:   { label:'Easy',   enemyHpMult:0.7,  enemyAtkMult:0.6,  waveInterval:90, maxWaveCount:12, startCredits:5000, enemyCountBase:2,  enemyCountPerWave:1 },
  medium: { label:'Medium', enemyHpMult:1.0,  enemyAtkMult:1.0,  waveInterval:60, maxWaveCount:16, startCredits:2000, enemyCountBase:3,  enemyCountPerWave:2 },
  hard:   { label:'Hard',   enemyHpMult:1.4,  enemyAtkMult:1.3,  waveInterval:40, maxWaveCount:99, startCredits:1000, enemyCountBase:4,  enemyCountPerWave:3 },
};

// World size
const WORLD_W = 1688;
const WORLD_H = 932;
const TILE = 20;

// Camera
let cam = { x: 200, y: 200, zoom: 1.0 };
let camTarget = { x: 200, y: 200, zoom: 1.0 };

// ── SOUND SYSTEM ────────────────────────────────────
const SOUNDS = {
  landingPageSong: new Audio('Sounds/Landing_Page_Song.mp3'),
  themeSong: new Audio('Sounds/Theme_Song.mp3'),
  building: new Audio('Sounds/building.mp3'),
  cancel: new Audio('Sounds/cancel.mp3'),
  constructionCompleted: new Audio('Sounds/construction-completed.mp3'),
  insufficientBalance: new Audio('Sounds/insufficient-balance.mp3'),
  newConstructionOptions: new Audio('Sounds/new-construction-options.mp3'),
  onHold: new Audio('Sounds/on-hold.mp3'),
  ourBaseIsInDanger: new Audio('Sounds/our-base-is-in-danger.mp3'),
  unitReady: new Audio('Sounds/unit-ready.mp3'),
  losingSound: new Audio('Sounds/Loosing_Sound.mp3'),
  yesSir: new Audio('Sounds/yes-sir.mp3'),
  congratulations: new Audio('Sounds/congratulations.mp3'),
  absolutely: new Audio('Sounds/absolutely.mp3'),
  movingOut: new Audio('Sounds/moving-out.mp3'),
  affirmative: new Audio('Sounds/affirmative.mp3'),
  yesCommander: new Audio('Sounds/yes-commander.mp3'),
  dogSound: new Audio('Sounds/dog_sound.mp3'),
};

let audioVolumes = {
  master: 0.5,
  music: 0.5,
  sfx: 0.5,
  isMuted: false,
};

// Initialize audio properties
Object.values(SOUNDS).forEach(audio => {
  audio.volume = audioVolumes.master * audioVolumes.sfx;
});

// Set loop for background themes
SOUNDS.themeSong.loop = true;
SOUNDS.landingPageSong.loop = true;

function playSound(soundName) {
  if (SOUNDS[soundName]) {
    SOUNDS[soundName].currentTime = 0;
    SOUNDS[soundName].play().catch(() => {}); // Ignore autoplay restrictions
  }
}

function playAudioSafe(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function stopSound(soundName) {
  if (SOUNDS[soundName]) {
    SOUNDS[soundName].pause();
    SOUNDS[soundName].currentTime = 0;
  }
}

function updateMasterVolume(value) {
  audioVolumes.master = value / 100;
  document.getElementById('masterVolumeValue').textContent = value + '%';
  applyVolumeSettings();
}

function updateMusicVolume(value) {
  audioVolumes.music = value / 100;
  document.getElementById('musicVolumeValue').textContent = value + '%';
  applyVolumeSettings();
}

function updateSFXVolume(value) {
  audioVolumes.sfx = value / 100;
  document.getElementById('sfxVolumeValue').textContent = value + '%';
  applyVolumeSettings();
}

function applyVolumeSettings() {
  const masterMultiplier = audioVolumes.isMuted ? 0 : 1;
  
  // Music tracks
  SOUNDS.themeSong.volume = audioVolumes.master * audioVolumes.music * masterMultiplier;
  SOUNDS.landingPageSong.volume = audioVolumes.master * audioVolumes.music * masterMultiplier;
  
  // SFX tracks
  SOUNDS.building.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.cancel.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.constructionCompleted.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.insufficientBalance.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.newConstructionOptions.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.onHold.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.ourBaseIsInDanger.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
  SOUNDS.unitReady.volume = audioVolumes.master * audioVolumes.sfx * masterMultiplier;
}

function toggleMute() {
  audioVolumes.isMuted = !audioVolumes.isMuted;
  const muteBtn = document.getElementById('muteBtn');
  if (audioVolumes.isMuted) {
    muteBtn.classList.add('muted');
    muteBtn.textContent = '🔇 MUTED';
  } else {
    muteBtn.classList.remove('muted');
    muteBtn.textContent = '🔊 MUTE';
  }
  applyVolumeSettings();
}

function resetAudio() {
  audioVolumes.master = 0.5;
  audioVolumes.music = 0.5;
  audioVolumes.sfx = 0.5;
  audioVolumes.isMuted = false;
  
  document.getElementById('masterVolume').value = 50;
  document.getElementById('musicVolume').value = 50;
  document.getElementById('sfxVolume').value = 50;
  document.getElementById('masterVolumeValue').textContent = '50%';
  document.getElementById('musicVolumeValue').textContent = '50%';
  document.getElementById('sfxVolumeValue').textContent = '50%';
  
  const muteBtn = document.getElementById('muteBtn');
  muteBtn.classList.remove('muted');
  muteBtn.textContent = '🔊 MUTE';
  
  applyVolumeSettings();
}

// Game state
let credits = 2000;
let power = 10;
let wave = 1;
let waveTimer = 0;
let WAVE_INTERVAL = 60;
let gameOver = false;
let winner = null;
let paused = false;
let difficultyStarting = false;

// ID counter
let nextId = 1;
function uid() { return nextId++; }

// ── TERRAIN MAP ──────────────────────────────────────
const MAP_COLS = Math.ceil(WORLD_W / TILE);
const MAP_ROWS = Math.ceil(WORLD_H / TILE);
const terrain = [];
let decorations = [];
let fogRevealed = [];
let fogCurrent = [];
let gameTime = 0;
let fogUpdateTimer = 0;
let fogCanvas = null;
let fogCtx = null;
let fogDirty = true;
let fogHintTiles = new Set();
let lastCreditsDisplay = null;
let lastPowerDisplay = null;

function getCameraView() {
  const vw = canvas.width / cam.zoom;
  const vh = canvas.height / cam.zoom;
  const x = Math.max(0, cam.x - vw / 2);
  const y = Math.max(0, cam.y - vh / 2);
  return {
    x,
    y,
    w: Math.min(WORLD_W - x, vw),
    h: Math.min(WORLD_H - y, vh),
  };
}

function initFogCanvas() {
  fogCanvas = document.createElement('canvas');
  fogCanvas.width = WORLD_W;
  fogCanvas.height = WORLD_H;
  fogCtx = fogCanvas.getContext('2d');
  fogCtx.fillStyle = '#000';
  fogCtx.fillRect(0, 0, WORLD_W, WORLD_H);
  fogDirty = false;
}

function updateFogTile(r, c) {
  if (!fogCtx) return;
  if (!fogRevealed[r][c]) {
    fogCtx.fillStyle = fogHintTiles.has(r * MAP_COLS + c) ? 'rgba(0,0,0,0.95)' : '#000';
    fogCtx.fillRect(c * TILE, r * TILE, TILE, TILE);
  } else {
    fogCtx.clearRect(c * TILE, r * TILE, TILE, TILE);
  }
}

function rebuildFogCanvas() {
  if (!fogCtx) return;
  fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      updateFogTile(r, c);
    }
  }
  fogDirty = false;
}

function rebuildFogHints() {
  fogHintTiles = new Set();
  entities.forEach(e => {
    if (e.team === 'allied' && e.kind === 'structure') {
      const ec = Math.floor(e.x / TILE), er = Math.floor(e.y / TILE);
      const wt = Math.ceil((e.w || TILE) / TILE), ht = Math.ceil((e.h || TILE) / TILE);
      for (let dr = -1; dr < ht + 1; dr++) {
        for (let dc = -1; dc < wt + 1; dc++) {
          fogHintTiles.add((er + dr) * MAP_COLS + (ec + dc));
        }
      }
    }
  });
  fogDirty = true;
}

function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const v00 = hash(ix, iy) / 0x7fffffff;
  const v10 = hash(ix + 1, iy) / 0x7fffffff;
  const v01 = hash(ix, iy + 1) / 0x7fffffff;
  const v11 = hash(ix + 1, iy + 1) / 0x7fffffff;
  return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v11 - v10 - v01 + v00) * sx * sy;
}

function initTerrain() {
  for (let r = 0; r < MAP_ROWS; r++) {
    terrain[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const n = smoothNoise(c * 0.5, r * 0.5);
      terrain[r][c] = { type: 'grass', noise: n, elevation: 0.5, detail: 0.5 };
    }
  }
  decorations = [];
}

function isWalkable(wx, wy) {
  const c = Math.floor(wx / TILE);
  const r = Math.floor(wy / TILE);
  if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false;
  return terrain[r][c].type !== 'water';
}

// ── ENTITY TYPES ─────────────────────────────────────
const UNIT_DEFS = {
  conscript:     { name:'Conscript',     hp:80,   spd:60,  atk:15, range:80,  atkSpd:1.2, sight:120, type:'infantry', size:10, color:'#cc2200', icon:'🪖', cost:100 },
  dog:           { name:'War Dog',       hp:60,   spd:100, atk:25, range:40,  atkSpd:1.5, sight:100, type:'infantry', size:8,  color:'#aa4400', icon:'🐕', cost:200 },
  rhino:         { name:'Rhino Tank',    hp:300,  spd:70,  atk:60, range:120, atkSpd:1.8, sight:160, type:'vehicle',  size:16, color:'#884422', icon:'🚂', cost:900 },
  tesla_trooper: { name:'Tesla Trooper', hp:100,  spd:55,  atk:45, range:70,  atkSpd:1.0, sight:120, type:'infantry', size:10, color:'#0088ff', icon:'⚡', cost:500 },
  v3:            { name:'V3 Rocket',     hp:150,  spd:60,  atk:100,range:200, atkSpd:3.0, sight:180, type:'vehicle',  size:14, color:'#664400', icon:'🚀', cost:1200 },
  apocalypse:    { name:'Apocalypse',    hp:600,  spd:45,  atk:120,range:140, atkSpd:2.0, sight:180, type:'vehicle',  size:20, color:'#551100', icon:'💀', cost:2000 },
  // Enemy units
  gi:            { name:'GI',            hp:70,   spd:55,  atk:12, range:80,  atkSpd:1.2, sight:110, type:'infantry', size:10, color:'#0044bb', icon:'🪖', cost:0 },
  grizzly:       { name:'Grizzly Tank',  hp:250,  spd:75,  atk:50, range:120, atkSpd:1.8, sight:150, type:'vehicle',  size:15, color:'#224488', icon:'🚂', cost:0 },
  prism:         { name:'Prism Tank',    hp:180,  spd:65,  atk:80, range:180, atkSpd:2.5, sight:200, type:'vehicle',  size:14, color:'#3366cc', icon:'✨', cost:0 },
  chrono:        { name:'Chrono Tank',   hp:220,  spd:85,  atk:65, range:130, atkSpd:1.6, sight:160, type:'vehicle',  size:15, color:'#5588dd', icon:'🌀', cost:0 },
  harvester_e:   { name:'Harvester',     hp:200,  spd:50,  atk:0,  range:0,   atkSpd:99,  sight:80,  type:'vehicle',  size:16, color:'#ffaa00', icon:'🚜', cost:0 },
};

const STRUCT_DEFS = {
  conyard:     { name:'Construction Yard', hp:1000, pw:0,   size:6, color:'#bb4422', icon:'🏛️', cost:0 },
  barracks:    { name:'Infantry',          hp:500,  pw:-5,  size:4, color:'#cc5533', icon:'🏭', cost:300 },
  warfactory:  { name:'Barracks',          hp:800,  pw:-10, size:6, color:'#bb5533', icon:'🏗️', cost:2000 },
  refinery:    { name:'Ore Refinery',      hp:700,  pw:-8,  size:4, wTiles:6, hTiles:4, color:'#cc8844', icon:'🏚️', cost:2000 },
  turret:      { name:'Tesla Turret',      hp:400,  pw:-5,  size:2, color:'#993333', icon:'🗼', cost:600,  atk:70, range:160, atkSpd:2.0 },
  tesla:       { name:'Tesla Coil',        hp:500,  pw:-15, size:4, color:'#5533aa', icon:'⚡', cost:1500, atk:120,range:200, atkSpd:2.5 },
  wall:        { name:'Wall',              hp:250,  pw:0,   size:1, color:'#55514a', icon:'▰', cost:100 },
  radar:       { name:'Radar Dome',        hp:400,  pw:-8,  size:4, color:'#556633', icon:'📡', cost:1000 },
  powerplant:  { name:'Power Plant',       hp:400,  pw:20,  size:4, color:'#885533', icon:'🏭', cost:500 },
  // Allied structures
  alliedcy:    { name:'Construction Yard', hp:1000, pw:0,   size:6, color:'#2244aa', icon:'🏛️', cost:0 },
  alliedbar:   { name:'Allied Barracks',   hp:500,  pw:-5,  size:4, color:'#3355bb', icon:'🏭', cost:0 },
  chronosphere:{ name:'Chronosphere',      hp:600,  pw:-20, size:4, color:'#4477cc', icon:'🌀', cost:0 },
  prismtower:  { name:'Prism Tower',       hp:500,  pw:-15, size:4, color:'#3355aa', icon:'✨', cost:0, atk:100,range:200, atkSpd:2.0 },
};

// ── ENTITY OBJECTS ───────────────────────────────────
let entities = []; // all units & structures

function spawnUnit(type, x, y, team) {
  const def = UNIT_DEFS[type];
  const d = team === 'allied' && difficulty ? DIFF[difficulty] : null;
  const hpMult = d ? d.enemyHpMult : 1;
  const atkMult = d ? d.enemyAtkMult : 1;
  return {
    id: uid(), kind:'unit', type, team,
    x, y, tx: x, ty: y,
    hp: def.hp * hpMult, maxHp: def.hp * hpMult,
    atk: def.atk * atkMult, range: def.range, atkSpd: def.atkSpd, spd: def.spd,
    sight: def.sight, size: def.size, color: def.color, icon: def.icon,
    name: def.name,
    state: 'idle',
    target: null,
    atkTimer: 0,
    moveTimer: 0,
    facing: 0,
    selected: false,
    attackMove: false,
    path: [],
  };
}

function spawnStructure(type, gx, gy, team) {
  const def = STRUCT_DEFS[type];
  const wt = def.wTiles || def.size;
  const ht = def.hTiles || def.size;
  const sz = def.size * TILE;
  return {
    id: uid(), kind:'structure', type, team,
    x: gx * TILE, y: gy * TILE,
    w: wt * TILE, h: ht * TILE,
    hp: def.hp, maxHp: def.hp,
    pw: def.pw,
    atk: def.atk || 0, range: def.range || 0, atkSpd: def.atkSpd || 99,
    sight: Math.max(160, (def.range || 0) * 1.5),
    color: def.color, icon: def.icon, name: def.name,
    state: 'idle', target: null, atkTimer: 0,
    selected: false,
    rallyX: gx * TILE + sz / 2 + 40,
    rallyY: gy * TILE + sz,
    level: type === 'radar' ? 1 : undefined,
  };
}

function initGame() {
  entities = [];
  selected = [];
  effects = [];
  trainingQueue = [];
  oreDeposits = [];
  refineryTimer = 0;
  radarHealTimer = 0;
  fogDirty = true;
  credits = difficulty ? DIFF[difficulty].startCredits : 2000;
  lastCreditsDisplay = null;
  lastPowerDisplay = null;
  wave = 1;
  waveTimer = 0;
  gameOver = false;
  paused = false;
  placing = null;
  document.getElementById('pause-overlay').classList.remove('visible');
  document.getElementById('pause-btn').textContent = '⏸';
  document.getElementById('wave-num').textContent = '1';
  document.getElementById('canvas-wrap').classList.remove('placing');
  // Player base (Soviet) — bottom-left area
  entities.push(spawnStructure('conyard', 6, 34, 'soviet'));
  entities.push(spawnStructure('barracks', 14, 34, 'soviet'));
  entities.push(spawnStructure('refinery', 6, 40, 'soviet'));
  entities.push(spawnStructure('turret', 22, 34, 'soviet'));
  entities.push(spawnStructure('turret', 22, 40, 'soviet'));

  // Some starting units
  for (let i = 0; i < 5; i++) {
    entities.push(spawnUnit('conscript', 200 + i * 25, 600 + (i%2)*30, 'soviet'));
  }
  entities.push(spawnUnit('rhino', 300, 650, 'soviet'));

  // Allied base (top-right)
  entities.push(spawnStructure('alliedcy', 66, 4, 'allied'));
  entities.push(spawnStructure('alliedbar', 72, 4, 'allied'));
  entities.push(spawnStructure('prismtower', 62, 4, 'allied'));
  entities.push(spawnStructure('prismtower', 62, 10, 'allied'));
  entities.push(spawnStructure('chronosphere', 76, 4, 'allied'));

  oreDeposits = createOreDeposits(ORE_DEPOSIT_COUNT);

  // Spawn harvester
  entities.push(spawnUnit('conscript', 350, 700, 'soviet'));
  rebuildFogHints();
}

// ── ORE & ECONOMY ────────────────────────────────────
let oreDeposits = [];
let refineryTimer = 0;
const ORE_DEPOSIT_COUNT = 7;
const ORE_MIN_SPACING = 120;
let oreCanvas = null;

function createOreCanvas() {
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 24;
  const cx = c.getContext('2d');
  cx.shadowColor = 'rgba(255,220,70,0.8)';
  cx.shadowBlur = 8;
  const shards = [
    { x: 3, y: 13, w: 8, h: 18, a: -0.35, c1: '#fff08a', c2: '#a66b00' },
    { x: 12, y: 10, w: 10, h: 24, a: 0.08, c1: '#fff7b0', c2: '#d89910' },
    { x: 21, y: 14, w: 7, h: 16, a: 0.42, c1: '#ffe36a', c2: '#8f5700' },
    { x: 11, y: 21, w: 13, h: 11, a: 1.38, c1: '#ffd74b', c2: '#6d4300' },
  ];
  shards.forEach(sh => {
    cx.save();
    cx.translate(sh.x, sh.y);
    cx.rotate(sh.a);
    const grad = cx.createLinearGradient(0, -sh.h / 2, 0, sh.h / 2);
    grad.addColorStop(0, sh.c1);
    grad.addColorStop(0.45, '#f3b21c');
    grad.addColorStop(1, sh.c2);
    cx.fillStyle = grad;
    cx.strokeStyle = 'rgba(60,35,0,0.85)';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(0, -sh.h / 2);
    cx.lineTo(sh.w / 2, -sh.h * 0.08);
    cx.lineTo(sh.w * 0.28, sh.h / 2);
    cx.lineTo(-sh.w * 0.34, sh.h * 0.42);
    cx.lineTo(-sh.w / 2, -sh.h * 0.08);
    cx.closePath();
    cx.fill();
    cx.stroke();
    cx.strokeStyle = 'rgba(255,255,210,0.58)';
    cx.beginPath();
    cx.moveTo(0, -sh.h * 0.38);
    cx.lineTo(sh.w * 0.18, sh.h * 0.28);
    cx.stroke();
    cx.restore();
  });
  cx.shadowBlur = 0;
  cx.fillStyle = 'rgba(255,235,130,0.45)';
  cx.beginPath();
  cx.arc(7, 5, 1.8, 0, Math.PI * 2);
  cx.arc(19, 2, 1.4, 0, Math.PI * 2);
  cx.fill();
  oreCanvas = c;
}

function updateEconomy(dt) {
  // Passive income from refineries
  refineryTimer += dt;
  if (refineryTimer >= 5) {
    refineryTimer = 0;
    const refs = entities.filter(e => e.kind==='structure' && e.type==='refinery' && e.team==='soviet');
    if (refs.length > 0) {
      addCredits(200 * refs.length);
    }
  }
  // Power
  let pw = 10;
  entities.filter(e => e.kind==='structure' && e.team==='soviet').forEach(s => pw += (s.pw || 0));
  power = pw;
  const displayCredits = Math.floor(credits);
  if (displayCredits !== lastCreditsDisplay) {
    document.getElementById('sidebar-credits').textContent = displayCredits;
    lastCreditsDisplay = displayCredits;
  }
  if (power !== lastPowerDisplay) {
    updatePowerMeter(power);
    lastPowerDisplay = power;
  }
}

function updatePowerMeter(value) {
  const green = document.getElementById('power-meter-green');
  const yellow = document.getElementById('power-meter-yellow');
  const red = document.getElementById('power-meter-red');
  if (!green || !yellow || !red) return;

  let greenWeight = 1;
  let yellowWeight = 1;
  let redWeight = 1;

  if (value > 10) {
    greenWeight += Math.min(4, ((value - 10) / 40) * 4);
  } else if (value < -10) {
    redWeight += Math.min(4, ((Math.abs(value) - 10) / 40) * 4);
  } else {
    yellowWeight += (1 - Math.abs(value) / 10) * 4;
  }

  const total = greenWeight + yellowWeight + redWeight;
  green.style.height = `${(greenWeight / total) * 100}%`;
  yellow.style.height = `${(yellowWeight / total) * 100}%`;
  red.style.height = `${(redWeight / total) * 100}%`;
}

function addCredits(n) {
  credits = Math.min(credits + n, 99999);
  showAlert(`+$${n} Credits`, false);
}

function showAlert(message, urgent = false) {
  const overlay = document.getElementById('alert-overlay');
  const msgBar = document.getElementById('msg-bar');
  if (msgBar) msgBar.textContent = message;
  if (!overlay) return;

  const el = document.createElement('div');
  el.className = 'alert-msg';
  el.textContent = message;
  if (urgent) {
    el.style.borderColor = '#ffcc33';
    el.style.color = '#ffcc33';
  }
  overlay.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function createOreDeposits(count) {
  const deposits = [];
  for (let i = 0; i < count; i++) {
    const ore = { x: 0, y: 0, angle: 0, available: true, respawnTimer: 0 };
    spawnOre(ore, deposits);
    deposits.push(ore);
  }
  return deposits;
}

function spawnOre(o, others = oreDeposits) {
  let x = o.x, y = o.y;
  for (let tries = 0; tries < 120; tries++) {
    x = 80 + Math.random() * (WORLD_W - 160);
    y = 80 + Math.random() * (WORLD_H - 160);
    const clearOfOre = others.every(other => other === o || Math.hypot(other.x - x, other.y - y) >= ORE_MIN_SPACING);
    const clearOfBase = entities.every(en => Math.hypot(cx(en) - x, cy(en) - y) >= 120);
    if (isWalkable(x, y) && clearOfOre && clearOfBase) break;
  }
  o.x = x;
  o.y = y;
  o.angle = Math.random() * Math.PI * 2;
  o.available = true;
  o.respawnTimer = 0;
}

function updateOre(dt) {
  oreDeposits.forEach(o => {
    if (!o.available) {
      o.respawnTimer -= dt;
      if (o.respawnTimer <= 0) spawnOre(o);
      return;
    }
    for (const e of entities) {
      if (e.kind === 'unit' && Math.hypot(e.x - o.x, e.y - o.y) < 25) {
        const amount = 200;
        if (e.team === 'soviet') credits = Math.min(credits + amount, 99999);
        showAlert(`${e.team === 'soviet' ? '+' : 'Enemy +'}$${amount} Credits`);
        o.available = false;
        o.respawnTimer = 40;
        break;
      }
    }
  });
}

// ── WAVE SYSTEM ──────────────────────────────────────
function updateWaves(dt) {
  if (!difficulty) return;
  waveTimer += dt;
  const interval = difficulty ? DIFF[difficulty].waveInterval : 60;
  const pct = (waveTimer / interval) * 100;
  document.getElementById('wave-fill').style.width = pct + '%';
  if (waveTimer >= interval) {
    waveTimer = 0;
    spawnWave();
    wave++;
    document.getElementById('wave-num').textContent = wave;
  }
}

function spawnWave() {
  const d = DIFF[difficulty];
  const count = Math.min(d.enemyCountBase + wave * d.enemyCountPerWave, d.maxWaveCount);
  const types = getWaveTypes();
  for (let i = 0; i < count; i++) {
    const t = types[Math.floor(Math.random() * types.length)];
    const x = WORLD_W - 200 + (Math.random() - 0.5) * 200;
    const y = 100 + Math.random() * 200;
    const u = spawnUnit(t, x, y, 'allied');
    u.state = 'attack';
    u.attackMove = true;
    u.tx = 120 + Math.random() * 380;
    u.ty = 680 + Math.random() * 150;
    entities.push(u);
  }
  showAlert(`⚠ ENEMY ATTACK! Wave ${wave}`, true);
}

function getWaveTypes() {
  if (wave <= 2) return ['gi'];
  if (wave <= 4) return ['gi', 'gi', 'rhino'];
  if (wave <= 6) return ['gi', 'rhino', 'rhino'];
  if (wave <= 8) return ['rhino', 'v3', 'gi'];
  return ['rhino', 'v3', 'apocalypse', 'v3'];
}

// ── SELECTION ────────────────────────────────────────
let selected = [];
let selBox = { active: false, sx:0, sy:0, ex:0, ey:0 };
let mouseWorld = {x:0, y:0};
let placing = null; // structure type being placed

function selectEntities(ids) {
  entities.forEach(e => e.selected = false);
  selected = [];
  ids.forEach(id => {
    const e = entities.find(x => x.id === id);
    if (e) { e.selected = true; selected.push(e); }
  });
  updateSelInfo();
}

function updateSelInfo() {
  const el = document.getElementById('sel-info');
  if (selected.length === 0) {
    el.innerHTML = '<div class="sel-info-empty">[ Select a unit or building ]</div>';
    return;
  }
  if (selected.length > 1) {
    el.innerHTML = `<div class="sel-name">${selected.length} units selected</div>`;
    return;
  }
  const e = selected[0];
  const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
  const hpColor = hpPct > 60 ? '#22cc44' : hpPct > 30 ? '#ddaa00' : '#cc2200';
  el.innerHTML = `
    <div class="sel-name">${e.icon || '?'} ${e.name}</div>
    <div class="health-bar-wrap"><div class="health-bar" style="width:${hpPct}%;background:${hpColor}"></div></div>
    <div class="stat-row"><span>HP</span><span>${Math.ceil(e.hp)}/${e.maxHp}</span></div>
    ${e.atk ? `<div class="stat-row"><span>ATK</span><span>${e.atk}</span></div>` : ''}
    ${e.range ? `<div class="stat-row"><span>RANGE</span><span>${e.range}</span></div>` : ''}
    ${e.spd ? `<div class="stat-row"><span>SPD</span><span>${e.spd}</span></div>` : ''}
    <div class="stat-row"><span>TEAM</span><span style="color:${e.team==='soviet'?'#ff3300':'#3366ff'}">${e.team.toUpperCase()}</span></div>
    ${e.team === 'soviet' && e.kind === 'unit' ? `<div class="stat-row"><span>RADAR</span><span style="color:${hasRadarBuff(e)?'#ffcc44':'#666'}">${hasRadarBuff(e)?'BOOSTED ✓':'—'}</span></div>` : ''}
    ${e.type === 'radar' && e.team === 'soviet' ? `
      <div class="stat-row"><span>LEVEL</span><span>${e.level}/5</span></div>
      <div class="stat-row"><span>MAP</span><span>${RADAR_LEVEL_PCT[e.level]}%</span></div>
      <button class="upgrade-btn" onclick="upgradeRadar()">⬆ UPGRADE $${RADAR_UPGRADE_COST[e.level]}</button>
    ` : ''}
    ${e.team === 'soviet' ? '<button class="action-btn">SELL / DISBAND</button>' : ''}
  `;
  const sellBtn = el.querySelector('.action-btn');
  if (sellBtn) sellBtn.addEventListener('click', deleteSelected);
}

function updateSelInfoHP() {
  if (selected.length !== 1) return;
  const e = selected[0];
  const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
  const hpColor = hpPct > 60 ? '#22cc44' : hpPct > 30 ? '#ddaa00' : '#cc2200';
  const hpBar = document.querySelector('#sel-info .health-bar');
  const hpVal = document.querySelector('#sel-info .stat-row:nth-child(3) span:last-child');
  if (hpBar) {
    hpBar.style.width = hpPct + '%';
    hpBar.style.background = hpColor;
  }
  if (hpVal) {
    hpVal.textContent = `${Math.ceil(e.hp)}/${e.maxHp}`;
  }
}

function deleteSelected() {
  selected.forEach(e => {
    if (e.kind === 'structure') credits += Math.floor((STRUCT_DEFS[e.type]?.cost || 0) * 0.5);
    entities = entities.filter(x => x.id !== e.id);
  });
  selected = [];
  updateSelInfo();
}

// ── COMBAT ───────────────────────────────────────────
function dist(a, b) {
  const ax = a.x + (a.w || 0) / 2;
  const ay = a.y + (a.h || 0) / 2;
  const bx = b.x + (b.w || 0) / 2;
  const by = b.y + (b.h || 0) / 2;
  return Math.hypot(ax - bx, ay - by);
}

function cx(e) { return e.x + (e.w || 0) / 2; }
function cy(e) { return e.y + (e.h || 0) / 2; }

function hasRadarBuff(e) {
  if (e.team !== 'soviet') return false;
  return entities.some(x => x.kind === 'structure' && x.type === 'radar' && x.team === 'soviet' && dist(e, x) < 300);
}

function findTarget(e) {
  const enemies = entities.filter(x => x.team !== e.team && x.hp > 0);
  const sightMult = hasRadarBuff(e) ? 1.5 : 1;
  let best = null, bestD = Infinity;
  for (const en of enemies) {
    const d = dist(e, en);
    if (d < bestD && d <= e.sight * sightMult) { best = en; bestD = d; }
  }
  return best;
}

function updateCombat(e, dt) {
  if (e.atk === 0) return;
  e.atkTimer = Math.max(0, e.atkTimer - dt);

  if (!e.target || e.target.hp <= 0 || !entities.includes(e.target)) {
    if (e.team === 'allied' && e.state === 'attack') {
      let best = null, bestD = Infinity;
      for (const en of entities) {
        if (en.team === 'soviet' && en.hp > 0) {
          const d = dist(e, en);
          const weight = en.kind === 'structure' ? 0.85 : 1;
          if (d * weight < bestD) { best = en; bestD = d * weight; }
        }
      }
      e.target = best;
    } else {
      e.target = findTarget(e);
    }
  }

  if (e.target) {
    const d = dist(e, e.target);
    if (d <= e.range) {
      if (e.kind === 'unit') { e.tx = e.x; e.ty = e.y; }
      if (e.atkTimer <= 0) {
        const dmgMult = hasRadarBuff(e) ? 1.3 : 1;
        const dmg = e.atk * dmgMult;
        if (e.type === 'tesla' || e.type === 'tesla_trooper') {
          fireTeslaShock(e, e.target, dmg);
        } else {
          e.target.hp -= dmg;
          spawnEffect(cx(e.target), cy(e.target), 'hit');
        }
        
        // Play danger sound if Soviet base was hit
        if (e.target.team === 'soviet' && e.target.type === 'conyard') {
          playSound('ourBaseIsInDanger');
        }
        
        e.atkTimer = e.atkSpd;
        // Retaliation — damaged entity fights back
        if (e.target.team === 'soviet' && e.target.kind === 'unit' && (!e.target.target || e.target.target.hp <= 0 || !entities.includes(e.target.target))) {
          e.target.target = e;
          e.target.state = 'attack';
        }
        if (e.target.hp <= 0) {
          onDeath(e.target);
        }
      }
    } else if (e.kind === 'unit' && (e.attackMove || e.state === 'attack')) {
      e.tx = cx(e.target);
      e.ty = cy(e.target);
    }
  }
}

function fireTeslaShock(attacker, target, damage) {
  const fromX = cx(attacker);
  const fromY = attacker.kind === 'structure'
    ? attacker.y + attacker.h * 0.18
    : cy(attacker) - (attacker.size || 10) * 0.6;
  const toX = cx(target);
  const toY = cy(target);

  target.hp -= damage;
  spawnTeslaArc(fromX, fromY, toX, toY, true);
  spawnEffect(toX, toY, 'teslaHit');

  // Tesla arcs bite nearby enemies too, but at reduced power.
  if (attacker.type === 'tesla') {
    const chainRange = 74;
    const chainDamage = damage * 0.35;
    entities
      .filter(e => e !== target && e.team !== attacker.team && e.hp > 0 && dist(target, e) <= chainRange)
      .slice(0, 3)
      .forEach(e => {
        e.hp -= chainDamage;
        spawnTeslaArc(toX, toY, cx(e), cy(e), false);
        spawnEffect(cx(e), cy(e), 'teslaHit');
        if (e.hp <= 0) onDeath(e);
      });
  }
}

function initFog() {
  fogRevealed = [];
  fogCurrent = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    fogRevealed[r] = new Array(MAP_COLS).fill(false);
    fogCurrent[r] = new Array(MAP_COLS).fill(false);
  }
}

function updateFog(dt) {
  fogUpdateTimer += dt;
  if (fogUpdateTimer < 0.1) return;
  fogUpdateTimer = 0;
  // Reset current visibility
  for (let r = 0; r < MAP_ROWS; r++)
    for (let c = 0; c < MAP_COLS; c++)
      fogCurrent[r][c] = false;
  // Reveal from units
  const viewers = entities.filter(e => (e.kind === 'unit' || (e.kind === 'structure' && e.team === 'soviet')) && e.team === 'soviet' && e.hp > 0);
  viewers.forEach(e => {
    const er = e.y / TILE, ec = e.x / TILE;
    const sight = Math.ceil((e.sight || 8) / TILE) + 2;
    for (let dr = -sight; dr <= sight; dr++) {
      for (let dc = -sight; dc <= sight; dc++) {
        const r = Math.round(er + dr), c = Math.round(ec + dc);
        if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) continue;
        if (dr * dr + dc * dc <= sight * sight) {
          fogCurrent[r][c] = true;
          if (!fogRevealed[r][c]) {
            fogRevealed[r][c] = true;
            updateFogTile(r, c);
          }
        }
      }
    }
  });
}

function drawFog() {
  if (fogDirty) rebuildFogCanvas();

  const view = getCameraView();
  const dest = worldToScreen(view.x, view.y);
  ctx.drawImage(
    fogCanvas,
    view.x,
    view.y,
    view.w,
    view.h,
    dest.x,
    dest.y,
    view.w * cam.zoom,
    view.h * cam.zoom
  );
}

let radarHealTimer = 0;
function updateRadarHeal(dt) {
  radarHealTimer += dt;
  if (radarHealTimer < 0.5) return;
  radarHealTimer = 0;
  const radars = entities.filter(x => x.kind === 'structure' && x.type === 'radar' && x.team === 'soviet' && x.hp > 0);
  if (radars.length === 0) return;
  entities.filter(e => e.team === 'soviet' && e.hp > 0 && e.hp < e.maxHp).forEach(e => {
    const nearRadar = radars.some(r => dist(e, r) < 300);
    if (nearRadar) {
      e.hp = Math.min(e.maxHp, e.hp + 3);
      spawnEffect(cx(e), cy(e) - 10, 'smoke');
    }
  });
}

const RADAR_LEVEL_PCT = [0, 10, 25, 40, 60, 80];
const RADAR_UPGRADE_COST = [0, 500, 1000, 2000, 4000, 99999];

function revealFogByRadar(level) {
  if (!level || level < 1) level = 1;
  const targetPct = RADAR_LEVEL_PCT[Math.min(level, 5)];
  const totalTiles = MAP_ROWS * MAP_COLS;
  let revealed = 0;
  for (let r = 0; r < MAP_ROWS; r++)
    for (let c = 0; c < MAP_COLS; c++)
      if (fogRevealed[r][c]) revealed++;
  const needed = Math.floor(totalTiles * targetPct / 100) - revealed;
  if (needed <= 0) return;
  // Collect hidden tiles
  const hidden = [];
  for (let r = 0; r < MAP_ROWS; r++)
    for (let c = 0; c < MAP_COLS; c++)
      if (!fogRevealed[r][c]) hidden.push([r, c]);
  // Shuffle and reveal
  for (let i = hidden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hidden[i], hidden[j]] = [hidden[j], hidden[i]];
  }
  const revealCount = Math.min(needed, hidden.length);
  for (let i = 0; i < revealCount; i++) {
    const [r, c] = hidden[i];
    fogRevealed[r][c] = true;
  }
}

function upgradeRadar() {
  const radar = entities.find(e => e.type === 'radar' && e.team === 'soviet' && e.hp > 0);
  if (!radar) { showAlert('No Radar Dome!'); return; }
  if (radar.level >= 5) { showAlert('Max level!'); return; }
  const cost = RADAR_UPGRADE_COST[radar.level];
  if (credits < cost) { showAlert(`Need $${cost}!`); return; }
  credits -= cost;
  radar.level++;
  revealFogByRadar(radar.level);
  const pct = RADAR_LEVEL_PCT[radar.level];
  showAlert(`Radar Level ${radar.level} — ${pct}% map revealed`);
  updateSelInfo();
}

function onDeath(e) {
  spawnEffect(cx(e), cy(e), 'explosion');
  if (e.team === 'allied' && e.kind === 'unit') {
    credits += 50;
  }
  entities = entities.filter(x => x.id !== e.id);
  if (selected.includes(e)) {
    selected = selected.filter(x => x.id !== e.id);
    updateSelInfo();
  }

  // Check win/lose
  const sovietCY = entities.find(x => x.type === 'conyard' && x.team === 'soviet');
  const alliedCY = entities.find(x => x.type === 'alliedcy' && x.team === 'allied');
  if (!sovietCY) { endGame('allied'); }
  if (!alliedCY) { endGame('soviet'); }
  if (e.team === 'allied' && e.kind === 'structure') rebuildFogHints();
}

function minimapClick(e) {
  const rect = minimap.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * WORLD_W;
  const y = (e.clientY - rect.top) / rect.height * WORLD_H;
  camTarget.x = x;
  camTarget.y = y;
  cam.x = x;
  cam.y = y;
  clampCam();
}

let menuAnimationFrame = null;

function startMenuAnimation() {
  const menuCanvas = document.getElementById('menu-canvas');
  const overlay = document.getElementById('difficulty-overlay');
  if (!menuCanvas || !overlay || menuAnimationFrame) return;

  const menuCtx = menuCanvas.getContext('2d');
  let w = 0;
  let h = 0;
  const embers = Array.from({ length: 56 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.18 + Math.random() * 0.45,
    drift: Math.random() * 2,
    size: 0.8 + Math.random() * 1.8,
  }));

  function resizeMenuCanvas() {
    const rect = menuCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.max(1, Math.floor(rect.width * dpr));
    h = Math.max(1, Math.floor(rect.height * dpr));
    if (menuCanvas.width !== w || menuCanvas.height !== h) {
      menuCanvas.width = w;
      menuCanvas.height = h;
    }
  }

  function drawMenuFire(ts) {
    if (overlay.classList.contains('hidden')) {
      menuAnimationFrame = null;
      return;
    }

    resizeMenuCanvas();
    const t = ts * 0.001;
    menuCtx.clearRect(0, 0, w, h);
    menuCtx.save();
    menuCtx.globalCompositeOperation = 'lighter';

    const glow = menuCtx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, w * 0.72);
    glow.addColorStop(0, 'rgba(255,88,10,0.34)');
    glow.addColorStop(0.35, 'rgba(180,22,0,0.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    menuCtx.fillStyle = glow;
    menuCtx.fillRect(0, 0, w, h);

    for (let layer = 0; layer < 4; layer += 1) {
      const count = 7 + layer * 4;
      const height = h * (0.38 - layer * 0.055);
      const alpha = 0.2 - layer * 0.035;
      menuCtx.beginPath();
      menuCtx.moveTo(0, h);
      for (let i = 0; i <= count; i += 1) {
        const x = (i / count) * w;
        const wave = Math.sin(t * (2.2 + layer * 0.4) + i * 1.75) * h * 0.05;
        const flicker = Math.sin(t * (3.6 + layer * 0.5) + i * 2.7) * h * 0.035;
        const y = h - height - wave - flicker - Math.sin(i * 4.1 + t) * h * 0.03;
        menuCtx.quadraticCurveTo(x - w / count * 0.5, h - height * 0.48, x, y);
        menuCtx.quadraticCurveTo(x + w / count * 0.32, h - height * 0.35, x + w / count * 0.52, h);
      }
      menuCtx.lineTo(w, h);
      menuCtx.closePath();
      const grad = menuCtx.createLinearGradient(0, h - height, 0, h);
      grad.addColorStop(0, `rgba(255,224,92,${alpha * 0.28})`);
      grad.addColorStop(0.42, `rgba(255,80,12,${alpha})`);
      grad.addColorStop(1, `rgba(110,0,0,${alpha * 0.9})`);
      menuCtx.fillStyle = grad;
      menuCtx.fill();
    }

    embers.forEach(e => {
      e.y -= e.speed * 0.01;
      if (e.y < -0.05) {
        e.x = Math.random();
        e.y = 1.05;
      }
      const x = e.x * w + Math.sin(t * e.drift + e.y * 8) * 22;
      const y = e.y * h;
      menuCtx.fillStyle = `rgba(255,${130 + Math.floor(e.size * 35)},40,${0.22 + e.size * 0.11})`;
      menuCtx.beginPath();
      menuCtx.arc(x, y, e.size * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      menuCtx.fill();
    });

    menuCtx.restore();
    menuAnimationFrame = requestAnimationFrame(drawMenuFire);
  }

  menuAnimationFrame = requestAnimationFrame(drawMenuFire);
}

function endGame(winner) {
  gameOver = true;
  if (winner === 'allied') {
    SOUNDS.losingSound.currentTime = 0;
    SOUNDS.losingSound.play().catch(() => {});
  } else {
    SOUNDS.congratulations.currentTime = 0;
    SOUNDS.congratulations.play().catch(() => {});
  }
  const msg = winner === 'soviet' ? '☭ VICTORY! FOR THE MOTHERLAND!' : '✦ DEFEAT! THE ALLIES HAVE WON!';
  const el = document.getElementById('alert-overlay');
  el.innerHTML = `<div class="alert-msg" style="font-size:18px;padding:16px 32px;border-color:${winner==='soviet'?'#ff2200':'#2244ff'};color:${winner==='soviet'?'#ff4400':'#4488ff'};animation:none">${msg}<br><small style="font-size:12px;color:#888">Click to restart</small></div>`;
  el.onclick = () => {
    difficulty = null;
    el.innerHTML = '';
    el.onclick = null;
    document.getElementById('difficulty-overlay').classList.remove('hidden');
    resetDifficultyButtons();
    stopSound('themeSong');
    playSound('landingPageSong');
    startMenuAnimation();
    initTerrain();
    initFog();
    initFogCanvas();
  };
}

// ── EFFECTS ──────────────────────────────────────────
let effects = [];

function spawnEffect(x, y, type) {
  if (type === 'explosion') {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      effects.push({
        x, y, type: 'debris',
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: 0, life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
      });
    }
    for (let i = 0; i < 6; i++) {
      effects.push({
        x, y, type: 'smoke',
        vx: (Math.random() - 0.5) * 20,
        vy: -20 - Math.random() * 30,
        t: 0, life: 0.6 + Math.random() * 0.4,
        size: 4 + Math.random() * 6
      });
    }
    effects.push({ x, y, type: 'explosion', t: 0, life: 0.5 });
  } else if (type === 'hit') {
    for (let i = 0; i < 4; i++) {
      effects.push({
        x, y, type: 'spark',
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        t: 0, life: 0.15 + Math.random() * 0.1,
        size: 1.5 + Math.random()
      });
    }
  } else if (type === 'teslaHit') {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 105;
      effects.push({
        x, y, type: 'teslaSpark',
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        t: 0, life: 0.16 + Math.random() * 0.18,
        size: 1.4 + Math.random() * 2.6
      });
    }
    for (let i = 0; i < 3; i++) {
      effects.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        type: 'teslaGlow',
        t: 0,
        life: 0.22 + Math.random() * 0.16,
        size: 12 + Math.random() * 18
      });
    }
  } else if (type === 'smoke') {
    for (let i = 0; i < 2; i++) {
      effects.push({
        x, y, type: 'smoke',
        vx: (Math.random() - 0.5) * 10,
        vy: -10 - Math.random() * 15,
        t: 0, life: 0.5 + Math.random() * 0.3,
        size: 3 + Math.random() * 3
      });
    }
  }
}

function spawnTeslaArc(x, y, x2, y2, mainArc) {
  const segments = mainArc ? 9 : 6;
  const dx = x2 - x;
  const dy = y2 - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const jitter = mainArc ? 18 : 10;
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const offset = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * jitter;
    points.push({
      x: x + dx * t + nx * offset,
      y: y + dy * t + ny * offset,
    });
  }

  effects.push({
    x, y, x2, y2,
    type: 'teslaArc',
    points,
    t: 0,
    life: mainArc ? 0.2 : 0.15,
    mainArc,
  });
}

function updateEffects(dt) {
  effects = effects.filter(e => {
    e.t += dt;
    if (e.vx !== undefined) { e.x += e.vx * dt; e.y += e.vy * dt; }
    if (e.vy !== undefined) e.vy += 60 * dt; // gravity
    return e.t < e.life;
  });
}

function drawEffects() {
  effects.forEach(e => {
    const s = worldToScreen(e.x, e.y);
    if (s.x < -100 || s.x > canvas.width + 100 || s.y < -100 || s.y > canvas.height + 100) return;
    const pct = e.t / e.life;
    ctx.save();
    ctx.globalAlpha = 1 - pct;
    if (e.type === 'explosion') {
      const r = (8 + pct * 35) * cam.zoom;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, `hsl(${40 - pct * 30}, 100%, ${70 - pct * 40}%)`);
      grad.addColorStop(1, 'rgba(200,50,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'debris') {
      const sz = e.size * cam.zoom;
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x - sz/2, s.y - sz/2, sz, sz);
    } else if (e.type === 'smoke') {
      const sz = (e.size + pct * 10) * cam.zoom;
      ctx.fillStyle = `rgba(100,100,100,${0.4 * (1 - pct)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'spark') {
      const sz = e.size * cam.zoom;
      ctx.fillStyle = '#ffff88';
      ctx.beginPath();
      ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'teslaArc') {
      const alpha = 1 - pct;
      const points = e.points.map(p => worldToScreen(p.x, p.y));

      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.shadowColor = '#5ee7ff';
      ctx.shadowBlur = e.mainArc ? 18 : 11;
      ctx.strokeStyle = e.mainArc ? 'rgba(77,220,255,0.9)' : 'rgba(90,190,255,0.72)';
      ctx.lineWidth = (e.mainArc ? 7 : 4) * cam.zoom;
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      ctx.shadowBlur = e.mainArc ? 9 : 5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (e.mainArc ? 2.2 : 1.4) * cam.zoom;
      ctx.beginPath();
      points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      if (e.mainArc) {
        ctx.strokeStyle = 'rgba(255,255,180,0.82)';
        ctx.lineWidth = 1 * cam.zoom;
        ctx.setLineDash([6 * cam.zoom, 5 * cam.zoom]);
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (e.type === 'teslaSpark') {
      const sz = e.size * cam.zoom;
      ctx.shadowColor = '#62e8ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#eaffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'teslaGlow') {
      const r = (e.size + pct * 24) * cam.zoom;
      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      grad.addColorStop(0, `rgba(255,255,255,${0.7 * (1 - pct)})`);
      grad.addColorStop(0.28, `rgba(80,225,255,${0.45 * (1 - pct)})`);
      grad.addColorStop(1, 'rgba(20,80,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

// ── MOVEMENT ─────────────────────────────────────────
function updateMovement(u, dt) {
  if (u.kind !== 'unit') return;
  const dx = u.tx - u.x;
  const dy = u.ty - u.y;
  const d = Math.hypot(dx, dy);
  if (d >= 2) u.facing = Math.atan2(dy, dx);
  if (d < 2) {
    u.x = u.tx;
    u.y = u.ty;
    return;
  }
  const step = u.spd * dt;
  if (step >= d) {
    u.x = u.tx;
    u.y = u.ty;
    return;
  }
  const nx = u.x + (dx / d) * step;
  const ny = u.y + (dy / d) * step;
  if (isWalkable(nx, ny)) {
    u.x = nx; u.y = ny;
  } else {
    // Try to slide around obstacle
    if (isWalkable(nx, u.y)) u.x = nx;
    else if (isWalkable(u.x, ny)) u.y = ny;
    else { u.tx = u.x; u.ty = u.y; }
  }
}

// ── TRAINING QUEUE ───────────────────────────────────
let trainingQueue = [];
let trainingTimer = 0;

function trainUnit(type) {
  if (!difficulty) return;
  const def = UNIT_DEFS[type];
  // Check requirements
  if (type === 'conscript' || type === 'dog' || type === 'tesla_trooper') {
    if (!entities.find(e => e.type === 'barracks' && e.team === 'soviet')) {
      showAlert('Need Infantry!'); return;
    }
  }
  if (type === 'rhino' || type === 'v3' || type === 'apocalypse') {
    if (!entities.find(e => e.type === 'warfactory' && e.team === 'soviet')) {
      showAlert('Need Barracks!'); return;
    }
  }
  if (credits < def.cost) { 
    playSound('insufficientBalance');
    showAlert('Insufficient credits!'); 
    return; 
  }
  credits -= def.cost;
  playSound('newConstructionOptions');
  trainingQueue.push(type);
  updateTrainingDisplay();
}

function updateTrainingDisplay() {
  document.querySelectorAll('.queue-count').forEach(el => {
    const type = el.dataset.unit;
    const count = trainingQueue.filter(t => t === type).length;
    el.textContent = count > 0 ? count : '';
  });
}

function showCommandTab(tab) {
  document.querySelectorAll('.command-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.commandTab === tab);
  });
  document.querySelectorAll('.command-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.commandPanel === tab);
  });
}

function updateTraining(dt) {
  if (trainingQueue.length === 0) return;
  const type = trainingQueue[0];
  const def = UNIT_DEFS[type];
  const trainTime = Math.max(3, def.cost / 200);
  trainingTimer += dt;
  if (trainingTimer >= trainTime) {
    trainingTimer = 0;
    trainingQueue.shift();
    updateTrainingDisplay();
    // Spawn near barracks or war factory
    const src = entities.find(e => (e.type === 'barracks' || e.type === 'warfactory') && e.team === 'soviet');
    const sx = src ? src.x + src.w / 2 : 300;
    const sy = src ? src.y + src.h + 10 : 1000;
    entities.push(spawnUnit(type, sx + Math.random()*40-20, sy + Math.random()*40, 'soviet'));
    playSound('unitReady');
    showAlert(`${def.name} ready!`);
  }
}

// ── PLACING STRUCTURES ───────────────────────────────
function startPlace(type) {
  if (!difficulty) return;
  const def = STRUCT_DEFS[type];
  if ((type === 'barracks' || type === 'warfactory') && entities.find(e => e.type === type && e.team === 'soviet')) {
    playSound('cancel');
    showAlert(`Already have a ${def.name}!`); return;
  }
  if (credits < def.cost) { 
    playSound('insufficientBalance');
    showAlert('Insufficient credits!'); 
    return; 
  }
  placing = type;
  playSound('newConstructionOptions');
  document.getElementById('canvas-wrap').classList.add('placing');
  showAlert(`Placing ${def.name} — click to build`);
}

function placeStructure(wx, wy) {
  const def = STRUCT_DEFS[placing];
  const gx = Math.floor(wx / TILE);
  const gy = Math.floor(wy / TILE);
  const wt = def.wTiles || def.size;
  const ht = def.hTiles || def.size;
  // Check overlap and walkable
  for (let dr = 0; dr < ht; dr++) {
    for (let dc = 0; dc < wt; dc++) {
      if (!isWalkable((gx+dc)*TILE+1, (gy+dr)*TILE+1)) {
        playSound('cancel');
        showAlert('Cannot build here!'); return;
      }
    }
  }
  // Check overlap with existing structures
  const nx = gx * TILE, ny = gy * TILE, nw = wt * TILE, nh = ht * TILE;
  const overlap = entities.find(e => e.kind === 'structure' &&
    !(nx + nw < e.x || nx > e.x + (e.w||TILE) || ny + nh < e.y || ny > e.y + (e.h||TILE)));
  if (overlap) { 
    playSound('cancel');
    showAlert('Space occupied!'); return; 
  }

  credits -= def.cost;
  playSound('building');
  entities.push(spawnStructure(placing, gx, gy, 'soviet'));
  placing = null;
  document.getElementById('canvas-wrap').classList.remove('placing');
}

// ── RENDER ───────────────────────────────────────────
function worldToScreen(wx, wy, out) {
  out = out || {};
  out.x = (wx - cam.x) * cam.zoom + canvas.width / 2;
  out.y = (wy - cam.y) * cam.zoom + canvas.height / 2;
  return out;
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - canvas.width / 2) / cam.zoom + cam.x,
    y: (sy - canvas.height / 2) / cam.zoom + cam.y,
  };
}

function isWorldRectVisible(wx, wy, ww, wh) {
  const halfW = canvas.width / 2 / cam.zoom;
  const halfH = canvas.height / 2 / cam.zoom;
  return wx + ww >= cam.x - halfW && wx <= cam.x + halfW &&
         wy + wh >= cam.y - halfH && wy <= cam.y + halfH;
}

function drawOreDeposit(o, s) {
  ctx.drawImage(oreCanvas, s.x - 12 * cam.zoom, s.y - 12 * cam.zoom, 24 * cam.zoom, 24 * cam.zoom);
}

function drawTerrain() {
  if (mapImg.complete && mapImg.naturalWidth > 0) {
    const view = getCameraView();
    const dest = worldToScreen(view.x, view.y);
    ctx.drawImage(
      mapImg,
      (view.x / WORLD_W) * mapImg.naturalWidth,
      (view.y / WORLD_H) * mapImg.naturalHeight,
      (view.w / WORLD_W) * mapImg.naturalWidth,
      (view.h / WORLD_H) * mapImg.naturalHeight,
      dest.x,
      dest.y,
      view.w * cam.zoom,
      view.h * cam.zoom
    );
  }

  // Ore deposits
  oreDeposits.forEach(o => {
    if (!o.available) return;
    if (!isWorldRectVisible(o.x - 16, o.y - 16, 32, 32)) return;
    const s = worldToScreen(o.x, o.y);
    drawOreDeposit(o, s);
  });
}

function drawStructure(e) {
  if (!isWorldRectVisible(e.x - TILE, e.y - TILE, (e.w || TILE) + TILE, (e.h || TILE) + TILE)) return;
  const s = worldToScreen(e.x, e.y);
  const w = e.w * cam.zoom;
  const h = e.h * cam.zoom;
  const isAlly = e.team === 'soviet';
  const cx = s.x + w / 2, cy = s.y + h / 2;

  function drawStructureImage(img, scale = 1.08) {
    const imgRatio = img.naturalHeight / img.naturalWidth;
    const fitW = w * scale;
    const fitH = fitW * imgRatio;
    const drawW = fitH > h * scale ? (h * scale) / imgRatio : fitW;
    const drawH = drawW * imgRatio;
    ctx.drawImage(img, s.x + (w - drawW) / 2, s.y + (h - drawH) / 2, drawW, drawH);
  }

  // Structure glow
  if (e.selected) {
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 1.5);
    grad.addColorStop(0, `rgba(${isAlly ? '255,68,0' : '68,136,255'}, 0.1)`);
    grad.addColorStop(1, `rgba(${isAlly ? '255,68,0' : '68,136,255'}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - w * 0.5, s.y - h * 0.5, w * 2, h * 2);
    ctx.restore();
  }

  // Attack range ring (selected turret / tesla)
  if (e.selected && e.atk > 0 && (e.type === 'turret' || e.type === 'tesla')) {
    const cx = worldToScreen(e.x + e.w/2, e.y + e.h/2);
    const radius = e.range * cam.zoom;
    ctx.beginPath();
    ctx.arc(cx.x, cx.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 50, 50, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4 * cam.zoom, 4 * cam.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Radar buff range ring (selected radar dome)
  if (e.selected && e.type === 'radar') {
    const cx = worldToScreen(e.x + e.w/2, e.y + e.h/2);
    const radius = 300 * cam.zoom;
    ctx.beginPath();
    ctx.arc(cx.x, cx.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 50, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6 * cam.zoom, 6 * cam.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Body
  if (e.type === 'conyard' && redMotherhall.complete && redMotherhall.naturalWidth > 0) {
    const iw = w * 0.95, ih = iw * (redMotherhall.naturalHeight / redMotherhall.naturalWidth);
    ctx.drawImage(redMotherhall, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
  } else if (e.type === 'alliedcy' && blueMotherhall.complete && blueMotherhall.naturalWidth > 0) {
    const iw = w * 0.95, ih = iw * (blueMotherhall.naturalHeight / blueMotherhall.naturalWidth);
    ctx.drawImage(blueMotherhall, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
  } else if (e.type === 'refinery') {
    const refineryImg = isAlly ? redRefinery : blueRefinery;
    if (refineryImg.complete && refineryImg.naturalWidth > 0) {
      drawStructureImage(refineryImg, 1.18);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'warfactory') {
    const barrackImg = isAlly ? redBarrack : blueBarrack;
    if (barrackImg.complete && barrackImg.naturalWidth > 0) {
      const imgRatio = barrackImg.naturalHeight / barrackImg.naturalWidth;
      const fitW = w * 1.08;
      const fitH = fitW * imgRatio;
      const drawW = fitH > h * 1.08 ? (h * 1.08) / imgRatio : fitW;
      const drawH = drawW * imgRatio;
      ctx.drawImage(barrackImg, s.x + (w - drawW)/2, s.y + (h - drawH)/2, drawW, drawH);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'alliedbar') {
    if (blueBarrack.complete && blueBarrack.naturalWidth > 0) {
      const imgRatio = blueBarrack.naturalHeight / blueBarrack.naturalWidth;
      const fitW = w * 1.08;
      const fitH = fitW * imgRatio;
      const drawW = fitH > h * 1.08 ? (h * 1.08) / imgRatio : fitW;
      const drawH = drawW * imgRatio;
      ctx.drawImage(blueBarrack, s.x + (w - drawW)/2, s.y + (h - drawH)/2, drawW, drawH);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'barracks') {
    const infImg = isAlly ? redInfantry : blueInfantry;
    if (infImg.complete && infImg.naturalWidth > 0) {
      const imgRatio = infImg.naturalHeight / infImg.naturalWidth;
      const fitW = w * 1.08;
      const fitH = fitW * imgRatio;
      const drawW = fitH > h * 1.08 ? (h * 1.08) / imgRatio : fitW;
      const drawH = drawW * imgRatio;
      ctx.drawImage(infImg, s.x + (w - drawW)/2, s.y + (h - drawH)/2, drawW, drawH);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'powerplant') {
    const ppImg = isAlly ? redPowerplant : bluePowerplant;
    if (ppImg.complete && ppImg.naturalWidth > 0) {
      drawStructureImage(ppImg);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'radar') {
    const radarImg = isAlly ? redRadar : blueRadar;
    if (radarImg.complete && radarImg.naturalWidth > 0) {
      drawStructureImage(radarImg);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'tesla') {
    const teslaImg = isAlly ? redTesla : blueTesla;
    if (teslaImg.complete && teslaImg.naturalWidth > 0) {
      drawStructureImage(teslaImg);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'turret') {
    const turretImg = isAlly ? redTurret : blueTurret;
    if (turretImg.complete && turretImg.naturalWidth > 0) {
      drawStructureImage(turretImg, 1.25);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'prismtower') {
    if (blueTurret.complete && blueTurret.naturalWidth > 0) {
      drawStructureImage(blueTurret, 1.25);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
    }
  } else if (e.type === 'chronosphere') {
    if (blueRadar.complete && blueRadar.naturalWidth > 0) {
      drawStructureImage(blueRadar);
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(s.x, s.y, w, h);
      }
    } else if (e.type === 'prismtower') {
      if (blueTurret.complete && blueTurret.naturalWidth > 0) {
        const iw = w * 0.9, ih = h * 0.9;
        ctx.drawImage(blueTurret, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
      } else {
        ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
      }
    } else if (e.type === 'chronosphere') {
      if (blueRadar.complete && blueRadar.naturalWidth > 0) {
        const iw = w * 0.9, ih = h * 0.9;
        ctx.drawImage(blueRadar, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
      } else {
        ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
      }
    } else {
    ctx.fillStyle = e.color;
    ctx.fillRect(s.x, s.y, w, h);
  }

  // Border — only when selected
  if (e.selected) {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, w, h);
  }

  // Icon
  if (cam.zoom > 0.4) {
    if (e.type === 'conyard' && redMotherhall.complete && redMotherhall.naturalWidth > 0) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'alliedcy' && blueMotherhall.complete && blueMotherhall.naturalWidth > 0) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'refinery' && ((isAlly ? redRefinery : blueRefinery).complete && (isAlly ? redRefinery : blueRefinery).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'warfactory' && ((isAlly ? redBarrack : blueBarrack).complete && (isAlly ? redBarrack : blueBarrack).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'alliedbar' && blueBarrack.complete && blueBarrack.naturalWidth > 0) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'barracks' && ((isAlly ? redInfantry : blueInfantry).complete && (isAlly ? redInfantry : blueInfantry).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'powerplant' && ((isAlly ? redPowerplant : bluePowerplant).complete && (isAlly ? redPowerplant : bluePowerplant).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'radar' && ((isAlly ? redRadar : blueRadar).complete && (isAlly ? redRadar : blueRadar).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'tesla' && ((isAlly ? redTesla : blueTesla).complete && (isAlly ? redTesla : blueTesla).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'turret' && ((isAlly ? redTurret : blueTurret).complete && (isAlly ? redTurret : blueTurret).naturalWidth > 0)) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'prismtower' && blueTurret.complete && blueTurret.naturalWidth > 0) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'chronosphere' && blueRadar.complete && blueRadar.naturalWidth > 0) {
      // Rendered by custom image code, skip icon
    } else if (e.type === 'powerplant') {
      const ppImg = isAlly ? redPowerplant : bluePowerplant;
      if (ppImg.complete && ppImg.naturalWidth > 0) {
        const iw = w * 0.85, ih = h * 0.85;
        ctx.drawImage(ppImg, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
      } else {
        ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
      }
    } else if (e.type === 'radar') {
      const radarImg = isAlly ? redRadar : blueRadar;
      if (radarImg.complete && radarImg.naturalWidth > 0) {
        const iw = w * 0.9, ih = h * 0.9;
        ctx.drawImage(radarImg, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
      } else {
        ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
      }
    } else if (e.type === 'tesla') {
      const teslaImg = isAlly ? redTesla : blueTesla;
      if (teslaImg.complete && teslaImg.naturalWidth > 0) {
        const iw = w * 0.85, ih = h * 0.85;
        ctx.drawImage(teslaImg, s.x + (w - iw)/2, s.y + (h - ih)/2, iw, ih);
      } else {
        ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
      }
    } else {
      ctx.font = `${Math.max(12, 20 * cam.zoom)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.icon, s.x + w/2, s.y + h/2);
    }
  }

  // Health bar — only when selected
  if (e.selected) {
    const hpPct = e.hp / e.maxHp;
    ctx.fillStyle = '#111';
    ctx.fillRect(s.x, s.y - 6*cam.zoom, w, 4*cam.zoom);
    ctx.fillStyle = hpPct > 0.6 ? '#22cc44' : hpPct > 0.3 ? '#ddaa00' : '#cc2200';
    ctx.fillRect(s.x, s.y - 6*cam.zoom, w * hpPct, 4*cam.zoom);
  }

  // Team stripe — only when selected
  if (e.selected) {
    ctx.fillStyle = isAlly ? '#cc2200' : '#0044cc';
    ctx.fillRect(s.x, s.y, w, 3*cam.zoom);
  }
}

function drawUnitShadow(x, y, r, scaleX = 1.15, scaleY = 0.45) {
  const shadow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.35);
  shadow.addColorStop(0, 'rgba(0,0,0,0.55)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.22, y + r * 0.34, r * scaleX, r * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRealisticInfantry(e, s, r, isAlly, isMoving, angle) {
  const teamColor = isAlly ? '#d63a22' : '#2d6cff';
  const armorDark = isAlly ? '#4a1b12' : '#142849';
  const armorMid = isAlly ? '#8e2e1c' : '#244f93';
  const step = isMoving ? Math.sin(gameTime * 14 + e.id) * r * 0.18 : 0;
  const aimX = Math.cos(angle);
  const aimY = Math.sin(angle);

  ctx.save();
  ctx.translate(s.x, s.y);

  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * 0.1 + step);
  ctx.lineTo(-r * 0.38, r * 0.78 + step);
  ctx.moveTo(r * 0.28, r * 0.1 - step);
  ctx.lineTo(r * 0.38, r * 0.78 - step);
  ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(-r * 0.6, -r * 0.55, r * 0.6, r * 0.55);
  bodyGrad.addColorStop(0, '#151515');
  bodyGrad.addColorStop(0.22, armorDark);
  bodyGrad.addColorStop(0.58, armorMid);
  bodyGrad.addColorStop(1, '#070707');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.roundRect(-r * 0.48, -r * 0.35, r * 0.96, r * 0.95, r * 0.18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = teamColor;
  ctx.fillRect(-r * 0.38, -r * 0.2, r * 0.76, r * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-r * 0.3, -r * 0.28, r * 0.22, r * 0.56);

  ctx.strokeStyle = '#1b1b1b';
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.beginPath();
  ctx.moveTo(r * 0.26, -r * 0.18);
  ctx.lineTo(aimX * r * 0.74, -r * 0.2 + aimY * r * 0.28);
  ctx.stroke();
  ctx.strokeStyle = '#363636';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(aimX * r * 0.42, -r * 0.2 + aimY * r * 0.18);
  ctx.lineTo(aimX * r * 1.18, -r * 0.2 + aimY * r * 0.52);
  ctx.stroke();

  const helmetGrad = ctx.createRadialGradient(-r * 0.18, -r * 0.75, r * 0.08, 0, -r * 0.72, r * 0.55);
  helmetGrad.addColorStop(0, '#d9d1b8');
  helmetGrad.addColorStop(0.32, teamColor);
  helmetGrad.addColorStop(1, '#160b08');
  ctx.fillStyle = helmetGrad;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, -r * 0.72, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.ellipse(aimX * r * 0.08, -r * 0.78 + aimY * r * 0.04, r * 0.24, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.type === 'tesla_trooper') {
    ctx.strokeStyle = 'rgba(90,210,255,0.85)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, r * 0.08);
    ctx.lineTo(-r * 0.12, -r * 0.08);
    ctx.lineTo(r * 0.05, r * 0.14);
    ctx.lineTo(r * 0.32, -r * 0.08);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRealisticVehicle(e, s, r, isAlly, isMoving, hullAngle, turretAngle) {
  const teamColor = isAlly ? '#b7351f' : '#255fc7';
  const bodyColor = e.color;
  const facing = hullAngle;
  const treadPhase = isMoving ? (gameTime * e.spd * 0.11 + e.id) % (r * 0.34) : 0;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(facing + Math.PI / 2);

  if (isMoving) {
    const trailGrad = ctx.createLinearGradient(0, r * 0.6, 0, r * 2.4);
    trailGrad.addColorStop(0, 'rgba(55,42,26,0.28)');
    trailGrad.addColorStop(1, 'rgba(55,42,26,0)');
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.ellipse(-r * 0.68, r * 1.38, r * 0.24, r * 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.68, r * 1.38, r * 0.24, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(38,30,20,0.34)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.setLineDash([r * 0.18, r * 0.18]);
    ctx.beginPath();
    ctx.moveTo(-r * 0.68, r * 0.82);
    ctx.lineTo(-r * 0.68, r * 2.25);
    ctx.moveTo(r * 0.68, r * 0.82);
    ctx.lineTo(r * 0.68, r * 2.25);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const treadGrad = ctx.createLinearGradient(-r * 0.92, -r * 0.75, r * 0.92, r * 0.75);
  treadGrad.addColorStop(0, '#3f403c');
  treadGrad.addColorStop(0.24, '#121212');
  treadGrad.addColorStop(0.5, '#070707');
  treadGrad.addColorStop(0.76, '#121212');
  treadGrad.addColorStop(1, '#3f403c');

  [-1, 1].forEach(side => {
    const tx = side * r * 0.56;
    ctx.fillStyle = treadGrad;
    ctx.strokeStyle = '#020202';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.roundRect(tx - r * 0.18, -r * 0.72, r * 0.36, r * 1.44, r * 0.15);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tx - r * 0.18, -r * 0.72, r * 0.36, r * 1.44, r * 0.15);
    ctx.clip();
    ctx.strokeStyle = '#555550';
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let y = -r * 0.9 + treadPhase; y < r * 0.9; y += r * 0.34) {
      ctx.beginPath();
      ctx.moveTo(tx - r * 0.16, y);
      ctx.lineTo(tx + r * 0.16, y + side * r * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  });

  for (let i = -2; i <= 2; i++) {
    const wy = i * r * 0.28 + (isMoving ? Math.sin(gameTime * 12 + i + e.id) * r * 0.025 : 0);
    [-1, 1].forEach(side => {
      const wx = side * r * 0.56;
      const wheelGrad = ctx.createRadialGradient(wx, wy, r * 0.03, wx, wy, r * 0.14);
      wheelGrad.addColorStop(0, '#8d8d86');
      wheelGrad.addColorStop(0.45, '#2d2d2b');
      wheelGrad.addColorStop(1, '#050505');
      ctx.fillStyle = wheelGrad;
      ctx.beginPath();
      ctx.arc(wx, wy, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = Math.max(1, r * 0.035);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(
        wx + Math.cos(gameTime * 12 + i + (side < 0 ? Math.PI : 0)) * r * 0.1,
        wy + Math.sin(gameTime * 12 + i + (side < 0 ? Math.PI : 0)) * r * 0.1
      );
      ctx.stroke();
    });
  }

  const hullGrad = ctx.createLinearGradient(-r * 0.62, -r * 0.8, r * 0.62, r * 0.8);
  hullGrad.addColorStop(0, '#181818');
  hullGrad.addColorStop(0.25, bodyColor);
  hullGrad.addColorStop(0.58, teamColor);
  hullGrad.addColorStop(1, '#090909');
  ctx.fillStyle = hullGrad;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(-r * 0.46, -r * 0.76);
  ctx.lineTo(r * 0.46, -r * 0.76);
  ctx.lineTo(r * 0.68, -r * 0.42);
  ctx.lineTo(r * 0.52, r * 0.66);
  ctx.lineTo(-r * 0.52, r * 0.66);
  ctx.lineTo(-r * 0.68, -r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, -r * 0.58);
  ctx.lineTo(r * 0.0, -r * 0.62);
  ctx.lineTo(-r * 0.2, r * 0.5);
  ctx.lineTo(-r * 0.42, r * 0.44);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(r * 0.34, -r * 0.58);
  ctx.lineTo(r * 0.6, -r * 0.36);
  ctx.lineTo(r * 0.42, r * 0.5);
  ctx.lineTo(r * 0.2, r * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.34 + i * r * 0.34, -r * 0.44);
    ctx.lineTo(-r * 0.42 + i * r * 0.34, r * 0.42);
    ctx.stroke();
  }

  ctx.rotate(turretAngle - facing);
  const turretGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.18, r * 0.1, 0, 0, r * 0.75);
  turretGrad.addColorStop(0, '#d6d0ba');
  turretGrad.addColorStop(0.28, teamColor);
  turretGrad.addColorStop(1, '#171717');
  ctx.fillStyle = turretGrad;
  ctx.strokeStyle = '#050505';
  ctx.beginPath();
  ctx.roundRect(-r * 0.42, -r * 0.45, r * 0.84, r * 0.74, r * 0.18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#202020';
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.roundRect(-r * 0.11, -r * 1.32, r * 0.22, r * 1.0, r * 0.08);
  ctx.fill();
  ctx.stroke();

  if (e.type === 'v3') {
    ctx.fillStyle = '#672018';
    ctx.fillRect(-r * 0.34, -r * 1.12, r * 0.68, r * 0.38);
    ctx.fillStyle = '#d8d8c8';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.45);
    ctx.lineTo(-r * 0.34, -r * 1.12);
    ctx.lineTo(r * 0.34, -r * 1.12);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 'apocalypse') {
    ctx.fillStyle = '#111';
    ctx.fillRect(-r * 0.42, -r * 1.2, r * 0.18, r * 0.9);
    ctx.fillRect(r * 0.24, -r * 1.2, r * 0.18, r * 0.9);
  }

  ctx.restore();
}

function getRhinoDirectionIndex(hullAngle) {
  // Map hullAngle to the user's sprite ordering using explicit sectors.
  // Canvas angle convention: 0 = right, 90 = down, 180 = left, 270 = up.
  const angle = (hullAngle * 180 / Math.PI + 360) % 360;
  if (angle >= 337.5 || angle < 22.5) return 1; // right
  if (angle < 67.5) return 7; // forward-right
  if (angle < 112.5) return 5; // forward
  if (angle < 157.5) return 6; // forward-left
  if (angle < 202.5) return 3; // left
  if (angle < 247.5) return 2; // back-left
  if (angle < 292.5) return 4; // back
  return 0; // back-right
}

function drawRhinoSprite(e, s, r, isAlly, hullAngle) {
  const dir = getRhinoDirectionIndex(hullAngle);
  const sprite = getRhinoSprite(isAlly, dir);
  if (!sprite) return false;

  const maxHeight = r * 3.2;
  const aspect = sprite.naturalWidth / sprite.naturalHeight || 1;
  const width = maxHeight * aspect;
  const height = maxHeight;

  ctx.save();
  ctx.drawImage(sprite, s.x - width / 2, s.y - height / 2, width, height);
  ctx.restore();
  return true;
}

function drawRhino3D(e, s, r, isAlly, isMoving, hullAngle, turretAngle) {
  const bodyColor = isAlly ? '#c02f2c' : '#3072d4';
  const shadowColor = isAlly ? '#531815' : '#122f5f';
  const lightColor = isAlly ? '#e45f5a' : '#7aa3f5';
  const treadOffset = isMoving ? Math.sin(gameTime * 10 + e.id) * r * 0.06 : 0;
  const facing = hullAngle + Math.PI / 2;

  ctx.save();
  ctx.translate(s.x, s.y + r * 0.05);
  ctx.rotate(facing);

  // Ground shadow
  const shadow = ctx.createRadialGradient(0, r * 1.05, 0, 0, r * 1.05, r * 0.75);
  shadow.addColorStop(0, 'rgba(0,0,0,0.35)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, r * 1.05, r * 0.7, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tracks
  const trackW = r * 1.35;
  const trackH = r * 0.28;
  [-1, 1].forEach(side => {
    ctx.save();
    ctx.translate(side * r * 0.52, r * 0.18);
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.roundRect(-trackW / 2, -trackH / 2, trackW, trackH, trackH * 0.25);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath();
    ctx.roundRect(-trackW / 2 + r * 0.05, -trackH / 2 + r * 0.05, trackW - r * 0.1, trackH * 0.4, trackH * 0.15);
    ctx.fill();

    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = Math.max(1, r * 0.04);
    for (let i = -3; i <= 3; i += 1) {
      const y = i * r * 0.14 + treadOffset;
      ctx.beginPath();
      ctx.moveTo(-trackW / 2 + r * 0.08, y);
      ctx.lineTo(trackW / 2 - r * 0.08, y + side * r * 0.04);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Hull
  const hullW = r * 1.0;
  const hullH = r * 0.7;
  const hullB = r * 0.95;
  const hullGrad = ctx.createLinearGradient(-hullW, -hullH, hullW, hullH);
  hullGrad.addColorStop(0, '#111111');
  hullGrad.addColorStop(0.22, shadowColor);
  hullGrad.addColorStop(0.45, bodyColor);
  hullGrad.addColorStop(0.72, lightColor);
  hullGrad.addColorStop(1, '#070707');

  ctx.fillStyle = hullGrad;
  ctx.strokeStyle = '#090909';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(-hullW, -hullH * 0.25);
  ctx.lineTo(-hullW * 0.8, hullB * 0.4);
  ctx.lineTo(hullW * 0.8, hullB * 0.4);
  ctx.lineTo(hullW, -hullH * 0.25);
  ctx.lineTo(hullW * 0.55, -hullH);
  ctx.lineTo(-hullW * 0.55, -hullH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side plates
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.moveTo(-hullW, -hullH * 0.25);
  ctx.lineTo(-hullW, hullB * 0.4);
  ctx.lineTo(-hullW * 0.62, hullB * 0.28);
  ctx.lineTo(-hullW * 0.48, -hullH * 0.06);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(hullW, -hullH * 0.25);
  ctx.lineTo(hullW, hullB * 0.4);
  ctx.lineTo(hullW * 0.62, hullB * 0.28);
  ctx.lineTo(hullW * 0.48, -hullH * 0.06);
  ctx.closePath();
  ctx.fill();

  // Front glacis
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(-hullW * 0.45, -hullH * 0.1);
  ctx.lineTo(hullW * 0.45, -hullH * 0.1);
  ctx.lineTo(hullW * 0.3, hullB * 0.12);
  ctx.lineTo(-hullW * 0.3, hullB * 0.12);
  ctx.closePath();
  ctx.fill();

  // Turret
  ctx.save();
  ctx.translate(0, -r * 0.18);
  ctx.rotate(turretAngle - hullAngle);
  const turretR = r * 0.36;
  const turretGrad = ctx.createRadialGradient(-turretR * 0.15, -turretR * 0.12, turretR * 0.1, 0, 0, turretR);
  turretGrad.addColorStop(0, '#ddd');
  turretGrad.addColorStop(0.28, bodyColor);
  turretGrad.addColorStop(1, '#111111');

  ctx.fillStyle = turretGrad;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.roundRect(-turretR, -turretR * 0.68, turretR * 2, turretR * 1.36, r * 0.16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.roundRect(-r * 0.08, -turretR * 0.5, r * 0.9, r * 0.16, r * 0.08);
  ctx.fill();

  ctx.fillStyle = '#282828';
  ctx.beginPath();
  ctx.roundRect(-r * 0.05, -turretR * 0.54, r * 0.9, r * 0.08, r * 0.05);
  ctx.fill();
  ctx.restore();

  // Team stripe
  ctx.fillStyle = isAlly ? '#f08a7e' : '#a1bdfa';
  ctx.fillRect(-hullW * 0.36, -hullH * 0.2, hullW * 0.72, r * 0.1);

  ctx.restore();
}

function drawRealisticScout(e, s, r, isAlly, isMoving, angle) {
  const step = isMoving ? Math.sin(gameTime * 18 + e.id) * r * 0.2 : 0;
  const tailWag = isMoving ? Math.sin(gameTime * 20 + e.id) * r * 0.18 : 0;
  const side = Math.cos(angle) < 0 ? -1 : 1;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(side, 1);

  ctx.strokeStyle = '#090705';
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.lineCap = 'round';

  // Tail
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, -r * 0.08);
  ctx.quadraticCurveTo(-r * 1.28, -r * 0.28 + tailWag, -r * 1.48, r * 0.18 + tailWag);
  ctx.stroke();

  // Legs behind body
  ctx.strokeStyle = '#8c7048';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.34);
  ctx.lineTo(-r * 0.58 + step, r * 0.98);
  ctx.moveTo(r * 0.34, r * 0.34);
  ctx.lineTo(r * 0.18 - step, r * 0.98);
  ctx.stroke();

  ctx.strokeStyle = '#eadbb8';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(-r * 0.58 + step, r * 0.98);
  ctx.lineTo(-r * 0.74 + step, r * 1.1);
  ctx.moveTo(r * 0.18 - step, r * 0.98);
  ctx.lineTo(r * 0.02 - step, r * 1.1);
  ctx.stroke();

  // Body base
  const bodyGrad = ctx.createLinearGradient(-r, -r * 0.5, r, r * 0.62);
  bodyGrad.addColorStop(0, '#1b1b17');
  bodyGrad.addColorStop(0.28, '#2a2b27');
  bodyGrad.addColorStop(0.58, '#9a8055');
  bodyGrad.addColorStop(1, '#dfc995');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#070707';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(-r * 0.82, -r * 0.22);
  ctx.bezierCurveTo(-r * 0.46, -r * 0.64, r * 0.38, -r * 0.58, r * 0.78, -r * 0.24);
  ctx.bezierCurveTo(r * 0.84, r * 0.16, r * 0.48, r * 0.46, -r * 0.18, r * 0.48);
  ctx.bezierCurveTo(-r * 0.76, r * 0.48, -r * 1.0, r * 0.18, -r * 0.82, -r * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Black shepherd saddle.
  const saddleGrad = ctx.createLinearGradient(-r * 0.7, -r * 0.62, r * 0.72, r * 0.1);
  saddleGrad.addColorStop(0, '#050606');
  saddleGrad.addColorStop(0.45, '#1d2222');
  saddleGrad.addColorStop(1, 'rgba(20,20,18,0.15)');
  ctx.fillStyle = saddleGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, -r * 0.2);
  ctx.bezierCurveTo(-r * 0.34, -r * 0.58, r * 0.36, -r * 0.54, r * 0.68, -r * 0.2);
  ctx.bezierCurveTo(r * 0.28, r * 0.02, -r * 0.18, r * 0.08, -r * 0.68, -r * 0.02);
  ctx.closePath();
  ctx.fill();

  // Neck and head with long muzzle.
  const headGrad = ctx.createRadialGradient(r * 0.72, -r * 0.72, r * 0.04, r * 0.66, -r * 0.44, r * 0.72);
  headGrad.addColorStop(0, '#b89a6d');
  headGrad.addColorStop(0.48, '#3b352b');
  headGrad.addColorStop(1, '#111312');
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#070707';
  ctx.beginPath();
  ctx.moveTo(r * 0.46, -r * 0.4);
  ctx.bezierCurveTo(r * 0.56, -r * 0.82, r * 1.08, -r * 0.94, r * 1.36, -r * 0.62);
  ctx.bezierCurveTo(r * 1.62, -r * 0.36, r * 1.28, -r * 0.12, r * 0.9, -r * 0.2);
  ctx.bezierCurveTo(r * 0.62, -r * 0.18, r * 0.42, -r * 0.24, r * 0.46, -r * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pointed ears.
  ctx.fillStyle = '#120b07';
  ctx.beginPath();
  ctx.moveTo(r * 0.62, -r * 0.76);
  ctx.lineTo(r * 0.54, -r * 1.36);
  ctx.lineTo(r * 0.88, -r * 0.82);
  ctx.closePath();
  ctx.moveTo(r * 0.9, -r * 0.86);
  ctx.lineTo(r * 1.06, -r * 1.38);
  ctx.lineTo(r * 1.16, -r * 0.72);
  ctx.closePath();
  ctx.fill();

  // Front legs, paws, collar, eye, nose, mouth.
  ctx.strokeStyle = '#b79761';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.beginPath();
  ctx.moveTo(r * 0.46, r * 0.24);
  ctx.lineTo(r * 0.58 + step, r * 1.0);
  ctx.moveTo(r * 0.78, r * 0.16);
  ctx.lineTo(r * 0.92 - step, r * 0.92);
  ctx.stroke();

  ctx.strokeStyle = '#efe1bd';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(r * 0.58 + step, r * 1.0);
  ctx.lineTo(r * 0.44 + step, r * 1.12);
  ctx.moveTo(r * 0.92 - step, r * 0.92);
  ctx.lineTo(r * 1.06 - step, r * 1.04);
  ctx.stroke();

  ctx.strokeStyle = '#d60000';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.22);
  ctx.lineTo(r * 0.72, -r * 0.08);
  ctx.stroke();

  ctx.fillStyle = '#080808';
  ctx.beginPath();
  ctx.arc(r * 1.02, -r * 0.58, Math.max(1, r * 0.055), 0, Math.PI * 2);
  ctx.arc(r * 1.48, -r * 0.42, Math.max(1, r * 0.055), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffd2c8';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(r * 1.2, -r * 0.2);
  ctx.lineTo(r * 1.42, -r * 0.18);
  ctx.stroke();

  ctx.restore();
}

function drawUnit(e) {
  if (!isWorldRectVisible(e.x - e.size, e.y - e.size, e.size * 2, e.size * 2)) return;
  const s = worldToScreen(e.x, e.y);
  const r = e.size * cam.zoom;
  const isAlly = e.team === 'soviet';
  const moveDist = Math.hypot(e.tx - e.x, e.ty - e.y);
  const isMoving = moveDist > 1.5;
  const bob = 0;
  const hullAngle = isMoving ? Math.atan2(e.ty - e.y, e.tx - e.x) : (e.facing || 0);
  const aimAngle = e.target && e.target.hp > 0
    ? Math.atan2(e.target.y - e.y, e.target.x - e.x)
    : hullAngle;

  // Selection glow
  if (e.selected) {
    ctx.save();
    const grad = ctx.createRadialGradient(s.x, s.y, r * 0.5, s.x, s.y, r * 3);
    grad.addColorStop(0, 'rgba(255, 255, 68, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 3 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawUnitShadow(s.x, s.y + bob, r, UNIT_DEFS[e.type]?.type === 'vehicle' ? 1.35 : 1.1, UNIT_DEFS[e.type]?.type === 'vehicle' ? 0.55 : 0.42);

  if (e.type === 'rhino') {
    if (!drawRhinoSprite(e, s, r, isAlly, hullAngle)) {
      drawRhino3D(e, s, r, isAlly, isMoving, hullAngle, aimAngle || hullAngle);
    }
  } else if (e.type === 'dog') {
    drawRealisticScout(e, s, r, isAlly, isMoving, aimAngle);
  } else if (UNIT_DEFS[e.type]?.type === 'infantry') {
    drawRealisticInfantry(e, s, r, isAlly, isMoving, aimAngle);
  } else {
    drawRealisticVehicle(e, s, r, isAlly, isMoving, hullAngle, aimAngle || hullAngle);
  }

  // Radar buff ring
  if (e.team === 'soviet' && e.kind === 'unit' && hasRadarBuff(e)) {
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, r + 4*cam.zoom, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3 * cam.zoom, 3 * cam.zoom]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // HP bar
  if (e.hp < e.maxHp || e.selected) {
    const hpPct = e.hp / e.maxHp;
    const bw = r * 2.2, bh = 3 * cam.zoom;
    const bx = s.x - bw / 2, by = s.y - r - 7 * cam.zoom + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.roundRect ? ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 2) : 0;
    ctx.fillRect(bx, by, bw, bh);
    const hpColor = hpPct > 0.6 ? '#22cc44' : hpPct > 0.3 ? '#ddaa00' : '#cc2200';
    ctx.fillStyle = hpColor;
    ctx.fillRect(bx, by, bw * hpPct, bh);
  }

  // Selected ring
  if (e.selected) {
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, r + 3*cam.zoom, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffff44';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Move target line
  if (e.selected && isMoving) {
    const ts = worldToScreen(e.tx, e.ty);
    ctx.strokeStyle = 'rgba(100,255,100,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + bob);
    ctx.lineTo(ts.x, ts.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ts.x, ts.y, 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#44ff44';
    ctx.stroke();
  }
}

// ── MINIMAP ──────────────────────────────────────────
let minimapBg = null;

function createMinimapBg() {
  const mw = minimap.width, mh = minimap.height;
  if (mw === 0 || mh === 0) return;
  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const cx = c.getContext('2d');
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  cx.fillStyle = '#0a1505';
  cx.fillRect(0, 0, mw, mh);
  for (let r = 0; r < MAP_ROWS; r += 3) {
    for (let c2 = 0; c2 < MAP_COLS; c2 += 3) {
      const t = terrain[r][c2];
      if (t.type === 'water') {
        cx.fillStyle = '#0a1a3a';
        cx.fillRect(c2 * TILE * sx, r * TILE * sy, TILE * sx * 3, TILE * sy * 3);
      }
    }
  }
  minimapBg = c;
}

function drawMinimap() {
  const mw = minimap.width, mh = minimap.height;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;

  // Use cached background
  if (minimapBg) mctx.drawImage(minimapBg, 0, 0);

  // Ore
  mctx.fillStyle = '#aa8800';
  oreDeposits.forEach(o => { if (o.available) mctx.fillRect(o.x*sx-1, o.y*sy-1, 4, 3); });

  // Entities
  entities.forEach(e => {
    const ex = e.x * sx, ey = e.y * sy;
    mctx.fillStyle = e.team === 'soviet' ? '#dd2200' : '#2255cc';
    if (e.kind === 'structure') {
      mctx.fillRect(ex, ey, (e.w||TILE)*sx, (e.h||TILE)*sy);
    } else {
      mctx.beginPath();
      mctx.arc(ex, ey, 2, 0, Math.PI*2);
      mctx.fill();
    }
  });

  // Camera viewport
  const cvx = (cam.x - canvas.width/(2*cam.zoom)) * sx;
  const cvy = (cam.y - canvas.height/(2*cam.zoom)) * sy;
  const cvw = (canvas.width / cam.zoom) * sx;
  const cvh = (canvas.height / cam.zoom) * sy;
  mctx.strokeStyle = '#ffffff44';
  mctx.lineWidth = 1;
  mctx.strokeRect(cvx, cvy, cvw, cvh);
}

function render(updateMinimapNow, updateSelectedInfoNow) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  drawTerrain();

  // Structures
  for (let i = 0, len = entities.length; i < len; i++) {
    const e = entities[i];
    if (e.kind === 'structure') drawStructure(e);
  }
  // Units
  for (let i = 0, len = entities.length; i < len; i++) {
    const e = entities[i];
    if (e.kind === 'unit') drawUnit(e);
  }
  // Effects
  drawEffects();
  // Fog
  drawFog();

  // Selection circle (right-click drag)
  if (selBox.active) {
    const cx = (selBox.sx + selBox.ex) / 2;
    const cy = (selBox.sy + selBox.ey) / 2;
    const r = Math.hypot(selBox.ex - selBox.sx, selBox.ey - selBox.sy) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, r), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,255,100,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,255,100,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Placing ghost
  if (placing) {
    const def = STRUCT_DEFS[placing];
    const gx = Math.floor(mouseWorld.x / TILE);
    const gy = Math.floor(mouseWorld.y / TILE);
    const s = worldToScreen(gx * TILE, gy * TILE);
    const gw = (def.wTiles || def.size) * TILE * cam.zoom;
    const gh = (def.hTiles || def.size) * TILE * cam.zoom;
    ctx.fillStyle = 'rgba(255,200,0,0.2)';
    ctx.fillRect(s.x, s.y, gw, gh);
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, gw, gh);
    ctx.font = `${Math.max(16, 28*cam.zoom)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffdd00';
    ctx.fillText(def.icon, s.x + gw/2, s.y + gh/2);
  }

  ctx.restore();

  if (updateMinimapNow) drawMinimap();
  if (updateSelectedInfoNow) updateSelInfoHP();
}

// ── GAME LOOP ────────────────────────────────────────
let lastTime = 0;
let minimapRenderTimer = 0;
let selectedInfoTimer = 0;

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!difficulty) {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!gameOver && !paused) {
    gameTime += dt;
    minimapRenderTimer += dt;
    selectedInfoTimer += dt;
    updateEdgeScroll(dt);
    updateCamera(dt);
    updateEconomy(dt);
    updateOre(dt);
    updateWaves(dt);
    updateTraining(dt);
    updateEffects(dt);
    updateFog(dt);
    updateRadarHeal(dt);

    // Update all entities
    for (let i = 0, len = entities.length; i < len; i++) {
      const e = entities[i];
      updateCombat(e, dt);
      if (e.kind === 'unit') updateMovement(e, dt);
    }

    // Remove dead — any non-removed dead entities need onDeath called
    for (let i = 0, len = entities.length; i < len; i++) {
      if (entities[i].hp <= 0) onDeath(entities[i]);
    }
    const alive = [];
    for (let i = 0, len = entities.length; i < len; i++) {
      if (entities[i].hp > 0) alive.push(entities[i]);
    }
    entities = alive;
  }

  const updateMinimapNow = minimapRenderTimer >= 0.12 || paused || gameOver;
  const updateSelectedInfoNow = selectedInfoTimer >= 0.12 || paused || gameOver;
  if (updateMinimapNow) minimapRenderTimer = 0;
  if (updateSelectedInfoNow) selectedInfoTimer = 0;
  render(updateMinimapNow, updateSelectedInfoNow);
  requestAnimationFrame(gameLoop);
}

// ── INPUT ────────────────────────────────────────────
let isDragging = false;
let dragStart = {x:0, y:0};
let isPanning = false;
let isLeftPan = false;
let panStart = {x:0, y:0};
let panCam = {x:0, y:0};
let isRightDrag = false;

canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const w = screenToWorld(mx, my);
  mouseWorld = w;

  if (e.button === 1) {
    isPanning = true;
    isLeftPan = false;
    panStart = {x:e.clientX, y:e.clientY};
    panCam = {x:camTarget.x, y:camTarget.y};
    return;
  }

  if (e.button === 2) {
    isRightDrag = true;
    isDragging = true;
    dragStart = {x:mx, y:my};
    selBox = { active: true, sx:mx, sy:my, ex:mx, ey:my };
    return;
  }

  if (e.button === 0) {
    if (placing) {
      placeStructure(w.x, w.y);
      return;
    }

    let hit = null;
    for (const en of entities) {
      if (en.kind === 'unit') {
        if (dist(en, w) < en.size * 1.5) { hit = en; break; }
      } else {
        if (w.x >= en.x && w.x <= en.x + en.w && w.y >= en.y && w.y <= en.y + en.h) { hit = en; break; }
      }
    }

    if (hit) {
      if (e.shiftKey) {
        hit.selected = !hit.selected;
        if (hit.selected) selected.push(hit);
        else selected = selected.filter(x => x.id !== hit.id);
      } else {
        selectEntities([hit.id]);
      }
      if (hit.kind === 'unit') {
        const isInfantry = UNIT_DEFS[hit.type] && UNIT_DEFS[hit.type].type === 'infantry';
        const snd = hit.type === 'dog' ? 'dogSound' : isInfantry ? 'yesCommander' : 'yesSir';
        playAudioSafe(SOUNDS[snd]);
      }
    } else {
      isLeftPan = true;
      isPanning = true;
      panStart = {x:e.clientX, y:e.clientY};
      panCam = {x:camTarget.x, y:camTarget.y};
      if (!e.shiftKey) selectEntities([]);
    }
  }
});

canvas.addEventListener('mousemove', e => {
  if (isPanning || isDragging) e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  mouseWorld = screenToWorld(mx, my);

  if (isPanning) {
    camTarget.x = panCam.x - (e.clientX - panStart.x) / cam.zoom;
    camTarget.y = panCam.y - (e.clientY - panStart.y) / cam.zoom;
    clampCamTarget();
  }

  if (isDragging) {
    selBox.ex = mx; selBox.ey = my;
  }
});

canvas.addEventListener('mouseup', e => {
  e.preventDefault();
  if (e.button === 1) { isPanning = false; return; }
  if (e.button === 0 && isLeftPan) {
    isPanning = false;
    isLeftPan = false;
  }
  if (e.button === 2 && isRightDrag) {
    isRightDrag = false;
    isPanning = false;
    if (selBox.active) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = selBox.ex - selBox.sx;
      const dy = selBox.ey - selBox.sy;
      const distDragged = Math.hypot(dx, dy);
      if (distDragged > 5) {
        // Circle select — pick all Soviet units inside the circle
        const cx1 = (selBox.sx + selBox.ex) / 2;
        const cy1 = (selBox.sy + selBox.ey) / 2;
        const wCenter = screenToWorld(cx1, cy1);
        // Radius in world units: average of half-width/height of the circle
        const rWorld = (distDragged / 2) / cam.zoom;
        const inCircle = entities.filter(en => {
          if (en.team !== 'soviet' || en.kind !== 'unit') return false;
          const d = Math.hypot(en.x - wCenter.x, en.y - wCenter.y);
          return d < rWorld;
        });
        if (inCircle.length > 0) selectEntities(inCircle.map(x => x.id));
        selBox.active = false;
        isDragging = false;
        return;
      }
      // Click (no drag) — move/attack
      selBox.active = false;
      isDragging = false;
      const w = screenToWorld(mx, my);
      if (selected.length > 0) {
        const enemyAt = entities.find(en => {
          if (en.team === 'soviet') return false;
          const d = en.kind === 'unit' ? dist(en, w) < en.size * 2 :
            (w.x >= en.x && w.x <= en.x + en.w && w.y >= en.y && w.y <= en.y + en.h);
          return d;
        });
        const hasDog = selected.some(u => u.type === 'dog');
        if (hasDog) {
          playAudioSafe(SOUNDS.dogSound);
        } else if (enemyAt && enemyAt.kind === 'structure') {
          playAudioSafe(SOUNDS.affirmative);
        } else if (enemyAt) {
          playAudioSafe(SOUNDS.absolutely);
        } else {
          playAudioSafe(SOUNDS.movingOut);
        }
        const N = selected.filter(u => u.kind === 'unit').length;
        selected.filter(u => u.kind === 'unit').forEach((u, i) => {
          const spread = N > 1 ? 30 : 0;
          const row = Math.floor(i / 4), col = i % 4;
          u.tx = w.x + (col - 1.5) * spread;
          u.ty = w.y + row * spread;
          u.attackMove = false;
          u.target = enemyAt || null;
          if (enemyAt) u.attackMove = true;
          u.state = 'move';
        });
      }
    }
  }
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  isLeftPan = false;
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  const minZoom = Math.max(canvas.width / WORLD_W, canvas.height / WORLD_H);
  const newZoom = Math.min(2.5, Math.max(minZoom, cam.zoom * factor));
  cam.zoom = newZoom;
  camTarget.zoom = newZoom;
  camTarget.x = cam.x;
  camTarget.y = cam.y;
  clampCam();
}, { passive: false });

// Edge scrolling
let edgeScroll = {x:0, y:0};
document.addEventListener('mousemove', e => {
  const margin = 30;
  const spd = 8;
  edgeScroll.x = 0; edgeScroll.y = 0;
  if (e.clientX < margin) edgeScroll.x = -spd;
  if (e.clientX > window.innerWidth - margin) edgeScroll.x = spd;
  if (e.clientY < 40) edgeScroll.y = -spd;
  if (e.clientY > window.innerHeight - 30) edgeScroll.y = spd;
});

function updateEdgeScroll(dt) {
  if (!edgeScroll.x && !edgeScroll.y) return;
  camTarget.x += (edgeScroll.x * dt * 60) / cam.zoom;
  camTarget.y += (edgeScroll.y * dt * 60) / cam.zoom;
  clampCamTarget();
}

function updateCamera(dt) {
  camTarget.zoom = cam.zoom;
  clampCamTarget();
  const ease = isPanning ? 1 : Math.min(1, dt * 14);
  cam.x += (camTarget.x - cam.x) * ease;
  cam.y += (camTarget.y - cam.y) * ease;
  clampCamera(cam);
}

function clampCamera(camera) {
  const vw = canvas.width / camera.zoom;
  const vh = canvas.height / camera.zoom;
  if (vw > WORLD_W) {
    camera.x = WORLD_W / 2;
  } else {
    camera.x = Math.max(vw / 2, Math.min(WORLD_W - vw / 2, camera.x));
  }
  if (vh > WORLD_H) {
    camera.y = WORLD_H / 2;
  } else {
    camera.y = Math.max(vh / 2, Math.min(WORLD_H - vh / 2, camera.y));
  }
}

function clampCamTarget() {
  clampCamera(camTarget);
}

function clampCam() {
  clampCamera(cam);
  clampCamera(camTarget);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selected.length > 0) deleteSelected();
  }
  if (e.key === 's' || e.key === 'S') {
    selected.filter(u => u.kind === 'unit').forEach(u => { u.tx = u.x; u.ty = u.y; u.attackMove = false; u.target = null; });
  }
  if (e.key === 'a' || e.key === 'A') {
    selected.filter(u => u.kind === 'unit').forEach(u => { u.attackMove = true; u.state = 'attack'; });
    showAlert('Attack Move');
  }
  if (e.key === 'Escape') {
    if (placing) {
      placing = null;
      document.getElementById('canvas-wrap').classList.remove('placing');
    } else {
      selectEntities([]);
    }
  }
  if (e.key === 'p' || e.key === 'P') {
    togglePause();
  }
});

function togglePause() {
  if (gameOver || !difficulty) return;
  paused = !paused;
  document.getElementById('pause-overlay').classList.toggle('visible', paused);
  document.getElementById('pause-btn').textContent = paused ? '▶' : '⏸';
  if (paused) {
    playSound('onHold');
  } else {
    stopSound('onHold');
  }
}

function quitGame() {
  difficultyStarting = false;
  difficulty = null;
  gameOver = false;
  paused = false;
  placing = null;
  entities = [];
  selected = [];
  effects = [];
  trainingQueue = [];
  trainingTimer = 0;
  oreDeposits = [];
  refineryTimer = 0;
  radarHealTimer = 0;
  wave = 1;
  waveTimer = 0;
  credits = 2000;
  power = 10;
  lastCreditsDisplay = null;
  lastPowerDisplay = null;
  fogUpdateTimer = 0;
  selBox.active = false;
  edgeScroll = { x: 0, y: 0 };

  document.getElementById('pause-overlay').classList.remove('visible');
  document.getElementById('pause-btn').textContent = '⏸';
  document.getElementById('canvas-wrap').classList.remove('placing');
  document.getElementById('difficulty-overlay').classList.remove('hidden');
  document.getElementById('wave-num').textContent = '1';
  document.getElementById('wave-fill').style.width = '0%';
  document.getElementById('sidebar-credits').textContent = credits;

  const alertOverlay = document.getElementById('alert-overlay');
  alertOverlay.innerHTML = '';
  alertOverlay.onclick = null;

  stopSound('themeSong');
  stopSound('onHold');
  playSound('landingPageSong');

  initTerrain();
  initFog();
  initFogCanvas();
  initGame();
  fogUpdateTimer = 10;
  resize();
  cam.x = 350;
  cam.y = 600;
  camTarget.x = cam.x;
  camTarget.y = cam.y;
  camTarget.zoom = cam.zoom;
  clampCam();
  updateTrainingDisplay();
  resetDifficultyButtons();
  startMenuAnimation();
}

function resize() {
  const wrap = document.getElementById('canvas-wrap');
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}
window.addEventListener('resize', resize);

function startGame(diff) {
  difficulty = diff;
  gameOver = false;
  paused = false;
  placing = null;
  stopSound('landingPageSong');
  playSound('themeSong');

  document.getElementById('difficulty-overlay').classList.add('hidden');

  initTerrain();
  initFog();
  initFogCanvas();
  createMinimapBg();
  createOreCanvas();
  initGame();
  fogUpdateTimer = 10;
  resize();
  cam.x = 350;
  cam.y = 600;
  camTarget.x = cam.x;
  camTarget.y = cam.y;
  camTarget.zoom = cam.zoom;
  clampCam();
}

function resetDifficultyButtons() {
  difficultyStarting = false;
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('blood-pressed');
    btn.querySelectorAll('.blood-steam').forEach(el => el.remove());
  });
  document.getElementById('difficulty-overlay')?.classList.remove('blood-impact');
}

function chooseDifficulty(diff, btn) {
  if (difficulty || difficultyStarting) return;
  difficultyStarting = true;

  const overlay = document.getElementById('difficulty-overlay');
  overlay.classList.add('blood-impact');

  if (btn) {
    btn.classList.add('blood-pressed');
    btn.disabled = true;

    const burst = document.createElement('span');
    burst.className = 'blood-steam';
    for (let i = 0; i < 12; i++) {
      const drop = document.createElement('span');
      drop.style.setProperty('--x', `${Math.random() * 120 - 60}px`);
      drop.style.setProperty('--y', `${Math.random() * -95 - 22}px`);
      drop.style.setProperty('--r', `${Math.random() * 160 - 80}deg`);
      drop.style.setProperty('--s', `${0.55 + Math.random() * 0.85}`);
      burst.appendChild(drop);
    }
    btn.appendChild(burst);
  }

  playSound('building');
  setTimeout(() => {
    overlay.classList.remove('blood-impact');
    startGame(diff);
  }, 620);
}

initTerrain();
initFog();
initFogCanvas();
createOreCanvas();
createMinimapBg();
resize();
startMenuAnimation();
// Play landing page song
const startInitialMusic = () => {
  if (difficulty === null && !gameOver) {
    playSound('landingPageSong');
  }
  window.removeEventListener('click', startInitialMusic);
  window.removeEventListener('keydown', startInitialMusic);
};
// Listen for first interaction to bypass autoplay block
window.addEventListener('click', startInitialMusic);
window.addEventListener('keydown', startInitialMusic);
// Show difficulty menu — game starts when user clicks a button
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
