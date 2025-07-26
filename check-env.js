#!/usr/bin/env node

// סקריפט בדיקה למשתני סביבה
require('dotenv').config();

console.log('🔍 === Environment Variables Check ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🖥️  Node.js version: ${process.version}`);
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

console.log('\n🔑 === Google Search API Variables ===');
console.log(`GOOGLE_SEARCH_API_KEY: ${process.env.GOOGLE_SEARCH_API_KEY ? `✅ EXISTS (${process.env.GOOGLE_SEARCH_API_KEY.substring(0, 15)}...)` : '❌ MISSING/UNDEFINED'}`);
console.log(`GOOGLE_SEARCH_ENGINE_ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID ? `✅ EXISTS (${process.env.GOOGLE_SEARCH_ENGINE_ID})` : '❌ MISSING/UNDEFINED'}`);

console.log('\n🔍 === All Google-related Environment Variables ===');
const googleVars = Object.keys(process.env).filter(key => key.toLowerCase().includes('google'));
if (googleVars.length > 0) {
  googleVars.forEach(key => {
    const value = process.env[key];
    const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`${key}: ${displayValue}`);
  });
} else {
  console.log('❌ No Google-related environment variables found');
}

console.log('\n🔑 === Other Important Variables ===');
console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`CLAUDE_API_KEY: ${process.env.CLAUDE_API_KEY ? '✅ EXISTS' : '❌ MISSING'}`);

console.log('\n📋 === Validation Results ===');
const hasGoogleAPI = process.env.GOOGLE_SEARCH_API_KEY && 
                    process.env.GOOGLE_SEARCH_ENGINE_ID &&
                    !process.env.GOOGLE_SEARCH_API_KEY.includes('your_') &&
                    !process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_');

if (hasGoogleAPI) {
  console.log('✅ Google Search API: PROPERLY CONFIGURED');
} else {
  console.log('❌ Google Search API: NOT CONFIGURED');
  
  if (!process.env.GOOGLE_SEARCH_API_KEY) {
    console.log('   - GOOGLE_SEARCH_API_KEY is missing');
  } else if (process.env.GOOGLE_SEARCH_API_KEY.includes('your_')) {
    console.log('   - GOOGLE_SEARCH_API_KEY contains placeholder text');
  }
  
  if (!process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.log('   - GOOGLE_SEARCH_ENGINE_ID is missing');
  } else if (process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_')) {
    console.log('   - GOOGLE_SEARCH_ENGINE_ID contains placeholder text');
  }
}

console.log('\n🚀 === Ready to Test ===');
console.log('Run this script with: node check-env.js');
console.log('Make sure to run it in the same environment where your bot runs!');
console.log('========================================');