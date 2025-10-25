import { auth, googleProvider } from '$lib/config/firebase-config';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { showErrorAlert } from "$lib/store/errorAlert.svelte";
import { apiClient } from '$lib/api/apiClient';

export const userData = $state({
    user: null,
    loading: true
});

onAuthStateChanged(auth, (u) => {
    userData.user = u;
    userData.loading = false;
});

export const turnstileData = $state({ isLoaded: false });

export const handleLogIn = async () => {
    if (turnstileData.isLoaded) return;

    try {
        userData.loading = true;
        turnstileData.isLoaded = true;

        const container = document.getElementById("turnstile-container");
        if (container) {
            container.innerHTML = "";
        }

        if (!window.turnstile) {
            throw new Error("Turnstile nije učitan");
        }

        const turnstileToken = await new Promise((resolve, reject) => {
            window.turnstile.render("#turnstile-container", {
                sitekey: "0x4AAAAAABBBBZ3tdroBV8xr",
                callback: (token) => {
                    resolve(token);
                },
                "error-callback": () => {
                    reject(new Error("Cloudflare Turnstile nije uspio učitati."));
                },
                "timeout-callback": () => {
                    reject(new Error("Turnstile verification timeout."));
                }
            });
        });

        const verifyResponse = await apiClient(
            "/turnstile/verify",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: turnstileToken }),
            }
        );

        if (!verifyResponse.ok) {
            throw new Error("Verifikacija nije uspjela. Pokušajte ponovo.");
        }

        await signInWithPopup(auth, googleProvider);

        const accountExistsResponse = await apiClient('/account/exists', { method: 'GET' });
        if (accountExistsResponse.data == "Account does not exist") {
            await apiClient('/account/create', { method: 'POST' });
        }

    } catch (err) {
        console.error("Login error:", err);
        showErrorAlert(err.message || "Greška pri prijavi.");

        try {
            await signOut(auth);
        } catch (signOutError) {
        }
    } finally {
        userData.loading = false;
        turnstileData.isLoaded = false;

        const container = document.getElementById("turnstile-container");
        if (container) {
            container.innerHTML = "";
        }
    }
};

export const logout = async () => {
    await signOut(auth);
    userData.user = null;
};