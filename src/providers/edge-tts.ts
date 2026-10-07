import {spawn} from "node:child_process"; import type {ProviderResult,VoiceProvider} from "../types.js";
export class EdgeTTSProvider implements VoiceProvider{
async synthesize(text:string,voiceId:string,outputPath:string):Promise<ProviderResult<{outputPath:string}>>{
return new Promise(resolve=>{const c=spawn("edge-tts",["--voice",voiceId,"--text",text,"--write-media",outputPath],{stdio:["ignore","ignore","pipe"]});let e="";c.stderr.on("data",d=>e+=d);c.on("error",x=>resolve({ok:false,error:x.message}));c.on("close",n=>resolve(n===0?{ok:true,value:{outputPath}}:{ok:false,error:e||`edge-tts exited ${n}`}));});
}}
