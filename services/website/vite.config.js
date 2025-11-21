import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	// Load env vars from monorepo root
	envDir: resolve(__dirname, '../..'),
	envPrefix: ['PUBLIC_', 'WEBSITE_'],
	server: {
		port: process.env.PORT ? Number(process.env.PORT) : 4200,
		strictPort: true,
	},
	resolve: {
		// Ensure proper module resolution in monorepo
		preserveSymlinks: false,
	},
});

