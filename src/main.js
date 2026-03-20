import './style.css';
import * as THREE from 'three';
import * as WebIFC from 'web-ifc';

// ─── IFC type constants & helpers ─────────────────────────────────────────────
const T = WebIFC; // alias for constants

const CATEGORY_ICONS = {
  IFCWALL: '🧱', IFCWALLSTANDARDCASE: '🧱', IFCCURTAINWALL: '🧱',
  IFCSLAB: '⬜', IFCSLABSTANDARDCASE: '⬜', IFCFOOTING: '⬜', IFCROOF: '⬜',
  IFCCOLUMN: '🏛', IFCBEAM: '━',
  IFCDOOR: '🚪', IFCWINDOW: '🪟',
  IFCSTAIR: '🪜', IFCSTAIRFLIGHT: '🪜',
  IFCFURNISHINGELEMENT: '🪑', IFCFURNITURE: '🪑',
  IFCSPACE: '📦', IFCZONE: '📦',
  IFCBUILDING: '🏢', IFCBUILDINGSTOREY: '🏠', IFCSITE: '🌍',
  IFCPROJECT: '📋',
  IFCMEMBER: '━', IFCPLATE: '▭',
};

const CAT_COLORS = [
  '#4f8ef7','#f7934f','#7cf77e','#f7f44f','#cf4ff7',
  '#4ff7e8','#f74f4f','#9af74f','#f74fb8','#4faaf7',
];

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  mode: 'orbit',
  loaded: false,
  selectedId: null,
  sectionActive: false,
  hiddenTypes: new Set(),
  typeMeshes: {},
  allMeshes: [],
  ifcApi: null,
  modelId: 0,
  bbox: null,
  count: 0,
};

// ─── THREE setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('viewer-canvas');
const wrapper = document.getElementById('viewport-wrapper');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x1a1c22);
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
camera.position.set(20, 20, 20);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(30, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { near: 0.5, far: 300, left: -80, right: 80, top: 80, bottom: -80 });
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8ab4f8, 0.3);
fill.position.set(-20, 10, -20);
scene.add(fill);

const grid = new THREE.GridHelper(200, 100, 0x2a2d38, 0x232530);
scene.add(grid);

const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let clippingPlane = null;

// ─── Orbit controls ───────────────────────────────────────────────────────────
const orb = {
  sph: new THREE.Spherical(50, Math.PI / 4, Math.PI / 4),
  target: new THREE.Vector3(),
  drag: false, pan: false,
  lx: 0, ly: 0,
};

function syncCamera() {
  camera.position.setFromSpherical(orb.sph).add(orb.target);
  camera.lookAt(orb.target);
}
syncCamera();

canvas.addEventListener('pointerdown', e => {
  if (e.button === 2 || (e.button === 0 && e.altKey) || e.button === 1) {
    orb.pan = true; orb.drag = false;
  } else if (e.button === 0 && state.mode === 'orbit') {
    orb.drag = true; orb.pan = false;
  }
  orb.lx = e.clientX; orb.ly = e.clientY;
});
canvas.addEventListener('pointermove', e => {
  if (!orb.drag && !orb.pan) return;
  const dx = e.clientX - orb.lx, dy = e.clientY - orb.ly;
  orb.lx = e.clientX; orb.ly = e.clientY;
  if (orb.drag) {
    orb.sph.theta -= dx * 0.008;
    orb.sph.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orb.sph.phi - dy * 0.008));
  } else {
    const speed = orb.sph.radius * 0.001;
    const right = new THREE.Vector3().crossVectors(
      camera.getWorldDirection(new THREE.Vector3()), camera.up
    ).normalize();
    orb.target.addScaledVector(right, -dx * speed);
    orb.target.addScaledVector(camera.up, dy * speed);
  }
  syncCamera();
});
canvas.addEventListener('pointerup', e => {
  if (state.mode === 'select' && e.button === 0 && !orb.drag && !orb.pan) pick(e);
  orb.drag = false; orb.pan = false;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  orb.sph.radius = Math.max(0.5, Math.min(1000, orb.sph.radius * (1 + e.deltaY * 0.001)));
  syncCamera();
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─── Axes gizmo ───────────────────────────────────────────────────────────────
const axCanvas = document.getElementById('axes-canvas');
const axCtx = axCanvas.getContext('2d');

function drawAxes() {
  const S = 80, cx = 40, cy = 40, R = 28;
  axCtx.clearRect(0, 0, S, S);
  const mat = new THREE.Matrix4().lookAt(
    camera.position.clone().sub(orb.target),
    new THREE.Vector3(), camera.up
  );
  const axes = [
    { v: new THREE.Vector3(1, 0, 0), l: 'X', c: '#f87171' },
    { v: new THREE.Vector3(0, 1, 0), l: 'Y', c: '#34d399' },
    { v: new THREE.Vector3(0, 0, 1), l: 'Z', c: '#60a5fa' },
  ].map(a => {
    const p = a.v.clone().applyMatrix4(mat);
    return { x: cx + p.x * R, y: cy - p.y * R, z: p.z, l: a.l, c: a.c };
  }).sort((a, b) => a.z - b.z);

  axCtx.fillStyle = 'rgba(26,28,34,0.75)';
  axCtx.beginPath(); axCtx.arc(cx, cy, R + 8, 0, Math.PI * 2); axCtx.fill();

  axes.forEach(a => {
    axCtx.beginPath(); axCtx.moveTo(cx, cy); axCtx.lineTo(a.x, a.y);
    axCtx.strokeStyle = a.c; axCtx.lineWidth = 2; axCtx.stroke();
    axCtx.fillStyle = a.c;
    axCtx.font = 'bold 10px system-ui'; axCtx.textAlign = 'center'; axCtx.textBaseline = 'middle';
    axCtx.fillText(a.l, cx + (a.x - cx) * 1.35, cy + (a.y - cy) * 1.35);
  });
  axCtx.fillStyle = '#fff'; axCtx.beginPath(); axCtx.arc(cx, cy, 3, 0, Math.PI * 2); axCtx.fill();
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  const w = wrapper.clientWidth, h = wrapper.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrapper);
resize();

// ─── Render loop ──────────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  renderer.render(scene, camera);
  drawAxes();
}
loop();

// ─── IFC loader ───────────────────────────────────────────────────────────────
async function loadIFC(buffer, fileName) {
  setStatus(`Chargement de ${fileName}…`, true, 10);

  // Clear old model
  state.allMeshes.forEach(m => scene.remove(m));
  state.allMeshes = []; state.typeMeshes = {};
  state.selectedId = null; selectedMeshes = [];

  const api = new WebIFC.IfcAPI();
  api.SetWasmPath('/', true);

  setStatus('Initialisation du moteur…', true, 20);
  await api.Init();
  state.ifcApi = api;

  setStatus('Analyse du fichier IFC…', true, 35);
  const modelId = api.OpenModel(new Uint8Array(buffer));
  state.modelId = modelId;

  setStatus('Génération de la géométrie…', true, 50);

  // We'll capture type info per expressId during streaming
  const expressIdToType = {};

  // First pass: collect express IDs and their types
  const allLines = api.GetAllLines(modelId);
  for (let i = 0; i < allLines.size(); i++) {
    const id = allLines.get(i);
    try {
      const line = api.GetLine(modelId, id);
      if (line && line.type) expressIdToType[id] = line.type;
    } catch (_) {}
  }

  // Geometry streaming
  api.StreamAllMeshes(modelId, (mesh) => {
    const placedGeoms = mesh.geometries;
    for (let i = 0; i < placedGeoms.size(); i++) {
      const pg = placedGeoms.get(i);
      const geom = api.GetGeometry(modelId, pg.geometryExpressID);
      const verts = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize());
      const idxs = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize());

      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(verts.length / 2);
      const nrm = new Float32Array(verts.length / 2);
      for (let j = 0; j < verts.length; j += 6) {
        const b = j / 2;
        pos[b] = verts[j]; pos[b+1] = verts[j+1]; pos[b+2] = verts[j+2];
        nrm[b] = verts[j+3]; nrm[b+1] = verts[j+4]; nrm[b+2] = verts[j+5];
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      g.setIndex(new THREE.BufferAttribute(idxs, 1));

      const { x: r, y: gr, z: b, w: a } = pg.color;
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(r, gr, b),
        opacity: a, transparent: a < 0.99,
        side: THREE.DoubleSide,
        clippingPlanes: clippingPlane ? [clippingPlane] : [],
      });

      g.applyMatrix4(new THREE.Matrix4().fromArray(pg.flatTransformation));
      const m = new THREE.Mesh(g, mat);
      m.userData.expressId = mesh.expressID;
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      state.allMeshes.push(m);

      geom.delete();
    }
  });

  setStatus('Extraction des métadonnées…', true, 75);

  // Group by IFC type name
  state.allMeshes.forEach(m => {
    const typeCode = expressIdToType[m.userData.expressId];
    const typeName = typeCode ? (api.GetNameFromTypeCode(typeCode) || `TYPE_${typeCode}`) : 'OTHER';
    if (!state.typeMeshes[typeName]) state.typeMeshes[typeName] = [];
    state.typeMeshes[typeName].push(m);
  });

  state.count = state.allMeshes.length;

  // Bounding box
  const box = new THREE.Box3();
  state.allMeshes.forEach(m => box.expandByObject(m));
  state.bbox = box;

  setStatus('Construction de l\'arbre…', true, 88);
  buildTree(api, modelId);
  buildCategories();

  fitView();
  setStatus(`${fileName} — ${state.count} éléments`, false);
  document.getElementById('model-stats').style.display = 'block';
  document.getElementById('stat-elements').textContent = `${state.count} éléments`;
  document.getElementById('drop-zone').classList.add('hidden');
  document.getElementById('categories-section').style.display = '';
  state.loaded = true;
}

// ─── Model tree ───────────────────────────────────────────────────────────────
function buildTree(api, modelId) {
  const treeEl = document.getElementById('model-tree');
  treeEl.innerHTML = '';

  const getSingle = (type) => {
    const ids = api.GetLineIDsWithType(modelId, type);
    return ids.size() > 0 ? ids.get(0) : null;
  };
  const getAll = (type) => {
    const ids = api.GetLineIDsWithType(modelId, type);
    const arr = [];
    for (let i = 0; i < ids.size(); i++) arr.push(ids.get(i));
    return arr;
  };
  const name = (id) => {
    if (!id) return null;
    try { return api.GetLine(modelId, id)?.Name?.value; } catch (_) { return null; }
  };
  const elevation = (id) => {
    if (!id) return null;
    try { return api.GetLine(modelId, id)?.Elevation?.value; } catch (_) { return null; }
  };

  const root = mkEl('div', 'tree-node');

  // Site
  const siteId = getSingle(T.IFCSITE);
  const siteName = name(siteId) || 'Site';
  const siteRow = mkTreeRow('🌍', siteName, 0);
  const siteChildren = mkEl('div', 'tree-children open');
  siteRow.querySelector('.tree-arrow').classList.add('open');
  siteRow.addEventListener('click', () => toggleTree(siteRow, siteChildren));

  // Buildings
  getAll(T.IFCBUILDING).forEach((bid, bi) => {
    const bName = name(bid) || `Bâtiment ${bi + 1}`;
    const bRow = mkTreeRow('🏢', bName, 1);
    const bChildren = mkEl('div', 'tree-children open');
    bRow.querySelector('.tree-arrow').classList.add('open');
    bRow.addEventListener('click', () => toggleTree(bRow, bChildren));

    // Storeys
    getAll(T.IFCBUILDINGSTOREY).forEach((sid, si) => {
      const sName = name(sid) || `Niveau ${si}`;
      const elev = elevation(sid);
      const label = elev != null ? `${sName}  (z = ${elev.toFixed(2)} m)` : sName;
      const sRow = mkTreeRow('🏠', label, 2);
      sRow.querySelector('.tree-arrow').style.visibility = 'hidden';
      bChildren.appendChild(wrap(sRow));
    });

    const bNode = mkEl('div', 'tree-node');
    bNode.appendChild(bRow); bNode.appendChild(bChildren);
    siteChildren.appendChild(bNode);
  });

  root.appendChild(siteRow); root.appendChild(siteChildren);
  treeEl.appendChild(root);
}

function mkTreeRow(icon, label, depth) {
  const row = mkEl('div', 'tree-row');
  row.style.paddingLeft = `${6 + depth * 10}px`;
  const arr = mkEl('span', 'tree-arrow'); arr.textContent = '▶';
  const ico = mkEl('span', 'tree-icon'); ico.textContent = icon;
  const lbl = mkEl('span', 'tree-label'); lbl.textContent = label;
  row.append(arr, ico, lbl);
  return row;
}

function wrap(row) {
  const n = mkEl('div', 'tree-node'); n.appendChild(row); return n;
}

function toggleTree(row, children) {
  const arr = row.querySelector('.tree-arrow');
  children.classList.toggle('open');
  arr?.classList.toggle('open');
}

// ─── Categories ───────────────────────────────────────────────────────────────
function buildCategories() {
  const listEl = document.getElementById('categories-list');
  listEl.innerHTML = '';

  const sorted = Object.entries(state.typeMeshes)
    .sort((a, b) => b[1].length - a[1].length);

  sorted.forEach(([typeName, meshes], i) => {
    const item = mkEl('div', 'category-item');
    const dot = mkEl('span', 'cat-color');
    dot.style.background = CAT_COLORS[i % CAT_COLORS.length];
    const lbl = mkEl('span', 'cat-label');
    lbl.textContent = cleanType(typeName);
    lbl.title = typeName;
    const cnt = mkEl('span', 'cat-count');
    cnt.textContent = meshes.length;
    const eye = mkEl('span', 'cat-eye');
    item.append(dot, lbl, cnt, eye);

    item.addEventListener('click', () => {
      const hidden = state.hiddenTypes.has(typeName);
      if (hidden) { state.hiddenTypes.delete(typeName); item.classList.remove('hidden'); }
      else        { state.hiddenTypes.add(typeName);    item.classList.add('hidden'); }
      meshes.forEach(m => { m.visible = hidden; });
    });

    listEl.appendChild(item);
  });
}

function cleanType(t) {
  return t.replace(/^IFC/, '').replace(/([A-Z])/g, ' $1').trim();
}

// ─── Selection ────────────────────────────────────────────────────────────────
let selectedMeshes = [];

function pick(e) {
  if (!state.loaded) return;
  const rect = canvas.getBoundingClientRect();
  ptr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ptr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ptr, camera);

  const hits = raycaster.intersectObjects(state.allMeshes.filter(m => m.visible));

  // Deselect
  selectedMeshes.forEach(m => {
    m.material.emissive?.set(0, 0, 0);
  });
  selectedMeshes = [];

  if (!hits.length) { state.selectedId = null; showProps(null); return; }

  const id = hits[0].object.userData.expressId;
  state.selectedId = id;

  state.allMeshes.filter(m => m.userData.expressId === id).forEach(m => {
    m.material.emissive?.set(0.12, 0.3, 0.7);
    selectedMeshes.push(m);
  });

  showProps(id);
}

// ─── Properties ──────────────────────────────────────────────────────────────
async function showProps(expressId) {
  const panel = document.getElementById('properties-panel');
  if (!expressId) {
    panel.innerHTML = '<div class="empty-hint">Sélectionnez un élément<br>pour voir ses propriétés</div>';
    return;
  }

  const api = state.ifcApi;
  const mid = state.modelId;

  let line;
  try { line = api.GetLine(mid, expressId, false); } catch (_) { line = null; }
  if (!line) { panel.innerHTML = '<div class="empty-hint">Propriétés non disponibles</div>'; return; }

  const typeName = api.GetNameFromTypeCode(line.type) || 'Inconnu';
  const elName = line.Name?.value || 'Sans nom';
  const guid = line.GlobalId?.value || '';
  const desc = line.Description?.value || '';
  const tag = line.Tag?.value || '';

  let html = `
    <div class="element-header">
      <div class="element-type">${cleanType(typeName)}</div>
      <div class="element-name">${elName}</div>
      <div class="element-id">#${expressId} · ${guid}</div>
    </div>`;

  // General properties
  const gen = {};
  if (desc) gen['Description'] = desc;
  if (tag) gen['Repère'] = tag;
  if (line.ObjectType?.value) gen['Type objet'] = line.ObjectType.value;
  if (line.PredefinedType) gen['Type prédéfini'] = valStr(line.PredefinedType);
  if (line.OverallHeight?.value != null) gen['Hauteur'] = line.OverallHeight.value.toFixed(3) + ' m';
  if (line.OverallWidth?.value != null) gen['Largeur'] = line.OverallWidth.value.toFixed(3) + ' m';

  if (Object.keys(gen).length) {
    html += section('Général', Object.entries(gen).map(([k, v]) => propRow(k, v)).join(''));
  }

  // Property sets via IFCRELDEFINESBYPROPERTIES
  try {
    const relIds = api.GetLineIDsWithType(mid, T.IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relIds.size(); i++) {
      const rel = api.GetLine(mid, relIds.get(i), true);
      if (!rel?.RelatedObjects) continue;

      const related = Array.isArray(rel.RelatedObjects) ? rel.RelatedObjects : [rel.RelatedObjects];
      const hasEl = related.some(o => {
        const v = o?.value ?? o;
        return v === expressId;
      });
      if (!hasEl) continue;

      const pset = rel.RelatingPropertyDefinition;
      if (!pset) continue;

      const psetName = pset.Name?.value || 'Propriétés';
      const props = pset.HasProperties;
      if (!props || !props.length) continue;

      const rows = props.map(p => {
        const pn = p.Name?.value || '';
        let pv = '';
        if (p.NominalValue !== undefined && p.NominalValue !== null) {
          pv = valStr(p.NominalValue);
        }
        return propRow(pn, pv);
      }).join('');

      if (rows) html += section(psetName, rows);
    }
  } catch (_) {}

  // Quantities via IFCELEMENTQUANTITY
  try {
    const relIds = api.GetLineIDsWithType(mid, T.IFCRELDEFINESBYPROPERTIES);
    for (let i = 0; i < relIds.size(); i++) {
      const rel = api.GetLine(mid, relIds.get(i), true);
      if (!rel?.RelatedObjects) continue;

      const related = Array.isArray(rel.RelatedObjects) ? rel.RelatedObjects : [rel.RelatedObjects];
      const hasEl = related.some(o => (o?.value ?? o) === expressId);
      if (!hasEl) continue;

      const qset = rel.RelatingPropertyDefinition;
      if (!qset?.Quantities) continue;

      const qsetName = qset.Name?.value || 'Quantités';
      const rows = qset.Quantities.map(q => {
        const qn = q.Name?.value || '';
        const qv = q.LengthValue?.value ?? q.AreaValue?.value ?? q.VolumeValue?.value ?? q.CountValue?.value;
        if (qv == null) return '';
        const unit = q.AreaValue != null ? ' m²' : q.VolumeValue != null ? ' m³' : q.LengthValue != null ? ' m' : '';
        return propRow(qn, `<span class="prop-val highlight">${typeof qv === 'number' ? qv.toFixed(3) : qv}${unit}</span>`, true);
      }).join('');

      if (rows) html += section('📐 ' + qsetName, rows);
    }
  } catch (_) {}

  panel.innerHTML = html;
}

function valStr(v) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v.value ?? v.type ?? JSON.stringify(v));
  return String(v);
}

function section(title, content) {
  return `<div class="prop-section"><div class="prop-section-title">${title}</div>${content}</div>`;
}

function propRow(key, val, rawVal = false) {
  const vHtml = rawVal ? val : `<span class="prop-val">${val}</span>`;
  return `<div class="prop-row"><span class="prop-key">${key}</span>${vHtml}</div>`;
}

// ─── Fit view ─────────────────────────────────────────────────────────────────
function fitView() {
  if (!state.bbox) return;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  state.bbox.getCenter(center);
  state.bbox.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * Math.PI / 180;
  orb.target.copy(center);
  orb.sph.radius = (maxDim / (2 * Math.tan(fov / 2))) * 1.6;
  orb.sph.theta = Math.PI / 4;
  orb.sph.phi = Math.PI / 3.5;
  grid.position.y = state.bbox.min.y;

  const posSlider = document.getElementById('section-pos');
  posSlider.min = state.bbox.min.z.toFixed(1);
  posSlider.max = state.bbox.max.z.toFixed(1);
  posSlider.value = center.z.toFixed(1);

  syncCamera();
}

// ─── Section plane ────────────────────────────────────────────────────────────
function applySection() {
  const axis = document.getElementById('section-axis').value;
  const pos = parseFloat(document.getElementById('section-pos').value);
  const n = axis === 'x' ? new THREE.Vector3(1, 0, 0)
    : axis === 'y' ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(0, 0, 1);
  clippingPlane = new THREE.Plane(n, -pos);
  state.allMeshes.forEach(m => { m.material.clippingPlanes = [clippingPlane]; });
}

function clearSection() {
  clippingPlane = null;
  state.allMeshes.forEach(m => { m.material.clippingPlanes = []; });
}

// ─── Status ───────────────────────────────────────────────────────────────────
function setStatus(msg, loading = false, pct = 0) {
  document.getElementById('status-msg').textContent = msg;
  const bar = document.getElementById('loading-bar');
  bar.style.display = loading ? 'block' : 'none';
  if (loading) document.getElementById('loading-fill').style.width = pct + '%';
}

// ─── UI wiring ────────────────────────────────────────────────────────────────
document.getElementById('btn-orbit').addEventListener('click', () => setMode('orbit'));
document.getElementById('btn-select').addEventListener('click', () => setMode('select'));

function setMode(m) {
  state.mode = m;
  document.getElementById('btn-orbit').classList.toggle('active', m === 'orbit');
  document.getElementById('btn-select').classList.toggle('active', m === 'select');
  canvas.style.cursor = m === 'select' ? 'crosshair' : 'grab';
}

document.getElementById('btn-fit').addEventListener('click', fitView);

document.getElementById('btn-section').addEventListener('click', () => {
  const ctrl = document.getElementById('section-controls');
  if (state.sectionActive) {
    ctrl.style.display = 'none';
    state.sectionActive = false;
    clearSection();
    document.getElementById('btn-section').classList.remove('active');
  } else {
    ctrl.style.display = 'flex';
    state.sectionActive = true;
    applySection();
    document.getElementById('btn-section').classList.add('active');
  }
});

document.getElementById('btn-section-off').addEventListener('click', () => {
  document.getElementById('section-controls').style.display = 'none';
  state.sectionActive = false;
  clearSection();
  document.getElementById('btn-section').classList.remove('active');
});

document.getElementById('section-axis').addEventListener('change', applySection);
document.getElementById('section-pos').addEventListener('input', applySection);

document.getElementById('btn-toggle-left').addEventListener('click', () => {
  document.getElementById('panel-left').classList.toggle('collapsed');
});
document.getElementById('btn-toggle-right').addEventListener('click', () => {
  document.getElementById('panel-right').classList.toggle('collapsed');
});

document.getElementById('ifc-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  await loadIFC(await f.arrayBuffer(), f.name);
  e.target.value = '';
});

// Drag & drop
const dropEl = document.getElementById('drop-zone');
wrapper.addEventListener('dragover', e => {
  e.preventDefault(); dropEl.classList.add('dragging'); dropEl.classList.remove('hidden');
});
wrapper.addEventListener('dragleave', () => {
  dropEl.classList.remove('dragging');
  if (state.loaded) dropEl.classList.add('hidden');
});
wrapper.addEventListener('drop', async e => {
  e.preventDefault(); dropEl.classList.remove('dragging');
  const f = e.dataTransfer.files[0];
  if (!f?.name.endsWith('.ifc')) { setStatus('Erreur : fichier .ifc requis'); return; }
  await loadIFC(await f.arrayBuffer(), f.name);
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'o') setMode('orbit');
  if (k === 's') setMode('select');
  if (k === 'f') fitView();
  if (k === 'escape') {
    selectedMeshes.forEach(m => m.material.emissive?.set(0, 0, 0));
    selectedMeshes = []; state.selectedId = null; showProps(null);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mkEl(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}
