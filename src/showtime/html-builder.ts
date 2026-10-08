import type { StoryboardPlan } from "../types.js";

export class ShowtimeHtmlBuilder {
  /**
   * Generates production-ready index.html for Showtime DOM vertical short (9:16)
   * Includes video background plates, mobile safe zones, SVG icons (zero emoji 404s),
   * and synchronized karaoke captions.
   */
  static buildHtml(storyboard: StoryboardPlan, emphasisWords = "cringe,exile,survival,rejection,safe,memory"): string {
    const sceneSectionsHtml = storyboard.scenes.map((scene, idx) => {
      const isFirst = idx === 0;
      const startAttr = isFirst ? `data-start="0"` : `data-start="#scene-${idx}"`;
      const durAttr = `data-dur="${scene.durationSec.toFixed(2)}"`;
      const transAttr = isFirst ? "" : `data-transition="${scene.transition}"`;
      const assetRelPath = scene.assetPath || `assets/scene-${scene.sceneNumber}.webm`;

      let innerCard = "";

      switch (scene.type) {
        case "hook":
          innerCard = `
    <div class="card-hero" data-st-decor>
      <div class="badge-tag" style="background: rgba(244, 63, 94, 0.22); color: #FDA4AF; border-color: rgba(244, 63, 94, 0.5);">
        ${scene.cardLayout?.badge ?? 'BRAIN ALERT'}
      </div>
      <h1 class="t-hero" data-st="kinetic-type" data-style="pop" data-by="words" data-at="0.15">
        ${scene.cardLayout?.headline ?? scene.onScreenText ?? '3:00 AM BRAIN LOOP'}
      </h1>
      <p class="t-sub" data-st="kinetic-type" data-style="rise" data-at="0.4">
        ${scene.cardLayout?.subtext ?? 'Why does cringe keep you awake?'}
      </p>
      <div class="clock-display">
        <span class="clock-digit">03</span><span class="clock-colon">:</span><span class="clock-digit">00</span>
        <span class="clock-label">AM</span>
      </div>
    </div>`;
          break;

        case "reaction":
          innerCard = `
    <div class="card-glass" data-st-decor>
      <div class="badge-tag" style="background: rgba(56, 189, 248, 0.22); color: #BAE6FD; border-color: rgba(56, 189, 248, 0.5);">
        ${scene.cardLayout?.badge ?? 'MEMORY PARADOX'}
      </div>
      <h2 class="t-headline" data-st="kinetic-type" data-style="rise" data-at="0.2">
        ${scene.cardLayout?.headline ?? 'THE PARADOX'}
      </h2>
      <div class="comparison-grid">
        <div class="comparison-col faded">
          <span class="comp-label">School Facts</span>
          <div class="bar-fill" style="width: 35%;"></div>
          <span class="comp-val">Fades away</span>
        </div>
        <div class="comparison-col active">
          <span class="comp-label">Awkward Moment</span>
          <div class="bar-fill highlight" style="width: 95%;"></div>
          <span class="comp-val">Permanently Stuck</span>
        </div>
      </div>
      <p class="t-note">${scene.cardLayout?.subtext ?? 'Textbook memories fade. Cringe stays sharp.'}</p>
    </div>`;
          break;

        case "diagram":
          innerCard = `
    <div class="card-diagram" data-st-decor>
      <div class="badge-tag" style="background: rgba(245, 158, 11, 0.22); color: #FDE68A; border-color: rgba(245, 158, 11, 0.45);">
        ${scene.cardLayout?.badge ?? 'ANCESTRAL BLUEPRINT'}
      </div>
      <h2 class="t-headline">${scene.cardLayout?.headline ?? 'SOCIAL = PHYSICAL PAIN'}</h2>
      <div class="threat-matrix">
        <div class="matrix-node pulse">
          <div class="node-icon-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="node-title">Social Error</div>
        </div>
        <div class="matrix-arrow">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#CBD5E1" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="matrix-node warning">
          <div class="node-icon-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div class="node-title">Tribal Exile</div>
        </div>
        <div class="matrix-arrow">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#CBD5E1" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="matrix-node critical">
          <div class="node-icon-svg">
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M12 2a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v3h8v-3c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z"/><line x1="9" y1="20" x2="15" y2="20"/></svg>
          </div>
          <div class="node-title">Mortal Danger</div>
        </div>
      </div>
      <p class="t-subtext">${scene.cardLayout?.subtext ?? 'To primitive biology: Isolation was fatal.'}</p>
    </div>`;
          break;

        case "mixed":
          innerCard = `
    <div class="card-glass" data-st-decor>
      <div class="badge-tag" style="background: rgba(16, 185, 129, 0.22); color: #A7F3D0; border-color: rgba(16, 185, 129, 0.5);">
        ${scene.cardLayout?.badge ?? 'NEURAL SCAN'}
      </div>
      <h2 class="t-headline">${scene.cardLayout?.headline ?? 'AMYGDALA OVERRIDE'}</h2>
      <div class="status-box">
        <div class="status-row">
          <span class="status-label">Brain Region:</span>
          <span class="status-value">Dorsal ACC + Amygdala</span>
        </div>
        <div class="status-row">
          <span class="status-label">Priority Flag:</span>
          <span class="status-badge alert">CRITICAL OVERRIDE</span>
        </div>
        <div class="status-row">
          <span class="status-label">Instruction:</span>
          <span class="status-value">Never Repeat Mistake</span>
        </div>
      </div>
      <p class="t-subtext">${scene.cardLayout?.subtext ?? 'Emotion coats the memory in high-priority varnish.'}</p>
    </div>`;
          break;

        case "payoff":
        default:
          innerCard = `
    <div class="card-hero payoff" data-st-decor>
      <div class="badge-tag" style="background: rgba(139, 92, 246, 0.22); color: #DDD6FE; border-color: rgba(139, 92, 246, 0.5);">
        ${scene.cardLayout?.badge ?? 'DAILY CORTEX'}
      </div>
      <h1 class="t-hero" data-st="kinetic-type" data-style="pop" data-by="words" data-at="0.1">
        ${scene.cardLayout?.headline ?? 'SURVIVAL, NOT PUNISHMENT'}
      </h1>
      <p class="t-sub" data-st="kinetic-type" data-style="rise" data-at="0.35">
        ${scene.cardLayout?.subtext ?? 'Your brain is protecting your belonging.'}
      </p>
      <div class="channel-pill">
        <div class="channel-icon-svg">
          <svg viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/></svg>
        </div>
        <span class="channel-name">Daily Cortex</span>
      </div>
    </div>`;
          break;
      }

      return `  <!-- Scene ${scene.sceneNumber}: ${scene.type} (${scene.durationSec.toFixed(2)}s) -->
  <section class="scene" id="scene-${scene.sceneNumber}" ${startAttr} ${durAttr} ${transAttr}>
    <div class="scene-media-wrap">
      <video class="scene-media" src="${assetRelPath}" autoplay muted loop playsinline></video>
      <div class="scene-overlay"></div>
    </div>
${innerCard}
  </section>`;
    }).join("\n\n");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${storyboard.topic.topic} | Daily Cortex</title>
<script src="/_st/stage.js"></script>
<link rel="stylesheet" href="/_st/themes/bold.css">
<script type="module" src="/_st/components/index.js"></script>
<style>
  /* 1080x1920 (9:16 vertical short). Mobile safe box: x 6-85%, y 11.5-75%. Captions at 62-75%. */
  :root {
    --bg-dark: #070913;
    --accent-red: #F43F5E;
    --accent-cyan: #38BDF8;
    --accent-amber: #F59E0B;
    --accent-emerald: #10B981;
    --accent-purple: #8B5CF6;
    --border-glass: rgba(255, 255, 255, 0.14);
  }

  .scene {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-dark);
  }

  /* Background video container */
  .scene-media-wrap {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }
  .scene-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.65;
    filter: brightness(0.65) contrast(1.15);
  }
  .scene-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(7, 9, 19, 0.5) 0%, rgba(7, 9, 19, 0.78) 55%, rgba(7, 9, 19, 0.96) 100%);
  }

  .scene::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.3;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 8cqw 8cqw;
    -webkit-mask-image: radial-gradient(80% 50% at 50% 35%, black, transparent 75%);
    mask-image: radial-gradient(80% 50% at 50% 35%, black, transparent 75%);
  }

  /* Safe container for top-half content */
  .card-hero, .card-glass, .card-diagram {
    position: absolute;
    left: 8cqw;
    right: 14cqw;
    top: 13cqh;
    padding: 5cqw;
    border-radius: 4cqw;
    z-index: 2;
    background: rgba(15, 23, 42, 0.82);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--border-glass);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .badge-tag {
    display: inline-block;
    padding: 1.2cqw 3.2cqw;
    border-radius: 2cqw;
    font: 700 3.2cqw/1 var(--font-mono, monospace);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid;
    margin-bottom: 2.2cqh;
  }

  .t-hero {
    font: 800 9.5cqw/1.05 var(--font-display, sans-serif);
    letter-spacing: -0.04em;
    color: #F8FAFC;
    margin: 0 0 1.8cqh;
  }

  .t-headline {
    font: 750 7.8cqw/1.1 var(--font-display, sans-serif);
    letter-spacing: -0.03em;
    color: #F8FAFC;
    margin: 0 0 1.8cqh;
  }

  .t-sub {
    font: 500 4.8cqw/1.35 var(--font-body, sans-serif);
    color: #94A3B8;
    margin: 0 0 2.2cqh;
  }

  .t-subtext, .t-note {
    font: 450 4.2cqw/1.3 var(--font-body, sans-serif);
    color: #94A3B8;
    margin-top: 1.8cqh;
  }

  /* Clock display component */
  .clock-display {
    display: inline-flex;
    align-items: baseline;
    gap: 1.5cqw;
    background: rgba(0, 0, 0, 0.6);
    padding: 2cqw 4cqw;
    border-radius: 2.5cqw;
    border: 1px solid rgba(244, 63, 94, 0.35);
  }
  .clock-digit {
    font: 700 8cqw/1 var(--font-mono, monospace);
    color: #F43F5E;
    text-shadow: 0 0 12px rgba(244, 63, 94, 0.6);
  }
  .clock-colon {
    font: 700 7cqw/1 var(--font-mono, monospace);
    color: #F43F5E;
  }
  .clock-label {
    font: 600 3.8cqw/1 var(--font-mono, monospace);
    color: #FDA4AF;
  }

  /* Comparison grid */
  .comparison-grid {
    display: flex;
    flex-direction: column;
    gap: 1.8cqh;
    margin: 1.5cqh 0;
  }
  .comparison-col {
    display: flex;
    flex-direction: column;
    gap: 0.8cqh;
  }
  .comp-label {
    font: 600 3.6cqw/1 var(--font-mono, monospace);
    color: #CBD5E1;
    text-transform: uppercase;
  }
  .comp-val {
    font: 700 4.4cqw/1 var(--font-body, sans-serif);
    color: #CBD5E1;
  }
  .bar-fill {
    height: 1.2cqh;
    border-radius: 1cqh;
    background: #334155;
  }
  .bar-fill.highlight {
    background: linear-gradient(90deg, #38BDF8, #818CF8);
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
  }

  /* Threat matrix with inline SVG icons (Zero emoji 404s) */
  .threat-matrix {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5cqw;
    margin: 1.8cqh 0;
  }
  .matrix-node {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.2cqw 1cqw;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 2.5cqw;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .node-icon-svg {
    width: 6cqw;
    height: 6cqw;
    margin-bottom: 0.8cqh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .node-icon-svg svg { width: 100%; height: 100%; }
  .node-title { font: 600 3.2cqw/1.1 var(--font-body, sans-serif); color: #F1F5F9; text-align: center; }
  .matrix-arrow { font: 700 4cqw/1 var(--font-mono, monospace); color: #64748B; }

  /* Status box */
  .status-box {
    display: flex;
    flex-direction: column;
    gap: 1.5cqh;
    background: rgba(0, 0, 0, 0.5);
    padding: 3cqw 4cqw;
    border-radius: 3cqw;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .status-label { font: 500 3.6cqw/1 var(--font-mono, monospace); color: #94A3B8; }
  .status-value { font: 700 4cqw/1 var(--font-body, sans-serif); color: #F8FAFC; }
  .status-badge.alert {
    padding: 0.8cqw 2cqw;
    border-radius: 1.5cqw;
    background: rgba(244, 63, 94, 0.25);
    color: #FDA4AF;
    font: 700 3.2cqw/1 var(--font-mono, monospace);
  }

  /* Channel Pill on Payoff */
  .channel-pill {
    display: inline-flex;
    align-items: center;
    gap: 2cqw;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.4);
    padding: 1.5cqw 4cqw;
    border-radius: 3cqw;
    margin-top: 1cqh;
  }
  .channel-icon-svg { width: 5.5cqw; height: 5.5cqw; }
  .channel-icon-svg svg { width: 100%; height: 100%; }
  .channel-name { font: 700 4.2cqw/1 var(--font-display, sans-serif); color: #DDD6FE; }
</style>
</head>
<body>
<div class="stage">

${sceneSectionsHtml}

  <!-- Synchronized Karaoke Captions (placed in safe vertical zone) -->
  <div data-st="caption-karaoke" data-src="words.json" data-style="clean-pop" data-emphasis="${emphasisWords}"></div>

  <div data-st="grain"></div>
</div>
</body>
</html>
`;
  }
}
