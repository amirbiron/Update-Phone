require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { handleStart, handleDeviceQuery } = require('./bot/commandHandler');
const { connectToDB } = require('./services/mongo');

async function main() {
    try {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error('💥 TELEGRAM_BOT_TOKEN is not defined!');

        await connectToDB();

        const bot = new TelegramBot(token, { polling: true }); // Start with polling for simplicity

        bot.onText(/\/start/, (msg) => handleStart(bot, msg));
        
        // Listen to ANY message that is not a command
        bot.on('message', (msg) => {
            if (msg.text && !msg.text.startsWith('/')) {
                handleDeviceQuery(bot, msg);
            }
        });

        bot.on('polling_error', (error) => console.error(`Polling error: ${error.code} - ${error.message}`));
        
        console.log('✅ Bot is running and listening for messages...');

    } catch (err) {
        console.error('💥 FATAL: Failed to start the application:', err.message);
        process.exit(1);
    }
}

main();
