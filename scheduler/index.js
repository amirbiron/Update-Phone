#!/usr/bin/env node

require('dotenv').config();

console.log('🕒 Starting Android Update Advisor Scheduler...');

const Scheduler = require('../common/scheduler');

// יצירת מופע הסקג'ולר
const scheduler = new Scheduler();

// הפעלת כל המשימות המתוזמנות
scheduler.start();

console.log('✅ Scheduler started successfully');
console.log('🔄 All scheduled tasks are now running');

// טיפול בסיגנלים לעצירה חלקה
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, stopping scheduler...');
  scheduler.stop();
  process.exit(0);
});

// טיפול בשגיאות
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Scheduler:', error?.message || error);
  scheduler.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in Scheduler:', reason);
  scheduler.stop();
  process.exit(1);
});