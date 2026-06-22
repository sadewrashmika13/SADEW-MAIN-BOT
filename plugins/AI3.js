// 3. සාමාන්‍ය Text ප්‍රශ්න අහන Function එක
async function askGeminiText(prompt) {
    const q = `${prompt}\n\n${STYLE_INSTRUCTION}`;
    const { data } = await axios.get(TEXT_API_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        params: { q: q, apitoken: API_TOKEN },
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
        }
    });
    const answer = extractTextFromObject(data);
    if (!answer) throw new Error("API response is empty.");
    return answer;
}

// 4. ෆොටෝ එක්ක ප්‍රශ්න අහන Function එක
async function askGeminiVision(prompt, imageUrl) {
    const q = `${prompt}\n\n${STYLE_INSTRUCTION}`;
    const { data } = await axios.get(VISION_API_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        params: { q: q, url: imageUrl },
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36"
        }
    });
    const answer = extractTextFromObject(data);
    if (!answer) throw new Error("Vision API response is empty.");
    return answer;
}
