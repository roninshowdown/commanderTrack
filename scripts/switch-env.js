#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mode = process.argv[2]; // "debug" | "firebase"

const debugEnv = `VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
VITE_DEBUG_MODE=true
`;

if (mode === 'debug') {
	writeFileSync(resolve(root, '.env'), debugEnv, 'utf-8');
	console.log('✅ Switched to DEBUG mode (.env written)');
} else if (mode === 'firebase') {
	try {
		const existing = readFileSync(resolve(root, '.env'), 'utf-8');
		const patched = existing.replace(/VITE_DEBUG_MODE=.*/, 'VITE_DEBUG_MODE=false');
		writeFileSync(resolve(root, '.env'), patched, 'utf-8');
	} catch {
		console.error('⚠️  No .env found – copy .env.example and add your Firebase credentials.');
		process.exit(1);
	}
	console.log('✅ Switched to FIREBASE mode (VITE_DEBUG_MODE=false)');
} else {
	console.error('Usage: node scripts/switch-env.js <debug|firebase>');
	process.exit(1);
}

