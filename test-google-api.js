#!/usr/bin/env node

// סקריפט בדיקת Google Search API
require('dotenv').config();
const https = require('https');

console.log('🔍 === Google Search API Test ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);

// בדיקת משתני סביבה
const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

console.log('\n🔑 === Environment Variables ===');
console.log(`GOOGLE_SEARCH_API_KEY: ${apiKey ? `✅ EXISTS (${apiKey.substring(0, 15)}...)` : '❌ MISSING'}`);
console.log(`GOOGLE_SEARCH_ENGINE_ID: ${searchEngineId ? `✅ EXISTS (${searchEngineId})` : '❌ MISSING'}`);

if (!apiKey || !searchEngineId) {
  console.log('\n❌ Cannot test API - missing required environment variables');
  console.log('\n📋 To fix this:');
  console.log('1. Set GOOGLE_SEARCH_API_KEY in your environment');
  console.log('2. Set GOOGLE_SEARCH_ENGINE_ID in your environment');
  console.log('3. Run this script again');
  process.exit(1);
}

// בדיקת placeholder values
if (apiKey.includes('your_') || searchEngineId.includes('your_')) {
  console.log('\n❌ API credentials contain placeholder text');
  console.log('Please replace with actual values');
  process.exit(1);
}

console.log('\n🚀 === Testing Google Search API ===');

// בניית URL לבדיקה
const testQuery = 'Android update';
const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(testQuery)}&num=1`;

console.log(`🔍 Test query: "${testQuery}"`);
console.log(`🌐 API URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);

// ביצוע הבקשה
const startTime = Date.now();

https.get(url, (res) => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  console.log(`\n📡 === API Response ===`);
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Response Time: ${responseTime}ms`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('\n✅ === SUCCESS ===');
        console.log(`Found ${jsonData.searchInformation?.totalResults || 0} results`);
        console.log(`Search time: ${jsonData.searchInformation?.searchTime || 'unknown'}s`);
        
        if (jsonData.items && jsonData.items.length > 0) {
          console.log('\n📋 First result:');
          console.log(`Title: ${jsonData.items[0].title}`);
          console.log(`Link: ${jsonData.items[0].link}`);
          console.log(`Snippet: ${jsonData.items[0].snippet?.substring(0, 100)}...`);
        }
        
        console.log('\n🎉 Google Search API is working correctly!');
        
      } else {
        console.log('\n❌ === ERROR ===');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:`, JSON.stringify(jsonData, null, 2));
        
        if (jsonData.error) {
          console.log(`\n🔧 Error details:`);
          console.log(`Code: ${jsonData.error.code}`);
          console.log(`Message: ${jsonData.error.message}`);
          
          // הצעות לפתרון בעיות נפוצות
          if (jsonData.error.message.includes('API key not valid')) {
            console.log('\n💡 Solution: Check your API key is correct and enabled');
          } else if (jsonData.error.message.includes('Custom search engine not found')) {
            console.log('\n💡 Solution: Check your Search Engine ID is correct');
          } else if (jsonData.error.message.includes('Daily Limit Exceeded')) {
            console.log('\n💡 Solution: You have exceeded your daily quota');
          }
        }
      }
      
    } catch (parseError) {
      console.log('\n❌ Failed to parse JSON response');
      console.log('Raw response:', data);
    }
  });
  
}).on('error', (err) => {
  console.log('\n❌ === NETWORK ERROR ===');
  console.log(`Error: ${err.message}`);
  console.log('\n💡 This might be a network connectivity issue');
});

console.log('\n⏳ Waiting for API response...');