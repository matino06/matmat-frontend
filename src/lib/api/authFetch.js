import { auth } from '$lib/config/firebase-config';
// import { getTurnstileToken } from '$lib/utils/turnstile';

export async function authFetch(input, init = {}) {
    const user = auth.currentUser;
    const fetchInit = {
        ...init,
        headers: {
            ...(init.headers || {})
        }
    };

    if (user) {
        const token = await user.getIdToken();
        fetchInit.headers['Authorization'] = `Bearer ${token}`;
    }

    //   if ((fetchInit.method || 'GET').toUpperCase() !== 'GET') {
    //     const cfToken = getTurnstileToken();
    //     fetchInit.headers['CF-Turnstile-Token'] = cfToken;
    //   }

    return fetch(input, fetchInit);
}
