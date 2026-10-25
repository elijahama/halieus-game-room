import {readFileSync} from "node:fs";
const health=JSON.parse(readFileSync(0,"utf8"));
const rooms=Object.entries(health).filter(([key])=>/^active.*Rooms$/.test(key));
if(health.status!=="online" || !Object.hasOwn(health,"activeRooms") || rooms.length===0 ||
 rooms.some(([,count])=>!Number.isInteger(count)||count<0||count!==0)){
 console.error("Deployment blocked: active games or unverifiable room counts. Production remains running.");
 process.exit(1);
}
console.log("Oracle pre-activation room check: all reported room counts are zero.");
