import { GEMINI_API_KEY } from "$env/static/private";
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
    const { systemPrompt } = await request.json();

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: systemPrompt }]
                    }
                ]
            })
        }
    );

    const data = await response.json();
    return json(data);
}