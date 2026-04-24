#!/usr/bin/env node
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mode = process.argv[2]; // "debug" | "firebase"

function patchDebugMode(value) {
	const envPath = resolve(root, '.env');
	try {
		const existing = readFileSync(envPath, 'utf-8');
		const patched = existing.replace(/VITE_DEBUG_MODE=.*/, `VITE_DEBUG_MODE=${value}`);
		writeFileSync(envPath, patched, 'utf-8');
	} catch {
		console.error('⚠️  No .env found – copy .env.example and add your Firebase credentials.');
		process.exit(1);
	}
}

if (mode === 'debug') {
	patchDebugMode('true');
	console.log('✅ Switched to DEBUG mode (VITE_DEBUG_MODE=true)');
} else if (mode === 'firebase') {
	patchDebugMode('false');
	console.log('✅ Switched to FIREBASE mode (VITE_DEBUG_MODE=false)');
} else {
	console.error('Usage: node scripts/switch-env.js <debug|firebase>');
	process.exit(1);
}

