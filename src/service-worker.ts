/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => {
			(self as unknown as ServiceWorkerGlobalScope).skipWaiting();
		})
	);
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
			(self as unknown as ServiceWorkerGlobalScope).clients.claim();
		})
	);
});

self.addEventListener('fetch', (event: FetchEvent) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Don't cache Firebase or Scryfall API calls
	if (url.hostname.includes('firebase') || url.hostname.includes('scryfall')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Serve from cache if available
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;

			// Otherwise fetch from network
			try {
				const response = await fetch(event.request);
				if (response.status === 200) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				// Fallback for navigation requests
				const fallback = await cache.match('/index.html');
				if (fallback) return fallback;
				return new Response('Offline', { status: 503 });
			}
		})()
	);
});

