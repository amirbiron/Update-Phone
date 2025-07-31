#!/usr/bin/env node

// סקריפט בדיקת חיפוש באתרים ספציפיים
require('dotenv').config();
const https = require('https');

console.log('🔍 === Site-Specific Google Search Test ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);

const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!apiKey || !searchEngineId) {
  console.log('\n❌ Missing API credentials');
  process.exit(1);
}

// האתרים שהוגדרו במנוע החיפוש
const targetSites = [
  'reddit.com',
  'xda-developers.com', 
  'androidcentral.com',
  'androidpolice.com',
  '9to5google.com',
  'support.google.com/android'
];

const testQuery = 'Android 14 update';

console.log(`\n🚀 Testing search for: "${testQuery}"`);
console.log(`🎯 Testing ${targetSites.length} sites individually...\n`);

async function testSiteSearch(site, query) {
  return new Promise((resolve) => {
    const siteQuery = `${query} site:${site}`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(siteQuery)}&num=3`;
    
    console.log(`🔍 Testing: ${site}`);
    
    const startTime = Date.now();
    
    https.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (res.statusCode === 200) {
            const totalResults = jsonData.searchInformation?.totalResults || '0';
            const resultsCount = jsonData.items ? jsonData.items.length : 0;
            
            console.log(`✅ ${site}: ${totalResults} total results, ${resultsCount} returned (${responseTime}ms)`);
            
            if (jsonData.items && jsonData.items.length > 0) {
              console.log(`   📋 Sample: ${jsonData.items[0].title.substring(0, 80)}...`);
            } else {
              console.log(`   ⚠️  No results returned for this site`);
            }
            
            resolve({
              site,
              success: true,
              totalResults: parseInt(totalResults),
              returnedResults: resultsCount,
              responseTime,
              items: jsonData.items || []
            });
          } else {
            console.log(`❌ ${site}: Error ${res.statusCode}`);
            if (jsonData.error) {
              console.log(`   Error: ${jsonData.error.message}`);
            }
            resolve({
              site,
              success: false,
              error: jsonData.error?.message || `HTTP ${res.statusCode}`,
              responseTime
            });
          }
        } catch (error) {
          console.log(`❌ ${site}: Parse error`);
          resolve({
            site,
            success: false,
            error: 'Parse error',
            responseTime
          });
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${site}: Network error - ${err.message}`);
      resolve({
        site,
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });
  });
}

async function runTests() {
  console.log('⏳ Running tests...\n');
  
  const results = [];
  
  // בדיקה רצופה של כל אתר
  for (const site of targetSites) {
    const result = await testSiteSearch(site, testQuery);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // השהייה קצרה בין בקשות
  }
  
  console.log('\n📊 === SUMMARY ===');
  
  const successfulSites = results.filter(r => r.success);
  const failedSites = results.filter(r => !r.success);
  
  console.log(`✅ Successful sites: ${successfulSites.length}/${targetSites.length}`);
  console.log(`❌ Failed sites: ${failedSites.length}/${targetSites.length}`);
  
  if (successfulSites.length > 0) {
    console.log('\n🎯 Sites with results:');
    successfulSites
      .sort((a, b) => b.totalResults - a.totalResults)
      .forEach(site => {
        console.log(`   ${site.site}: ${site.totalResults} results`);
      });
  }
  
  if (failedSites.length > 0) {
    console.log('\n⚠️ Sites with issues:');
    failedSites.forEach(site => {
      console.log(`   ${site.site}: ${site.error}`);
    });
  }
  
  // המלצות
  console.log('\n💡 === RECOMMENDATIONS ===');
  
  if (successfulSites.length === 1 && successfulSites[0].site === 'reddit.com') {
    console.log('🔍 Only Reddit is returning results. Possible causes:');
    console.log('   1. Other sites have less Android 14 content');
    console.log('   2. Google\'s index for these sites might be limited');
    console.log('   3. Sites might be blocking Google crawlers');
    console.log('   4. Content might be behind paywalls/registration');
  } else if (successfulSites.length > 1) {
    console.log('✅ Multiple sites are working. The issue might be in the search strategy.');
  } else {
    console.log('❌ No sites are returning results. Check API configuration.');
  }
  
  console.log('\n🛠️ Suggested fixes:');
  console.log('   1. Use broader search terms');
  console.log('   2. Implement site-specific search strategies');
  console.log('   3. Add fallback to general web search');
  console.log('   4. Adjust date restrictions');
}

runTests().catch(console.error);