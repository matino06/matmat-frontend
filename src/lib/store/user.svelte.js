import { auth, googleProvider } from '$lib/config/firebase-config';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import { showErrorAlert } from "$lib/store/errorAlert.svelte";
import { apiClient } from '$lib/api/apiClient';
import { browser } from '$app/environment';

export const userData = $state({
    user: null,
    loading: true
});

// 🔐 Auth state listener
onAuthStateChanged(auth, (u) => {
    userData.user = u;
    userData.loading = false;
});

// 🔑 Login - UVIJEK koristi popup
export const handleLogIn = async () => {

    userData.loading = true;

    try {
        await signInWithPopup(auth, googleProvider);
        const response = await apiClient('/account/exists', { method: 'GET' });
        const textResponse = await response.text();

        if (textResponse == "Account does not exist") {
            const tempResponse = await apiClient('/account/create', { method: 'POST' });
        }
    } catch (err) {
        userData.loading = false;

        // Rukovanje specifičnim greškama
        if (err.code === 'auth/popup-blocked') {
            showErrorAlert(
                "Popup prozor je blokiran. Molimo omogućite popup prozore za ovu stranicu:\n\n" +
                "1. Kliknite ikonu zaključanja u address baru\n" +
                "2. Odaberite 'Site settings' ili 'Permissions'\n" +
                "3. Omogućite 'Pop-ups and redirects'\n" +
                "4. Pokušajte ponovno"
            );
        } else if (err.code === 'auth/popup-closed-by-user') {
            // Korisnik je zatvorio popup - ne prikazuj error
            console.log('Korisnik je zatvorio login popup');
        } else if (err.code === 'auth/cancelled-popup-request') {
            // Višestruki klikovi - ignoriši
            console.log('Login request cancelled');
        } else {
            // Ostale greške
            showErrorAlert("Greška pri prijavi: " + (err.message || err.code));
        }

        console.error('Login error:', err);
    }
};

// 🔓 Logout
export const logout = async () => {
    await signOut(auth);
    userData.user = null;
};