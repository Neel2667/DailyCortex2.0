import {config} from "../config.js";
export class GroqProvider{
constructor(private readonly apiKey=config.groqApiKey){}
async generate(prompt:string):Promise<string>{
if(!this.apiKey) throw new Error("GROQ_API_KEY is not configured");
const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({model:"llama-3.3-70b-versatile",messages:[{role:"user",content:prompt}],temperature:.7})});
if(!r.ok) throw new Error(`Groq request failed: ${r.status}`);
const d=await r.json() as any; return d.choices?.[0]?.message?.content??"";
}}
