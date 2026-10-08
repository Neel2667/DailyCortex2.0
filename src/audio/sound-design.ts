import type { StoryboardPlan } from "../types.js";

export interface AudioTrackConfig {
  id?: string;
  kind: "voice" | "music" | "sfx";
  file?: string;
  start?: number;
  at?: number;
  align?: "hit" | "start";
  gain_db?: number;
  compose?: {
    style: string;
    bpm: number;
    sections: string;
    seed?: string;
  };
  synth?: {
    type: string;
    intensity?: number;
    seed?: number;
    key?: string;
  };
  duck?: {
    under: string;
    depth_db: number;
    carve?: number;
  };
  fade_out?: number;
  texture?: boolean;
}

export interface MixConfiguration {
  _comment: string;
  sample_rate: number;
  tracks: AudioTrackConfig[];
  master: {
    lufs: number;
    true_peak: number;
  };
}

export class SoundDesignEngine {
  /**
   * Builds the declarative audio/mix.json for Showtime
   */
  static generateMix(storyboard: StoryboardPlan, voiceAudioRelPath: string = "voice/vo.wav"): MixConfiguration {
    let currentTimelineSec = 0;
    const tracks: AudioTrackConfig[] = [];

    // 1. Voice track
    tracks.push({
      id: "vo",
      kind: "voice",
      file: voiceAudioRelPath,
      start: 0.0
    });

    // 2. Background music bed with ducking
    const totalDuration = storyboard.totalDurationSec;
    const introEnd = Math.min(4, totalDuration * 0.15);
    const dropStart = totalDuration * 0.7;

    tracks.push({
      id: "bed",
      kind: "music",
      compose: {
        style: storyboard.soundtrack.style,
        bpm: storyboard.soundtrack.bpm,
        sections: `0:intro,${introEnd.toFixed(1)}:verse,${dropStart.toFixed(1)}:drop,${(totalDuration - 3).toFixed(1)}:outro`,
        seed: "auto"
      },
      gain_db: 2,
      fade_out: 1.2,
      duck: {
        under: "voice",
        depth_db: storyboard.soundtrack.duckingDb,
        carve: 0.4
      }
    });

    // 3. Sound design effects timed to scene transitions and key beats
    storyboard.scenes.forEach((scene, index) => {
      const sceneStart = currentTimelineSec;

      if (scene.soundCues) {
        scene.soundCues.forEach((cueType, cueIndex) => {
          const cueTime = sceneStart + (cueIndex * 0.4);
          let key = "A";
          if (cueType === "pop" || cueType === "ding") {
            key = index % 2 === 0 ? "A" : "E";
          }

          tracks.push({
            kind: "sfx",
            synth: {
              type: cueType,
              seed: index * 10 + cueIndex,
              key
            },
            at: Number(cueTime.toFixed(2)),
            align: "hit",
            gain_db: cueType === "whoosh" ? -12 : -5,
            texture: cueType === "whoosh" || cueType === "paper-swipe"
          });
        });
      }

      currentTimelineSec += scene.durationSec;
    });

    return {
      _comment: "DailyCortex 2.0 automated procedural audio mix with voice ducking and synchronized sound design",
      sample_rate: 48000,
      tracks,
      master: {
        lufs: -14,
        true_peak: -1
      }
    };
  }
}
