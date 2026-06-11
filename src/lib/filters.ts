import type { FaceResult, PoseResult } from "./tracking";

// MediaPipe Face Landmarker keypoint indices we use
const IDX = {
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeInner: 133,
  rightEyeInner: 362,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  noseTip: 1,
  noseBottom: 2,
  upperLipTop: 13,
  lowerLipBottom: 14,
  mouthLeft: 61,
  mouthRight: 291,
  chin: 152,
  forehead: 10,
  leftCheek: 234,
  rightCheek: 454,
  leftBrow: 105,
  rightBrow: 334,
};

export type FilterId =
  | "none"
  | "cat"
  | "dog"
  | "bunny"
  | "deer"
  | "glasses"
  | "shades"
  | "crown"
  | "halo"
  | "anime-eyes"
  | "blush-tears"
  | "demon"
  | "cyber"
  | "rainbow-aura"
  | "fire-eyes"
  | "vaporwave"
  | "noir"
  | "anime-bg"
  | "neon-grid"
  | "sparkles"
  | "body-glow"
  | "wings";

export interface FilterMeta {
  id: FilterId;
  label: string;
  emoji: string;
  group: "Animal" | "Accessory" | "Anime" | "Effect" | "Background" | "Body";
}

export const FILTERS: FilterMeta[] = [
  { id: "none", label: "None", emoji: "✕", group: "Accessory" },
  { id: "cat", label: "Cat", emoji: "🐱", group: "Animal" },
  { id: "dog", label: "Dog", emoji: "🐶", group: "Animal" },
  { id: "bunny", label: "Bunny", emoji: "🐰", group: "Animal" },
  { id: "deer", label: "Deer", emoji: "🦌", group: "Animal" },
  { id: "glasses", label: "Glasses", emoji: "👓", group: "Accessory" },
  { id: "shades", label: "Shades", emoji: "🕶️", group: "Accessory" },
  { id: "crown", label: "Crown", emoji: "👑", group: "Accessory" },
  { id: "halo", label: "Halo", emoji: "😇", group: "Accessory" },
  { id: "anime-eyes", label: "Anime Eyes", emoji: "✨", group: "Anime" },
  { id: "blush-tears", label: "Blush", emoji: "🥺", group: "Anime" },
  { id: "demon", label: "Demon", emoji: "👹", group: "Anime" },
  { id: "cyber", label: "Cyber Visor", emoji: "🤖", group: "Anime" },
  { id: "fire-eyes", label: "Fire Eyes", emoji: "🔥", group: "Effect" },
  { id: "rainbow-aura", label: "Aura", emoji: "🌈", group: "Effect" },
  { id: "sparkles", label: "Sparkles", emoji: "✦", group: "Effect" },
  { id: "vaporwave", label: "Vaporwave", emoji: "🌆", group: "Effect" },
  { id: "noir", label: "Noir", emoji: "🎞️", group: "Effect" },
  { id: "anime-bg", label: "Anime Sky", emoji: "🌸", group: "Background" },
  { id: "neon-grid", label: "Neon Grid", emoji: "▦", group: "Background" },
  { id: "body-glow", label: "Body Glow", emoji: "⚡", group: "Body" },
  { id: "wings", label: "Wings", emoji: "🪽", group: "Body" },
];

interface Pt { x: number; y: number; }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ---------- Backgrounds (drawn BEFORE video frame, but we composite differently below) ----------

export function drawBackgroundEffect(
  ctx: CanvasRenderingContext2D,
  filter: FilterId,
  w: number,
  h: number,
  time: number,
) {
  if (filter === "anime-bg") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffb3d9");
    g.addColorStop(0.6, "#a3c7ff");
    g.addColorStop(1, "#fef3c7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // petals
    ctx.fillStyle = "rgba(255,140,180,0.85)";
    for (let i = 0; i < 18; i++) {
      const x = ((i * 97 + time * 0.04) % (w + 60)) - 30;
      const y = ((i * 53 + time * 0.06) % (h + 60)) - 30;
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 3, (time * 0.002 + i) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (filter === "neon-grid") {
    ctx.fillStyle = "#0b0420";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,80,200,0.6)";
    ctx.lineWidth = 1;
    const horizon = h * 0.55;
    for (let i = 0; i < 14; i++) {
      const y = horizon + ((i * 30 + time * 0.1) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 30, horizon);
      ctx.lineTo(w / 2 + i * 150, h);
      ctx.stroke();
    }
    // sun
    const sg = ctx.createLinearGradient(0, horizon - 120, 0, horizon);
    sg.addColorStop(0, "#ffb84d");
    sg.addColorStop(1, "#ff3d8b");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(w / 2, horizon, 80, Math.PI, 0);
    ctx.fill();
  } else if (filter === "vaporwave") {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#ff6ec7");
    g.addColorStop(1, "#5fd4ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

export function applyPostEffect(
  ctx: CanvasRenderingContext2D,
  filter: FilterId,
  w: number,
  h: number,
) {
  if (filter === "noir") {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
    // vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  } else if (filter === "vaporwave") {
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(255,110,199,0.25)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
}

// ---------- Foreground face/body effects ----------

export function drawFaceFilter(
  ctx: CanvasRenderingContext2D,
  filter: FilterId,
  face: FaceResult | null,
  w: number,
  h: number,
  time: number,
) {
  if (!face || !face.faceLandmarks || face.faceLandmarks.length === 0) return;
  const lm = face.faceLandmarks[0];
  const p = (i: number): Pt => ({ x: lm[i].x * w, y: lm[i].y * h });

  const leftEye = p(IDX.leftEyeOuter);
  const rightEye = p(IDX.rightEyeOuter);
  const noseTip = p(IDX.noseTip);
  const chin = p(IDX.chin);
  const forehead = p(IDX.forehead);
  const leftCheek = p(IDX.leftCheek);
  const rightCheek = p(IDX.rightCheek);
  const mouthL = p(IDX.mouthLeft);
  const mouthR = p(IDX.mouthRight);
  const lipTop = p(IDX.upperLipTop);
  const lipBot = p(IDX.lowerLipBottom);

  const faceW = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
  const faceH = Math.hypot(chin.x - forehead.x, chin.y - forehead.y);
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  const center = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };

  ctx.save();

  switch (filter) {
    case "cat":
      drawAnimalEars(ctx, forehead, faceW, angle, "#1a1a1a", "#ff9eb8");
      drawNoseDot(ctx, noseTip, faceW * 0.06, "#1a1a1a");
      drawWhiskers(ctx, noseTip, faceW);
      break;
    case "dog":
      drawDogEars(ctx, forehead, faceW, angle, "#7b4a23");
      drawNoseDot(ctx, noseTip, faceW * 0.07, "#1a1a1a");
      drawTongue(ctx, lipTop, lipBot, mouthL, mouthR);
      break;
    case "bunny":
      drawBunnyEars(ctx, forehead, faceW, angle);
      drawNoseDot(ctx, noseTip, faceW * 0.05, "#ff6fa3");
      break;
    case "deer":
      drawAntlers(ctx, forehead, faceW, angle);
      break;
    case "glasses":
      drawGlasses(ctx, leftEye, rightEye, faceW, false);
      break;
    case "shades":
      drawGlasses(ctx, leftEye, rightEye, faceW, true);
      break;
    case "crown":
      drawCrown(ctx, forehead, faceW, angle);
      break;
    case "halo":
      drawHalo(ctx, forehead, faceW, angle, time);
      break;
    case "anime-eyes":
      drawAnimeEyes(ctx, lm, w, h);
      break;
    case "blush-tears":
      drawBlush(ctx, leftCheek, rightCheek, faceW);
      drawSparkleTears(ctx, p(IDX.leftEyeBottom), p(IDX.rightEyeBottom), faceW);
      break;
    case "demon":
      drawHorns(ctx, forehead, faceW, angle);
      drawGlowEyes(ctx, leftEye, rightEye, faceW, "#ff2a2a");
      break;
    case "cyber":
      drawCyberVisor(ctx, leftEye, rightEye, faceW, angle, time);
      break;
    case "fire-eyes":
      drawFireEyes(ctx, leftEye, rightEye, faceW, time);
      break;
    case "rainbow-aura":
      drawAura(ctx, center, faceW, faceH, time);
      break;
    case "sparkles":
      drawSparkles(ctx, center, faceW * 2, time);
      break;
  }

  ctx.restore();
}

export function drawBodyFilter(
  ctx: CanvasRenderingContext2D,
  filter: FilterId,
  pose: PoseResult | null,
  w: number,
  h: number,
  time: number,
) {
  if (!pose || !pose.landmarks || pose.landmarks.length === 0) return;
  const body = pose.landmarks[0];
  const p = (i: number): Pt => ({ x: body[i].x * w, y: body[i].y * h });
  // 11 left shoulder, 12 right shoulder, 23 left hip, 24 right hip
  const lShoulder = p(11);
  const rShoulder = p(12);
  const lHip = p(23);
  const rHip = p(24);

  if (filter === "body-glow") {
    const cx = (lShoulder.x + rShoulder.x + lHip.x + rHip.x) / 4;
    const cy = (lShoulder.y + rShoulder.y + lHip.y + rHip.y) / 4;
    const rad = Math.hypot(lShoulder.x - rHip.x, lShoulder.y - rHip.y) * 0.9;
    const g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    g.addColorStop(0, `hsla(${(time * 0.1) % 360},100%,65%,0.35)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (filter === "wings") {
    drawWings(ctx, lShoulder, rShoulder, time);
  }
}

// ---------- Drawing primitives ----------

function drawAnimalEars(
  ctx: CanvasRenderingContext2D,
  forehead: Pt,
  faceW: number,
  angle: number,
  outer: string,
  inner: string,
) {
  const earH = faceW * 0.7;
  const earW = faceW * 0.4;
  const offset = faceW * 0.45;
  drawEar(ctx, forehead.x - Math.cos(angle) * offset - Math.sin(angle) * faceW * 0.4,
    forehead.y - Math.sin(angle) * offset + Math.cos(angle) * faceW * 0.4 - earH * 0.6,
    earW, earH, angle - 0.3, outer, inner);
  drawEar(ctx, forehead.x + Math.cos(angle) * offset - Math.sin(angle) * faceW * 0.4,
    forehead.y + Math.sin(angle) * offset + Math.cos(angle) * faceW * 0.4 - earH * 0.6,
    earW, earH, angle + 0.3, outer, inner);
}

function drawEar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, rot: number, outer: string, inner: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(-w / 4, h / 3);
  ctx.lineTo(0, -h / 3);
  ctx.lineTo(w / 4, h / 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDogEars(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number, color: string) {
  const earH = faceW * 0.55;
  const earW = faceW * 0.32;
  ctx.fillStyle = color;
  for (const sign of [-1, 1]) {
    const cx = forehead.x + Math.cos(angle) * sign * faceW * 0.5 - Math.sin(angle) * faceW * 0.2;
    const cy = forehead.y + Math.sin(angle) * sign * faceW * 0.5 + Math.cos(angle) * faceW * 0.2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + sign * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, earH * 0.3, earW * 0.7, earH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBunnyEars(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number) {
  const h = faceW * 1.3;
  const w = faceW * 0.22;
  for (const sign of [-1, 1]) {
    const cx = forehead.x + Math.cos(angle) * sign * faceW * 0.25 - Math.sin(angle) * h * 0.5;
    const cy = forehead.y + Math.sin(angle) * sign * faceW * 0.25 + Math.cos(angle) * h * 0.5 - h * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + sign * 0.15);
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb3d1";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.5, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawAntlers(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number) {
  ctx.strokeStyle = "#6b4423";
  ctx.lineWidth = Math.max(3, faceW * 0.04);
  ctx.lineCap = "round";
  for (const sign of [-1, 1]) {
    const bx = forehead.x + Math.cos(angle) * sign * faceW * 0.25;
    const by = forehead.y + Math.sin(angle) * sign * faceW * 0.25;
    const tx = bx + sign * faceW * 0.35 - Math.sin(angle) * faceW * 0.8;
    const ty = by + Math.cos(angle) * -faceW * 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    // branches
    ctx.moveTo(bx + (tx - bx) * 0.4, by + (ty - by) * 0.4);
    ctx.lineTo(bx + (tx - bx) * 0.4 + sign * faceW * 0.2, by + (ty - by) * 0.4 - faceW * 0.1);
    ctx.moveTo(bx + (tx - bx) * 0.7, by + (ty - by) * 0.7);
    ctx.lineTo(bx + (tx - bx) * 0.7 + sign * faceW * 0.25, by + (ty - by) * 0.7 - faceW * 0.05);
    ctx.stroke();
  }
}

function drawHorns(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number) {
  ctx.fillStyle = "#2a0a0a";
  for (const sign of [-1, 1]) {
    const bx = forehead.x + Math.cos(angle) * sign * faceW * 0.3;
    const by = forehead.y + Math.sin(angle) * sign * faceW * 0.3;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + sign * 0.4);
    ctx.beginPath();
    ctx.moveTo(-faceW * 0.08, 0);
    ctx.quadraticCurveTo(-faceW * 0.05, -faceW * 0.5, faceW * 0.05, -faceW * 0.6);
    ctx.quadraticCurveTo(faceW * 0.08, -faceW * 0.3, faceW * 0.08, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawNoseDot(ctx: CanvasRenderingContext2D, p: Pt, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawWhiskers(ctx: CanvasRenderingContext2D, nose: Pt, faceW: number) {
  ctx.strokeStyle = "rgba(20,20,20,0.85)";
  ctx.lineWidth = Math.max(1, faceW * 0.008);
  for (const sign of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(nose.x + sign * faceW * 0.05, nose.y + i * faceW * 0.02);
      ctx.lineTo(nose.x + sign * faceW * 0.4, nose.y + i * faceW * 0.06);
      ctx.stroke();
    }
  }
}

function drawTongue(ctx: CanvasRenderingContext2D, top: Pt, bot: Pt, l: Pt, r: Pt) {
  const open = Math.hypot(top.x - bot.x, top.y - bot.y);
  if (open < 8) return;
  ctx.fillStyle = "#ff7a9b";
  ctx.beginPath();
  ctx.ellipse((l.x + r.x) / 2, bot.y + open * 0.4, open * 0.6, open * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlasses(ctx: CanvasRenderingContext2D, le: Pt, re: Pt, faceW: number, dark: boolean) {
  const r = faceW * 0.13;
  ctx.strokeStyle = dark ? "#0a0a0a" : "#222";
  ctx.lineWidth = Math.max(2, faceW * 0.018);
  if (dark) {
    ctx.fillStyle = "rgba(10,10,10,0.85)";
    ctx.beginPath(); ctx.arc(le.x, le.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(re.x, re.y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.beginPath(); ctx.arc(le.x, le.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(re.x, re.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(le.x + r, le.y);
  ctx.lineTo(re.x - r, re.y);
  ctx.stroke();
}

function drawCrown(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number) {
  ctx.save();
  ctx.translate(forehead.x, forehead.y);
  ctx.rotate(angle);
  const w = faceW * 1.05;
  const h = faceW * 0.45;
  ctx.fillStyle = "#ffd24d";
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -h * 0.4);
  ctx.lineTo(-w / 3, -h);
  ctx.lineTo(-w / 6, -h * 0.5);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 6, -h * 0.5);
  ctx.lineTo(w / 3, -h);
  ctx.lineTo(w / 2, -h * 0.4);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff3b6b";
  for (const x of [-w / 3, 0, w / 3]) {
    ctx.beginPath();
    ctx.arc(x, -h * 0.2, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHalo(ctx: CanvasRenderingContext2D, forehead: Pt, faceW: number, angle: number, time: number) {
  ctx.save();
  ctx.translate(forehead.x - Math.sin(angle) * faceW * 0.5, forehead.y + Math.cos(angle) * -faceW * 0.5);
  ctx.rotate(angle);
  ctx.strokeStyle = `hsl(${50 + Math.sin(time * 0.003) * 30},100%,70%)`;
  ctx.lineWidth = Math.max(3, faceW * 0.04);
  ctx.shadowColor = "rgba(255,220,120,0.9)";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.ellipse(0, 0, faceW * 0.55, faceW * 0.16, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAnimeEyes(ctx: CanvasRenderingContext2D, lm: { x: number; y: number }[], w: number, h: number) {
  const drawEye = (cx: number, cy: number, r: number) => {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.85);
    g.addColorStop(0, "#a3e7ff");
    g.addColorStop(1, "#1d3aff");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0a0a2a";
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy + r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
  };
  const lx = lm[33].x * w, rx = lm[263].x * w;
  const ly = (lm[159].y + lm[145].y) / 2 * h;
  const ry = (lm[386].y + lm[374].y) / 2 * h;
  const r = Math.hypot(rx - lx, ry - ly) * 0.18;
  drawEye((lm[33].x + lm[133].x) / 2 * w, ly, r);
  drawEye((lm[263].x + lm[362].x) / 2 * w, ry, r);
}

function drawBlush(ctx: CanvasRenderingContext2D, l: Pt, r: Pt, faceW: number) {
  ctx.fillStyle = "rgba(255,120,160,0.55)";
  for (const c of [l, r]) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, faceW * 0.15, faceW * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkleTears(ctx: CanvasRenderingContext2D, l: Pt, r: Pt, faceW: number) {
  ctx.fillStyle = "rgba(180,220,255,0.85)";
  for (const c of [l, r]) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.quadraticCurveTo(c.x - faceW * 0.02, c.y + faceW * 0.05, c.x, c.y + faceW * 0.1);
    ctx.quadraticCurveTo(c.x + faceW * 0.02, c.y + faceW * 0.05, c.x, c.y);
    ctx.fill();
  }
}

function drawGlowEyes(ctx: CanvasRenderingContext2D, le: Pt, re: Pt, faceW: number, color: string) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = color;
  for (const e of [le, re]) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, faceW * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCyberVisor(ctx: CanvasRenderingContext2D, le: Pt, re: Pt, faceW: number, angle: number, time: number) {
  ctx.save();
  const cx = (le.x + re.x) / 2;
  const cy = (le.y + re.y) / 2;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = faceW * 1.2;
  const h = faceW * 0.35;
  ctx.fillStyle = "#0a0a14";
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.4);
  ctx.fill();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  const hue = (time * 0.1) % 360;
  g.addColorStop(0, `hsl(${hue},100%,60%)`);
  g.addColorStop(1, `hsl(${(hue + 80) % 360},100%,60%)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + h * 0.2, -h / 2 + h * 0.2, w - h * 0.4, h - h * 0.4, h * 0.25);
  ctx.fill();
  ctx.restore();
}

function drawFireEyes(ctx: CanvasRenderingContext2D, le: Pt, re: Pt, faceW: number, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const e of [le, re]) {
    for (let i = 0; i < 6; i++) {
      const off = (Math.sin(time * 0.01 + i) + 1) * faceW * 0.04;
      const g = ctx.createRadialGradient(e.x, e.y - off, 0, e.x, e.y - off, faceW * 0.15);
      g.addColorStop(0, "rgba(255,240,160,0.9)");
      g.addColorStop(0.5, "rgba(255,120,40,0.7)");
      g.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y - off, faceW * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAura(ctx: CanvasRenderingContext2D, c: Pt, faceW: number, faceH: number, time: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 6; i++) {
    const r = faceW * (0.9 + i * 0.18) + Math.sin(time * 0.005 + i) * 8;
    const hue = (time * 0.1 + i * 60) % 360;
    ctx.strokeStyle = `hsla(${hue},100%,65%,0.6)`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + faceH * 0.1, r, r * 1.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSparkles(ctx: CanvasRenderingContext2D, c: Pt, r: number, time: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + time * 0.001;
    const rr = r * (0.4 + ((i * 37 + time * 0.05) % 100) / 200);
    const x = c.x + Math.cos(a) * rr;
    const y = c.y + Math.sin(a) * rr;
    const size = 4 + Math.sin(time * 0.01 + i) * 3;
    drawStar(ctx, x, y, size);
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? s : s * 0.35;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawWings(ctx: CanvasRenderingContext2D, lS: Pt, rS: Pt, time: number) {
  const span = Math.hypot(rS.x - lS.x, rS.y - lS.y);
  const flap = Math.sin(time * 0.006) * 0.2;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(180,220,255,0.8)";
  ctx.shadowBlur = 30;
  // left wing
  ctx.beginPath();
  ctx.moveTo(lS.x, lS.y);
  ctx.quadraticCurveTo(lS.x - span * 1.5, lS.y - span * (0.6 + flap), lS.x - span * 1.8, lS.y + span * 0.2);
  ctx.quadraticCurveTo(lS.x - span * 0.7, lS.y + span * 0.1, lS.x, lS.y);
  ctx.fill();
  // right wing
  ctx.beginPath();
  ctx.moveTo(rS.x, rS.y);
  ctx.quadraticCurveTo(rS.x + span * 1.5, rS.y - span * (0.6 + flap), rS.x + span * 1.8, rS.y + span * 0.2);
  ctx.quadraticCurveTo(rS.x + span * 0.7, rS.y + span * 0.1, rS.x, rS.y);
  ctx.fill();
  ctx.restore();
}
