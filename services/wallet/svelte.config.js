import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Explicitly configure for Fly.io
			// adapter-node automatically uses PORT and HOST env vars
			// PORT=3000 and HOST=0.0.0.0 are set in Dockerfile
		})
	}
};

export default config;
