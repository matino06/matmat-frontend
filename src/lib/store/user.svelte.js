import { auth, googleProvider } from '$lib/config/firebase-config';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { showErrorAlert } from "$lib/store/errorAlert.svelte";

export const userData = $state({
    user: null,
    loading: true
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
        setTimeout(() => {
            userData.loading = false;
        }, 2500)
        showErrorAlert("Greška pri prijavi.");
    }
};

export const turnstileData = $state({ isLoaded: false });

export const handleLogIn = async () => {
    if (turnstileData.isLoaded) return;

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
                    const response = await fetch(
                        "http://localhost:8080/api/turnstile/verify",
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
}

export const logout = async () => {
    await signOut(auth);
    userData.user = null;
};