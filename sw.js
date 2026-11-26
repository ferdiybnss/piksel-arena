/* Piksel Arena · çevrimdışı çalışma.
   Uygulamayı güncellemek için bu dosyayı değiştirmek gerekmez: sayfa her açılışta önce internetten alınır. */
var CACHE='piksel-arena-v1';
var EXTRA=['manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'];
var SCOPE=new URL('./',self.location).pathname;

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.add(new Request('./',{cache:'reload'})).then(function(){
      /* bir simge eksik yüklenmişse kurulum yine de tamamlansın */
      return Promise.all(EXTRA.map(function(u){return c.add(new Request(u,{cache:'reload'})).catch(function(){})}));
    });
  }).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  /* aynı adresteki başka uygulamaların önbelleğine dokunma */
  e.waitUntil(caches.keys().then(function(K){return Promise.all(K.filter(function(k){return k.indexOf('piksel-arena-')===0&&k!==CACHE}).map(function(k){return caches.delete(k)}))})
    .then(function(){return self.clients.claim()}));
});

function keep(key,res){var copy=res.clone();return caches.open(CACHE).then(function(c){return c.put(key,copy)}).catch(function(){})}
function cached(key){return caches.open(CACHE).then(function(c){return c.match(key)})}

/* sayfa: önce internet (güncel sürüm), 4 saniyede gelmezse ya da internet yoksa kayıtlı kopya */
function page(e){
  var net=fetch(e.request.url,{cache:'no-cache'}).then(function(r){if(r.ok&&!r.redirected)return keep('./',r).then(function(){return r});return r});
  e.waitUntil(net.catch(function(){}));
  e.respondWith(new Promise(function(done,fail){
    var over=false;function give(r){if(!over){over=true;done(r)}}
    var t=setTimeout(function(){cached('./').then(function(h){if(h)give(h)})},4000);
    net.then(function(r){clearTimeout(t);if(r.ok)return give(r);cached('./').then(function(h){give(h||r)})},
      function(err){clearTimeout(t);cached('./').then(function(h){if(h)give(h);else if(!over){over=true;fail(err)}})});
  }));
}
/* simgeler ve yazı tipleri: kayıtlı olan hemen verilir, arka planda yenilenir */
function asset(e){
  var net=fetch(e.request).then(function(r){if(r.ok||r.type==='opaque')return keep(e.request,r).then(function(){return r});return r});
  e.waitUntil(net.catch(function(){}));
  e.respondWith(cached(e.request).then(function(h){return h||net}));
}
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var u=new URL(e.request.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com')return asset(e);
  /* sıralama sunucusu dahil diğer adresler doğrudan internete gider */
  if(u.origin!==self.location.origin||u.pathname.indexOf(SCOPE)!==0)return;
  var rest=u.pathname.slice(SCOPE.length);
  if(e.request.mode==='navigate'){if(rest===''||rest==='index.html')page(e);return}
  if(EXTRA.indexOf(rest)>=0)asset(e);
});
