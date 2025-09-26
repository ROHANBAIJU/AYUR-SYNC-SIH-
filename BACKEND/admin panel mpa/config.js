// Runtime configuration for Admin MPA.
// Chooses API base automatically:
// 1. If a ?api=... query param is present, that wins (e.g. ?api=local or ?api=http://other-host:8000/api)
// 2. If ?api=local -> uses LOCAL_API.
// 3. If served from localhost/127.0.0.1 and no explicit ?api, use LOCAL_API for convenience.
// 4. Otherwise fall back to REMOTE_API (Render deployment).
// This lets you open index.html via Live Server and transparently talk to your local backend without edits.

(function(){
	const REMOTE_API = 'https://ayur-sync-sih.onrender.com/api';
	const LOCAL_API = 'http://127.0.0.1:8000/api';
	let chosen = REMOTE_API;
	try {
		const params = new URLSearchParams(window.location.search);
		const apiParam = params.get('api');
		if (apiParam) {
			if (apiParam === 'local') {
				chosen = LOCAL_API;
			} else if (/^https?:\/\//i.test(apiParam)) {
				chosen = apiParam.replace(/\/$/, ''); // strip trailing slash
			}
		} else if (['localhost','127.0.0.1'].includes(window.location.hostname)) {
			chosen = LOCAL_API;
		}
	} catch(e) { /* silent */ }
	window.API_BASE_URL = chosen;
	console.log('[Admin Config] Using API_BASE_URL =', window.API_BASE_URL);
})();
