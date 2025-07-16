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

    return fetch(input, fetchInit);
}
