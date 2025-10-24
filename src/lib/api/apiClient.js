import { auth } from '$lib/config/firebase-config';

export async function apiClient(path, init = {}) {
    const url = 'https://api.matmat.online/api' + path;
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
        fetchInit.headers['Content-Type'] = 'application/json';
    }

    return fetch(url, fetchInit);
}