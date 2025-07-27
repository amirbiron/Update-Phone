// ... (the rest of the file remains the same)

async function analyzeDeviceData(deviceName, googleResults, redditResults) {
    console.log("▶️ Claude AI: Initializing analysis...");
    // ... (the rest of the function remains the same)
    
    // Just before the try-catch block for the API call:
    try {
        console.log("🧠 Claude AI: Sending data for analysis...");
        const response = await anthropic.messages.create({
            model: model,
            max_tokens: 4000,
            messages: [{ role: 'user', content: userPrompt }],
            system: "You are an AI assistant that generates structured reports about Android updates in Hebrew based on provided text and a strict template."
        });
        console.log("✅ Claude AI: Analysis received successfully.");
        return response.content[0].text;
    } catch (error) {
        console.error('❌ Claude AI Error:', error);
        return 'הייתה שגיאה בניתוח המידע. אנא נסה שוב מאוחר יותר.';
    }
}

module.exports = { analyzeDeviceData };
