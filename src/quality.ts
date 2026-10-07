import type {ContentSpec} from "./types.js";
export function qualityGates(s:ContentSpec){return[
{name:"schema",passed:Boolean(s.id&&s.topic&&s.script&&s.scenes.length),reason:"required fields"},
{name:"hook",passed:s.hook.trim().length>=20,reason:"clear hook"},
{name:"duration",passed:s.durationSec>0&&s.scenes.every(x=>x.durationSec>0),reason:"positive durations"},
{name:"scene-coverage",passed:s.scenes.length>=(s.format==="short"?4:8),reason:"enough visual beats"},
{name:"metadata",passed:Boolean(s.metadata.description&&s.metadata.hashtags.length),reason:"metadata"}
]}
export function assertQuality(s:ContentSpec){const f=qualityGates(s).filter(x=>!x.passed);if(f.length)throw new Error(f.map(x=>x.name+": "+x.reason).join("; "))}
