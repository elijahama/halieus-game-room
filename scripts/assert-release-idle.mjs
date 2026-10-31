import {readFileSync} from "node:fs";
let health;
try {
  const input=readFileSync(0,"utf8");
  if(!input.trim()) throw new Error("Empty /health response");
  health=JSON.parse(input);
  if(!health || typeof health!=="object" || Array.isArray(health)) throw new Error("Invalid /health object");
} catch {
  console.error("Deployment blocked: Oracle /health response is missing or invalid; room occupancy cannot be verified.");
  process.exit(1);
}
const rooms=Object.entries(health).filter(([key])=>/^active.*Rooms$/.test(key));
if(health.status!=="online" || !Object.hasOwn(health,"activeRooms") || rooms.length===0 ||
 rooms.some(([,count])=>!Number.isInteger(count)||count<0||count!==0)){
 console.error("Deployment blocked: active games or unverifiable room counts. Production remains running.");
 process.exit(1);
}
console.log("Oracle pre-activation room check: all reported room counts are zero.");
