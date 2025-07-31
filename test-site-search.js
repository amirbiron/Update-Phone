#!/usr/bin/env node

// סקריפט בדיקת חיפוש באתרים ספציפיים
require('dotenv').config();
const https = require('https');

console.log('🔍 === Site-Specific Search Test ===');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);

// בדיקת משתני סביבה
const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

console.log('\n🔑 === Environment Variables ===');
console.log(`API Key: ${apiKey ? `✅ EXISTS (${apiKey.substring(0, 15)}...)` : '❌ MISSING'}`);
console.log(`CSE ID: ${searchEngineId ? `✅ EXISTS (${searchEngineId})` : '❌ MISSING'}`);

if (!apiKey || !searchEngineId) {
  console.log('\n❌ Cannot test - missing environment variables');
  process.exit(1);
}

// האתרים לבדיקה
const TARGET_SITES = [
    'reddit.com',
    'xda-developers.com', 
    'androidcentral.com',
    'androidpolice.com',
    '9to5google.com',
    'support.google.com'
];

const testQuery = 'Android 14 update';

console.log(`\n🚀 === Testing Search for: "${testQuery}" ===`);
console.log(`🎯 Testing ${TARGET_SITES.length} sites...`);

// פונקציה לבדיקת אתר בודד
function testSiteSearch(site) {
    return new Promise((resolve) => {
        const siteQuery = `${testQuery} site:${site}`;
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(siteQuery)}&num=3`;
        
        console.log(`\n🔍 Testing ${site}...`);
        console.log(`📝 Query: "${siteQuery}"`);
        
        const startTime = Date.now();
        
        https.get(url, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (res.statusCode === 200) {
                        const items = jsonData.items || [];
                        console.log(`✅ ${site}: ${items.length} results (${responseTime}ms)`);
                        
                        if (items.length > 0) {
                            items.forEach((item, index) => {
                                const domain = new URL(item.link).hostname;
                                console.log(`   ${index + 1}. ${item.title.substring(0, 60)}...`);
                                console.log(`      ${item.link}`);
                                console.log(`      Domain: ${domain}`);
                                
                                // בדיקה אם התוצאה באמת מהאתר הנכון
                                if (!domain.includes(site.replace('.com', ''))) {
                                    console.log(`      ⚠️  WARNING: Result not from expected site!`);
                                }
                            });
                        } else {
                            console.log(`   ❌ No results found for ${site}`);
                        }
                        
                        resolve({
                            site,
                            success: true,
                            count: items.length,
                            responseTime,
                            results: items
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
                    
                } catch (parseError) {
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

// בדיקת כל האתרים
async function runTests() {
    const results = [];
    
    for (const site of TARGET_SITES) {
        const result = await testSiteSearch(site);
        results.push(result);
        
        // המתנה קצרה בין בקשות
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // סיכום התוצאות
    console.log('\n📊 === SUMMARY ===');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalResults = successful.reduce((sum, r) => sum + r.count, 0);
    
    console.log(`✅ Successful searches: ${successful.length}/${TARGET_SITES.length}`);
    console.log(`❌ Failed searches: ${failed.length}/${TARGET_SITES.length}`);
    console.log(`📈 Total results found: ${totalResults}`);
    
    if (successful.length > 0) {
        console.log('\n📋 Results by site:');
        successful.forEach(r => {
            console.log(`   ${r.site}: ${r.count} results`);
        });
        
        const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        console.log(`\n⏱️  Average response time: ${Math.round(avgResponseTime)}ms`);
    }
    
    if (failed.length > 0) {
        console.log('\n❌ Failed sites:');
        failed.forEach(r => {
            console.log(`   ${r.site}: ${r.error}`);
        });
    }
    
    // המלצות
    console.log('\n💡 === RECOMMENDATIONS ===');
    
    if (totalResults === 0) {
        console.log('🚨 NO RESULTS FOUND AT ALL!');
        console.log('   - Check your Custom Search Engine configuration');
        console.log('   - Verify API key and CSE ID are correct');
        console.log('   - Make sure sites are properly added to CSE');
    } else if (successful.length < TARGET_SITES.length / 2) {
        console.log('⚠️  Many sites returning no results');
        console.log('   - Check if sites are properly configured in CSE');
        console.log('   - Verify site URLs are correct (no www. prefix)');
    } else if (successful.length === 1 && successful[0].site === 'reddit.com') {
        console.log('🎯 FOUND THE PROBLEM!');
        console.log('   - Only Reddit is returning results');
        console.log('   - Your CSE is probably configured for Reddit only');
        console.log('   - Follow the GOOGLE_CSE_FIX_GUIDE.md to fix this');
    } else {
        console.log('✅ Search is working across multiple sites!');
        console.log('   - Your CSE configuration looks good');
    }
}

runTests().catch(console.error);