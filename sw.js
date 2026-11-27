// ตับดีมีสุข · offline shell. Videos stream from the network and are never cached here.
const CACHE='tdms-v47';
const SHELL=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','media/app-icon2.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url); if(u.origin!==location.origin||/\.mp4$/i.test(u.pathname))return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put('index.html',c));return res}).catch(()=>caches.match('index.html')));return}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok&&/\.(webp|png|jpg|svg|webmanifest)$/i.test(u.pathname)){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res})));
});

/* ---- medicine reminders while the app is closed ----
   The push carries no data. The schedule the app saved on this phone (cache "tdms-rem") says which dose is due. */
const pad2=n=>String(n).padStart(2,'0');
function remText(d,now){
  const th=!d||d.lang!=='en';
  const base={title:th?'ถึงเวลารับประทานยา':'Time for your medicines',body:th?'เปิดแอปตับดีมีสุขเพื่อดูรายการยาและบันทึกการกินยา':'Open the app to see your medicines and record them',tag:'tdms-dose'};
  if(d&&d.testAt&&now.getTime()-d.testAt<300000)return {title:th?'การแจ้งเตือนใช้งานได้แล้ว':'Reminders are working',body:th?'เมื่อถึงเวลากินยา จะมีแจ้งเตือนแบบนี้ขึ้น แม้ไม่ได้เปิดแอป':'At each dose time you’ll get a notification like this, even with the app closed',tag:'tdms-test',test:true};
  if(!d||!d.days)return base;
  const day=now.getFullYear()+'-'+pad2(now.getMonth()+1)+'-'+pad2(now.getDate()),slots=d.days[day];if(!slots)return base;
  const nowM=now.getHours()*60+now.getMinutes(),lead=+d.lead||0,mm=t=>+t.slice(0,2)*60+ +t.slice(3,5);
  const ts=Object.keys(slots).sort();let t=null;
  ts.forEach(x=>{if(mm(x)-lead<=nowM+3)t=x});if(!t)t=ts[0];if(!t)return base;
  const names=slots[t]||[];const who=d.who?(th?'ของ '+d.who:'for '+d.who):'';
  return {title:base.title+' '+t+(who?' '+who:''),body:d.names===false||!names.length?(th?`ยา ${names.length||''} รายการ แตะเพื่อเปิดแอปและบันทึก`:`${names.length||''} medicine(s) · tap to open and record`).replace('  ',' '):names.join(', '),tag:'tdms-dose-'+t};
}
self.addEventListener('push',e=>{e.waitUntil((async()=>{
  let d=null;try{const c=await caches.open('tdms-rem');const r=await c.match('rem.json');if(r)d=await r.json()}catch(x){}
  const m=remText(d,new Date());
  if(m.test&&d){try{d.testAt=0;await (await caches.open('tdms-rem')).put('rem.json',new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}}))}catch(x){}}
  await self.registration.showNotification(m.title,{body:m.body,tag:m.tag,renotify:true,requireInteraction:!m.test,icon:'icons/icon-192.png',vibrate:[400,150,400,150,600],data:{url:'./?v=meds'}});
})())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{
  const all=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const c of all){try{c.postMessage({go:'meds'});return await c.focus()}catch(x){}}
  return self.clients.openWindow((e.notification.data&&e.notification.data.url)||'./');
})())});
