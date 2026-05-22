import * as BABYLON from "@babylonjs/core";

interface GameCallbacks {
  onGemCollect: (count: number, total: number) => void;
  onFall: (remainingLives: number) => void;
  onWin: (finalScore: number) => void;
  onTimeUpdate: (time: number) => void;
}

interface Wall {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface GemData {
  mesh: BABYLON.Mesh;
  collected: boolean;
}

const LEVELS: {
  walls: Wall[];
  gems: [number, number][];
  start: [number, number];
  finish: [number, number];
  boardSize: number;
}[] = [
  {
    boardSize: 14,
    start: [-5, -5],
    finish: [5, 5],
    gems: [[-3, 0], [0, -3], [3, 0], [0, 3], [2, -2]],
    walls: [
      { x: 0, z: -3, w: 4, d: 0.5 },
      { x: -2, z: 1, w: 0.5, d: 4 },
      { x: 2, z: 2, w: 4, d: 0.5 },
      { x: 3, z: -1, w: 0.5, d: 3 },
      { x: -3, z: -2, w: 3, d: 0.5 },
    ],
  },
  {
    boardSize: 16,
    start: [-6, -6],
    finish: [6, 6],
    gems: [[-4, -2], [-1, -4], [2, -3], [4, 0], [2, 3], [-2, 4], [0, 1]],
    walls: [
      { x: -2, z: -4, w: 5, d: 0.5 },
      { x: -4, z: -1, w: 0.5, d: 5 },
      { x: 0, z: 0, w: 4, d: 0.5 },
      { x: 3, z: -2, w: 0.5, d: 4 },
      { x: 1, z: 2, w: 5, d: 0.5 },
      { x: -1, z: 4, w: 0.5, d: 4 },
      { x: 4, z: 4, w: 3, d: 0.5 },
    ],
  },
  {
    boardSize: 18,
    start: [-7, -7],
    finish: [7, 7],
    gems: [[-5, -3], [-2, -5], [1, -4], [4, -2], [5, 1], [3, 4], [0, 5], [-3, 3], [-1, 0], [2, 2]],
    walls: [
      { x: -3, z: -5, w: 6, d: 0.5 },
      { x: -5, z: -2, w: 0.5, d: 5 },
      { x: -1, z: -2, w: 5, d: 0.5 },
      { x: 2, z: -4, w: 0.5, d: 4 },
      { x: 4, z: 0, w: 4, d: 0.5 },
      { x: 5, z: -3, w: 0.5, d: 4 },
      { x: 1, z: 2, w: 5, d: 0.5 },
      { x: -2, z: 1, w: 0.5, d: 5 },
      { x: 3, z: 5, w: 0.5, d: 4 },
      { x: -4, z: 5, w: 4, d: 0.5 },
    ],
  },
];

export default class BabylonGame {
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private ball!: BABYLON.Mesh;
  private ballVelX = 0;
  private ballVelZ = 0;
  private lives = 3;
  private gemsCollected = 0;
  private gems: GemData[] = [];
  private score = 0;
  private elapsedTime = 0;
  private timerInterval: number | null = null;
  private levelData: (typeof LEVELS)[0];
  private finishMesh!: BABYLON.Mesh;
  private won = false;
  private fell = false;
  private boardHalfSize: number;
  private callbacks: GameCallbacks;
  private level: number;
  private keys: Record<string, boolean> = {};
  private joystickX = 0;
  private joystickZ = 0;
  private walls: BABYLON.Mesh[] = [];
  private wallData: Wall[] = [];
  private portalGlow!: BABYLON.PointLight;
  private portalTime = 0;

  constructor(canvas: HTMLCanvasElement, level: number, callbacks: GameCallbacks) {
    this.level = level;
    this.callbacks = callbacks;
    this.levelData = LEVELS[level - 1];
    this.boardHalfSize = this.levelData.boardSize / 2 - 1;

    this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.08, 1);

    this.setupCamera();
    this.setupLighting();
    this.setupBoard();
    this.setupWalls();
    this.setupBall();
    this.setupGems();
    this.setupFinish();
    this.setupControls();
    this.setupParticles();
    this.startTimer();

    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });

    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => {
    this.engine.resize();
  };

  private setupCamera() {
    const cam = new BABYLON.ArcRotateCamera(
      "cam",
      -Math.PI / 2,
      Math.PI / 3.5,
      22,
      BABYLON.Vector3.Zero(),
      this.scene
    );
    cam.lowerRadiusLimit = 12;
    cam.upperRadiusLimit = 35;
    cam.upperBetaLimit = Math.PI / 2.2;
  }

  private setupLighting() {
    const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.4;
    hemi.diffuse = new BABYLON.Color3(0.4, 0.5, 0.8);
    hemi.groundColor = new BABYLON.Color3(0.1, 0.1, 0.15);

    const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1, -2, -1), this.scene);
    sun.intensity = 0.8;
    sun.diffuse = new BABYLON.Color3(0.8, 0.85, 1.0);

    const ballGlow = new BABYLON.PointLight("ballGlow", new BABYLON.Vector3(0, 1, 0), this.scene);
    ballGlow.intensity = 1.2;
    ballGlow.range = 8;
    ballGlow.diffuse = new BABYLON.Color3(0.2, 0.8, 1.0);
    this.scene.registerBeforeRender(() => {
      if (this.ball) {
        ballGlow.position = this.ball.position.clone();
        ballGlow.position.y += 0.5;
      }
    });
  }

  private setupBoard() {
    const size = this.levelData.boardSize;

    const board = BABYLON.MeshBuilder.CreateBox("board", { width: size, height: 0.4, depth: size }, this.scene);
    board.position.y = -0.2;

    const mat = new BABYLON.StandardMaterial("boardMat", this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.08, 0.1, 0.18);
    mat.specularColor = new BABYLON.Color3(0.3, 0.4, 0.6);
    mat.emissiveColor = new BABYLON.Color3(0.01, 0.015, 0.03);
    board.material = mat;

    const gridSize = Math.floor(size);
    for (let i = -gridSize / 2; i <= gridSize / 2; i++) {
      const lineX = BABYLON.MeshBuilder.CreateBox(`gl_x_${i}`, { width: size, height: 0.01, depth: 0.02 }, this.scene);
      lineX.position.set(0, 0.01, i);
      const lmat = new BABYLON.StandardMaterial(`glm_x_${i}`, this.scene);
      lmat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.3);
      lmat.disableLighting = true;
      lineX.material = lmat;

      const lineZ = BABYLON.MeshBuilder.CreateBox(`gl_z_${i}`, { width: 0.02, height: 0.01, depth: size }, this.scene);
      lineZ.position.set(i, 0.01, 0);
      const lmat2 = new BABYLON.StandardMaterial(`glm_z_${i}`, this.scene);
      lmat2.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.3);
      lmat2.disableLighting = true;
      lineZ.material = lmat2;
    }

    const edgeH = this.levelData.boardSize / 2 + 0.15;
    const edgeMat = new BABYLON.StandardMaterial("edgeMat", this.scene);
    edgeMat.emissiveColor = new BABYLON.Color3(0.0, 0.4, 0.9);
    edgeMat.disableLighting = true;

    const edges = [
      { pos: [0, 0.21, edgeH], size: [size + 0.3, 0.05, 0.08] },
      { pos: [0, 0.21, -edgeH], size: [size + 0.3, 0.05, 0.08] },
      { pos: [edgeH, 0.21, 0], size: [0.08, 0.05, size + 0.3] },
      { pos: [-edgeH, 0.21, 0], size: [0.08, 0.05, size + 0.3] },
    ];
    edges.forEach((e, i) => {
      const edge = BABYLON.MeshBuilder.CreateBox(`edge_${i}`, { width: e.size[0], height: e.size[1], depth: e.size[2] }, this.scene);
      edge.position.set(e.pos[0], e.pos[1], e.pos[2]);
      edge.material = edgeMat;
    });
  }

  private setupWalls() {
    this.wallData = this.levelData.walls;
    this.wallData.forEach((w, i) => {
      const wall = BABYLON.MeshBuilder.CreateBox(`wall_${i}`, {
        width: w.w,
        height: 0.8,
        depth: w.d,
      }, this.scene);
      wall.position.set(w.x, 0.4, w.z);

      const mat = new BABYLON.StandardMaterial(`wallMat_${i}`, this.scene);
      const hue = (i * 40) % 360;
      const [r, g, b] = this.hslToRgb(hue / 360, 0.7, 0.4);
      mat.diffuseColor = new BABYLON.Color3(r, g, b);
      mat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      mat.emissiveColor = new BABYLON.Color3(r * 0.15, g * 0.15, b * 0.15);
      wall.material = mat;
      this.walls.push(wall);
    });
  }

  private setupBall() {
    this.ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.7, segments: 16 }, this.scene);
    this.ball.position.set(this.levelData.start[0], 0.35, this.levelData.start[1]);

    const mat = new BABYLON.StandardMaterial("ballMat", this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.1, 0.8, 1.0);
    mat.specularColor = new BABYLON.Color3(1, 1, 1);
    mat.specularPower = 64;
    mat.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.5);
    this.ball.material = mat;
  }

  private setupGems() {
    this.gems = this.levelData.gems.map(([x, z], i) => {
      const gem = BABYLON.MeshBuilder.CreatePolyhedron(`gem_${i}`, { type: 3, size: 0.28 }, this.scene);
      gem.position.set(x, 0.5, z);

      const mat = new BABYLON.StandardMaterial(`gemMat_${i}`, this.scene);
      const colors = [
        [1.0, 0.2, 0.8],
        [0.2, 1.0, 0.5],
        [1.0, 0.8, 0.1],
        [0.4, 0.4, 1.0],
        [1.0, 0.4, 0.2],
      ];
      const c = colors[i % colors.length];
      mat.diffuseColor = new BABYLON.Color3(c[0], c[1], c[2]);
      mat.emissiveColor = new BABYLON.Color3(c[0] * 0.5, c[1] * 0.5, c[2] * 0.5);
      mat.specularColor = new BABYLON.Color3(1, 1, 1);
      gem.material = mat;

      return { mesh: gem, collected: false };
    });

    this.callbacks.onGemCollect(0, this.gems.length);
  }

  private setupFinish() {
    const [fx, fz] = this.levelData.finish;

    const portal = BABYLON.MeshBuilder.CreateCylinder("portal", {
      diameter: 1.4,
      height: 0.08,
      tessellation: 32,
    }, this.scene);
    portal.position.set(fx, 0.05, fz);

    const mat = new BABYLON.StandardMaterial("portalMat", this.scene);
    mat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.4);
    mat.disableLighting = true;
    portal.material = mat;
    this.finishMesh = portal;

    const ring = BABYLON.MeshBuilder.CreateTorus("ring", { diameter: 1.6, thickness: 0.12, tessellation: 32 }, this.scene);
    ring.position.set(fx, 0.5, fz);
    const ringMat = new BABYLON.StandardMaterial("ringMat", this.scene);
    ringMat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.4);
    ringMat.disableLighting = true;
    ring.material = ringMat;

    this.scene.registerBeforeRender(() => {
      ring.rotation.y += 0.03;
      ring.rotation.x += 0.01;
    });

    this.portalGlow = new BABYLON.PointLight("portalGlow", new BABYLON.Vector3(fx, 1, fz), this.scene);
    this.portalGlow.intensity = 0.8;
    this.portalGlow.range = 5;
    this.portalGlow.diffuse = new BABYLON.Color3(0.0, 1.0, 0.4);
  }

  private setupParticles() {
    const emitter = BABYLON.MeshBuilder.CreateSphere("emitter", { diameter: 0.01 }, this.scene);
    emitter.isVisible = false;
    this.scene.registerBeforeRender(() => {
      if (this.ball) emitter.position = this.ball.position.clone();
    });

    const ps = new BABYLON.ParticleSystem("trail", 40, this.scene);
    ps.emitter = emitter;
    ps.minEmitBox = new BABYLON.Vector3(0, 0, 0);
    ps.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    ps.color1 = new BABYLON.Color4(0.2, 0.8, 1.0, 0.8);
    ps.color2 = new BABYLON.Color4(0.4, 0.4, 1.0, 0.4);
    ps.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    ps.minSize = 0.05;
    ps.maxSize = 0.15;
    ps.minLifeTime = 0.15;
    ps.maxLifeTime = 0.35;
    ps.emitRate = 30;
    ps.direction1 = new BABYLON.Vector3(-0.5, 0.2, -0.5);
    ps.direction2 = new BABYLON.Vector3(0.5, 0.8, 0.5);
    ps.minEmitPower = 0.3;
    ps.maxEmitPower = 1.0;
    ps.updateSpeed = 0.02;
    ps.gravity = new BABYLON.Vector3(0, -3, 0);
    ps.start();
  }

  private setupControls() {
    const down = (e: KeyboardEvent) => { this.keys[e.code] = true; };
    const up = (e: KeyboardEvent) => { this.keys[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    this.scene.onDisposeObservable.add(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    });
  }

  private startTimer() {
    this.elapsedTime = 0;
    this.timerInterval = window.setInterval(() => {
      if (!this.won && !this.fell) {
        this.elapsedTime++;
        this.callbacks.onTimeUpdate(this.elapsedTime);
      }
    }, 1000);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
  }

  private checkWallCollision(newX: number, newZ: number): { x: number; z: number } {
    const ballRadius = 0.35;
    let x = newX;
    let z = newZ;

    for (let i = 0; i < this.wallData.length; i++) {
      const w = this.wallData[i];
      const halfW = w.w / 2 + ballRadius;
      const halfD = w.d / 2 + ballRadius;

      const dx = x - w.x;
      const dz = z - w.z;

      if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
        const overlapX = halfW - Math.abs(dx);
        const overlapZ = halfD - Math.abs(dz);
        if (overlapX < overlapZ) {
          x = w.x + Math.sign(dx) * halfW;
          this.ballVelX *= -0.3;
        } else {
          z = w.z + Math.sign(dz) * halfD;
          this.ballVelZ *= -0.3;
        }
      }
    }
    return { x, z };
  }

  private update() {
    if (this.won || this.fell) return;

    const dt = this.engine.getDeltaTime() / 1000;
    const acc = 12;
    const friction = 0.85;
    const maxSpeed = 6;

    const fwd = this.keys["ArrowUp"] || this.keys["KeyW"];
    const bwd = this.keys["ArrowDown"] || this.keys["KeyS"];
    const lft = this.keys["ArrowLeft"] || this.keys["KeyA"];
    const rgt = this.keys["ArrowRight"] || this.keys["KeyD"];

    if (fwd) this.ballVelZ -= acc * dt;
    if (bwd) this.ballVelZ += acc * dt;
    if (lft) this.ballVelX -= acc * dt;
    if (rgt) this.ballVelX += acc * dt;

    this.ballVelX *= Math.pow(friction, dt * 60);
    this.ballVelZ *= Math.pow(friction, dt * 60);

    const speed = Math.sqrt(this.ballVelX ** 2 + this.ballVelZ ** 2);
    if (speed > maxSpeed) {
      this.ballVelX = (this.ballVelX / speed) * maxSpeed;
      this.ballVelZ = (this.ballVelZ / speed) * maxSpeed;
    }

    const newX = this.ball.position.x + this.ballVelX * dt;
    const newZ = this.ball.position.z + this.ballVelZ * dt;
    const resolved = this.checkWallCollision(newX, newZ);

    this.ball.position.x = resolved.x;
    this.ball.position.z = resolved.z;

    this.ball.rotation.x += this.ballVelZ * dt * 1.5;
    this.ball.rotation.z -= this.ballVelX * dt * 1.5;

    const halfB = this.levelData.boardSize / 2;
    if (
      Math.abs(this.ball.position.x) > halfB + 0.5 ||
      Math.abs(this.ball.position.z) > halfB + 0.5
    ) {
      this.handleFall();
      return;
    }

    const allGemsCollected = this.gemsCollected >= this.gems.length;
    this.gems.forEach((gem) => {
      if (gem.collected) return;
      const dist = BABYLON.Vector3.Distance(this.ball.position, gem.mesh.position);
      if (dist < 0.75) {
        gem.collected = true;
        gem.mesh.setEnabled(false);
        this.gemsCollected++;
        this.score += 50;
        this.callbacks.onGemCollect(this.gemsCollected, this.gems.length);
      }
      gem.mesh.rotation.y += dt * 2;
      gem.mesh.position.y = 0.5 + Math.sin(Date.now() / 600 + gem.mesh.position.x) * 0.12;
    });

    const newAllGems = this.gemsCollected >= this.gems.length;
    if (newAllGems) {
      const pm = this.finishMesh.material as BABYLON.StandardMaterial;
      pm.emissiveColor = new BABYLON.Color3(0.5, 1.0, 0.2);
    }

    this.portalTime += dt;
    this.portalGlow.intensity = 0.8 + Math.sin(this.portalTime * 4) * 0.3;
    this.finishMesh.rotation.y += dt * 1.5;

    if (allGemsCollected || newAllGems) {
      const [fx, fz] = this.levelData.finish;
      const distToFinish = Math.sqrt(
        (this.ball.position.x - fx) ** 2 + (this.ball.position.z - fz) ** 2
      );
      if (distToFinish < 0.9) {
        this.handleWin();
      }
    }
  }

  private handleFall() {
    this.fell = true;
    this.lives--;
    const remaining = this.lives;

    setTimeout(() => {
      this.fell = false;
      this.ball.position.set(this.levelData.start[0], 0.35, this.levelData.start[1]);
      this.ballVelX = 0;
      this.ballVelZ = 0;
      this.callbacks.onFall(remaining);
    }, 500);
  }

  private handleWin() {
    this.won = true;
    const timeBonus = Math.max(0, 300 - this.elapsedTime * 2);
    const finalScore = this.score + timeBonus;
    this.callbacks.onWin(finalScore);
  }

  restart() {
    this.won = false;
    this.fell = false;
    this.lives = 3;
    this.gemsCollected = 0;
    this.score = 0;
    this.ballVelX = 0;
    this.ballVelZ = 0;
    this.ball.position.set(this.levelData.start[0], 0.35, this.levelData.start[1]);
    this.gems.forEach((g) => {
      g.collected = false;
      g.mesh.setEnabled(true);
    });
  }

  dispose() {
    if (this.timerInterval !== null) clearInterval(this.timerInterval);
    window.removeEventListener("resize", this.onResize);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
