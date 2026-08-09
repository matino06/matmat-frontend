import { GEMINI_API_KEY } from "$env/static/private";

// Images quoted from a task are fetched here rather than in the browser: task
// images are cross-origin, so a canvas read would taint and a client fetch would
// need CORS headers we don't control.
//
// The client supplies the URL, so this is an SSRF sink — only hosts we actually
// serve task images from are allowed, everything else is dropped silently.
const ALLOWED_IMAGE_HOSTS = new Set(["api.matmat.online", "matmat.online"]);

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function toBase64(buffer) {
    return Buffer.from(buffer).toString("base64");
}

// The Content-Type header is not trustworthy here: the backend serves task PNGs
// as "application/json". Identify the format from its magic bytes instead, which
// also keeps us from forwarding non-images that merely claim to be one.
function sniffImageMime(buffer) {
    const b = new Uint8Array(buffer);
    if (b.length < 12) return null;

    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";

    const ascii = (i, len) => String.fromCharCode(...b.subarray(i, i + len));
    if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
    if (ascii(4, 4) === "ftyp") {
        const brand = ascii(8, 4);
        if (brand === "heic" || brand === "heix" || brand === "hevc") return "image/heic";
        if (brand === "mif1" || brand === "msf1") return "image/heif";
    }
    return null;
}

// Every rejection path is silent to the caller, which once cost a long debugging
// session — an image that never arrived looked exactly like a model that refused
// to look at it. Always leave a trace.
function drop(url, reason) {
    console.warn("[ai] image dropped:", reason, url);
    return null;
}

// → { mimeType, data } for a Gemini inlineData part, or null if unusable.
async function fetchImageInline(rawUrl, origin) {
    if (typeof rawUrl !== "string" || !rawUrl) return drop(rawUrl, "no-url");

    if (rawUrl.startsWith("data:")) {
        const comma = rawUrl.indexOf(",");
        const header = rawUrl.slice(5, comma);
        if (comma < 0 || !/;base64/i.test(header)) return drop(rawUrl, "bad-data-uri");
        const mimeType = header.split(";")[0];
        if (!mimeType.startsWith("image/")) return drop(rawUrl, "not-an-image");
        const data = rawUrl.slice(comma + 1);
        // base64 expands 4 chars per 3 bytes
        if (data.length * 0.75 > MAX_IMAGE_BYTES) return drop(rawUrl, "too-large");
        console.log("[ai] image attached:", mimeType, `${Math.round(data.length * 0.75)}B`, "(data uri)");
        return { mimeType, data };
    }

    let url;
    try {
        url = new URL(rawUrl, origin);
    } catch {
        return drop(rawUrl, "bad-url");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return drop(rawUrl, "bad-protocol");
    if (url.origin !== origin && !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
        return drop(rawUrl, `blocked-host (${url.hostname})`);
    }

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return drop(rawUrl, `http-${res.status}`);

        const declared = Number(res.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return drop(rawUrl, "too-large");

        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) return drop(rawUrl, "too-large");

        const mimeType = sniffImageMime(buffer);
        if (!mimeType) {
            const claimed = (res.headers.get("content-type") ?? "").split(";")[0].trim();
            return drop(rawUrl, `not-an-image (claimed ${claimed || "nothing"})`);
        }

        console.log("[ai] image attached:", mimeType, `${buffer.byteLength}B`, url.href);
        return { mimeType, data: toBase64(buffer) };
    } catch (err) {
        return drop(rawUrl, `fetch-failed (${err?.name ?? "error"})`);
    }
}

export async function POST({ request, url: requestUrl }) {
    const { systemPrompt, images = [], imageNote = "" } = await request.json();

    const attached = [];
    if (Array.isArray(images) && images.length) {
        const inlined = await Promise.all(
            images
                .slice(0, MAX_IMAGES)
                .map(img => fetchImageInline(img?.url, requestUrl.origin)),
        );
        for (const inlineData of inlined) {
            if (inlineData) attached.push({ inlineData });
        }
    }

    // The prompt may only mention attached images once they really are attached —
    // a dropped or blocked fetch must not leave the model describing nothing.
    const text = attached.length && imageNote
        ? `${systemPrompt}\n\n${imageNote}`
        : systemPrompt;

    const parts = [{ text }, ...attached];

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        return new Response(response.body, { status: response.status });
    }

    return new Response(response.body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            // Lets the client tell "the model ignored the figure" apart from
            // "the figure never reached the model".
            "X-Images-Requested": String(Array.isArray(images) ? images.length : 0),
            "X-Images-Attached": String(attached.length),
        }
    });
}
