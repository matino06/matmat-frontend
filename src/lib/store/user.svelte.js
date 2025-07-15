import { auth, googleProvider } from '$lib/config/firebase-config';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

export const userData = $state({
    user: null,
    loading: true,
    error: null
});

onAuthStateChanged(auth, (u) => {
    userData.user = u;
    userData.loading = false;
});

export const login = async () => {
    try {
        userData.loading = true
        await signInWithPopup(auth, googleProvider);
    } catch (err) {
        console.error(err);
        userData.error = "Greška pri prijavi.";
    }
};

export const logout = async () => {
    await signOut(auth);
    userData.user = null;
};
