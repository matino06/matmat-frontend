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

export const turnstileData = $state({ isLoaded: false });

onAuthStateChanged(auth, (u) => {
    userData.user = u;
    userData.loading = false;
});

export const handleLogIn = async () => {

    userData.loading = true;

    try {
        await signInWithPopup(auth, googleProvider);

        turnstileData.isVisible = true;
        loadTurnstile();
    } catch (err) {
        userData.loading = false;

        if (err.code === 'auth/popup-blocked') {
            showErrorAlert(
                "Popup prozor je blokiran. Molimo omogućite popup prozore za ovu stranicu:\n\n" +
                "1. Kliknite ikonu zaključanja u address baru\n" +
                "2. Odaberite 'Site settings' ili 'Permissions'\n" +
                "3. Omogućite 'Pop-ups and redirects'\n" +
                "4. Pokušajte ponovno"
            );
        } else if (err.code === 'auth/popup-closed-by-user') {
            console.log('Korisnik je zatvorio login popup');
        } else if (err.code === 'auth/cancelled-popup-request') {
            console.log('Login request cancelled');
        } else {
            showErrorAlert("Greška pri prijavi: " + (err.message || err.code));
        }

        console.error('Login error:', err);
    }
};

const loadTurnstile = () => {
    if (!browser || !window.turnstile) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => renderTurnstile();
        document.head.appendChild(script);
    } else {
        renderTurnstile();
    }
};

const login = async () => {
    const response = await apiClient('/account/exists', { method: 'GET' });
    const textResponse = await response.text();

    if (textResponse == "Account does not exist") {
        const tempResponse = await apiClient('/account/create', { method: 'POST' });
    }
}

const renderTurnstile = () => {
    const container = document.getElementById("turnstile-container");
    if (container) {
        container.innerHTML = "";
    }

    turnstileData.isLoaded = true;
    if (window.turnstile) {
        window.turnstile.render("#turnstile-container", {
            sitekey: "0x4AAAAAABBBBZ3tdroBV8xr",
            callback: async (token) => {
                try {
                    const response = await apiClient(
                        "/turnstile/verify",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ token }),
                        },
                    );

                    if (response.ok) {
                        setTimeout(() => {
                            turnstileData.isLoaded = false;
                        }, 2500);

                        login();
                    } else {
                        setTimeout(() => {
                            turnstileData.isLoaded = false;
                        }, 2500);
                        showErrorAlert("Verifikacija nije uspjela. Pokušajte ponovo.");
                    }
                } catch (err) {
                    setTimeout(() => {
                        turnstileData.isLoaded = false;
                    }, 2500);
                    showErrorAlert("Greška prilikom povezivanja sa serverom.");
                }
            },
            "error-callback": () => {
                setTimeout(() => {
                    turnstileData.isLoaded = false;
                }, 2500);
                showErrorAlert("Cloudflare Turnstile nije uspio učitati.");
            },
        });
    }
};

export const logout = async () => {
    await signOut(auth);
    userData.user = null;
};