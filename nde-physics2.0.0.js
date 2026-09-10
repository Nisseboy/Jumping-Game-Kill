
/*
This is a built version of nde-physics and is all the source files stitched together, go to the github for source


*/
/* src/PhysicsManager.js */
/*


*/



class PhysicsManager extends Component {
  static collisionPairs = new Map();
  
  constructor(props = {}) {
    super();
    
    this.iterations = 15;

    this.obs = []
    this.rbs = [];
    
    this.layers = [];
    for (let i of props.layers ?? []) {
      this.addLayer(i);
    }

    this.staticFrictionThreshold = 0.01; // m/s
    this.staticFrictionRatio = 1.2; // frictionStatic/frictionDynamic

    this.dampingLinear = 0.02;
    this.dampingRotational = 0.02;

    this.constraints = [];


    this._collisionSet = new Set();
    this._potentialCollisions = new Array();
    this._collisions = new Array();

    this.collisionMap = new Map();


    this._showCollisionPoints = false;
    this.collisionPoints = new Array();
  }

  

  addOb(ob) {
    let c = ob.getComponent(Collider);
    let layer = this.calculateLayer(c);
    if (layer == undefined) return;

    this.layers[layer].addCollider(c);

    let index = this.obs.indexOf(undefined);
    if (index == -1) index = this.obs.length;

    this.obs[index] = ob;
    this.rbs[index] = ob.getComponent(RigidBody);
  }
  removeOb(ob) {
    let index = this.obs.indexOf(ob);
    if (index == -1) return;
    
    this.obs[index] = undefined;
    this.rbs[index] = undefined;

    let c = ob.getComponent(Collider);
    
    let layer = this.layers.find(l=>l.colliders.indexOf(c) != -1);
    if (layer != undefined) {
      layer.removeCollider(c);
    }
  }
  addObs(ob) {
    let colliders = ob.getComponents(Collider);
    
    for (let i = 0; i < colliders.length; i++) {
      let ob = colliders[i].ob;

      if (this.obs.includes(ob)) continue;

      this.addOb(ob);
    }
  }
  removeObs(ob) {
    let colliders = ob.getComponents(Collider);
    
    for (let i = 0; i < colliders.length; i++) {
      let ob = colliders[i].ob;

      if (!this.obs.includes(ob)) continue;

      this.removeOb(ob);
    }
  }

  addLayer(layer) {
    this.layers.push(layer);
    this.layers.sort((a, b) => a.size - b.size);
  }
  calculateLayer(collider) {
    let size = 10 ** Math.ceil(Math.log10(collider.r));
    
    for (let i = 0; i < this.layers.length; i++) {
      if (this.layers[i].size == size) return i;
    }

    this.addLayer(new PhysicsLayer(size));

    return this.calculateLayer(collider);
  }

  static addCollisionPair(typeA, typeB, f) {
    let mapA = this.collisionPairs.get(typeA);
    if (!mapA) this.collisionPairs.set(typeA, new Map());
    mapA = this.collisionPairs.get(typeA);
    mapA.set(typeB, f);
  }

  clear() {
    for (let i = 0; i < this.obs.length; i++) {
      if (this.obs[i]) this.removeOb(this.obs[i]);
    }
  }

  addConstraint(constraint) {
    this.constraints.push(constraint);
  }
  removeConstraint(constraint) {
    let index = this.constraints.indexOf(constraint);
    if (index != -1) this.constraints.splice(index, 1);
  }
  clearConstraints() {
    this.constraints.length = 0;
  }


  start() {
    this.addObs(this);

    this.on("obAdded", ob => {
      this.addObs(ob);
    });
    this.on("obRemoved", ob => {
      this.removeObs(ob);
    });
    this.on("componentAdded", comp => {
      if (!(comp instanceof Collider)) return;
      
      this.addOb(comp.ob);
    });
    this.on("componentRemoved", comp => {
      if (!(comp instanceof Collider)) return;
      
      this.removeOb(comp.ob);
    });
  }

  update(_dt) {
    let collisions;

    let dt = _dt / this.iterations;
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      this.integrate(dt);

      collisions = this.getCollisions();

      for (let i = 0; i < this.constraints.length; i++) {
        this.constraints[i].solve();
      }
      
      outer: for (let i = 0; i < collisions.length; i++) {
        let coll = collisions[i];

        for (let j = 0; j < this.constraints.length; j++) {
          let con = this.constraints[j];
          if ((con.a == coll.a && con.b == coll.b) || (con.a == coll.b && con.b == coll.a)) continue outer;
        }
        
        this.resolveCollision(coll);
      } 
    }

    this._showCollisionPoints = false;

    this.fireCollisionEvents(collisions);

    this.resetForces();
  }

  renderCollisionPoints() {
    renderer._(() => {
      renderer.set("fill", "rgb(255, 255, 255)")
        
      for (let p of this.collisionPoints) {
        renderer.circle(new Vec(p.x, p.y), 0.1);
      }

      this._showCollisionPoints = true;
      this.collisionPoints.length = 0;
    });
  }

  getCollisions() {
    let num = this.layers.length;

    for (let i = 0; i < num; i++) {
      let layer = this.layers[i];

      layer.partition();
    }

    
    this._potentialCollisions.length = 0;
    for (let i = 0; i < num; i++) {
      for (let j = i; j < num; j++) {
        this.layers[i].getPotentialCollisions(this.layers[j], this._potentialCollisions);
      }
    }
    
    this._collisions.length = 0;
    for (let i = 0; i < this._potentialCollisions.length; i += 2) {
      let collision = createCollision(this._potentialCollisions[i], this._potentialCollisions[i+1]);
      if (collision) this._collisions.push(collision);
    }

    return this._collisions;
  }

  resolveCollision(coll) {
    let a = coll.a;
    let b = coll.b;

    let aRB = this.rbs[this.obs.indexOf(a.ob)];
    let bRB = this.rbs[this.obs.indexOf(b.ob)];
    


    if (!aRB || !bRB || (aRB.static && bRB.static)) return;

    if (this._showCollisionPoints) this.collisionPoints.push(coll);

    // --- Relative positions from COM to contact point ---
    let rAx = coll.x - a.transform.pos.x;
    let rAy = coll.y - a.transform.pos.y;
    let rBx = coll.x - b.transform.pos.x;
    let rBy = coll.y - b.transform.pos.y;

    // --- Velocities at contact point ---
    let vAx = aRB.vel.x - aRB.av * rAy; // ω × r in 2D: (-ω * ry, ω * rx)
    let vAy = aRB.vel.y + aRB.av * rAx;
    let vBx = bRB.vel.x - bRB.av * rBy;
    let vBy = bRB.vel.y + bRB.av * rBx;

    // Relative velocity along normal
    let rvx = vBx - vAx;
    let rvy = vBy - vAy;
    let velAlongNormal = rvx * coll.nx + rvy * coll.ny;
    if (velAlongNormal > 0) return; // separating
    

    

    // --- Effective mass (scalar) ---
    let raCrossN = rAx * coll.ny - rAy * coll.nx;
    let rbCrossN = rBx * coll.ny - rBy * coll.nx;
    let invMassSum = aRB.invMass + bRB.invMass + raCrossN * raCrossN * aRB.invMoi + rbCrossN * rbCrossN * bRB.invMoi;

    // --- Impulse scalar ---
    let j = -(1 + aRB.restitution * bRB.restitution) * velAlongNormal / invMassSum;
    let ix = j * coll.nx;
    let iy = j * coll.ny;
    
    // --- Apply impulses ---
    aRB.applyImpulseAtPointFast(-ix, -iy, coll.x, coll.y);
    bRB.applyImpulseAtPointFast(ix, iy, coll.x, coll.y);
    

    // --- Recalculate relative velocity at contact point ---
    let vAxF = aRB.vel.x - aRB.av * rAy;
    let vAyF = aRB.vel.y + aRB.av * rAx;
    let vBxF = bRB.vel.x - bRB.av * rBy;
    let vByF = bRB.vel.y + bRB.av * rBx;

    let rvxF = vBxF - vAxF;
    let rvyF = vByF - vAyF;

    // --- Tangent vector (perpendicular to normal) ---
    let tx = -coll.ny;
    let ty = coll.nx;

    // --- Project relative velocity onto tangent ---
    let velAlongTangent = rvxF * tx + rvyF * ty;
    if (Math.abs(velAlongTangent) < 1e-6) return; // No significant tangential motion

    // --- Compute friction impulse scalar ---
    let raCrossT = rAx * ty - rAy * tx;
    let rbCrossT = rBx * ty - rBy * tx;
    let invMassTangent = aRB.invMass + bRB.invMass + raCrossT * raCrossT * aRB.invMoi + rbCrossT * rbCrossT * bRB.invMoi;

    let jt = -velAlongTangent / invMassTangent;

    let friction = aRB.friction * bRB.friction;
    if (Math.abs(velAlongTangent) < this.staticFrictionThreshold) friction *= this.staticFrictionRatio;

    // --- Coulomb's Law: clamp friction impulse ---
    let maxFriction = j * friction; // j is the normal impulse scalar
    jt = Math.max(-maxFriction, Math.min(jt, maxFriction));

    // --- Apply friction impulse ---
    let fx = jt * tx;
    let fy = jt * ty;

    aRB.applyImpulseAtPointFast(-fx, -fy, coll.x, coll.y);
    bRB.applyImpulseAtPointFast(fx, fy, coll.x, coll.y);

    // --- Positional correction (linear only) ---
    let percent = 0.2;
    let correction = (coll.penetration / (aRB.invMass + bRB.invMass)) * percent;

    if (!aRB.static) {
      a.transform.pos.x -= correction * coll.nx * aRB.invMass;
      a.transform.pos.y -= correction * coll.ny * aRB.invMass;
    }
    if (!bRB.static) {
      b.transform.pos.x += correction * coll.nx * bRB.invMass;
      b.transform.pos.y += correction * coll.ny * bRB.invMass;
    }
  }

  fireCollisionEvents(collisions) {
    this._collisionSet.clear();

    let coll, a, b, key;
    for (let i = 0; i < collisions.length; i++) {
      coll = collisions[i];

      a = coll.a.ob.id < coll.b.ob.id ? coll.a.ob.id : coll.b.ob.id;
      b = coll.a.ob.id < coll.b.ob.id ? coll.b.ob.id : coll.a.ob.id;

      key = (0.5 * (a + b) * (a + b + 1) + b);

      this._collisionSet.add(key);

      if (!this.collisionMap.has(key)) {
        this.collisionMap.set(key, [coll.a, coll.b]);

        coll.a.fire("collisionEnter", coll.b);
        coll.b.fire("collisionEnter", coll.a);
      }
    }

    for (let [key, pair] of this.collisionMap) {
      if (!this._collisionSet.has(key)) {
        this.collisionMap.delete(key);

        pair[0].fire("collisionExit", pair[1]);
        pair[1].fire("collisionExit", pair[0]);
      }
    }
  }


  integrate(dt) {
    let linearDampingFactor = Math.pow(1 - this.dampingLinear, dt);
    let rotationalDampingFactor = Math.pow(1 - this.dampingRotational, dt);

    let i,rb;
    for (i = 0; i < this.rbs.length; i++) {
      rb = this.rbs[i];
      if (!rb) continue;

      rb.vel.mul(linearDampingFactor);
      rb.av *= rotationalDampingFactor;

      rb.integrate(dt);
    }
  }

  accelerate(acc) {
    let i,rb;
    for (i = 0; i < this.rbs.length; i++) {
      rb = this.rbs[i];
      if (!rb) continue;

      rb.force.addV(acc._mul(rb.mass));
    }
  }

  resetForces() {
    let i,rb;
    for (i = 0; i < this.rbs.length; i++) {
      rb = this.rbs[i];
      if (!rb) continue;

      rb.force.set(0, 0);
      rb.torque = 0;
    }
  }
}





/* src/Collider/Collider.js */
class Collider extends Component {
  constructor() {
    super();

    this.r = undefined;

    this.i = undefined;
  }

  from(data) {
    super.from(data);

    this.r = data.r;

    return this;
  }
}





/* src/Collider/ColliderCircle.js */
class ColliderCircle extends Collider {
  constructor(props = {}) {
    super();

    this.r = props.r ?? 0.5;
  }
  
  render() {
    if (!nde.physicsDebug) return;
    
    nde.renderer._(() => {
      nde.renderer.translate(this.transform.pos);
      if (this.transform.dir) nde.renderer.rotate(this.transform.dir);

      nde.renderer.circle(vecZero, this.r);
    });
  }

}

PhysicsManager.addCollisionPair("ColliderCircle", "ColliderCircle", (a, b, c) => {
  // assume pos objects with x,y and helpers omitted; using raw arithmetic
  const dx2 = b.transform.pos.x - a.transform.pos.x;
  const dy2 = b.transform.pos.y - a.transform.pos.y;
  const mag2 = Math.sqrt(dx2*dx2 + dy2*dy2) || EPS;
  const rsum2 = a.r + b.r;
  const penetration = rsum2 - mag2;
  if (penetration <= 0) { return null; }
  c.penetration = penetration;
  c.nx = dx2 / mag2; c.ny = dy2 / mag2;
  // contact point: move from a towards b by a.r along the normal
  c.x = a.transform.pos.x + c.nx * (a.r - penetration*0.5);
  c.y = a.transform.pos.y + c.ny * (a.r - penetration*0.5);
  return c;
});





/* src/Collider/ColliderRect.js */
class ColliderRect extends Collider {
  constructor(props = {}) {
    super();

    this.size = props.size ?? vecOne.copy();

    this._cornercache = new Float32Array(8);
  }

  set size(value) {
    this._size = value;
    this.r = Math.sqrt((this.size.x * 0.5) ** 2 + (this.size.y * 0.5) ** 2);
  }
  get size() {
    return this._size;
  }

  render() {
    if (!nde.physicsDebug) return;
    
    nde.renderer._(() => {
      nde.renderer.translate(this.transform.pos);
      if (this.transform.dir) nde.renderer.rotate(this.transform.dir);

      nde.renderer.rect(this.size._mul(-0.5), this.size);
    });
  }


  from(data) {
    super.from(data);

    this.size = new Vec().from(data._size);

    return this;
  }
}


PhysicsManager.addCollisionPair("ColliderRect", "ColliderRect", (a, b, c) => {
  const A = getOBBFast(a);
  const B = getOBBFast(b);

  // axes are [ax,ay,bx,by] – but in getOBBFast it's [c,s,-s,c]; mapping below:
  const axisList = [
    [A.axes[0], A.axes[1], 0], // source 0 = A
    [A.axes[2], A.axes[3], 0],
    [B.axes[0], B.axes[1], 1],
    [B.axes[2], B.axes[3], 1]
  ];

  let smallestOverlap = Infinity;
  let smallestAxisX = 0, smallestAxisY = 0, axisSource = 0;

  // SAT loop (unrolled-ish)
  for (let i = 0; i < 4; i++) {
    const ax = axisList[i][0], ay = axisList[i][1];
    const projA = projectOntoAxisFast(A.corners, ax, ay);
    const projB = projectOntoAxisFast(B.corners, ax, ay);
    const overlap = overlap1DFast(projA.min, projA.max, projB.min, projB.max);
    if (overlap <= 0) { return null; } // separating axis -> no collision
    
    if (overlap < smallestOverlap) {
      smallestOverlap = overlap;
      smallestAxisX = ax; smallestAxisY = ay;
      axisSource = axisList[i][2];
    }
  }

  // Build normal consistent from A->B
  let dirx = b.transform.pos.x - a.transform.pos.x, diry = b.transform.pos.y - a.transform.pos.y;
  let dotDir = dirx*smallestAxisX + diry*smallestAxisY;
  let normalX = dotDir < 0 ? -smallestAxisX : smallestAxisX;
  let normalY = dotDir < 0 ? -smallestAxisY : smallestAxisY;

  // choose reference and incident boxes
  // axisSource === 0 => axis from A => reference = A, incident = B; else reverse
  let refBox = axisSource === 0 ? A : B;
  let incBox = axisSource === 0 ? B : A;

  // If reference is the second box we want to flip for clipping's outward plane orientation.
  // But we still want the collision normal to point A->B when returning to caller.
  if (axisSource === 1) {
    // flip normal for clipping plane selection (we'll adjust c.a/c.b so result matches expected semantics)
    normalX = -normalX; normalY = -normalY;
    c.a = b; c.b = a; // swap so c.n points from A -> B in final result
  } else {
    c.a = a; c.b = b;
  }

  c.penetration = smallestOverlap;
  c.nx = normalX; c.ny = normalY;

  // reference face index and vertices
  const refIdx = findBestFaceIndexFast(refBox.corners, normalX, normalY);
  const refV1x = refBox.corners[refIdx], refV1y = refBox.corners[refIdx+1];
  const refV2x = refBox.corners[(refIdx+2)%8], refV2y = refBox.corners[(refIdx+3)%8];

  // tangent t = normalized(refV2 - refV1)
  const txRaw = (refV2x - refV1x), tyRaw = (refV2y - refV1y);
  const tnorm = Math.sqrt(txRaw*txRaw + tyRaw*tyRaw) || EPS;
  const tX = txRaw / tnorm, tY = tyRaw / tnorm;

  // find incident face on incident box (most opposite to ref normal)
  let bestInc = 0, bestIncDot = Infinity;
  for (let i = 0; i < 8; i += 2) {
    const p0x = incBox.corners[i], p0y = incBox.corners[i+1];
    const p1x = incBox.corners[(i+2)%8], p1y = incBox.corners[(i+3)%8];
    const ex = p1x - p0x, ey = p1y - p0y;
    const L = Math.sqrt(ex*ex + ey*ey) || EPS;
    const nxE = ey / L, nyE = -ex / L; // edge normal
    const d = nxE*normalX + nyE*normalY;
    if (d < bestIncDot) { bestIncDot = d; bestInc = i; }
  }
  const incV1x = incBox.corners[bestInc], incV1y = incBox.corners[bestInc+1];
  const incV2x = incBox.corners[(bestInc+2)%8], incV2y = incBox.corners[(bestInc+3)%8];

  // Clip incident segment against the two side planes of the reference face:
  // keep dot(t, p) >= minT  and dot(t, p) <= maxT
  const refT1 = refV1x*tX + refV1y*tY;
  const refT2 = refV2x*tX + refV2y*tY;
  const minT = Math.min(refT1, refT2);
  const maxT = Math.max(refT1, refT2);

  // First clip: keep dot >= minT
  let clipped = clipSegmentToPlaneSimple(incV1x,incV1y, incV2x,incV2y, tX, tY, minT, true);
  if (clipped.length === 0) {
    // fallback: centroid of support points
    const ai = supportIndex(A.corners, normalX, normalY);
    const bi = supportIndex(B.corners, -normalX, -normalY);
    const px = (A.corners[ai] + B.corners[bi]) * 0.5;
    const py = (A.corners[ai+1] + B.corners[bi+1]) * 0.5;
    c.x = px; c.y = py;
    return c;
  }

  // dedupe points (small) and pick extreme by dot(t,p) for segment
  let uniq = [];
  for (let P of clipped) {
    let dup = false;
    for (let Q of uniq) {
      const dxp = P.x - Q.x, dyp = P.y - Q.y;
      if (dxp*dxp + dyp*dyp < 1e-12) { dup = true; break; }
    }
    if (!dup) uniq.push(P);
  }
  if (uniq.length > 2) {
    uniq.sort((p,q) => (p.x*tX + p.y*tY) - (q.x*tX + q.y*tY));
    uniq = [uniq[0], uniq[uniq.length-1]];
  }

  // Second clip: keep dot <= maxT
  let clipped2 = [];
  if (uniq.length === 1) {
    if ((uniq[0].x*tX + uniq[0].y*tY) - maxT <= 1e-9) clipped2.push(uniq[0]);
  } else {
    clipped2 = clipSegmentToPlaneSimple(uniq[0].x,uniq[0].y, uniq[1].x,uniq[1].y, tX, tY, maxT, false);
  }

  if (clipped2.length === 0) {
    const ai = supportIndex(A.corners, normalX, normalY);
    const bi = supportIndex(B.corners, -normalX, -normalY);
    const px = (A.corners[ai] + B.corners[bi]) * 0.5;
    const py = (A.corners[ai+1] + B.corners[bi+1]) * 0.5;
    c.x = px; c.y = py;
    return c;
  }

  // Now compute penetration for each clipped point relative to the reference face projection
  const projRef = projectOntoAxisFast(refBox.corners, normalX, normalY);
  const faceMax = projRef.max;
  let cx = 0, cy = 0, keepCount = 0;
  for (let P of clipped2) {
    const pDot = P.x*normalX + P.y*normalY;
    const pen = faceMax - pDot;
    if (pen >= -1e-9) { cx += P.x; cy += P.y; keepCount++; }
  }
  if (keepCount === 0) {
    const ai = supportIndex(A.corners, normalX, normalY);
    const bi = supportIndex(B.corners, -normalX, -normalY);
    const px = (A.corners[ai] + B.corners[bi]) * 0.5;
    const py = (A.corners[ai+1] + B.corners[bi+1]) * 0.5;
    c.x = px; c.y = py;
    return c;
  }
  c.x = cx / keepCount; c.y = cy / keepCount;
  return c;
});

PhysicsManager.addCollisionPair("ColliderCircle", "ColliderRect", (circle, rect, c) => {
  const cBody = circle.transform;
  const rBody = rect.transform;
  
  // 1. Vector from rect center to circle center
  const dx = cBody.pos.x - rBody.pos.x;
  const dy = cBody.pos.y - rBody.pos.y;

  // 2. Rotate that vector into the RECT'S LOCAL SPACE
  // Note: We use -rBody.dir to "un-rotate" the circle's position
  const cos = Math.cos(-rBody.dir);
  const sin = Math.sin(-rBody.dir);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // 3. Find the closest point on the local AABB
  const hW = rect.size.x * 0.5;
  const hH = rect.size.y * 0.5;
  

  // Clamp local circle center to rect bounds
  const closestX = Math.max(-hW, Math.min(localX, hW));
  const closestY = Math.max(-hH, Math.min(localY, hH));

  // 4. Distance from local circle center to the closest point
  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distanceSq = diffX * diffX + diffY * diffY;
  const radiusSq = circle.r * circle.r;

  // --- THE EXIT CONDITION ---
  // If the closest point is further than the radius, there is NO collision.
  if (distanceSq > radiusSq) {    
    return null;
  }

  const distance = Math.sqrt(distanceSq);

  // 5. Handle the "Inside" case vs "Outside" case
  if (distance !== 0) {
    // Standard case: Circle center is outside the rect
    c.penetration = circle.r - distance;
    // Local normal points from closest point to local center
    const lnx = diffX / distance;
    const lny = diffY / distance;

    // Rotate local normal back to world space
    const worldCos = Math.cos(rBody.dir);
    const worldSin = Math.sin(rBody.dir);
    c.nx = lnx * worldCos - lny * worldSin;
    c.ny = lnx * worldSin + lny * worldCos;
  } else {
    // Deep case: Circle center is EXACTLY inside the rect
    // Find the shallowest axis to push the circle out
    const overlapX = hW - Math.abs(localX);
    const overlapY = hH - Math.abs(localY);

    const worldCos = Math.cos(rBody.dir);
    const worldSin = Math.sin(rBody.dir);

    if (overlapX < overlapY) {
      c.penetration = overlapX + circle.r;
      const dir = localX > 0 ? 1 : -1;
      c.nx = dir * worldCos;
      c.ny = dir * worldSin;
    } else {
      c.penetration = overlapY + circle.r;
      const dir = localY > 0 ? 1 : -1;
      c.nx = -dir * worldSin;
      c.ny = dir * worldCos;
    }
  }

  // 6. Final Manifold Data
  c.a = rect;
  c.b = circle;

  // Contact point: the point on the Rect surface in world space
  const worldCos = Math.cos(rBody.dir);
  const worldSin = Math.sin(rBody.dir);
  c.x = rBody.pos.x + (closestX * worldCos - closestY * worldSin);
  c.y = rBody.pos.y + (closestX * worldSin + closestY * worldCos);

  return c;
});





/* src/Collider/ColliderGrid.js */
class ColliderGrid extends Collider {
  constructor(props = {}) {
    super();

    this.size = props.size ?? vecOne.copy();

    this.g = new Array(this.size.x * this.size.y);
  }

  set size(value) {
    this._size = value;
    this.r = Math.sqrt((this.size.x * 0.5) ** 2 + (this.size.y * 0.5) ** 2);
  }
  get size() {
    return this._size;
  }

  from(data) {
    super.from(data);

    this.size = new Vec().from(data._size);

    return this;
  }
}

PhysicsManager.addCollisionPair("ColliderGrid", "ColliderCircle", (grid, circle, c) => {
  const dx = circle.transform.pos.x - grid.transform.pos.x;
  const dy = circle.transform.pos.y - grid.transform.pos.y;
  const cos = Math.cos(-grid.transform.dir);
  const sin = Math.sin(-grid.transform.dir);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  const minCX = Math.floor(localX - circle.r);
  const maxCX = Math.floor(localX + circle.r);
  const minCY = Math.floor(localY - circle.r);
  const maxCY = Math.floor(localY + circle.r);

  let bestPen = -Infinity;
  let bestNX = 0, bestNY = 0, bestCX = 0, bestCY = 0;

  for (let cy = minCY; cy <= maxCY; cy++) {
    for (let cx = minCX; cx <= maxCX; cx++) {
      if (cx < 0 || cy < 0 || cx >= grid.size.x || cy >= grid.size.y) continue;
      if (!grid.g[cx + cy * grid.size.x]) continue;

      // Cell center in local space
      const cellCX = cx + 0.5;
      const cellCY = cy + 0.5;

      const relX = localX - cellCX;
      const relY = localY - cellCY;

      const closestX = Math.max(-0.5, Math.min(relX, 0.5));
      const closestY = Math.max(-0.5, Math.min(relY, 0.5));

      const diffX = relX - closestX;
      const diffY = relY - closestY;
      const distSq = diffX * diffX + diffY * diffY;

      if (distSq > circle.r * circle.r) continue;

      const dist = Math.sqrt(distSq);

      let pen, lnx, lny;
      if (dist > 0) {
        pen = circle.r - dist;
        lnx = diffX / dist;
        lny = diffY / dist;
      } else {
        const overlapX = 0.5 - Math.abs(relX);
        const overlapY = 0.5 - Math.abs(relY);
        if (overlapX < overlapY) {
          pen = overlapX + circle.r;
          lnx = relX > 0 ? 1 : -1;
          lny = 0;
        } else {
          pen = overlapY + circle.r;
          lnx = 0;
          lny = relY > 0 ? 1 : -1;
        }
      }

      if (pen > bestPen) {
        bestPen = pen;
        bestNX = lnx; bestNY = lny;
        bestCX = cellCX + closestX;
        bestCY = cellCY + closestY;
      }
    }
  }

  if (bestPen === -Infinity) return null;

  const wCos = Math.cos(grid.transform.dir);
  const wSin = Math.sin(grid.transform.dir);

  c.nx = bestNX * wCos - bestNY * wSin;
  c.ny = bestNX * wSin + bestNY * wCos;
  c.penetration = bestPen;
  c.x = grid.transform.pos.x + (bestCX * wCos - bestCY * wSin);
  c.y = grid.transform.pos.y + (bestCX * wSin + bestCY * wCos);
  c.a = grid;
  c.b = circle;
  return c;
});


PhysicsManager.addCollisionPair("ColliderGrid", "ColliderRect", (grid, rect, c) => {
  const cos = Math.cos(-grid.transform.dir);
  const sin = Math.sin(-grid.transform.dir);

  // Transform rect corners into grid local space to get candidate cells
  const obb = getOBBFast(rect);
  let minLX = Infinity, maxLX = -Infinity;
  let minLY = Infinity, maxLY = -Infinity;
  for (let i = 0; i < 8; i += 2) {
    const wx = obb.corners[i]   - grid.transform.pos.x;
    const wy = obb.corners[i+1] - grid.transform.pos.y;
    const lx = wx * cos - wy * sin;
    const ly = wx * sin + wy * cos;
    if (lx < minLX) minLX = lx;
    if (lx > maxLX) maxLX = lx;
    if (ly < minLY) minLY = ly;
    if (ly > maxLY) maxLY = ly;
  }

  const minCX = Math.floor(minLX);
  const maxCX = Math.floor(maxLX);
  const minCY = Math.floor(minLY);
  const maxCY = Math.floor(maxLY);

  const wCos = Math.cos(grid.transform.dir);
  const wSin = Math.sin(grid.transform.dir);

  // Rect-rect SAT function (reuse existing pair)
  const rectRectFn = PhysicsManager.collisionPairs.get("ColliderRect")?.get("ColliderRect");
  if (!rectRectFn) return null;

  let bestPen = -Infinity;
  let bestNX = 0, bestNY = 0, bestCX = 0, bestCY = 0;

  for (let cy = minCY; cy <= maxCY; cy++) {
    for (let cx = minCX; cx <= maxCX; cx++) {
      if (cx < 0 || cy < 0 || cx >= grid.size.x || cy >= grid.size.y) continue;
      if (!grid.g[cx + cy * grid.size.x]) continue;

      const cellLocalX = cx + 0.5;
      const cellLocalY = cy + 0.5;
      const cellWX = grid.transform.pos.x + (cellLocalX * wCos - cellLocalY * wSin);
      const cellWY = grid.transform.pos.y + (cellLocalX * wSin + cellLocalY * wCos);

      // Fake ColliderRect for this cell
      const cellCollider = {
        r: Math.SQRT2 * 0.5,
        size: { x: 1, y: 1 },
        transform: { pos: { x: cellWX, y: cellWY }, dir: grid.transform.dir },
        _cornercache: new Float32Array(8)
      };

      const result = rectRectFn(cellCollider, rect, {});
      if (!result) continue;

      if (result.penetration > bestPen) {
        bestPen = result.penetration;
        bestNX = result.nx; bestNY = result.ny;
        bestCX = result.x;  bestCY = result.y;
      }
    }
  }

  if (bestPen === -Infinity) return null;

  c.nx = bestNX; c.ny = bestNY;
  c.penetration = bestPen;
  c.x = bestCX; c.y = bestCY;
  c.a = grid; c.b = rect;
  return c;
});





/* src/Collider/Collision.js */


// === Lightweight Collision object + pool ===
class Collision {
  constructor() {
    this.a = null; this.b = null;
    this.x = 0; this.y = 0;
    this.nx = 0; this.ny = 0;
    this.penetration = 0;
  }
  reset(a,b) {
    this.a = a; this.b = b;
    this.x = this.y = this.nx = this.ny = this.penetration = 0;
    return this;
  }
}
const CollisionPool = (function(){
  const pool = [];
  return {
    alloc(a,b){
      return (pool.pop() || new Collision()).reset(a,b);
    },
    free(c){ pool.push(c); }
  };
})();


// === Helpers tuned for speed (inline-friendly) ===
// dot product inline in code where needed
// sqrt fallback for magnitude
const EPS = 1e-9;


// === OBB extractor: returns typed arrays for axes [ax,ay,bx,by] and corners Float32Array[8] (x0,y0,x1,y1,...) ===
function getOBBFast(collider) {
  // assume entity.pos = {x,y}, entity.dir is angle in radians, entity.collider.size = {x,y}
  const cx = collider.transform.pos.x, cy = collider.transform.pos.y;
  const hw = collider.size.x * 0.5;
  const hh = collider.size.y * 0.5;
  const c = Math.cos(collider.transform.dir), s = Math.sin(collider.transform.dir);

  // axes: local x, local y
  const axes = [ c, s, -s, c ];

  collider._cornercache[0] = cx + c*hw - s*hh; collider._cornercache[1] = cy + s*hw + c*hh;
  collider._cornercache[2] = cx - c*hw - s*hh; collider._cornercache[3] = cy - s*hw + c*hh;
  collider._cornercache[4] = cx - c*hw + s*hh; collider._cornercache[5] = cy - s*hw - c*hh;
  collider._cornercache[6] = cx + c*hw + s*hh; collider._cornercache[7] = cy + s*hw - c*hh;

  return { axes, corners: collider._cornercache };
}

// Project typed-corners onto axis (ax,ay). corners is Float32Array length 8.
function projectOntoAxisFast(corners, ax, ay) {
  // inline min/max
  let min = Infinity, max = -Infinity;
  let x, y, p;
  for (let i = 0; i < 8; i += 2) {
    x = corners[i]; y = corners[i+1];
    p = x*ax + y*ay;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min, max };
}

// overlap 1D
function overlap1DFast(aMin, aMax, bMin, bMax) {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin);
}

// support point on typed corners along (nx,ny) — returns index of corner with best projection
function supportIndex(corners, nx, ny) {
  let bestI = 0;
  let bestP = corners[0]*nx + corners[1]*ny;
  for (let i = 2; i < 8; i += 2) {
    const p = corners[i]*nx + corners[i+1]*ny;
    if (p > bestP) { bestP = p; bestI = i; }
  }
  return bestI; // index in corners (0..6 step2)
}

// normalize vector (inlined where needed)
function normalizeInline(x, y) {
  const L = Math.sqrt(x*x + y*y) || EPS;
  return [x / L, y / L, L];
}


// find best face index for reference box based on normal (nx,ny)
// returns starting corner index (0,2,4,6)
function findBestFaceIndexFast(corners, nx, ny) {
  let bestIdx = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < 8; i += 2) {
    const x0 = corners[i], y0 = corners[i+1];
    const x1 = corners[(i+2)%8], y1 = corners[(i+3)%8];
    const ex = x1 - x0, ey = y1 - y0;
    // edge normal = (ey, -ex) ; normalize for dot comparisons
    const L = Math.sqrt(ey*ey + ex*ex) || EPS;
    const nxE = ey / L, nyE = -ex / L;
    const d = nxE*nx + nyE*ny;
    if (d > bestDot) { bestDot = d; bestIdx = i; }
  }
  return bestIdx;
}


// Clip segment p0->p1 against plane dot(n,p) >= offset  or <= offset (controlled by keepGreater).
// p0,p1 are {x,y} style plain objects here for clarity — but we avoid creating them in hot path.
function clipSegmentToPlaneSimple(p0x,p0y, p1x,p1y, nx,ny, offset, keepGreater) {
  const out = [];
  const d0 = p0x*nx + p0y*ny - offset;
  const d1 = p1x*nx + p1y*ny - offset;
  const inside0 = keepGreater ? (d0 >= 0) : (d0 <= 0);
  const inside1 = keepGreater ? (d1 >= 0) : (d1 <= 0);
  if (inside0) out.push({x:p0x,y:p0y});
  if (inside1) out.push({x:p1x,y:p1y});
  if (d0 * d1 < 0) {
    const t = d0 / (d0 - d1);
    out.push({ x: p0x + (p1x - p0x)*t, y: p0y + (p1y - p0y)*t });
  }
  return out;
}


// === Main optimized collision creation (rect-rect + circle-circle implemented) ===
function createCollision(a, b) {
  // early broad-phase cheap circle-sphere approx using bounding radii if provided
  // assuming entities may have collider.r for circle or collider.size for rect
  const dx = a.transform.pos.x - b.transform.pos.x;
  const dy = a.transform.pos.y - b.transform.pos.y;
  const sqd = dx*dx + dy*dy;
  const ar = a.r;
  const br = b.r;
  const rsum = ar + br;
  if (sqd > rsum*rsum) return null; // cheap reject

  const c = CollisionPool.alloc(a,b);

  let res;
  let f = PhysicsManager.collisionPairs.get(a.type)?.get(b.type);
  if (f) res = f(a, b, c);
  else {
    f = PhysicsManager.collisionPairs.get(b.type)?.get(a.type);
    if (f) res = f(b, a, c);
  }
  
  if (res) return res;

  CollisionPool.free(c);
  return null;
}







/* src/Constraint/ConstraintBase.js */
class ConstraintBase extends Serializable {
  constructor(a, b) {
    super();

    this.a = a;
    this.b = b;

    this.aIndex = undefined;
    this.bIndex = undefined;
  }

  solve() {

  }

  from(data) {
    super.from(data);

    this.aIndex = data.aIndex;
    this.bIndex = data.bIndex;

    return this;
  }
}





/* src/Constraint/ConstraintWeld.js */
class ConstraintWeld extends ConstraintBase {
  constructor(a, b) {
    super(a, b);
    
    this.offsetPos = undefined;
    this.offsetDir = undefined;

    if (a) this.initOffset();
  }

  initOffset() {
    this.offsetPos = this.a.pos._subV(this.b.pos);
    this.offsetDir = this.a.dir - this.b.dir;
  }

  solve() {
    let x = (this.a.pos.x - this.b.pos.x) - this.offsetPos.x;
    let y = (this.a.pos.y - this.b.pos.y) - this.offsetPos.y;
    let dir = (this.a.dir - this.b.dir) - this.offsetDir;

    this.a.applyImpulseFast(-x, -y);
    this.b.applyImpulseFast(x, y);
    this.a.av -= dir * this.a.invMass;
    this.b.av += dir * this.b.invMass;
  }

  from(data) {
    super.from(data);

    this.offsetPos = new Vec().from(data.offsetPos);
    this.offsetDir = data.offsetDir;

    return this;
  }
}





/* src/PhysicsLayer.js */
class PhysicsLayer {
  constructor(size) {
    this.size = size;

    this.colliders = [];
    this.map = {};
    
    this._collisionSet = new Set();
  }

  addCollider(collider) {
    let i = this.colliders.indexOf(undefined);
    if (i == -1) i = this.colliders.length;

    this.colliders[i] = collider;

    let index = this.getIndex(collider.transform.pos);
    collider.i = index;

    if (!this.map[index]) this.map[index] = [];
    this.map[index].push(i);    
  }
  removeCollider(collider) {
    let i = this.colliders.indexOf(collider);
    if (i == -1) return;

    let cell = this.map[this.colliders[i].i];
    cell.splice(cell.indexOf(i), 1);

    this.colliders[i] = undefined;
  }

  moveCollider(colliderIndex, i) {
    let collider = this.colliders[colliderIndex];

    if (collider.i == i) return;

    let cell = this.map[collider.i];
    cell.splice(cell.indexOf(colliderIndex), 1);

    if (!this.map[i]) this.map[i] = [];
    this.map[i].push(colliderIndex);
    collider.i = i;

    
  }

  getIndex(pos) {
    return this.getIndexFast(pos.x, pos.y);
  }
  
  getIndexFast(x, y) {
    //return Math.floor(x / this.size) + "_" + Math.floor(y / this.size);

    let h1 = Math.floor(x / this.size) * 0x85ebca6b;
    let h2 = Math.floor(y / this.size) * 0x127842;
    
    h1 ^= h1 >>> 16;
    h2 ^= h2 >>> 16;
    
    return (h1 ^ h2) >>> 0;
  }

  partition() {
    let collider, index;
    for (let i = 0; i < this.colliders.length; i++) {
      collider = this.colliders[i];
      if (collider == undefined) continue;

      index = this.getIndex(collider.transform.pos);
      this.moveCollider(i, index);
    }
  }

  getPotentialCollisions(layer, collisions = []) {
    let size = layer.size;

    if (layer == this) {
      this._collisionSet.clear();
      let i,j,c1,x,y,coll,cell,cell2,cell3,cell4,cell5,hash;

      for (let I = 0; I < this.colliders.length; I++) {
        coll = this.colliders[I];
        if (coll == undefined) continue;

        hash = coll.i;

        if (this._collisionSet.has(hash)) continue;
        this._collisionSet.add(hash);

        cell = this.map[hash];
        x = coll.transform.pos.x;
        y = coll.transform.pos.y;
        cell2 = this.map[this.getIndexFast(x + size, y)];
        cell3 = this.map[this.getIndexFast(x, y + size)];
        cell4 = this.map[this.getIndexFast(x + size, y + size)];
        cell5 = this.map[this.getIndexFast(x - size, y + size)];

        for (i = 0; i < cell.length; i++) {
          c1 = this.colliders[cell[i]];

          for (j = i+1; j < cell.length; j++) {
            collisions.push(c1, this.colliders[cell[j]]);
          }

          for (j = 0; j < cell2?.length; j++) {
            collisions.push(c1, this.colliders[cell2[j]]);
          }
          for (j = 0; j < cell3?.length; j++) {
            collisions.push(c1, this.colliders[cell3[j]]);
          }
          for (j = 0; j < cell4?.length; j++) {
            collisions.push(c1, this.colliders[cell4[j]]);
          }
          for (j = 0; j < cell5?.length; j++) {
            collisions.push(c1, this.colliders[cell5[j]]);
          }
        }
      }
      
      return collisions;
    }


    
    let indexes = [];
    let coll, x, y, i, j, cell2;
    for (i = 0; i < this.colliders.length; i++) {
      coll = this.colliders[i];
      if (coll == undefined) continue;

      x = coll.transform.pos.x;
      y = coll.transform.pos.y;

      indexes[0] = layer.getIndexFast(x - size, y - size);
      indexes[1] = layer.getIndexFast(x - size, y);
      indexes[2] = layer.getIndexFast(x - size, y + size);
      indexes[3] = layer.getIndexFast(x, y - size);
      indexes[4] = layer.getIndexFast(x, y);
      indexes[5] = layer.getIndexFast(x, y + size);
      indexes[6] = layer.getIndexFast(x + size, y - size);
      indexes[7] = layer.getIndexFast(x + size, y);
      indexes[8] = layer.getIndexFast(x + size, y + size);


      for (j = 0; j < 9; j++) {
        cell2 = layer.map[indexes[j]];
        
        if (!cell2) continue;
        for (let k = 0; k < cell2.length; k++) {
          collisions.push(this.colliders[i], layer.colliders[cell2[k]]);
        }
      }
    }

    return collisions;


    if (layer == this) {
      let a,b;
      for (let i = 0; i < collisions.length; i += 2) {
        a = collisions[i];
        b = collisions[i+1];

        if (a != b && a > b) continue;

        collisions[i] = collisions[collisions.length - 2];
        collisions[i + 1] = collisions[collisions.length - 1];
        i -= 2;

        collisions.pop();
        collisions.pop();
      }
    }
    
  }
}





/* src/RigidBody.js */
class RigidBody extends Component {
  constructor(props = {}) {
    super();

    this.vel = props.vel || new Vec(0, 0);
    this.av = props.av || 0;
    
    this.force = new Vec(0, 0);
    this.torque = 0;


    this.friction = props.friction ?? Math.sqrt(0.5) //Friction coefficient of this to itself is 0.5
    this.restitution = props.restitution ?? Math.sqrt(0.2) //Restitution coefficient of this to itself is 0.5

    this.mass = props.mass ?? 10;
    this.moi = props.moi ?? 16;
    this.static = props.static ?? false;

    this.lastAcc = new Vec(0, 0);
    this.lastAA = 0;
  }

  set mass(value) {
    this._mass = value;
    this.updateInvs();
  }
  get mass() {
    return this._mass;
  }
  set moi(value) {
    this._moi = value;
    this.updateInvs();
  }
  get moi() {
    return this._moi;
  }
  set static(value) {
    this._static = value;
    this.updateInvs();
  }
  get static() {
    return this._static;
  }


  updateInvs() {
    if (this.static) {
      this.invMass = 0;
      this.invMoi = 0;
      return;
    }
    this.invMoi = 1 / this.moi;
    this.invMass = 1 / this.mass;
  }



  integrate(dt) {
    if (this.invMass != 0) {
      let newVelHalf = this.lastAcc._mul(dt * 0.5).addV(this.vel);
      this.transform.pos = newVelHalf._mul(dt).addV(this.transform.pos);
      this.lastAcc.from(this.force).mul(this.invMass);
      this.vel.from(this.lastAcc).mul(dt * 0.5).addV(newVelHalf);
    }

    if (this.invMoi != 0) {
      let newAVHalf = this.lastAA * dt * 0.5 + this.av;
      this.transform.dir += newAVHalf * dt;
      this.lastAA = this.torque * this.invMoi;
      this.av = this.lastAA * dt * 0.5 + newAVHalf;    
    }
  }

  applyForce(force) {
    this.applyForceFast(force.x, force.y)
  }
  applyForceFast(x, y) {
    this.force.x += x;
    this.force.y += y;
  }

  applyImpulse(impulse) {
    this.applyImpulseFast(impulse.x, impulse.y)
  }
  applyImpulseFast(x, y) {
    this.vel.x += x * this.invMass;
    this.vel.y += y * this.invMass;
  }

  applyImpulseAtPoint(impulse, pos) {
    this.applyImpulseAtPointFast(impulse.x, impulse.y, pos.x, pos.y)
  }
  applyImpulseAtPointFast(ix, iy, px, py) {
    this.vel.x += ix * this.invMass;
    this.vel.y += iy * this.invMass;

    let x = px - this.transform.pos.x;
    let y = py - this.transform.pos.y;

    // Cross product for torque (scalar in 2D)
    let torque = x * iy - y * ix;

    this.av += torque * this.invMoi;
  }


  from(data) {
    super.from(data);

    this.vel = new Vec().from(data.vel);
    this.av = data.av;

    this.force = new Vec().from(data.force);
    this.torque = data.torque;

    this.mass = data._mass;
    this.moi = data._moi;
    this.static = data._static;

    this.friction = data.friction;
    this.restitution = data.restitution;

    this.lastAcc = new Vec().from(data.lastAcc);
    this.lastAA = data.lastAA;

    return this;
  }
}





/* src/PhysicsGrid.js */
class PhysicsGrid {
  constructor() {
    this.growFactor = 0.3;

    this.min = new Vec(0, 0);
    this.max = new Vec(1, 1);
    this.size = new Vec(1, 1);
    this.gridSize = new Vec(1, 1);
    this.cellSize = 1;
    this.invCellSize = 1;

    this.grid = [[]];

    this.obs = [];
    this.queued = [];
  }

  addOb(ob) {
    this.obs.push(ob);
    this.queued.push(ob);
  }
  removeOb(ob) {
    let index = this.obs.findIndex(ob);
    if (index != -1) {
      this.obs.splice(index, 1);
      let gridIndex = this.getGridIndex(ob);
      let cell = this.grid[gridIndex];
      if (cell) {
        let cellIndex = cell.findIndex(ob);
        if (cellIndex != -1) {
          cell.splice(cellIndex, 1);
        }
      }
    }
  }
  clearObs() {
    this.obs = [];
    this.grid = [[]];
  }


  restructure(min, max, cellSize, iterations) {
    let hasChanged = false;
    
    let growFactor2 = 1 + this.growFactor;
    let growX = this.size.x * this.growFactor;
    let growY = this.size.y * this.growFactor;

    if (min.x < this.min.x) {
      this.min.x -= growX;
      hasChanged = true;      
    }
    if (min.y < this.min.y) {
      this.min.y -= growY;
      hasChanged = true;
    }
    if (max.x > this.max.x) {
      this.max.x += growX;
      hasChanged = true;
    }
    if (max.y > this.max.y) {
      this.max.y += growX;
      hasChanged = true;
    }
    if (cellSize > this.cellSize) {
      this.cellSize *= growFactor2;
      hasChanged = true;
    }


    if (iterations < 10) {
      let shrinkFactor = 1 - 1 / growFactor2;
      let shrinkFactor2 = 1 - shrinkFactor
      let shrinkX = Math.max(this.size.x * shrinkFactor, this.cellSize);
      let shrinkY = Math.max(this.size.y * shrinkFactor, this.cellSize);

      if (this.min.x + shrinkX < min.x) {
        this.min.x += shrinkX;
        hasChanged = true;
      }
      if (this.min.y + shrinkY < min.y) {
        this.min.y += shrinkY;
        hasChanged = true;
      }
      if (this.max.x - shrinkX > max.x) {
        this.max.x -= shrinkX;
        hasChanged = true;
      }
      if (this.max.y - shrinkY > max.y) {
        this.max.y -= shrinkY;
        hasChanged = true;
      }
      if (cellSize < this.cellSize * shrinkFactor2) {
        this.cellSize *= shrinkFactor2;
        hasChanged = true;        
      }
    }
    
    
    
    if (!hasChanged) return false;




    this.size.from(this.max).subV(this.min);
    let diff = this.size._();
    this.gridSize = this.size.div(this.cellSize).ceil();
    this.size = this.gridSize._mul(this.cellSize);
    diff.subV(this.size).mul(-0.5);
    this.min.subV(diff);
    this.max.addV(diff);
    
    this.invCellSize = 1 / this.cellSize;
    this.grid = new Array(this.gridSize.x * this.gridSize.y).fill(undefined).map(()=>[]);
    
    return true;
  }

  getGridIndex(ob) {
    return Math.floor((ob.pos.y - this.min.y) * this.invCellSize) * this.gridSize.x + Math.floor((ob.pos.x - this.min.x) * this.invCellSize);
  }

  partition() {
    let max = new Vec(-Infinity, -Infinity);
    let min = new Vec(Infinity, Infinity);
    let cellSize = 0;

    for (let i = 0; i < this.obs.length; i++) {
      let e = this.obs[i];

      max.x = Math.max(max.x, e.pos.x);
      max.y = Math.max(max.y, e.pos.y);
      min.x = Math.min(min.x, e.pos.x);
      min.y = Math.min(min.y, e.pos.y);

      cellSize = Math.max(cellSize, e.collider.r * 2);
    }

    if (max.x == -Infinity) max.x = 10;
    if (max.y == -Infinity) max.y = 10;
    if (min.x == Infinity) min.x = 0;
    if (min.y == Infinity) min.y = 0;
    if (min.x == max.x) max.x += 10;
    if (min.y == max.y) max.y += 10;
    if (cellSize == 0) cellSize = 1;

    let iterations = 0;
    while (this.restructure(min, max, cellSize, iterations)) {iterations++}

    
    
    if (iterations != 0) {
      this.queued.length = 0;
      for (let i = 0; i < this.obs.length; i++) {
        this.grid[this.getGridIndex(this.obs[i])].push(this.obs[i]);
      }
    } else {
      for (let i = 0; i < this.grid.length; i++) {
        let cell = this.grid[i];
        
        for (let j = 0; j < cell.length; j++) {
          if (this.getGridIndex(cell[j]) == i) continue;

          this.queued.push(cell[j]);
          cell.splice(j, 1);
          j--;
        }
      }
    } 
    
    
    for (let i = 0; i < this.queued.length; i++) {
      this.grid[this.getGridIndex(this.queued[i])].push(this.queued[i]);
    }
    this.queued.length = 0;
  }

  getPotentialCollisions(potentialCollisions = [], onlyStatic = false) {    

    let a, aStatic, i, j, cell, cell2, goRight, goDown;
    for (let cellIndex = 0; cellIndex < this.grid.length; cellIndex++) {
      cell = this.grid[cellIndex];
      
      
      for (i = 0; i < cell.length; i++) {
        a = cell[i];
        aStatic = a.static;


        for (j = i + 1; j < cell.length; j++) {
          if (!onlyStatic || aStatic != cell[j].static) {
            potentialCollisions.push(a, cell[j]);
          }
        }

        goRight = cellIndex % this.gridSize.x < this.gridSize.x - 1;
        goDown = Math.floor(cellIndex / this.gridSize.x) < this.gridSize.y - 1;

        if (goRight) {
          cell2 = this.grid[cellIndex + 1];
          for (j = 0; j < cell2.length; j++) {
            if (!onlyStatic || aStatic != cell2[j].static) {
              potentialCollisions.push(a, cell2[j]);
            }
          }
        }
        if (goDown) {
          cell2 = this.grid[cellIndex + this.gridSize.x];
          for (j = 0; j < cell2.length; j++) {
            if (!onlyStatic || aStatic != cell2[j].static) {
              potentialCollisions.push(a, cell2[j]);
            }
          }
        }

        if (goRight && goDown) {
          cell2 = this.grid[cellIndex + this.gridSize.x + 1];
          for (j = 0; j < cell2.length; j++) {
            if (!onlyStatic || aStatic != cell2[j].static) {
              potentialCollisions.push(a, cell2[j]);
            }
          }
        }
      }
    }

    return potentialCollisions;
  }
}





