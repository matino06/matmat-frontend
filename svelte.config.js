import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({
			out: 'build',   // build folder za server
			precompress: true
		}),
		// ako želiš prerender sve rute
		prerender: {
			entries: ['*']
		}
	}
};
