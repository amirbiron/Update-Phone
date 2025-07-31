const { generateRecommendation } = require('./recommendationEngine');

const deviceData = [
    { name: "iPhone 15 Pro", manufacturer: "Apple", model: "15 Pro", releaseYear: 2023, os: "iOS" },
    { name: "Samsung Galaxy S24 Ultra", manufacturer: "Samsung", model: "S24 Ultra", releaseYear: 2024, os: "Android" },
    { name: "Google Pixel 8 Pro", manufacturer: "Google", model: "Pixel 8 Pro", releaseYear: 2023, os: "Android" },
    { name: "iPhone 13", manufacturer: "Apple", model: "13", releaseYear: 2021, os: "iOS" },
    { name: "Samsung Galaxy A54", manufacturer: "Samsung", model: "A54", releaseYear: 2023, os: "Android" },
    { name: "iPhone 11", manufacturer: "Apple", model: "11", releaseYear: 2019, os: "iOS" }
];

function getDeviceDetails(modelName) {
    const lowerCaseModelName = modelName.toLowerCase();
    const device = deviceData.find(d => d.name.toLowerCase() === lowerCaseModelName);
    if (device) {
        return {
            ...device,
            recommendation: generateRecommendation(device.releaseYear)
        };
    }
    return null;
}

function getSupportedModels() {
    return deviceData.map(d => d.name);
}

/**
 * Removes markdown formatting (asterisks and hash symbols) from text
 * @param {string} text - The text to clean
 * @returns {string} Text without markdown formatting
 */
function removeMarkdownFormatting(text) {
    // Remove all asterisks (both single and double)
    let cleanedText = text.replace(/\*/g, '');
    
    // Remove hash symbols at the beginning of lines (headers)
    cleanedText = cleanedText.replace(/^#+\s*/gm, '');
    
    // Remove backticks (code formatting)
    cleanedText = cleanedText.replace(/`/g, '');
    
    // Remove underscores used for italics
    cleanedText = cleanedText.replace(/_/g, '');
    
    // Clean up multiple consecutive spaces (but preserve single spaces)
    cleanedText = cleanedText.replace(/ {2,}/g, ' ');
    
    // Clean up multiple consecutive newlines (preserve up to 2)
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
    
    // Trim each line
    cleanedText = cleanedText.split('\n').map(line => line.trim()).join('\n');
    
    return cleanedText;
}

/**
 * Splits a long message into multiple parts to comply with Telegram's 4096 character limit
 * @param {string} message - The message to split
 * @param {number} maxLength - Maximum length per message part (default: 4000 to leave some buffer)
 * @returns {Array<string>} Array of message parts
 */
function splitLongMessage(message, maxLength = 4000) {
    if (message.length <= maxLength) {
        return [message];
    }

    const parts = [];
    let currentPart = '';
    const lines = message.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineWithNewline = i === lines.length - 1 ? line : line + '\n';
        
        // If adding this line would exceed the limit
        if (currentPart.length + lineWithNewline.length > maxLength) {
            // If current part is not empty, save it
            if (currentPart.trim()) {
                parts.push(currentPart.trim());
                currentPart = '';
            }
            
            // If a single line is longer than maxLength, split it by words
            if (lineWithNewline.length > maxLength) {
                const words = line.split(' ');
                let wordPart = '';
                
                for (const word of words) {
                    if (wordPart.length + word.length + 1 > maxLength) {
                        if (wordPart.trim()) {
                            parts.push(wordPart.trim());
                            wordPart = '';
                        }
                        
                        // If a single word is longer than maxLength, split it
                        if (word.length > maxLength) {
                            let wordIndex = 0;
                            while (wordIndex < word.length) {
                                const chunk = word.substring(wordIndex, wordIndex + maxLength);
                                parts.push(chunk);
                                wordIndex += maxLength;
                            }
                        } else {
                            wordPart = word + ' ';
                        }
                    } else {
                        wordPart += word + ' ';
                    }
                }
                
                if (wordPart.trim()) {
                    currentPart = wordPart;
                }
            } else {
                currentPart = lineWithNewline;
            }
        } else {
            currentPart += lineWithNewline;
        }
    }
    
    // Add the last part if it's not empty
    if (currentPart.trim()) {
        parts.push(currentPart.trim());
    }
    
    // Add part numbers if there are multiple parts
    if (parts.length > 1) {
        return parts.map((part, index) => {
            const partNumber = `📄 חלק ${index + 1}/${parts.length}\n\n`;
            return partNumber + part;
        });
    }
    
    return parts;
}

/**
 * Sends a potentially long message by splitting it into multiple parts if needed
 * @param {Object} bot - Telegram bot instance
 * @param {number} chatId - Chat ID to send to
 * @param {string} message - Message to send
 * @param {Object} options - Telegram send options (like parse_mode)
 * @returns {Promise} Promise that resolves when all parts are sent
 */
async function sendLongMessage(bot, chatId, message, options = {}) {
    // Remove markdown formatting from the message
    const cleanedMessage = removeMarkdownFormatting(message);
    
    const messageParts = splitLongMessage(cleanedMessage);
    
    // Remove parse_mode since we're not using markdown anymore
    const cleanedOptions = { ...options };
    delete cleanedOptions.parse_mode;
    
    for (let i = 0; i < messageParts.length; i++) {
        try {
            await bot.sendMessage(chatId, messageParts[i], cleanedOptions);
            
            // Add a small delay between messages to avoid rate limiting
            if (i < messageParts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error(`Error sending message part ${i + 1}/${messageParts.length}:`, error);
            // Try to send an error message if the first part failed
            if (i === 0) {
                try {
                    await bot.sendMessage(chatId, '❌ אירעה שגיאה בשליחת ההודעה. ההודעה ארוכה מדי או שיש בעיית חיבור.', cleanedOptions);
                } catch (secondError) {
                    console.error('Failed to send error message:', secondError);
                }
            }
            throw error;
        }
    }
}

module.exports = {
    getDeviceDetails,
    getSupportedModels,
    removeMarkdownFormatting,
    splitLongMessage,
    sendLongMessage
};
