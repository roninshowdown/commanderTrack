/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];
const SKIP_DOMAINS = ['firebaseio.com', 'googleapis.com', 'api.scryfall.com'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);

	if (SKIP_DOMAINS.some((d) => url.hostname.includes(d))) return;

	event.respondWith(
		caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
			if (response.ok && response.type === 'basic') {
				const clone = response.clone();
				caches.open(CACHE).then((c) => c.put(event.request, clone));
			}
			return response;
		})).catch(() => {
			if (event.request.mode === 'navigate') {
				return caches.match('/index.html').then((r) => r ?? new Response('Offline', { status: 503 }));
			}
			return new Response('Offline', { status: 503 });
		})
	);
});

