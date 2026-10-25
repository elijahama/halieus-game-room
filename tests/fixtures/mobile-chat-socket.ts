const listeners=new Map();
export const socket={
 on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},
 off(event,fn){listeners.get(event)?.delete(fn);},
 emit(event,data,callback){if(event==="room-chat:join")callback?.({ok:true,messages:[],viewerRole:"player",viewerName:"Seat 1"});if(event==="room-chat:send"){window.hgrSent=data.text;callback?.({ok:true});}}
};
window.hgrMessage=(id)=>{for(const fn of listeners.get("room-chat:message")??[])fn({id,game:"mega-board",code:"QAONLY",senderName:"Seat 2",senderRole:"player",text:"Message "+id,at:Date.now()});};
