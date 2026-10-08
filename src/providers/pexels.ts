import { config } from "../config.js";
import type { AssetProvider, MediaAsset, ProviderResult } from "../types.js";

export class PexelsProvider implements AssetProvider {
  constructor(private readonly apiKey = config.pexelsApiKey) {}

  async search(
    query: string,
    o: { limit?: number; orientation?: "portrait" | "landscape" | "square" } = {}
  ): Promise<ProviderResult<MediaAsset[]>> {
    if (!this.apiKey) {
      return { ok: false, error: "PEXELS_API_KEY is not configured" };
    }
    const p = new URLSearchParams({ query, per_page: String(o.limit ?? 10) });
    if (o.orientation) p.set("orientation", o.orientation);

    const r = await fetch(`https://api.pexels.com/videos/search?${p}`, {
      headers: { Authorization: this.apiKey }
    });
    if (!r.ok) {
      return { ok: false, error: `Pexels request failed: ${r.status}` };
    }

    const d = await r.json() as any;
    const a: MediaAsset[] = (d.videos ?? [])
      .map((v: any) => ({
        id: String(v.id),
        url: v.video_files?.[0]?.link ?? "",
        mediaType: "video" as const,
        width: v.width,
        height: v.height,
        durationSec: v.duration,
        orientation: (v.height > v.width ? "portrait" : "landscape") as "portrait" | "landscape",
        query,
        score: 70,
        provider: "pexels" as const,
        attribution: `Pexels / ${v.user?.name ?? "Creator"}`
      }))
      .filter((x: MediaAsset) => x.url);

    return { ok: true, value: a };
  }
}
