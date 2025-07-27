require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleDeviceQuery } = require('./bot/commandHandler');
const { connectToDB } = require('./services/mongo');

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.WEBHOOK_URL; // e.g., https://your-app-name.onrender.com
const port = process.env.PORT || 3000;

if (!token || !url) {
    console.error('💥 FATAL: TELEGRAM_BOT_TOKEN or WEBHOOK_URL is not defined in environment variables!');
    process.exit(1);
}

// Create a new bot instance
const bot = new TelegramBot(token);

// Set the webhook
bot.setWebHook(`${url}/bot${token}`);
console.log(`🚀 Webhook is set to: ${url}/bot${token}`);

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Endpoint for the webhook
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.send('Telegram Bot is running and healthy.');
});

// Connect to DB and start the server
connectToDB().then(() => {
    app.listen(port, () => {
        console.log(`✅ Express server is listening on port ${port}. Bot is fully operational.`);
    });
}).catch(err => {
    console.error('💥 FATAL: Failed to connect to DB and start the application:', err.message);
    process.exit(1);
});

// --- Bot Listeners ---
bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        handleDeviceQuery(bot, msg);
    }
});
