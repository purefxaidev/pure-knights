const V='pk-v4b';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  if(u.pathname.includes('/assets/')&&!u.pathname.endsWith('.json')&&!u.pathname.endsWith('.mp4')){ e.respondWith(caches.open(V).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{ if(n.ok) c.put(e.request,n.clone()); return n; })))); return; }
  e.respondWith(fetch(e.request).then(n=>{ const cl=n.clone(); caches.open(V).then(c=>c.put(e.request,cl)); return n; }).catch(()=>caches.match(e.request)));
});
