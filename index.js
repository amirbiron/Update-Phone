require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleDeviceCommand } = require('./bot/commandHandler');
const { connectToDB } = require('./services/mongo');

async function main() {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error('💥 TELEGRAM_BOT_TOKEN is not defined!');

        await connectToDB();

        const bot = new TelegramBot(token);

        // --- Webhook setup for Render ---
        if (process.env.NODE_ENV === 'production') {
            const url = process.env.WEBHOOK_URL;
            if (!url) throw new Error('💥 WEBHOOK_URL is not defined for production!');
            
            await bot.setWebHook(`${url}/bot${token}`);
            console.log(`🚀 Production mode: Webhook set to ${url}`);
        } else {
            // For local development, use polling
            await bot.deleteWebHook().catch(e => console.warn('Could not delete webhook (this is normal in dev):', e.message));
            bot.options.polling = true;
            console.log('🚀 Development mode: Initializing bot with Polling.');
        }

        // --- Bot Listeners ---

        // Listen for specific commands
        bot.onText(/\/start/, (msg) => handleStart(bot, msg));
        
        // Listen for the /device command specifically
        bot.onText(/\/device (.+)/, (msg, match) => handleDeviceCommand(bot, msg, match));

        // Listen to ANY other message and treat it as a device query
        bot.on('message', (msg) => {
            // Ignore if it's a command we already handle
            if (msg.text && msg.text.startsWith('/')) {
                return;
            }
            // Pretend it's a /device command
            const match = [msg.text, msg.text]; // Create a "match" array
            handleDeviceCommand(bot, msg, match);
        });

        bot.on('polling_error', (error) => console.error(`Polling error: ${error.code} - ${error.message}`));
        bot.on('webhook_error', (error) => console.error(`Webhook error: ${error.code} - ${error.message}`));

        // --- Express App for Health Checks and Webhook ---
        const app = express();
        app.use(bodyParser.json());

        // Health check endpoint for Render
        app.get('/', (req, res) => res.send('Telegram Bot is running and healthy.'));

        // Webhook endpoint
        app.post(`/bot${token}`, (req, res) => {
            bot.processUpdate(req.body);
            res.sendStatus(200);
        });

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`✅ Express server is listening on port ${port}. Bot is fully operational.`);
        });

    } catch (err) {
        console.error('💥 FATAL: Failed to start the application:', err.message);
        process.exit(1);
    }
}

main();
