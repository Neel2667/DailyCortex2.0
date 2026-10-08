import type { StoryboardPlan } from "../types.js";

export class ShowtimeHtmlBuilder {
  /**
   * Generates production-ready index.html for Showtime DOM vertical short (9:16)
   */
  static buildHtml(storyboard: StoryboardPlan, emphasisWords: string = "cringe,exile,survival,rejection,safe"): string {
    let currentStart = 0;
    const sceneSectionsHtml = storyboard.scenes.map((scene, idx) => {
      const isFirst = idx === 0;
      const startAttr = isFirst ? `data-start="0"` : `data-start="#scene-${idx}"`;
      const durAttr = `data-dur="${scene.durationSec.toFixed(2)}"`;
      const transAttr = isFirst ? "" : `data-transition="${scene.transition}"`;

      let innerContent = "";

      switch (scene.type) {
        case "hook":
          innerContent = `
    <div class="card-hero" data-st-decor>
      <div class="badge-tag" style="background: ${scene.cardLayout?.accentColor ?? '#F43F5E'}22; color: ${scene.cardLayout?.accentColor ?? '#F43F5E'}; border-color: ${scene.cardLayout?.accentColor ?? '#F43F5E'}55;">
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
          innerContent = `
    <div class="card-glass" data-st-decor>
      <div class="badge-tag" style="background: ${scene.cardLayout?.accentColor ?? '#38BDF8'}22; color: ${scene.cardLayout?.accentColor ?? '#38BDF8'}; border-color: ${scene.cardLayout?.accentColor ?? '#38BDF8'}55;">
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
          innerContent = `
    <div class="card-diagram" data-st-decor>
      <div class="badge-tag" style="background: ${scene.cardLayout?.accentColor ?? '#F59E0B'}22; color: ${scene.cardLayout?.accentColor ?? '#F59E0B'}; border-color: ${scene.cardLayout?.accentColor ?? '#F59E0B'}55;">
        ${scene.cardLayout?.badge ?? 'ANCESTRAL BLUEPRINT'}
      </div>
      <h2 class="t-headline">${scene.cardLayout?.headline ?? 'SOCIAL = PHYSICAL PAIN'}</h2>
      <div class="threat-matrix">
        <div class="matrix-node pulse">
          <div class="node-icon">⚠️</div>
          <div class="node-title">Social Error</div>
        </div>
        <div class="matrix-arrow">➔</div>
        <div class="matrix-node warning">
          <div class="node-icon">🚫</div>
          <div class="node-title">Tribal Exile</div>
        </div>
        <div class="matrix-arrow">➔</div>
        <div class="matrix-node critical">
          <div class="node-icon">💀</div>
          <div class="node-title">Mortal Danger</div>
        </div>
      </div>
      <p class="t-subtext">${scene.cardLayout?.subtext ?? 'To primitive biology: Isolation was fatal.'}</p>
    </div>`;
          break;

        case "mixed":
          innerContent = `
    <div class="card-glass" data-st-decor>
      <div class="badge-tag" style="background: ${scene.cardLayout?.accentColor ?? '#10B981'}22; color: ${scene.cardLayout?.accentColor ?? '#10B981'}; border-color: ${scene.cardLayout?.accentColor ?? '#10B981'}55;">
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
          innerContent = `
    <div class="card-hero payoff" data-st-decor>
      <div class="badge-tag" style="background: ${scene.cardLayout?.accentColor ?? '#8B5CF6'}22; color: ${scene.cardLayout?.accentColor ?? '#8B5CF6'}; border-color: ${scene.cardLayout?.accentColor ?? '#8B5CF6'}55;">
        ${scene.cardLayout?.badge ?? 'DAILY CORTEX'}
      </div>
      <h1 class="t-hero" data-st="kinetic-type" data-style="pop" data-by="words" data-at="0.1">
        ${scene.cardLayout?.headline ?? 'SURVIVAL, NOT PUNISHMENT'}
      </h1>
      <p class="t-sub" data-st="kinetic-type" data-style="rise" data-at="0.35">
        ${scene.cardLayout?.subtext ?? 'Your brain is protecting your belonging.'}
      </p>
      <div class="channel-pill">
        <span class="channel-logo">🧠</span>
        <span class="channel-name">Daily Cortex</span>
      </div>
    </div>`;
          break;
      }

      currentStart += scene.durationSec;

      return `  <!-- Scene ${scene.sceneNumber}: ${scene.type} (${scene.durationSec.toFixed(1)}s) -->
  <section class="scene" id="scene-${scene.sceneNumber}" ${startAttr} ${durAttr} ${transAttr}>
${innerContent}
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
    --border-glass: rgba(255, 255, 255, 0.12);
  }

  .scene {
    background:
      radial-gradient(75% 38% at 15% 10%, rgba(56, 189, 248, 0.12), transparent 70%),
      radial-gradient(90% 45% at 85% 80%, rgba(139, 92, 246, 0.14), transparent 70%),
      var(--bg-dark);
  }

  .scene::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.35;
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
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-glass);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .badge-tag {
    display: inline-block;
    padding: 1.2cqw 3.2cqw;
    border-radius: 2cqw;
    font: 700 3.2cqw/1 var(--font-mono, monospace);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid;
    margin-bottom: 2.5cqh;
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
    margin: 0 0 2.5cqh;
  }

  .t-subtext, .t-note {
    font: 450 4.2cqw/1.3 var(--font-body, sans-serif);
    color: #94A3B8;
    margin-top: 2cqh;
  }

  /* Clock display component */
  .clock-display {
    display: inline-flex;
    align-items: baseline;
    gap: 1.5cqw;
    background: rgba(0, 0, 0, 0.5);
    padding: 2cqw 4cqw;
    border-radius: 2.5cqw;
    border: 1px solid rgba(244, 63, 94, 0.3);
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
    gap: 2cqh;
    margin: 2cqh 0;
  }
  .comparison-col {
    display: flex;
    flex-direction: column;
    gap: 1cqh;
  }
  .comp-label {
    font: 600 3.6cqw/1 var(--font-mono, monospace);
    color: #64748B;
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

  /* Threat matrix */
  .threat-matrix {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5cqw;
    margin: 2cqh 0;
  }
  .matrix-node {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.5cqw 1cqw;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 2.5cqw;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .node-icon { font-size: 5cqw; margin-bottom: 0.8cqh; }
  .node-title { font: 600 3cqw/1.1 var(--font-body, sans-serif); color: #F1F5F9; text-align: center; }
  .matrix-arrow { font: 700 4cqw/1 var(--font-mono, monospace); color: #64748B; }

  /* Status box */
  .status-box {
    display: flex;
    flex-direction: column;
    gap: 1.5cqh;
    background: rgba(0, 0, 0, 0.4);
    padding: 3cqw 4cqw;
    border-radius: 3cqw;
    border: 1px solid rgba(16, 185, 129, 0.3);
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
  .channel-logo { font-size: 4.8cqw; }
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
