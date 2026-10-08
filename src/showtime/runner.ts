import { spawn } from "node:child_process";
import { config } from "../config.js";

export interface SubprocessResult {
  code: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

export class ShowtimeRunner {
  constructor(private bin = config.showtimeBin) {}

  private execute(args: string[], cwd?: string): Promise<SubprocessResult> {
    return new Promise((resolve) => {
      const child = spawn(this.bin, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      child.on("error", (err: Error) => {
        resolve({
          code: 1,
          stdout,
          stderr: `${stderr}\nExecution error: ${err.message}`,
          success: false
        });
      });

      child.on("close", (code: number | null) => {
        resolve({
          code: code ?? 1,
          stdout,
          stderr,
          success: code === 0
        });
      });
    });
  }

  /**
   * Runs pre-render validation checks (WCAG contrast, phone safe zones, text readability, dead air)
   */
  async check(projectDir: string): Promise<SubprocessResult> {
    return this.execute(["check", projectDir, "--json"]);
  }

  /**
   * Renders the project to an MP4 video file
   */
  async render(
    projectDir: string,
    outputPath: string,
    options: { preview?: boolean; workers?: number } = {}
  ): Promise<SubprocessResult> {
    const args = ["render", projectDir, "-o", outputPath];
    if (options.preview) {
      args.push("--preview");
    } else {
      args.push("--size", "1080x1920");
    }
    if (options.workers) {
      args.push("--workers", String(options.workers));
    }
    return this.execute(args);
  }

  /**
   * Runs post-render video QA (loudness -14 LUFS, black frames, silence, caption alignment)
   */
  async qa(videoPath: string, platform: string = "shorts"): Promise<SubprocessResult> {
    return this.execute(["qa", videoPath, "--platform", platform, "--json"]);
  }
}
