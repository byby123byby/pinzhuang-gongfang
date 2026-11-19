import * as THREE from 'three';

const up = new THREE.Vector3(0, 1, 0);
const blue = '#1d50a1';
const paper = '#f5e7ca';
const surfaceMaps = new Map();
export const BOARD_X = -0.175;
export const MODEL_X = 0.115;

export function flatten(entry) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...entry.part.flatNormal).normalize(), up);
  const points = [];
  entry.object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const a = mesh.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(a, i).applyQuaternion(q));
  });
  let box = new THREE.Box3().setFromPoints(points);
  if (box.max.z - box.min.z > box.max.x - box.min.x) {
    const turn = new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2);
    q.premultiply(turn); points.forEach(p => p.applyQuaternion(turn));
    box = new THREE.Box3().setFromPoints(points);
  }
  const outline = silhouette(entry.object, q, points);
  entry.flat = { q, box, outline, width: box.max.x - box.min.x, depth: box.max.z - box.min.z };
}

function silhouette(object, q, points) {
  const edges = new Map(), positions = new Map();
  const key = p => `${Math.round(p.x * 1e7)},${Math.round(p.z * 1e7)}`;
  object.traverse(mesh => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry, a = g.attributes.position;
    const count = g.index?.count ?? a.count;
    for (let i = 0; i < count; i += 3) {
      const tri = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(a, g.index ? g.index.getX(i + j) : i + j).applyQuaternion(q));
      const normal = new THREE.Vector3().subVectors(tri[1], tri[0]).cross(new THREE.Vector3().subVectors(tri[2], tri[0])).normalize();
      if (normal.y < 0.999) continue;
      const keys = tri.map(p => { const k = key(p); positions.set(k, [p.x, p.z]); return k; });
      for (let j = 0; j < 3; j++) {
        const ends = [keys[j], keys[(j + 1) % 3]].sort(), id = ends.join('|');
        if (edges.has(id)) edges.delete(id); else edges.set(id, ends);
      }
    }
  });
  const adjacent = new Map();
  for (const [a, b] of edges.values()) {
    if (!adjacent.has(a)) adjacent.set(a, []);
    if (!adjacent.has(b)) adjacent.set(b, []);
    adjacent.get(a).push(b); adjacent.get(b).push(a);
  }
  const loops = [], visited = new Set();
  for (const start of adjacent.keys()) {
    if (visited.has(start)) continue;
    let current = start, previous = null; const loop = [];
    while (current && !visited.has(current)) {
      visited.add(current); loop.push(positions.get(current));
      const next = adjacent.get(current)?.find(k => k !== previous);
      previous = current; current = next;
    }
    if (current === start && loop.length >= 3) loops.push(loop);
  }
  const area = pts => Math.abs(pts.reduce((n, p, i) => { const b = pts[(i + 1) % pts.length]; return n + p[0] * b[1] - b[0] * p[1]; }, 0));
  loops.sort((a, b) => area(b) - area(a));
  if (loops[0]) return loops[0];
  const sorted = [...new Map(points.map(p => [key(p), [p.x, p.z]])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const half = list => { const h=[]; for (const p of list) { while(h.length>=2 && cross(h.at(-2),h.at(-1),p)<=0) h.pop(); h.push(p); } return h; };
  const a = half(sorted), b = half([...sorted].reverse()); a.pop(); b.pop(); return a.concat(b);
}

function layoutSlots(entries, width, code) {
  const inset = .012, gap = .010, label = .0105, rowGap = .006;
  const ordered = [...entries].sort((a, b) => b.flat.depth - a.flat.depth);
  let row = [], rowWidth = 0, rowDepth = 0, z = .030;
  const placeRow = () => {
    let x = (width - rowWidth) / 2;
    for (const [entry, cellWidth] of row) {
      entry.slot = { x: x + cellWidth / 2, z: z + label + entry.flat.depth / 2, labelZ: z + .004 };
      x += cellWidth + gap;
    }
    z += label + rowDepth + rowGap;
    row = []; rowWidth = 0; rowDepth = 0;
  };
  for (const entry of ordered) {
    const cellWidth = Math.max(.019, entry.flat.width);
    if (rowWidth + gap + cellWidth > width - inset * 2 || (code === 'C' && row.length === 5)) placeRow();
    rowWidth += (row.length ? gap : 0) + cellWidth;
    rowDepth = Math.max(rowDepth, entry.flat.depth);
    row.push([entry, cellWidth]);
  }
  placeRow();
  return Math.max(.138, z + inset);
}

function boardShape(width, depth) {
  const r = .007, left = -width / 2, right = width / 2, bottom = -depth / 2, top = depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(left + r, top);
  shape.lineTo(right - r, top); shape.quadraticCurveTo(right, top, right, top - r);
  shape.lineTo(right, bottom + r); shape.quadraticCurveTo(right, bottom, right - r, bottom);
  shape.lineTo(left + r, bottom); shape.quadraticCurveTo(left, bottom, left, bottom + r);
  shape.lineTo(left, top - r); shape.quadraticCurveTo(left, top, left + r, top);
  shape.closePath();
  return shape;
}

function printLabel(ctx, scale, value, x, z, size, weight, align = 'center') {
  ctx.save();
  ctx.resetTransform();
  ctx.font = `${weight} ${size * scale}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  ctx.fillText(value, x * scale, z * scale);
  ctx.restore();
}

function coastLine(ctx, x, z) {
  ctx.save();
  ctx.translate(x, z);
  ctx.lineWidth = .0004;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, .009);
  ctx.bezierCurveTo(.007, .009, .008, .006, .016, .006);
  ctx.bezierCurveTo(.025, .006, .027, .010, .037, .010);
  ctx.bezierCurveTo(.044, .010, .050, .007, .058, .008);
  ctx.lineTo(.088, .008);
  ctx.moveTo(.011, .0108);
  ctx.bezierCurveTo(.020, .012, .030, .0125, .035, .0118);
  ctx.moveTo(.053, .0105);
  ctx.quadraticCurveTo(.058, .0115, .063, .0105);
  ctx.moveTo(.069, .008);
  ctx.lineTo(.065, .006); ctx.lineTo(.080, .006); ctx.lineTo(.077, .008);
  ctx.moveTo(.071, .005);
  ctx.lineTo(.071, -.0025); ctx.lineTo(.067, .005); ctx.closePath();
  ctx.moveTo(.073, .005);
  ctx.lineTo(.073, -.0015); ctx.lineTo(.0775, .005); ctx.closePath();
  ctx.moveTo(.026, .001);
  ctx.quadraticCurveTo(.028, -.001, .030, .001);
  ctx.quadraticCurveTo(.032, -.001, .034, .001);
  ctx.moveTo(.041, .000);
  ctx.quadraticCurveTo(.0425, -.0015, .044, .000);
  ctx.quadraticCurveTo(.0455, -.0015, .047, .000);
  ctx.stroke();
  ctx.restore();
}

function printBoardHeader(ctx, scale, width, depth, code) {
  ctx.strokeStyle = blue;
  for (const [inset, radius, weight] of [[.0048, .0055, .00067], [.007, .004, .00029]]) {
    ctx.lineWidth = weight;
    ctx.beginPath();
    ctx.roundRect(inset, inset, width - inset * 2, depth - inset * 2, radius);
    ctx.stroke();
  }
  ctx.lineWidth = .00055;
  ctx.beginPath();
  for (const [x, z, dx, dz] of [[.010, depth-.010, 1, -1], [width-.010, depth-.010, -1, -1]]) {
    ctx.moveTo(x + dx * .005, z);
    ctx.lineTo(x, z); ctx.lineTo(x, z + dz * .005);
  }
  ctx.stroke();
  ctx.fillStyle = blue;
  ctx.beginPath();
  ctx.roundRect(.0108, .0108, .0155, .0122, .0018);
  ctx.fill();
  ctx.fillStyle = '#fff5df';
  printLabel(ctx, scale, code, .01855, .0171, .0083, 800);
  ctx.fillStyle = blue;
  const titles = { A: '主体结构', B: '屋顶与门廊', C: '门窗与细节' };
  printLabel(ctx, scale, titles[code], .031, .0171, .0067, 700, 'left');
  coastLine(ctx, width - .102, .013);
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paperGrain(ctx) {
  const { width, height } = ctx.canvas;
  const image = ctx.getImageData(0, 0, width, height);
  let seed = 20903;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    const tone = (seed >>> 29) - 3;
    image.data[i] += tone;
    image.data[i + 1] += tone;
    image.data[i + 2] += tone;
  }
  ctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.fillStyle = '#5c4c35';
  ctx.globalAlpha = .08;
  for (let i = 0; i < 310; i++) {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    ctx.fillRect((seed >>> 10) % width, (seed >>> 21) % height, 1 + (seed & 3), .6);
  }
  ctx.restore();
}

function boardStock(width, depth, shape, stock, edge) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .0015, bevelEnabled: false });
  const positions = geometry.attributes.position;
  const uv = [];
  for (let i = 0; i < positions.count; i++) {
    uv.push(positions.getX(i) / width + .5, positions.getY(i) / depth + .5);
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const slab = new THREE.Mesh(geometry, [stock, edge]);
  slab.rotation.x = -Math.PI / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  return slab;
}

export function makeBoards(entries) {
  const boards = {};
  const stock = printedMaterial('board', paper);
  const edge = new THREE.MeshStandardMaterial({ color: '#c1a779', roughness: 1 });
  for (const code of ['A', 'B', 'C']) {
    const group = new THREE.Group();
    group.position.x = BOARD_X;
    const list = entries.filter(entry => entry.part.board === code);
    const width = .245, depth = layoutSlots(list, width, code);
    const shape = boardShape(width, depth);
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = Math.ceil(canvas.width * depth / width);
    const ctx = canvas.getContext('2d'), scale = canvas.width / width;
    ctx.scale(scale, scale);
    printBoardHeader(ctx, scale, width, depth, code);

    for (const entry of list) {
      const center = entry.flat.box.getCenter(new THREE.Vector3());
      const sx = entry.slot.x - width / 2 - center.x, sz = entry.slot.z - depth / 2 - center.z;
      entry.trayPosition = new THREE.Vector3(BOARD_X + sx, .0018 - entry.flat.box.min.y, sz);
      entry.trayQuaternion = entry.flat.q.clone();

      const hole = new THREE.Path();
      ctx.beginPath();
      for (const [index, [x, z]] of entry.flat.outline.entries()) {
        const px = entry.slot.x + x - center.x, pz = entry.slot.z + z - center.z;
        if (index === 0) { hole.moveTo(sx + x, -(sz + z)); ctx.moveTo(px, pz); }
        else { hole.lineTo(sx + x, -(sz + z)); ctx.lineTo(px, pz); }
      }
      hole.closePath();
      shape.holes.push(hole);
      ctx.closePath();
      ctx.strokeStyle = '#2d589b';
      ctx.lineWidth = .00043;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(entry.slot.x, entry.slot.labelZ, .00815, .00345, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f6ebd1';
      ctx.fill();
      ctx.strokeStyle = blue;
      ctx.lineWidth = .00038;
      ctx.stroke();
      ctx.fillStyle = blue;
      printLabel(ctx, scale, entry.part.boardLabel, entry.slot.x, entry.slot.labelZ + .0002, .00455, 750);

      const contour = [...entry.flat.outline, entry.flat.outline[0]]
        .map(([x, z]) => new THREE.Vector3(sx + x, .0003, sz + z));
      const guide = new THREE.LineBasicMaterial({ color: blue, transparent: true, opacity: .46 });
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(contour), guide));
    }

    group.add(boardStock(width, depth, shape, stock, edge));
    const print = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({
      map: canvasTexture(canvas), transparent: true, depthWrite: false, toneMapped: false,
    }));
    print.rotation.x = -Math.PI / 2;
    print.position.y = .00158;
    group.add(print);
    boards[code] = { group, list, width, depth };
  }
  return boards;
}

function printRoof(ctx, kind, color) {
  if (kind === 'porchRoof') {
    for (let x = 42; x < 512; x += 72) {
      ctx.fillStyle = '#8e3f2e80'; ctx.fillRect(x, 0, 2.5, 512);
      ctx.fillStyle = '#ffd8ac48'; ctx.fillRect(x + 2.5, 0, 2.5, 512);
    }
    ctx.fillStyle = '#8c4534a0';
    ctx.fillRect(0, 5, 512, 3);
    ctx.fillRect(0, 504, 512, 3);
    return;
  }
  const width = kind === 'dormerRoof' ? 116 : 68, course = kind === 'dormerRoof' ? 69 : 48;
  const shades = ['#fff3d01a', '#73261314', '#f8c59a18', '#a64b341c'];
  ctx.strokeStyle = '#833c2ac2';
  ctx.lineWidth = 2.1;
  for (let row = Math.ceil(512 / course); row >= -1; row--) {
    const y = row * course, tail = y + course * 1.24;
    for (let col = -1; col <= Math.ceil(512 / width); col++) {
      const x = col * width + (row % 2) * width / 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, tail - course * .61);
      ctx.bezierCurveTo(x, tail - course * .22, x + width * .25, tail, x + width / 2, tail);
      ctx.bezierCurveTo(x + width * .75, tail, x + width, tail - course * .22, x + width, tail - course * .61);
      ctx.lineTo(x + width, y);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = shades[((row + 2) * 3 + (col + 1) * 7) % shades.length];
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function printedMaterial(kind, color) {
  const key = `${kind}:${color}`;
  let texture = surfaceMaps.get(key);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const x = canvas.getContext('2d', { willReadFrequently: true });
    x.fillStyle = color;
    x.fillRect(0, 0, 512, 512);
    if (/roof/i.test(kind)) {
      printRoof(x, kind, color);
    } else if (kind === 'door' || kind === 'sign') {
      // Vertical parts project their up axis toward negative V.
      x.save();
      x.translate(0, 512);
      x.scale(1, -1);
      x.strokeStyle = '#eddfb9';
      x.lineWidth = 6;
      x.strokeRect(29, 29, 454, 454);
      if (kind === 'door') {
        x.fillStyle = '#214a73';
        x.fillRect(70, 63, 372, 184);
        x.strokeRect(70, 63, 372, 184);
        x.beginPath();
        x.moveTo(256, 63); x.lineTo(256, 247);
        x.moveTo(70, 155); x.lineTo(442, 155);
        x.stroke();
        x.strokeStyle = '#d8e4de88';
        x.lineWidth = 3;
        for (const inset of [92, 174, 256, 338, 420]) {
          x.beginPath(); x.moveTo(inset, 281); x.lineTo(inset, 446); x.stroke();
        }
        x.fillStyle = '#e5be78';
        x.beginPath(); x.arc(405, 302, 12, 0, Math.PI * 2); x.fill();
      } else {
        x.lineWidth = 13;
        x.lineCap = 'round';
        x.beginPath();
        x.ellipse(256, 132, 13, 44, 0, 0, Math.PI * 2);
        x.moveTo(256, 177); x.lineTo(256, 380);
        x.moveTo(214, 231); x.lineTo(298, 231);
        x.moveTo(204, 304); x.quadraticCurveTo(216, 412, 256, 380);
        x.quadraticCurveTo(296, 412, 308, 304);
        x.stroke();
      }
      x.restore();
    } else if (kind === 'window') {
      x.strokeStyle = '#f0e6cc';
      x.lineWidth = 8;
      x.strokeRect(24, 23, 464, 466);
    } else if (kind === 'chimney') {
      x.strokeStyle = '#315b9168';
      x.lineWidth = 2;
      for (let y = 52, row = 0; y < 512; y += 58, row++) {
        x.beginPath(); x.moveTo(0, y); x.lineTo(512, y);
        for (let p = 102 + (row % 2) * 91; p < 512; p += 179) {
          x.moveTo(p, y); x.lineTo(p, y + 58);
        }
        x.stroke();
      }
    }
    paperGrain(x);
    texture = canvasTexture(canvas);
    surfaceMaps.set(key, texture);
  }
  return new THREE.MeshStandardMaterial({ map: texture, color: '#ffffff', roughness: .94 });
}

export function projectUV(mesh, normal) {
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normal).normalize(),up);
  const a=mesh.geometry.attributes.position, points=[];
  for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyQuaternion(q));
  const box=new THREE.Box3().setFromPoints(points),size=box.getSize(new THREE.Vector3());
  const uv=points.flatMap(p=>[(p.x-box.min.x)/Math.max(size.x,1e-6),(p.z-box.min.z)/Math.max(size.z,1e-6)]);
  mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
}
