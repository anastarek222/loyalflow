const VERSION = "v1";

const CARD_CACHE =
  `loyalflow-card-pages-${VERSION}`;

const ASSET_CACHE =
  `loyalflow-card-assets-${VERSION}`;

const CACHE_PREFIX =
  "loyalflow-card-";

const MAX_CARD_PAGES = 25;
const MAX_ASSETS = 100;

const OFFLINE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1,viewport-fit=cover"
  />
  <meta
    name="theme-color"
    content="#020617"
  />
  <title>الكارت غير متاح دون إنترنت</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(
          circle at top,
          #172554 0%,
          #020617 48%
        );
      color: #fff;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
    }

    .card {
      width: 100%;
      max-width: 420px;
      padding: 34px 26px;
      text-align: center;
      border: 1px solid
        rgba(255,255,255,.14);
      border-radius: 28px;
      background:
        rgba(15,23,42,.88);
      box-shadow:
        0 30px 80px
        rgba(0,0,0,.4);
    }

    .icon {
      width: 82px;
      height: 82px;
      margin: 0 auto 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 24px;
      background:
        linear-gradient(
          145deg,
          #2563eb,
          #1d4ed8
        );
      font-size: 38px;
    }

    h1 {
      margin: 0;
      font-size: 25px;
      line-height: 1.5;
    }

    p {
      margin: 14px 0 0;
      color: rgba(255,255,255,.7);
      font-size: 15px;
      line-height: 1.9;
    }

    button {
      width: 100%;
      margin-top: 26px;
      padding: 14px 18px;
      border: 0;
      border-radius: 14px;
      background: #2563eb;
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
  </style>
</head>

<body>
  <main class="card">
    <div class="icon">📶</div>

    <h1>
      لا يوجد اتصال بالإنترنت
    </h1>

    <p>
      لم يتم العثور على نسخة محفوظة من هذا
      الكارت. افتحه مرة واحدة أثناء الاتصال
      بالإنترنت ليصبح متاحًا لاحقًا.
    </p>

    <button
      type="button"
      onclick="location.reload()"
    >
      إعادة المحاولة
    </button>
  </main>
</body>
</html>`;

function offlineResponse() {
  return new Response(
    OFFLINE_HTML,
    {
      status: 503,

      headers: {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    }
  );
}

function getCardCacheKey(rawUrl) {
  const url = new URL(rawUrl);

  url.search = "";
  url.hash = "";

  return new Request(
    url.toString(),
    {
      method: "GET",

      headers: {
        Accept: "text/html",
      },
    }
  );
}

async function trimCache(
  cacheName,
  maximumEntries
) {
  const cache =
    await caches.open(cacheName);

  const keys =
    await cache.keys();

  while (
    keys.length >
    maximumEntries
  ) {
    const oldestKey =
      keys.shift();

    if (oldestKey) {
      await cache.delete(oldestKey);
    }
  }
}

async function saveCardResponse(
  rawUrl,
  response
) {
  if (
    !response ||
    !response.ok
  ) {
    return;
  }

  const cache =
    await caches.open(
      CARD_CACHE
    );

  await cache.put(
    getCardCacheKey(rawUrl),
    response.clone()
  );

  await trimCache(
    CARD_CACHE,
    MAX_CARD_PAGES
  );
}

async function networkFirstCard(
  request
) {
  const cache =
    await caches.open(
      CARD_CACHE
    );

  const cacheKey =
    getCardCacheKey(
      request.url
    );

  try {
    const response =
      await fetch(request);

    if (response.ok) {
      await cache.put(
        cacheKey,
        response.clone()
      );

      await trimCache(
        CARD_CACHE,
        MAX_CARD_PAGES
      );

      return response;
    }

    const savedResponse =
      await cache.match(
        cacheKey
      );

    return (
      savedResponse ||
      response
    );
  } catch {
    const savedResponse =
      await cache.match(
        cacheKey
      );

    return (
      savedResponse ||
      offlineResponse()
    );
  }
}

function canCacheResponse(
  response
) {
  return (
    response.ok ||
    response.type === "opaque"
  );
}

async function staleWhileRevalidate(
  request
) {
  const cache =
    await caches.open(
      ASSET_CACHE
    );

  const cachedResponse =
    await cache.match(request);

  const networkPromise =
    fetch(request)
      .then(
        async (response) => {
          if (
            canCacheResponse(
              response
            )
          ) {
            await cache.put(
              request,
              response.clone()
            );

            await trimCache(
              ASSET_CACHE,
              MAX_ASSETS
            );
          }

          return response;
        }
      )
      .catch(() => null);

  if (cachedResponse) {
    void networkPromise;

    return cachedResponse;
  }

  const networkResponse =
    await networkPromise;

  return (
    networkResponse ||
    Response.error()
  );
}

function isCardAsset(
  request,
  url
) {
  return (
    url.pathname.startsWith(
      "/_next/static/"
    ) ||
    url.pathname.startsWith(
      "/_next/image"
    ) ||
    url.pathname.startsWith(
      "/api/card-icon/"
    ) ||
    url.pathname.startsWith(
      "/api/card-manifest/"
    ) ||
    url.pathname === "/icon" ||
    url.pathname ===
      "/apple-icon" ||
    url.pathname.startsWith(
      "/apple-touch-icon"
    ) ||
    request.destination ===
      "image" ||
    request.destination ===
      "font"
  );
}

async function cacheCurrentCard(
  cardUrl,
  assetUrls
) {
  try {
    const url =
      new URL(
        cardUrl,
        self.location.origin
      );

    if (
      url.origin !==
        self.location.origin ||
      !url.pathname.startsWith(
        "/card/"
      )
    ) {
      return;
    }

    const response =
      await fetch(
        url.toString(),
        {
          credentials:
            "same-origin",

          cache: "no-store",

          headers: {
            Accept:
              "text/html",
          },
        }
      );

    await saveCardResponse(
      url.toString(),
      response
    );
  } catch {
    // The page will be cached
    // on the next successful visit.
  }

  const safeAssetUrls =
    Array.isArray(assetUrls)
      ? assetUrls.slice(0, 80)
      : [];

  const assetCache =
    await caches.open(
      ASSET_CACHE
    );

  await Promise.allSettled(
    safeAssetUrls.map(
      async (rawUrl) => {
        try {
          const url =
            new URL(rawUrl);

          if (
            url.origin !==
            self.location.origin
          ) {
            return;
          }

          const allowedPath =
            url.pathname.startsWith(
              "/_next/"
            ) ||
            url.pathname.startsWith(
              "/api/card-icon/"
            ) ||
            url.pathname.startsWith(
              "/api/card-manifest/"
            ) ||
            /\.(png|jpg|jpeg|webp|svg|ico|woff|woff2)$/i.test(
              url.pathname
            );

          if (!allowedPath) {
            return;
          }

          const response =
            await fetch(
              url.toString(),
              {
                credentials:
                  "same-origin",
              }
            );

          if (
            canCacheResponse(
              response
            )
          ) {
            await assetCache.put(
              url.toString(),
              response.clone()
            );
          }
        } catch {
          // Ignore individual
          // asset failures.
        }
      }
    )
  );

  await trimCache(
    ASSET_CACHE,
    MAX_ASSETS
  );
}

self.addEventListener(
  "install",
  () => {
    self.skipWaiting();
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      (async () => {
        const cacheNames =
          await caches.keys();

        await Promise.all(
          cacheNames.map(
            (cacheName) => {
              const isOldCache =
                cacheName.startsWith(
                  CACHE_PREFIX
                ) &&
                cacheName !==
                  CARD_CACHE &&
                cacheName !==
                  ASSET_CACHE;

              return isOldCache
                ? caches.delete(
                    cacheName
                  )
                : Promise.resolve(
                    false
                  );
            }
          )
        );

        await self.clients.claim();
      })()
    );
  }
);

self.addEventListener(
  "message",
  (event) => {
    if (
      event.data?.type !==
      "CACHE_CURRENT_CARD"
    ) {
      return;
    }

    event.waitUntil(
      cacheCurrentCard(
        event.data.cardUrl,
        event.data.assetUrls
      )
    );
  }
);

self.addEventListener(
  "fetch",
  (event) => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(request.url);

    if (
      request.mode ===
        "navigate" &&
      url.origin ===
        self.location.origin &&
      url.pathname.startsWith(
        "/card/"
      )
    ) {
      event.respondWith(
        networkFirstCard(
          request
        )
      );

      return;
    }

    if (
      isCardAsset(
        request,
        url
      )
    ) {
      event.respondWith(
        staleWhileRevalidate(
          request
        )
      );
    }
  }
);
