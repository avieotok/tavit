/* ═══════════════════════════════════════════════════
   Service Worker — מדבקות אפקון
   מאפשר עבודה מלאה בלי אינטרנט.
   בכל עדכון גרסה של האפליקציה יש להעלות את המספר כאן,
   כדי שהדפדפן יוריד את הקובץ החדש במקום להגיש את הישן.
   ═══════════════════════════════════════════════════ */
const CACHE = 'afkon-labels-v6.0';

/* קבצי הליבה — נשמרים בהתקנה */
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest'
];

/* ספריות חיצוניות — נשמרות בפעם הראשונה שנטענות */
const CDN = [
  'cdn.sheetjs.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.gstatic.com'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=> c.addAll(CORE).catch(()=>{}))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=> k !== CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('message', e=>{
  if(e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Firebase ותעבורת סנכרון — תמיד מהרשת, לעולם לא מהמטמון */
  if(/firebaseio|firebasedatabase|googleapis\.com\/identitytoolkit/.test(url.hostname)) return;

  /* דף האפליקציה: קודם רשת (כדי לקבל עדכונים), ובנפילה — מהמטמון */
  if(req.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith(
      fetch(req)
        .then(res=>{
          const copy = res.clone();
          caches.open(CACHE).then(c=> c.put(req, copy)).catch(()=>{});
          return res;
        })
        .catch(()=> caches.match(req).then(r=> r || caches.match('./index.html')))
    );
    return;
  }

  /* ספריות וגופנים: קודם מטמון, ורענון ברקע */
  if(CDN.some(h=> url.hostname.indexOf(h) !== -1)){
    e.respondWith(
      caches.match(req).then(hit=>{
        const net = fetch(req).then(res=>{
          const copy = res.clone();
          caches.open(CACHE).then(c=> c.put(req, copy)).catch(()=>{});
          return res;
        }).catch(()=> hit);
        return hit || net;
      })
    );
    return;
  }

  /* שאר הבקשות באתר עצמו */
  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).catch(()=> hit))
  );
});
