export function parseExplanation(text) {
    const tokens = [];
    const regex = /\$\$\$\$|\$\$(.+?)\$\$/gs;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index).trim();
            if (before) tokens.push(before);
        }

        if (match[0] === "$$$$") {
            tokens.push("");
        } else if (match[1]) {
            tokens.push(`$$${match[1].trim()}$$`);
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        const after = text.slice(lastIndex).trim();
        if (after) tokens.push(after);
    }

    return tokens;
}
