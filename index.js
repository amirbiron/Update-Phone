require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

// --- נתיבים מתוקנים ---
const { handleUpdate, handleCallbackQuery, handleMyDeviceInfo } = require('./bot/messageHandler');
const { handleStart, handleDeviceCommand } = require('./bot/commandHandler');
const { initializeDatabase } = require('./common/database');
const Scheduler = require('./scheduler/scheduler');
// --------------------

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.WEBHOOK_URL;
const port = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());
let bot;

app.get('/', (req, res) => {
  res.send('Telegram Bot is running and healthy.');
});

async function main() {
  try {
    if (!token) {
      throw new Error('💥 TELEGRAM_BOT_TOKEN is not defined in environment variables!');
    }

    await initializeDatabase();
    console.log('Database initialized successfully.');

    if (process.env.NODE_ENV === 'production') {
        if (!url) {
            throw new Error('💥 WEBHOOK_URL is not defined in environment variables for production mode!');
        }
        console.log('🚀 Production mode: Initializing bot with Webhook.');
        bot = new TelegramBot(token);
        await bot.setWebHook(`${url}/bot${token}`);
        console.log(`Webhook set to ${url}/bot${token}`);

        app.post(`/bot${token}`, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });
    } else {
        console.log('🚀 Development mode: Initializing bot with Polling.');
        const tempBot = new TelegramBot(token);
        await tempBot.deleteWebHook().catch(e => console.warn('Could not delete webhook (this is normal in dev):', e.message));
        bot = new TelegramBot(token, { polling: true });
    }

    // הגדרת מאזינים
    bot.on('message', (msg) => handleUpdate(bot, msg));
    bot.on('callback_query', (callbackQuery) => handleCallbackQuery(bot, callbackQuery));
    bot.onText(/\/mydevice/, (msg) => handleMyDeviceInfo(bot, msg));
    bot.onText(/\/start/, (msg) => handleStart(bot, msg));
    bot.onText(/\/device (.+)/, (msg, match) => handleDeviceCommand(bot, msg, match));
    
    bot.on('polling_error', (error) => console.error(`Polling error: ${error.code} - ${error.message}`));
    bot.on('webhook_error', (error) => console.error(`Webhook error: ${error.code} - ${error.message}`));

    const scheduler = new Scheduler(bot);
    scheduler.startAll();

    app.listen(port, () => {
        console.log(`✅ Express server is listening on port ${port}. Bot is fully operational.`);
    });

  } catch (err) {
    console.error('💥 FATAL: Failed to start the application:', err.message);
    process.exit(1);
  }
}

main();
