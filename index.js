require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleDeviceQuery, handleRecentUsers, handleResetUserQueries, handleQuickReset, handleAdminHelp } = require('./bot/commandHandler');
const { connectToDB } = require('./services/mongo');

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.WEBHOOK_URL;
const port = process.env.PORT || 3000;

if (!token || !url) {
    console.error('💥 FATAL: TELEGRAM_BOT_TOKEN or WEBHOOK_URL is not defined!');
    process.exit(1);
}

const bot = new TelegramBot(token);
bot.setWebHook(`${url}/bot${token}`);
console.log(`🚀 Webhook is set to: ${url}/bot${token}`);

const app = express();
app.use(bodyParser.json());

app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send('Telegram Bot is running and healthy.');
});

connectToDB().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`✅ Express server is listening on port ${port}. Bot is fully operational.`);
    });
}).catch(err => {
    console.error('💥 FATAL: Failed to connect to DB and start application:', err.message);
    process.exit(1);
});

bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/recent_users/, (msg) => handleRecentUsers(bot, msg));
bot.onText(/\/reset_me/, (msg) => handleQuickReset(bot, msg));
bot.onText(/\/reset_queries (.+)/, (msg, match) => handleResetUserQueries(bot, msg, match[1]));
bot.onText(/\/admin_help/, (msg) => handleAdminHelp(bot, msg));

// --- כאן התיקון העיקרי ---
bot.on('message', (msg) => {
    if (msg && msg.text && !msg.text.startsWith('/')) {
        // שולחים את הטקסט במפורש לפונקציה
        handleDeviceQuery(bot, msg, msg.text);
    }
});
