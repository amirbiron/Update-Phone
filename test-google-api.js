#!/usr/bin/env node

// סקריפט בדיקת Google Search API
require('dotenv').config();
const https = require('https');

console.log('🔍 === Google Search API Test ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);

// בדיקת משתני סביבה - גם החדשים וגם הישנים
const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

console.log('\n🔑 === Environment Variables ===');
console.log(`GOOGLE_SEARCH_API_KEY: ${process.env.GOOGLE_SEARCH_API_KEY ? `✅ EXISTS (${process.env.GOOGLE_SEARCH_API_KEY.substring(0, 15)}...)` : '❌ MISSING'}`);
console.log(`GOOGLE_SEARCH_ENGINE_ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID ? `✅ EXISTS (${process.env.GOOGLE_SEARCH_ENGINE_ID})` : '❌ MISSING'}`);
console.log(`GOOGLE_API_KEY (legacy): ${process.env.GOOGLE_API_KEY ? `✅ EXISTS (${process.env.GOOGLE_API_KEY.substring(0, 15)}...)` : '❌ MISSING'}`);
console.log(`GOOGLE_CSE_ID (legacy): ${process.env.GOOGLE_CSE_ID ? `✅ EXISTS (${process.env.GOOGLE_CSE_ID})` : '❌ MISSING'}`);
console.log(`Using API Key: ${apiKey ? `✅ ${apiKey.substring(0, 15)}...` : '❌ NONE'}`);
console.log(`Using CSE ID: ${searchEngineId ? `✅ ${searchEngineId}` : '❌ NONE'}`);

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
const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(testQuery)}&num=3`;

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
          console.log('\n📋 Search Results:');
          jsonData.items.forEach((item, index) => {
            console.log(`\n${index + 1}. ${item.title}`);
            console.log(`   URL: ${item.link}`);
            console.log(`   Snippet: ${item.snippet?.substring(0, 100)}...`);
            
            // בדיקה מאיזה אתר הגיעה התוצאה
            const domain = new URL(item.link).hostname;
            console.log(`   Domain: ${domain}`);
          });
          
          // סטטיסטיקה של דומיינים
          const domains = {};
          jsonData.items.forEach(item => {
            const domain = new URL(item.link).hostname;
            domains[domain] = (domains[domain] || 0) + 1;
          });
          
          console.log('\n📊 === Domain Distribution ===');
          Object.entries(domains).forEach(([domain, count]) => {
            console.log(`   ${domain}: ${count} results`);
          });
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