export const replaceCdata = (rawText: string) => {
    const cdataRegex = new RegExp("(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)", "g");
    const matches = rawText.match(cdataRegex);

    if (matches != null && matches.length > 0) {
        for (const matche of matches) {
            const regex = new RegExp("(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)", "g");
            const m = regex.exec(matche);
            if (m) {
                let cdataText = m[2];
                cdataText = cdataText.replace(/\&/g, "&amp;");
                cdataText = cdataText.replace(/\</g, "&lt;");
                cdataText = cdataText.replace(/\>/g, "&gt;");
                cdataText = cdataText.replace(/\"/g, "&quot;");
                rawText = rawText.replace(m[0], cdataText);
            }
        }
    }

    return rawText;
};
