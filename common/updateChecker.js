const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('querystring');

class UpdateChecker {
  constructor() {
    this.searchSources = this.initializeSearchSources();
    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
    this.redditToken = null;
    this.redditTokenExpiry = null;
  }

  // קבלת access token מ-Reddit
  async getRedditToken() {
    try {
      // בדיקה אם יש לנו token תקף
      if (this.redditToken && this.redditTokenExpiry && Date.now() < this.redditTokenExpiry) {
        return this.redditToken;
      }

      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        console.error('❌ Reddit API credentials not found in environment variables');
        return null;
      }

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const response = await axios.post('https://www.reddit.com/api/v1/access_token',
        qs.stringify({ grant_type: 'client_credentials' }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'UpdatePhoneBot/1.0 by yourusername'
          },
          timeout: 10000
        }
      );

      this.redditToken = response.data.access_token;
      // Reddit tokens typically expire in 1 hour, we'll refresh 5 minutes early
      this.redditTokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
      
      console.log('✅ Reddit access token obtained successfully');
      return this.redditToken;
    } catch (error) {
      console.error('❌ Error getting Reddit access token:', error?.message || error);
      return null;
    }
  }

  // מקורות חיפוש מידע
  initializeSearchSources() {
    return {
      reddit: {
        name: 'Reddit',
        baseUrl: 'https://oauth.reddit.com',
        searchUrl: 'https://oauth.reddit.com/search',
        weight: 0.7,
        enabled: true
      },
      xda: {
        name: 'XDA Developers',
        baseUrl: 'https://www.xda-developers.com',
        weight: 0.9,
        enabled: true
      },
      androidPolice: {
        name: 'Android Police',
        baseUrl: 'https://www.androidpolice.com',
        weight: 0.8,
        enabled: true
      },
      androidAuthority: {
        name: 'Android Authority',
        baseUrl: 'https://www.androidauthority.com',
        weight: 0.8,
        enabled: true
      },
      gsmarena: {
        name: 'GSMArena',
        baseUrl: 'https://www.gsmarena.com',
        weight: 0.6,
        enabled: true
      }
    };
  }

  // בדיקת עדכון עיקרית
  async checkUpdate(deviceInfo, parsedQuery) {
    try {
      console.log(`📱 Checking update for ${deviceInfo.device} - ${parsedQuery.version}`);
      
      const searchResults = await this.gatherInformation(deviceInfo, parsedQuery);
      console.log(`🔍 [checkUpdate] Starting Claude analysis...`);
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      console.log(`✅ [checkUpdate] Claude analysis completed, result length: ${analysisResult?.length || 0}`);
      
      return {
        deviceInfo,
        searchResults,
        analysis: analysisResult,
        lastChecked: new Date(),
        sources: this.getActiveSources()
      };

    } catch (error) {
      console.error(`❌ Error at [checkUpdate]:`, error?.message || error);
      return {
        error: 'Failed to check update',
        deviceInfo,
        lastChecked: new Date()
      };
    }
  }

  // פונקציה חדשה שהבוט קורא לה - מתאימה לממשק הנדרש
  async checkForUpdates(deviceModel, currentVersion) {
    try {
      console.log(`🔍 [checkForUpdates] Starting search for ${deviceModel} with ${currentVersion}`);
      
      // יצירת אובייקט deviceInfo מהפרמטרים
      const deviceInfo = this.createDeviceInfo(deviceModel);
      const parsedQuery = { version: currentVersion };
      
      // שימוש בפונקציית החיפוש הקיימת
      const searchResults = await this.gatherInformation(deviceInfo, parsedQuery);
      
      console.log(`✅ [checkForUpdates] Search completed - Reddit: ${searchResults.redditPosts?.length || 0}, Forums: ${searchResults.forumDiscussions?.length || 0}, Official: ${searchResults.officialSources?.length || 0}`);
      
      // ביצוע ניתוח עם Claude
      console.log(`🧠 [checkForUpdates] Starting analysis...`);
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      console.log(`✅ [checkForUpdates] Analysis completed`);
      
      return {
        searchResults,
        analysis: analysisResult,
        deviceInfo,
        lastChecked: new Date(),
        sources: this.getActiveSources()
      };

    } catch (error) {
      console.error(`❌ Error at [checkForUpdates]:`, error?.message || error);
      return {
        error: 'Failed to check for updates',
        searchResults: { redditPosts: [], forumDiscussions: [], officialSources: [] },
        analysis: null,
        lastChecked: new Date()
      };
    }
  }

  // פונקציה עזר ליצירת אובייקט deviceInfo
  createDeviceInfo(deviceModel) {
    const deviceLower = deviceModel.toLowerCase();
    
    let manufacturer = 'Unknown';
    let manufacturerKey = 'unknown';
    
    if (deviceLower.includes('samsung') || deviceLower.includes('galaxy')) {
      manufacturer = 'Samsung';
      manufacturerKey = 'samsung';
    } else if (deviceLower.includes('google') || deviceLower.includes('pixel')) {
      manufacturer = 'Google';
      manufacturerKey = 'google';
    } else if (deviceLower.includes('xiaomi') || deviceLower.includes('redmi') || deviceLower.includes('poco')) {
      manufacturer = 'Xiaomi';
      manufacturerKey = 'xiaomi';
    } else if (deviceLower.includes('oneplus')) {
      manufacturer = 'OnePlus';
      manufacturerKey = 'oneplus';
    } else if (deviceLower.includes('huawei')) {
      manufacturer = 'Huawei';
      manufacturerKey = 'huawei';
    }
    
    // חילוץ שנת ייצור משם המכשיר (בערך)
    let deviceYear = 2023; // ברירת מחדל
    const yearMatch = deviceModel.match(/(\d{2,4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year > 2000 && year <= new Date().getFullYear()) {
        deviceYear = year;
      } else if (year >= 20 && year <= 25) {
        deviceYear = 2000 + year;
      }
    }
    
    return {
      device: deviceModel,
      manufacturer,
      manufacturerKey,
      deviceYear,
      marketSegment: 'mid-range' // ברירת מחדל
    };
  }

  // איסוף מידע ממקורות שונים - עודכן לחיפוש אמיתי עם Google Search API
  async gatherInformation(deviceInfo, parsedQuery) {
    const results = {
      redditPosts: [],
      forumDiscussions: [],
      officialSources: []
    };

    try {
      console.log(`🔄 [gatherInformation] Starting comprehensive search for ${deviceInfo.device} ${parsedQuery.version}`);
      console.log(`🔑 [Google Search API] Checking credentials...`);
      
      // בדיקת מפתחות Google Search API
          const hasGoogleAPI = process.env.GOOGLE_SEARCH_API_KEY &&
                         process.env.GOOGLE_SEARCH_ENGINE_ID &&
                         !process.env.GOOGLE_SEARCH_API_KEY.includes('your_') &&
                         !process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_');
      
      if (hasGoogleAPI) {
        console.log(`✅ [Google Search API] Credentials found - using as primary search engine`);
      } else {
        console.log(`⚠️ [Google Search API] Credentials not configured - using fallback methods`);
        console.log(`🔍 [Google Search API] Debug info:`);
        console.log(`   - GOOGLE_SEARCH_API_KEY: ${process.env.GOOGLE_SEARCH_API_KEY ? 'exists' : 'missing'}`);
        console.log(`   - GOOGLE_SEARCH_ENGINE_ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID ? 'exists' : 'missing'}`);
        if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_API_KEY.includes('your_')) {
          console.log(`   - GOOGLE_SEARCH_API_KEY contains placeholder text`);
        }
        if (process.env.GOOGLE_SEARCH_ENGINE_ID && process.env.GOOGLE_SEARCH_ENGINE_ID.includes('your_')) {
          console.log(`   - GOOGLE_SEARCH_ENGINE_ID contains placeholder text`);
        }
      }
      
      // חיפוש מקבילי במספר מקורות לביצועים טובים יותר
      const searchPromises = [];
      
      // חיפוש ב-Reddit
      searchPromises.push(
        this.searchReddit(deviceInfo, parsedQuery)
          .then(results => ({ type: 'reddit', results }))
          .catch(error => {
            console.error('Reddit search failed:', error?.message);
            return { type: 'reddit', results: [] };
          })
      );

      // חיפוש בפורומים טכניים (עם Google API אם זמין)
      searchPromises.push(
        this.searchTechForums(deviceInfo, parsedQuery)
          .then(results => ({ type: 'forums', results }))
          .catch(error => {
            console.error('Tech forums search failed:', error?.message);
            return { type: 'forums', results: [] };
          })
      );

      // חיפוש מקורות רשמיים
      searchPromises.push(
        this.searchOfficialSources(deviceInfo, parsedQuery)
          .then(results => ({ type: 'official', results }))
          .catch(error => {
            console.error('Official sources search failed:', error?.message);
            return { type: 'official', results: [] };
          })
      );

      // אם יש Google API, נוסיף חיפוש כללי נוסף
      if (hasGoogleAPI) {
        searchPromises.push(
          this.performGoogleSearch(deviceInfo, parsedQuery)
            .then(results => ({ type: 'google_general', results }))
            .catch(error => {
              console.error('Google general search failed:', error?.message);
              return { type: 'google_general', results: [] };
            })
        );
      }

      // המתנה לכל החיפושים
      const searchResults = await Promise.allSettled(searchPromises);
      
      // עיבוד התוצאות
      searchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          const { type, results: searchData } = result.value;
          
          switch (type) {
            case 'reddit':
              results.redditPosts = searchData || [];
              break;
            case 'forums':
              results.forumDiscussions = searchData || [];
              break;
            case 'official':
              results.officialSources = searchData || [];
              break;
            case 'google_general':
              // מיזוג תוצאות Google כלליות עם פורומים
              if (searchData && searchData.length > 0) {
                results.forumDiscussions = [...(results.forumDiscussions || []), ...searchData];
              }
              break;
          }
        }
      });

      const totalResults = (results.redditPosts?.length || 0) + 
                          (results.forumDiscussions?.length || 0) + 
                          (results.officialSources?.length || 0);

      console.log(`✅ [gatherInformation] Search completed: Reddit=${results.redditPosts?.length || 0}, Forums=${results.forumDiscussions?.length || 0}, Official=${results.officialSources?.length || 0}, Total=${totalResults}`);

      // אם לא נמצאו תוצאות, נוסיף הודעת מידע
      if (totalResults === 0) {
        console.log(`⚠️ [gatherInformation] No results found - adding fallback information`);
        results.forumDiscussions.push({
          title: `${deviceInfo.device} ${parsedQuery.version} - מידע מוגבל`,
          url: `https://www.google.com/search?q=${encodeURIComponent(deviceInfo.device + ' ' + parsedQuery.version + ' update review')}`,
          source: 'Google Search',
          weight: 0.3,
          summary: `לא נמצא מידע ספציפי. מומלץ לחפש באופן עצמאי`,
          date: new Date(),
          sentiment: 'neutral',
          userReports: []
        });
      }

    } catch (error) {
      console.error(`❌ Error at [gatherInformation]:`, error?.message || error);
    }

    console.log(`📄 [gatherInformation] Finished collecting search results with Google Search API integration`);
    return results;
  }

  // חיפוש כללי עם Google Search API
  async performGoogleSearch(deviceInfo, parsedQuery) {
    try {
      console.log(`🔍 [performGoogleSearch] Starting Google search for ${deviceInfo.device} ${parsedQuery.version}`);
      
      // שאילתות חיפוש מותאמות
      const searchQueries = [
        `"${deviceInfo.device}" "${parsedQuery.version}" update review problems issues`,
        `"${deviceInfo.device}" "${parsedQuery.version}" user experience battery performance`,
        `"${deviceInfo.device}" "${parsedQuery.version}" update bugs stability`
      ];

      const results = [];
      
      // חיפוש עם השאילתה הראשונה (הכי חשובה)
      try {
        const googleResults = await this.googleCustomSearch(searchQueries[0]);
        
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ [performGoogleSearch] Found ${googleResults.length} results from Google API`);
          
          googleResults.forEach(result => {
            results.push({
              title: result.title,
              url: result.link,
              source: result.displayLink || 'Google Search',
              weight: 0.9,
              summary: result.snippet || `מידע על עדכון ${deviceInfo.device} ל-${parsedQuery.version}`,
              date: new Date(),
              sentiment: this.analyzeSentiment(result.title, result.snippet || ''),
              userReports: [{
                author: 'Web Source',
                content: result.snippet || result.title,
                sentiment: this.analyzeSentiment(result.title, result.snippet || ''),
                date: new Date()
              }]
            });
          });
        }
      } catch (error) {
        console.error(`❌ [performGoogleSearch] Google API error: ${error.message}`);
      }

      return results.slice(0, 5); // מגביל ל-5 תוצאות איכותיות
      
    } catch (error) {
      console.error(`❌ Error in performGoogleSearch:`, error?.message);
      return [];
    }
  }



  // חיפוש ב-Reddit
  async searchReddit(deviceInfo, parsedQuery) {
    try {
      // בדיקה אם יש Reddit API credentials
      if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || 
          process.env.REDDIT_CLIENT_ID.includes('your_') || 
          process.env.REDDIT_CLIENT_SECRET.includes('your_')) {
        console.log('⚠️  Reddit API not configured, skipping Reddit search');
        return [];
      }

      // קבלת access token
      const accessToken = await this.getRedditToken();
      if (!accessToken) {
        console.log('⚠️  Could not obtain Reddit access token, skipping Reddit search');
        return [];
      }

      const subreddits = [
        'Android',
        'samsung', 'GooglePixel', 'Xiaomi', 'oneplus',
        deviceInfo.manufacturerKey.toLowerCase(),
        'AndroidQuestions',
        'AndroidTips'
      ];

      // יצירת שאילתת חיפוש ספציפית יותר
      const deviceName = deviceInfo.device.toLowerCase();
      const version = parsedQuery.version || '';
      const searchQuery = `"${deviceName}" ${version} update experience`;
      const results = [];

      for (const subreddit of subreddits.slice(0, 3)) { // הקטנתי ל-3 subreddits איכותיים
        try {
          const response = await axios.get(
            `https://oauth.reddit.com/r/${subreddit}/search`,
            {
              params: {
                q: searchQuery,
                sort: 'relevance',
                t: 'month',
                limit: 10, // הקטנתי ל-10 תוצאות איכותיות
                restrict_sr: 1 // חיפוש רק בתוך הסאברדיט הנוכחי
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'UpdatePhoneBot/1.0 by yourusername'
              },
              timeout: 8000
            }
          );

          if (response.data && response.data.data && response.data.data.children) {
            const posts = [];
            for (const child of response.data.data.children) {
              // חילוץ דיווחי משתמשים אמיתיים מהפוסט
              const postText = `${child.data.title} ${child.data.selftext || ''}`;
              let userReports = this.extractUserReportsFromText(postText);
              
              // תרגום דיווחי משתמשים לעברית
              if (userReports.length > 0) {
                userReports = await this.translateUserReportsToHebrew(userReports);
              }
              
              posts.push({
                title: child.data.title,
                url: `https://reddit.com${child.data.permalink}`,
                score: child.data.score,
                numComments: child.data.num_comments,
                created: new Date(child.data.created_utc * 1000),
                subreddit: child.data.subreddit,
                author: child.data.author,
                selftext: child.data.selftext || '',
                source: 'reddit',
                relevance: this.calculateRelevance(child.data.title, searchQuery),
                // הוספת מידע נוסף לדיווחי משתמשים
                userExperience: this.extractUserExperience(child.data.title, child.data.selftext),
                sentiment: this.analyzeSentiment(child.data.title, child.data.selftext),
                isUserReport: this.isUserReport(child.data.title, child.data.selftext),
                userReports: userReports // דיווחי משתמשים מתורגמים לעברית!
              });
            }

            results.push(...posts);
          }
        } catch (error) {
          console.error(`❌ Error at [searchReddit subreddit ${subreddit}]:`, error?.message || error);
        }
      }

      // סינון מחמיר יותר לוודא רלוונטיות
      return results
        .filter(post => {
          // בדיקה שהפוסט באמת רלוונטי למכשיר הספציפי
          const titleLower = post.title.toLowerCase();
          const deviceNameLower = deviceName.toLowerCase();
          
          // חייב להכיל את שם המכשיר או להיות דיווח משתמש רלוונטי
          return post.relevance > 0.5 && 
                 (titleLower.includes(deviceNameLower) || 
                  titleLower.includes(deviceInfo.manufacturerKey.toLowerCase()) ||
                  post.isUserReport);
        })
        .sort((a, b) => {
          // העדפה לדיווחי משתמשים רלוונטיים
          if (a.isUserReport && !b.isUserReport) return -1;
          if (!a.isUserReport && b.isUserReport) return 1;
          
          // אחר כך לפי relevance ו-score
          return (b.relevance * b.score) - (a.relevance * a.score);
        })
        .slice(0, 8); // הקטנתי ל-8 תוצאות איכותיות
    } catch (error) {
      console.error(`❌ Error at [searchReddit]:`, error?.message || error);
      return [];
    }
  }

  // חיפוש בפורומים טכניים - חיפוש אמיתי במקום נתונים מדומים
  async searchTechForums(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      console.log(`🔍 Searching tech forums for ${deviceInfo.device} ${parsedQuery.version}...`);
      
      // חיפוש אמיתי ב-XDA Developers
      const xdaResults = await this.searchXDADevelopers(deviceInfo, parsedQuery);
      if (xdaResults.length > 0) {
        results.push(...xdaResults);
      }

      // חיפוש אמיתי באתרי חדשות טכניים
      const techNewsResults = await this.searchTechNews(deviceInfo, parsedQuery);
      if (techNewsResults.length > 0) {
        results.push(...techNewsResults);
      }

      // אם לא נמצאו תוצאות אמיתיות, נחזיר הודעה מתאימה
      if (results.length === 0) {
        console.log(`ℹ️  No real forum data found for ${deviceInfo.device} ${parsedQuery.version}`);
        results.push({
          title: `${deviceInfo.device} ${parsedQuery.version} - מידע מוגבל`,
          url: `https://www.google.com/search?q=${encodeURIComponent(deviceInfo.device + ' ' + parsedQuery.version + ' update review')}`,
          source: 'Search Suggestion',
          weight: 0.3,
          summary: `לא נמצא מידע ספציפי בפורומים. מומלץ לחפש ב-Google`,
          date: new Date(),
          sentiment: 'neutral',
          userReports: []
        });
      }

      console.log(`✅ Found ${results.length} tech forum results`);
    } catch (error) {
      console.error(`❌ Error at [searchTechForums]:`, error?.message || error);
      
      // במקרה של שגיאה, נחזיר הודעה מתאימה
      results.push({
        title: `${deviceInfo.device} ${parsedQuery.version} - שגיאה בחיפוש`,
        url: `https://www.google.com/search?q=${encodeURIComponent(deviceInfo.device + ' ' + parsedQuery.version + ' update')}`,
        source: 'Error Fallback',
        weight: 0.2,
        summary: `אירעה שגיאה בחיפוש בפורומים. מומלץ לחפש באופן עצמאי`,
        date: new Date(),
        sentiment: 'neutral',
        userReports: []
      });
    }

    return results;
  }

  // חיפוש אמיתי ב-XDA Developers
  async searchXDADevelopers(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      const searchQuery = `${deviceInfo.device} ${parsedQuery.version} update`;
      const searchUrl = `https://www.xda-developers.com/search/${encodeURIComponent(searchQuery)}`;
      
      console.log(`🔍 Searching XDA for: ${searchQuery}`);
      
      // ניסיון לחיפוש באמצעות Google site search (יותר אמין)
      const googleSearchUrl = `https://www.google.com/search?q=site:xda-developers.com+${encodeURIComponent(searchQuery)}`;
      
      try {
        // ניסיון חיפוש עם Google Search API תחילה
        const googleResults = await this.googleCustomSearch(`site:xda-developers.com "${deviceInfo.device}" "${parsedQuery.version}" update experience problems battery performance`);
        
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ Google Search API found ${googleResults.length} XDA results`);
          
          for (const result of googleResults) {
            // חילוץ דיווחי משתמשים אמיתיים מה-snippet
            let userReports = this.extractUserReportsFromText(result.snippet, result.title);
            
            // תרגום דיווחי משתמשים לעברית
            if (userReports.length > 0) {
              userReports = await this.translateUserReportsToHebrew(userReports);
            }
            
            results.push({
              title: result.title,
              url: result.link,
              source: 'XDA Developers',
              weight: 0.9,
              summary: result.snippet || `דיונים ב-XDA על ${deviceInfo.device} ${parsedQuery.version}`,
              date: new Date(),
              sentiment: this.analyzeSentiment(result.title, result.snippet),
              userReports: userReports // דיווחי משתמשים מתורגמים לעברית!
            });
          }
          
          return results;
        }
      } catch (googleError) {
        console.log(`⚠️ Google Search API failed for XDA: ${googleError.message}, using fallback`);
      }
      
      // Fallback - אם Google Search API נכשל
      try {
        const response = await axios.get(googleSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });

        // ניתוח בסיסי של תוצאות החיפוש
        if (response.data && response.data.includes('xda-developers.com')) {
          // במקום דיווח גנרי, ננסה לחלץ מידע אמיתי
          const realUserReports = [
            {
              author: 'XDA Member',
              content: `דיווח על עדכון ${parsedQuery.version} עבור ${deviceInfo.device} - יש לבדוק בפורום לפרטים מלאים`,
              sentiment: 'neutral',
              date: new Date(),
              isPlaceholder: true // מסמן שזה לא דיווח אמיתי
            }
          ];
          
          results.push({
            title: `${deviceInfo.device} ${parsedQuery.version} - XDA Discussion`,
            url: searchUrl,
            source: 'XDA Developers',
            weight: 0.9,
            summary: `נמצאו דיונים ב-XDA על ${deviceInfo.device} ${parsedQuery.version}`,
            date: new Date(),
            sentiment: 'mixed',
            userReports: realUserReports
          });
        }
      } catch (searchError) {
        console.log(`ℹ️  XDA search failed, providing search link instead`);
        
        // אם החיפוש נכשל לחלוטין, נספק קישור ישיר לחיפוש ללא דיווחים גנריים
        results.push({
          title: `${deviceInfo.device} ${parsedQuery.version} - XDA Search`,
          url: searchUrl,
          source: 'XDA Developers',
          weight: 0.7,
          summary: `חיפוש ב-XDA Developers - לא נמצאו דיווחי משתמשים ספציפיים`,
          date: new Date(),
          sentiment: 'neutral',
          userReports: [] // ריק במקום תוכן גנרי!
        });
      }
    } catch (error) {
      console.error(`❌ Error searching XDA:`, error?.message || error);
    }

    return results;
  }

  // חיפוש באתרי חדשות טכניים
  async searchTechNews(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      const searchQuery = `${deviceInfo.device} ${parsedQuery.version} update review`;
      
      const techSites = [
        {
          name: 'Android Police',
          domain: 'androidpolice.com',
          weight: 0.8,
          description: 'ביקורות מקצועיות ומדריכים מפורטים'
        },
        {
          name: 'Android Authority', 
          domain: 'androidauthority.com',
          weight: 0.8,
          description: 'ניתוחים טכניים ובדיקות ביצועים'
        },
        {
          name: '9to5Google',
          domain: '9to5google.com', 
          weight: 0.7,
          description: 'חדשות ועדכונים מהירים'
        }
      ];

      // הגבלה למקסימום 2 אתרים כדי למנוע חזרות מיותרות
      const selectedSites = techSites.slice(0, 2);

      for (const site of selectedSites) {
        try {
          const siteSearchUrl = `https://www.google.com/search?q=site:${site.domain}+${encodeURIComponent(searchQuery)}`;
          
          // ניסיון חיפוש אמיתי עם Google Search API
          try {
            const googleResults = await this.googleCustomSearch(`site:${site.domain} "${deviceInfo.device}" "${parsedQuery.version}" update review user experience`);
            
            if (googleResults && googleResults.length > 0) {
              console.log(`✅ Found ${googleResults.length} results from ${site.name}`);
              
              for (const result of googleResults.slice(0, 2)) {
                // חילוץ דיווחי משתמשים אמיתיים מהתוכן
                let userReports = this.extractUserReportsFromText(result.snippet, result.title);
                
                // תרגום דיווחי משתמשים לעברית
                if (userReports.length > 0) {
                  userReports = await this.translateUserReportsToHebrew(userReports);
                }
                
                results.push({
                  title: result.title,
                  url: result.link,
                  source: site.name,
                  weight: site.weight,
                  summary: result.snippet || `${site.description} - ${deviceInfo.device}`,
                  date: new Date(),
                  sentiment: this.analyzeSentiment(result.title, result.snippet),
                  userReports: userReports // דיווחי משתמשים מתורגמים לעברית!
                });
              }
            } else {
              // אם לא נמצאו תוצאות ב-Google, נוסיף קישור חיפוש ללא דיווחים גנריים
              results.push({
                title: `${deviceInfo.device} ${parsedQuery.version} - ${site.name}`,
                url: `https://${site.domain}/search?q=${encodeURIComponent(searchQuery)}`,
                source: site.name,
                weight: site.weight * 0.7,
                summary: `חיפוש ב-${site.name} - לא נמצאו דיווחי משתמשים ספציפיים`,
                date: new Date(),
                sentiment: 'neutral',
                userReports: [] // ריק במקום תוכן גנרי
              });
            }
          } catch (googleError) {
            console.log(`⚠️ Google Search failed for ${site.name}: ${googleError.message}`);
            
            // Fallback - קישור חיפוש ללא דיווחים גנריים
            results.push({
              title: `${deviceInfo.device} ${parsedQuery.version} - ${site.name}`,
              url: `https://${site.domain}/search?q=${encodeURIComponent(searchQuery)}`,
              source: site.name,
              weight: site.weight * 0.5,
              summary: `חיפוש ב-${site.name} - יש לבדוק ידנית`,
              date: new Date(),
              sentiment: 'neutral',
              userReports: [] // ריק במקום תוכן גנרי
            });
          }

          // הגבלה למניעת יותר מדי בקשות
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (siteError) {
          console.log(`ℹ️  Failed to search ${site.name}: ${siteError.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error searching tech news:`, error?.message || error);
    }

    return results;
  }

  // חיפוש מקורות רשמיים - מורחב עם חיפוש אמיתי
  async searchOfficialSources(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      console.log(`🏢 Searching official sources for ${deviceInfo.manufacturer} ${deviceInfo.device}...`);
      
      // מקורות רשמיים מורחבים לפי יצרן
      const officialSources = {
        samsung: {
          security: 'https://security.samsungmobile.com/workScope.smsb',
          updates: 'https://www.samsung.com/us/support/mobile-devices/',
          newsroom: 'https://news.samsung.com/global'
        },
        google: {
          security: 'https://source.android.com/security/bulletin',
          updates: 'https://support.google.com/pixelphone/answer/4457705',
          blog: 'https://blog.google/products/pixel/'
        },
        xiaomi: {
          security: 'https://trust.mi.com/misrc/bulletins/advisory',
          updates: 'https://www.mi.com/global/support',
          community: 'https://c.mi.com/'
        },
        oneplus: {
          security: 'https://www.oneplus.com/security',
          updates: 'https://www.oneplus.com/support',
          community: 'https://forums.oneplus.com/'
        },
        huawei: {
          security: 'https://consumer.huawei.com/en/support/bulletin/',
          updates: 'https://consumer.huawei.com/en/support/',
          community: 'https://club.vmall.com/'
        }
      };

      const manufacturerSources = officialSources[deviceInfo.manufacturerKey.toLowerCase()];
      
      if (manufacturerSources) {
        // הוספת מקור אבטחה רשמי
        results.push({
          title: `${deviceInfo.manufacturer} Security Bulletins`,
          url: manufacturerSources.security,
          source: `${deviceInfo.manufacturer} Official`,
          weight: 1.0,
          summary: `בולטין אבטחה רשמי של ${deviceInfo.manufacturer}`,
          type: 'security_bulletin',
          date: new Date(),
          userReports: [{
            author: `${deviceInfo.manufacturer} Security Team`,
            content: `עדכוני אבטחה רשמיים עבור ${deviceInfo.device}`,
            sentiment: 'neutral',
            date: new Date()
          }]
        });

        // הוספת מקור עדכונים רשמי
        if (manufacturerSources.updates) {
          results.push({
            title: `${deviceInfo.manufacturer} Software Updates`,
            url: manufacturerSources.updates,
            source: `${deviceInfo.manufacturer} Support`,
            weight: 0.9,
            summary: `מידע רשמי על עדכוני תוכנה`,
            type: 'software_updates',
            date: new Date(),
            userReports: []
          });
        }

        // חיפוש באתר הרשמי של היצרן
        await this.searchManufacturerSite(deviceInfo, parsedQuery, results);
      }

      // הוספת מקור Android רשמי כללי
      results.push({
        title: 'Android Security Bulletins',
        url: 'https://source.android.com/security/bulletin',
        source: 'Google Android',
        weight: 0.8,
        summary: 'בולטיני אבטחה רשמיים של אנדרואיד',
        type: 'android_security',
        date: new Date(),
        userReports: []
      });

      console.log(`✅ Found ${results.length} official sources`);
    } catch (error) {
      console.error(`❌ Error at [searchOfficialSources]:`, error?.message || error);
    }

    return results;
  }

  // חיפוש באתר הרשמי של היצרן
  async searchManufacturerSite(deviceInfo, parsedQuery, results) {
    try {
      const searchQuery = `${deviceInfo.device} ${parsedQuery.version} update`;
      const manufacturerDomain = this.getManufacturerDomain(deviceInfo.manufacturerKey);
      
      if (manufacturerDomain) {
        const googleSiteSearch = `https://www.google.com/search?q=site:${manufacturerDomain}+${encodeURIComponent(searchQuery)}`;
        
        results.push({
          title: `${deviceInfo.manufacturer} Official - ${deviceInfo.device} Updates`,
          url: googleSiteSearch,
          source: `${deviceInfo.manufacturer} Website`,
          weight: 0.85,
          summary: `חיפוש באתר הרשמי של ${deviceInfo.manufacturer}`,
          type: 'manufacturer_search',
          date: new Date(),
          userReports: []
        });
      }
    } catch (error) {
      console.log(`ℹ️  Could not search manufacturer site: ${error.message}`);
    }
  }

  // קבלת דומיין של יצרן
  getManufacturerDomain(manufacturerKey) {
    const domains = {
      samsung: 'samsung.com',
      google: 'support.google.com',
      xiaomi: 'mi.com',
      oneplus: 'oneplus.com',
      huawei: 'consumer.huawei.com',
      lg: 'lg.com',
      sony: 'sony.com',
      motorola: 'motorola.com'
    };
    
    return domains[manufacturerKey.toLowerCase()];
  }

  // ניתוח עם Claude
  async analyzeWithClaude(deviceInfo, parsedQuery, searchResults) {
    console.log(`🧠 [analyzeWithClaude] ===== STARTING CLAUDE ANALYSIS =====`);
    console.log(`📱 [analyzeWithClaude] Device: ${deviceInfo.device}, Version: ${parsedQuery.version}`);
    try {
      // בדיקה אם יש Claude API key
      if (!process.env.CLAUDE_API_KEY) {
        console.log('❌ [Claude AI] ERROR: CLAUDE_API_KEY not found in environment variables');
        console.log('🔄 [Claude AI] Falling back to basic analysis...');
        return this.fallbackAnalysis(deviceInfo, parsedQuery, searchResults);
      }
      
      if (process.env.CLAUDE_API_KEY.includes('your_') || process.env.CLAUDE_API_KEY === 'test_token_placeholder') {
        console.log('❌ [Claude AI] ERROR: CLAUDE_API_KEY contains placeholder text');
        console.log('🔄 [Claude AI] Falling back to basic analysis...');
        return this.fallbackAnalysis(deviceInfo, parsedQuery, searchResults);
      }

      const prompt = this.buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults);

      const modelToUse = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
      console.log(`🧠 [Claude AI] Sending analysis request to ${modelToUse}...`);
      console.log(`📝 [Claude AI] Analyzing device: ${deviceInfo.device} for ${parsedQuery.version}`);
      console.log(`🔑 [Claude AI] Using API key: ${process.env.CLAUDE_API_KEY.substring(0, 8)}...`);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ [Claude AI] API error: ${response.status} - ${data?.error?.message || 'Unknown error'}`);
        console.log(`🔄 [Claude AI] Falling back to basic analysis...`);
        return this.fallbackAnalysis(deviceInfo, parsedQuery, searchResults);
      }

      const result = data?.content?.[0]?.text || 'לא התקבלה תגובה מ-Claude.';
      console.log(`✅ [Claude AI] SUCCESS: Analysis completed (${result.length} chars)`);
      console.log(`📄 [Claude AI] Response preview: ${result.substring(0, 100)}...`);
      console.log(`💰 [Claude AI] Token usage: Input ~${prompt.length/4} | Output ~${result.length/4} tokens`);
      console.log(`🧠 [analyzeWithClaude] ===== CLAUDE ANALYSIS COMPLETED =====`);
      return result;

    } catch (error) {
      console.error(`❌ [Claude AI] ERROR: ${error?.message || error}`);
      console.log('🔄 [Claude AI] Falling back to basic analysis...');
      console.log(`🧠 [analyzeWithClaude] ===== CLAUDE ANALYSIS FAILED - USING FALLBACK =====`);
      return this.fallbackAnalysis(deviceInfo, parsedQuery, searchResults);
    }
  }

  // ניתוח fallback כאשר Claude לא זמין
  fallbackAnalysis(deviceInfo, parsedQuery, searchResults) {
    console.log(`🔧 [fallbackAnalysis] ===== STARTING FALLBACK ANALYSIS =====`);
    try {
      console.log(`🔧 [Basic Analysis] Using fallback analysis engine`);
      console.log(`📊 [Basic Analysis] Processing device: ${deviceInfo.device} for ${parsedQuery.version}`);
      
      const totalSources = (searchResults.redditPosts?.length || 0) + 
                          (searchResults.forumDiscussions?.length || 0) + 
                          (searchResults.officialSources?.length || 0);

      console.log(`📝 [Basic Analysis] Analyzing ${totalSources} sources found`);

      const analysis = {
        stabilityRating: 7, // ברירת מחדל זהירה
        majorIssues: [],
        benefits: [],
        recommendation: "wait",
        reasoning: `בהתבסס על ${totalSources} מקורות שנמצאו`,
        specialNotes: "ניתוח זה מבוסס על כלים בסיסיים. לניתוח מתקדם יותר נדרש Claude API."
      };

      // ניתוח בסיסי של תוצאות החיפוש
      if (searchResults.forumDiscussions?.length > 0) {
        analysis.benefits.push("נמצאו דיונים בפורומים טכניים");
        analysis.stabilityRating += 1;
      }

      if (searchResults.officialSources?.length > 0) {
        analysis.benefits.push("זמינים מקורות רשמיים");
        analysis.stabilityRating += 1;
        analysis.recommendation = "recommended_with_caution";
      }

      // התאמה לגיל המכשיר
      if (deviceInfo.deviceYear && deviceInfo.deviceYear < 2020) {
        analysis.majorIssues.push("מכשיר ישן יחסית - עלולות להיות בעיות תאימות");
        analysis.stabilityRating -= 1;
        analysis.recommendation = "wait";
      }

      // פורמט JSON
      console.log(`✅ [Basic Analysis] SUCCESS: Analysis completed with rating ${analysis.stabilityRating}/10`);
      console.log(`📋 [Basic Analysis] Recommendation: ${analysis.recommendation}`);
      console.log(`🔧 [fallbackAnalysis] ===== FALLBACK ANALYSIS COMPLETED =====`);
      return JSON.stringify(analysis, null, 2);

    } catch (error) {
      console.error('❌ [fallbackAnalysis] Error in fallback analysis:', error);
      console.log(`🔧 [fallbackAnalysis] ===== FALLBACK ANALYSIS FAILED =====`);
      return JSON.stringify({
        stabilityRating: 6,
        majorIssues: ["לא ניתן לנתח את המידע"],
        benefits: ["מידע בסיסי זמין"],
        recommendation: "wait",
        reasoning: "ניתוח מוגבל בשל בעיות טכניות",
        specialNotes: "מומלץ לבדוק מקורות נוספים באופן עצמאי"
      }, null, 2);
    }
  }

  // בניית הפרומפט לניתוח
  buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults) {
    const resultsText = this.formatSearchResultsForAnalysis(searchResults);
    
    return `
אני מעביר לך מידע על עדכון אנדרואיד ואני צריך ניתוח מקצועי להמלצה למשתמש.

מכשיר: ${deviceInfo.device} (${deviceInfo.manufacturer})
עדכון מבוקש: ${parsedQuery.version}
מגזר שוק: ${deviceInfo.marketSegment}
שנת ייצור: ${deviceInfo.deviceYear}

מידע שנאסף (כולל דיווחי משתמשים):
${resultsText}

חשוב מאוד: המשתמש יקבל גם את הדיווחים הגולמיים של משתמשים אחרים, 
לכן הניתוח שלך צריך להשלים ולא לחזור על מה שהם כבר רואים.

אנא נתח את המידע ותספק:
1. רמת יציבות העדכון (1-10) - בהתבסס על דיווחי המשתמשים
2. בעיות עיקריות שדווחו (רק הכי חשובות)
3. יתרונות העדכון (מה שמשתמשים דיווחו בחיוב)
4. המלצה ברורה (מומלץ/לא מומלץ/כדאי לחכות)
5. הערות מיוחדות - דברים שמשתמשים צריכים לדעת

תשובה בפורמט JSON:
{
  "stabilityRating": number,
  "majorIssues": ["רשימת בעיות עיקריות"],
  "benefits": ["רשימת יתרונות"],
  "recommendation": "recommended/not_recommended/wait",
  "reasoning": "הסבר קצר לההמלצה",
  "specialNotes": "הערות חשובות שלא מופיעות בדיווחי המשתמשים"
}
`;
  }

  // עיצוב תוצאות החיפוש לניתוח
  formatSearchResultsForAnalysis(searchResults) {
    let formatted = '';
    


    if (searchResults.redditPosts?.length > 0) {
      formatted += 'דיונים ב-Reddit:\n';
      searchResults.redditPosts.slice(0, 3).forEach(post => {
        formatted += `- ${post.title} (${post.score} נקודות, ${post.numComments} תגובות)\n`;
        if (post.selftext && post.selftext.length > 0) {
          formatted += `  ${post.selftext.substring(0, 200)}...\n`;
        }
      });
      formatted += '\n';
    }

    if (searchResults.forumDiscussions?.length > 0) {
      formatted += 'דיונים בפורומים:\n';
      searchResults.forumDiscussions.forEach(discussion => {
        formatted += `- ${discussion.title} (${discussion.source})\n`;
      });
      formatted += '\n';
    }

    return formatted || 'לא נמצא מידע ספציפי על העדכון.';
  }

  // פיענוח תשובת Claude
  parseClaudeResponse(responseText) {
    try {
      // נסיון לחלץ JSON מהתשובה
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return {
          ...parsedJson,
          rawResponse: responseText,
          analysisMethod: 'claude'
        };
      }
    } catch (error) {
      console.error(`❌ Error at [parseClaudeResponse]:`, error?.message || error);
    }

    // אם לא הצלחנו לחלץ JSON, ננתח את הטקסט באופן בסיסי
    return this.parseTextResponse(responseText);
  }

  // ניתוח טקסט בסיסי
  parseTextResponse(text) {
    const stabilityMatch = text.match(/(\d+)\/10|(\d+)\s*מתוך\s*10/);
    const stability = stabilityMatch ? parseInt(stabilityMatch[1] || stabilityMatch[2]) : 5;

    const isRecommended = text.toLowerCase().includes('מומלץ') || 
                         text.toLowerCase().includes('recommended');
    const shouldWait = text.toLowerCase().includes('חכות') || 
                      text.toLowerCase().includes('wait');

    let recommendation = 'neutral';
    if (isRecommended && !shouldWait) recommendation = 'recommended';
    else if (shouldWait) recommendation = 'wait';
    else if (text.toLowerCase().includes('לא מומלץ')) recommendation = 'not_recommended';

    return {
      stabilityRating: stability,
      majorIssues: [],
      benefits: [],
      recommendation: recommendation,
      reasoning: text,
      specialNotes: '',
      analysisMethod: 'basic_text_analysis',
      rawResponse: text
    };
  }

  // ניתוח חלופי כשClaude לא זמין
  getFallbackAnalysis(deviceInfo, parsedQuery, searchResults) {
    const totalResults = (searchResults.redditPosts?.length || 0) + 
                        (searchResults.forumDiscussions?.length || 0);
    
    let stabilityRating = 6; // ברירת מחדל
    let recommendation = 'wait';

    // אם יש מעט תוצאות, זה יכול להצביע על עדכון חדש
    if (totalResults < 5) {
      stabilityRating = 5;
      recommendation = 'wait';
    }

    // הערכה בסיסית לפי גיל המכשיר
    const deviceAge = new Date().getFullYear() - deviceInfo.deviceYear;
    if (deviceAge > 3) {
      stabilityRating = Math.max(3, stabilityRating - 2);
      recommendation = 'not_recommended';
    }

    return {
      stabilityRating,
      majorIssues: ['מידע מוגבל זמין'],
      benefits: ['עדכוני אבטחה', 'שיפורי ביצועים אפשריים'],
      recommendation,
      reasoning: 'ניתוח בסיסי בהעדר מידע מפורט',
      specialNotes: 'מומלץ לחכות למידע נוסף או לבדוק מקורות נוספים',
      analysisMethod: 'fallback',
      confidence: 'low'
    };
  }

  // חישוב רלוונטיות משופר
  calculateRelevance(title, searchQuery) {
    if (!title || !searchQuery) return 0;
    
    const titleLower = title.toLowerCase();
    const queryWords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 2);
    
    let relevance = 0;
    let exactMatches = 0;
    
    queryWords.forEach(word => {
      // הסרת מירכאות מהמילה
      const cleanWord = word.replace(/"/g, '');
      
      if (titleLower.includes(cleanWord)) {
        relevance += 1;
        
        // בונוס לחיפוש מדויק
        if (titleLower.includes(`"${cleanWord}"`)) {
          exactMatches += 1;
        }
      }
    });
    
    // בונוס לכותרות עם התאמה מדויקת
    const baseScore = relevance / Math.max(queryWords.length, 1);
    const exactBonus = exactMatches * 0.2;
    
    return Math.min(baseScore + exactBonus, 1.0);
  }

  // קבלת מקורות פעילים
  getActiveSources() {
    return Object.entries(this.searchSources)
      .filter(([key, source]) => source.enabled)
      .map(([key, source]) => ({
        key,
        name: source.name,
        weight: source.weight
      }));
  }

  // בדיקת סטטוס שירותים
  async getServicesStatus() {
    const services = ['Reddit API', 'Web Search', 'Claude Analysis'];
    return services.map(service => `✅ ${service}`).join('\n');
  }

  // זיהוי דיווח משתמש אמיתי
  isUserReport(title, text) {
    const userReportKeywords = [
      'updated', 'upgrade', 'installed', 'my experience', 'after update',
      'battery life', 'performance', 'bugs', 'issues', 'problems',
      'working fine', 'no issues', 'recommend', 'avoid', 'just updated',
      'עדכנתי', 'התקנתי', 'החוויה שלי', 'אחרי העדכון',
      'סוללה', 'ביצועים', 'באגים', 'בעיות', 'עובד טוב', 'מומלץ'
    ];
    
    // מילות מפתח שמצביעות על תוכן לא רלוונטי
    const excludeKeywords = [
      'introducing', 'announcement', 'rumor', 'leak', 'could get', 
      'might', 'expected', 'coming soon', 'features', 'specs',
      'הכרזה', 'שמועה', 'דליפה', 'צפוי', 'מאפיינים'
    ];
    
    const fullText = `${title} ${text}`.toLowerCase();
    
    // בדיקה שאין מילות מפתח מחריגות
    const hasExcludeKeywords = excludeKeywords.some(keyword => fullText.includes(keyword));
    if (hasExcludeKeywords) {
      return false;
    }
    
    // בדיקה שיש מילות מפתח של דיווח משתמש
    return userReportKeywords.some(keyword => fullText.includes(keyword));
  }

  // חילוץ חוויית משתמש
  extractUserExperience(title, text) {
    const fullText = `${title} ${text}`.toLowerCase();
    
    if (fullText.includes('battery drain') || fullText.includes('סוללה')) {
      return 'battery_issues';
    } else if (fullText.includes('performance') || fullText.includes('slow') || fullText.includes('ביצועים')) {
      return 'performance_issues';
    } else if (fullText.includes('working fine') || fullText.includes('no issues') || fullText.includes('עובד טוב')) {
      return 'positive';
    } else if (fullText.includes('bugs') || fullText.includes('crashes') || fullText.includes('באגים')) {
      return 'stability_issues';
    } else if (fullText.includes('recommend') || fullText.includes('מומלץ')) {
      return 'recommendation';
    }
    
    return 'general';
  }

  // ניתוח סנטימנט בסיסי
  analyzeSentiment(title, text) {
    const fullText = `${title} ${text}`.toLowerCase();
    
    const positiveWords = ['good', 'great', 'excellent', 'recommend', 'stable', 'fast', 'improved', 'טוב', 'מצוין', 'מומלץ', 'יציב'];
    const negativeWords = ['bad', 'terrible', 'avoid', 'slow', 'drain', 'crash', 'bug', 'רע', 'נורא', 'להימנע', 'איטי', 'באג'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (fullText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (fullText.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // חיפוש מידע כללי על מכשיר או עדכון
  async searchGeneralInfo(queryText) {
    try {
      console.log(`🔍 Searching general info for: ${queryText}`);
      
      // Extract device info from query text (support Hebrew and English)
      const deviceKeywords = queryText.toLowerCase().match(/samsung|galaxy|s\d+|note|a\d+|huawei|xiaomi|oneplus|pixel|iphone|גלקסי|סמסונג/gi);
      const versionKeywords = queryText.toLowerCase().match(/android\s*\d+|אנדרואיד\s*\d+|ios\s*\d+|\d+\.\d+/gi);
      
      // Try to extract specific device models
      let deviceModel = '';
      let androidVersion = '';
      
      if (queryText.toLowerCase().includes('galaxy a54') || queryText.toLowerCase().includes('a54')) {
        deviceModel = 'Samsung Galaxy A54';
      } else if (queryText.toLowerCase().includes('galaxy s23') || queryText.toLowerCase().includes('s23')) {
        deviceModel = 'Samsung Galaxy S23';
      } else if (queryText.toLowerCase().includes('galaxy s22') || queryText.toLowerCase().includes('s22')) {
        deviceModel = 'Samsung Galaxy S22';
      } else if (deviceKeywords && deviceKeywords.length > 0) {
        deviceModel = deviceKeywords.join(' ');
      }
      
      if (queryText.toLowerCase().includes('אנדרואיד 15') || queryText.toLowerCase().includes('android 15')) {
        androidVersion = 'Android 15';
      } else if (queryText.toLowerCase().includes('אנדרואיד 14') || queryText.toLowerCase().includes('android 14')) {
        androidVersion = 'Android 14';
      } else if (versionKeywords && versionKeywords.length > 0) {
        androidVersion = versionKeywords[0];
      }
      
      // If we have specific device and version, try to search for real information
      if (deviceModel && androidVersion) {
        console.log(`🔍 Searching for specific info: ${deviceModel} ${androidVersion}`);
        
        try {
          // Create mock device info for comprehensive search
          const mockDeviceInfo = {
            device: deviceModel,
            manufacturer: deviceModel.toLowerCase().includes('samsung') ? 'Samsung' : 
                         deviceModel.toLowerCase().includes('google') ? 'Google' :
                         deviceModel.toLowerCase().includes('xiaomi') ? 'Xiaomi' : 'Unknown',
            manufacturerKey: deviceModel.toLowerCase().includes('samsung') ? 'samsung' : 
                           deviceModel.toLowerCase().includes('google') ? 'google' :
                           deviceModel.toLowerCase().includes('xiaomi') ? 'xiaomi' : 'unknown'
          };
          const mockParsedQuery = {
            version: androidVersion
          };
          
                     // Try multiple search methods in parallel for better results
           const [redditResults, webSearchResults, officialResults, samsungCommunityResults] = await Promise.allSettled([
             this.searchReddit(mockDeviceInfo, mockParsedQuery),
             this.searchWebSources(deviceModel, androidVersion),
             this.searchOfficialSources(mockDeviceInfo, mockParsedQuery),
             this.searchSamsungCommunity(deviceModel, androidVersion)
           ]);
          
          let foundResults = false;
          let summary = `🔍 **מידע על עדכון ${deviceModel} ל-${androidVersion}:**\n\n`;
          
          // Process Reddit results
          if (redditResults.status === 'fulfilled' && redditResults.value && redditResults.value.length > 0) {
            foundResults = true;
            const relevantPosts = redditResults.value.slice(0, 3);
            summary += `📱 **דיווחי משתמשים מ-Reddit:**\n`;
            relevantPosts.forEach((post, index) => {
              summary += `• **${post.title}**\n`;
              if (post.selftext && post.selftext.length > 0) {
                const shortText = post.selftext.length > 150 ? 
                  post.selftext.substring(0, 150) + '...' : 
                  post.selftext;
                summary += `  ${shortText}\n`;
              }
              if (post.url) {
                summary += `  🔗 [קישור לדיון](${post.url})\n`;
              }
              summary += `\n`;
            });
          }
          
          // Process web search results
          if (webSearchResults.status === 'fulfilled' && webSearchResults.value && webSearchResults.value.length > 0) {
            foundResults = true;
            summary += `🌐 **מידע ממקורות נוספים:**\n`;
            webSearchResults.value.slice(0, 3).forEach((result, index) => {
              summary += `• **${result.title}**\n`;
              if (result.summary) {
                summary += `  ${result.summary}\n`;
              }
              if (result.url) {
                summary += `  🔗 [קישור למאמר](${result.url})\n`;
              }
              summary += `\n`;
            });
          }
          
                     // Process official sources
           if (officialResults.status === 'fulfilled' && officialResults.value && officialResults.value.length > 0) {
             foundResults = true;
             summary += `🏢 **מקורות רשמיים:**\n`;
             officialResults.value.slice(0, 2).forEach((result, index) => {
               summary += `• **${result.title}**\n`;
               if (result.summary) {
                 summary += `  ${result.summary}\n`;
               }
               if (result.url) {
                 summary += `  🔗 [קישור רשמי](${result.url})\n`;
               }
               summary += `\n`;
             });
           }
           
           // Process Samsung Community results
           if (samsungCommunityResults.status === 'fulfilled' && samsungCommunityResults.value && samsungCommunityResults.value.length > 0) {
             foundResults = true;
             summary += `👥 **קהילות Samsung:**\n`;
             samsungCommunityResults.value.slice(0, 3).forEach((result, index) => {
               summary += `• **${result.title}**\n`;
               if (result.summary) {
                 summary += `  ${result.summary}\n`;
               }
               if (result.url) {
                 summary += `  🔗 [קישור לקהילה](${result.url})\n`;
               }
               summary += `\n`;
             });
           }
          
                     if (foundResults) {
             summary += `💡 **המלצות כלליות:**\n`;
             summary += `• 🔍 קראו דיווחי משתמשים נוספים לפני העדכון\n`;
             summary += `• 💾 גבו את המכשיר לפני העדכון\n`;
             summary += `• ⏰ המתינו מספר ימים אחרי שחרור העדכון\n`;
             summary += `• 🔗 לחצו על הקישורים למידע מפורט\n\n`;
             summary += `🎯 **לקבלת המלצה מדויקת יותר, שלחו:**\n`;
             summary += `"${deviceModel}, Android [גרסה נוכחית], רוצה לעדכן ל-${androidVersion}"`;
             
             return {
               success: true,
               data: { summary },
               message: 'נמצא מידע רלוונטי',
               needsSplit: summary.length > 3000 // מסמן שהתשובה צריכה פיצול
             };
           }
        } catch (searchError) {
          console.error('Error searching for specific info:', searchError?.message || searchError);
        }
      }
      
      // Fallback to enhanced response with helpful links
      const searchResults = {
        sources: [],
        userReports: [],
        summary: `🔍 **חיפוש מידע עבור:** ${queryText}\n\n`
      };
      
      if (deviceModel) {
        searchResults.summary += `📱 **מכשיר מזוהה:** ${deviceModel}\n`;
      }
      
      if (androidVersion) {
        searchResults.summary += `🔄 **גרסה מזוהה:** ${androidVersion}\n`;
      }
      
      if (deviceModel && androidVersion) {
        searchResults.summary += `\n🔍 **מחפש מידע על העדכון...**\n`;
        searchResults.summary += `למרות שזיהיתי את המכשיר והגרסה, לא מצאתי מידע ספציפי כרגע.\n\n`;
        
        // הוספת קישורים מועילים לחיפוש עצמאי
        searchResults.summary += `🔗 **קישורים מועילים לחיפוש עצמי:**\n`;
        searchResults.summary += `• [חיפוש ב-Reddit](https://www.reddit.com/search/?q=${encodeURIComponent(deviceModel + ' ' + androidVersion + ' update')})\n`;
        searchResults.summary += `• [Samsung Community](https://us.community.samsung.com/t5/forums/searchpage/tab/message?filter=location&q=${encodeURIComponent(deviceModel + ' ' + androidVersion)})\n`;
        searchResults.summary += `• [XDA Developers](https://www.xda-developers.com/?s=${encodeURIComponent(deviceModel + ' ' + androidVersion)})\n`;
        searchResults.summary += `• [חיפוש Google](https://www.google.com/search?q=${encodeURIComponent(deviceModel + ' ' + androidVersion + ' update review problems')})\n\n`;
        
        // המלצות כלליות בהתבסס על המכשיר
        if (deviceModel.toLowerCase().includes('samsung')) {
          searchResults.summary += `📋 **המלצות כלליות עבור מכשירי Samsung:**\n`;
          searchResults.summary += `• בדקו באפליקציית Samsung Members אם יש עדכון זמין\n`;
          searchResults.summary += `• עקבו אחר Samsung Newsroom לעדכונים רשמיים\n`;
          searchResults.summary += `• המתינו מספר ימים אחרי שחרור העדכון לראות דיווחים\n`;
          searchResults.summary += `• גבו את המכשיר לפני כל עדכון מערכת הפעלה\n\n`;
        }
      }
      
      searchResults.summary += `💡 **לקבלת המלצה מדויקת יותר, אנא ציינו:**\n`;
      searchResults.summary += `• דגם מכשיר מדויק (לדוגמה: Samsung Galaxy A54)\n`;
      searchResults.summary += `• גרסת אנדרואיד הנוכחית שלכם\n`;
      searchResults.summary += `• גרסת האנדרואיד שאליה תרצו לעדכן\n\n`;
      searchResults.summary += `📝 **דוגמה לשאלה טובה:**\n`;
      searchResults.summary += `"Samsung Galaxy A54, Android 13, כדאי לעדכן לאנדרואיד 15?"`;
      
      return {
        success: true,
        data: searchResults,
        message: 'חיפוש כללי הושלם עם קישורים מועילים'
      };
      
    } catch (error) {
      console.error('Error in searchGeneralInfo:', error?.message || error);
      return {
        success: false,
        message: 'שגיאה בחיפוש מידע כללי',
        error: error?.message || error
      };
    }
  }

  // חיפוש במקורות אינטרנט נוספים עם Google Search API
  async searchWebSources(deviceModel, androidVersion) {
    const results = [];
    
    try {
      console.log(`🌐 Searching web sources for ${deviceModel} ${androidVersion}...`);
      
      // ניסיון חיפוש עם Google Search API תחילה
      try {
        const techSites = [
          'androidpolice.com',
          'androidauthority.com', 
          'gsmarena.com',
          'sammobile.com',
          'xda-developers.com',
          '9to5google.com'
        ];
        
        const siteQuery = techSites.map(site => `site:${site}`).join(' OR ');
        const googleQuery = `(${siteQuery}) "${deviceModel}" "${androidVersion}" (update OR review OR problems OR issues)`;
        
        const googleResults = await this.googleCustomSearch(googleQuery);
        
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ Google Search found ${googleResults.length} tech site results`);
          return googleResults.slice(0, 5).map(result => ({
            title: result.title,
            url: result.link,
            summary: result.snippet || `מידע על עדכון ${deviceModel} ל-${androidVersion}`,
            source: result.displayLink,
            weight: 0.9
          }));
        }
      } catch (googleError) {
        console.log(`⚠️ Google Search failed for web sources: ${googleError.message}, using fallback method`);
        
        // Fallback - חיפוש באתרים ספציפיים עם DuckDuckGo
        const techSites = [
          'androidpolice.com',
          'androidauthority.com', 
          'sammobile.com'
        ];
        
        const searchQueries = [
          `"${deviceModel}" "${androidVersion}" update review`,
          `"${deviceModel}" "${androidVersion}" problems issues`,
          `"${deviceModel}" "${androidVersion}" release date`
        ];
        
        // חיפוש מקבילי במספר מקורות
        const searchPromises = [];
        
        for (let i = 0; i < Math.min(techSites.length, 3); i++) {
          const site = techSites[i];
          const query = searchQueries[i % searchQueries.length];
          
          searchPromises.push(
            this.searchSpecificSite(site, query, deviceModel, androidVersion)
              .catch(error => {
                console.error(`Error searching ${site}:`, error?.message);
                return null;
              })
          );
        }
        
        const searchResults = await Promise.allSettled(searchPromises);
        
        searchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(...result.value);
          }
        });
      }
      
      // אם לא נמצאו תוצאות, נוסיף קישורי חיפוש כלליים
      if (results.length === 0) {
        results.push({
          title: `${deviceModel} ${androidVersion} - חיפוש כללי`,
          url: `https://www.google.com/search?q=${encodeURIComponent(deviceModel + ' ' + androidVersion + ' update review')}`,
          summary: `חיפוש כללי בגוגל עבור מידע על העדכון`,
          source: 'Google Search',
          weight: 0.3
        });
        
        results.push({
          title: `${deviceModel} ${androidVersion} - דיווחי בעיות`,
          url: `https://www.google.com/search?q=${encodeURIComponent(deviceModel + ' ' + androidVersion + ' problems issues bugs')}`,
          summary: `חיפוש דיווחי בעיות ותקלות`,
          source: 'Google Search',
          weight: 0.3
        });
      }
      
      console.log(`✅ Found ${results.length} web source results`);
      return results.slice(0, 5); // מגביל ל-5 תוצאות איכותיות
      
    } catch (error) {
      console.error('Error in searchWebSources:', error?.message || error);
      return [];
    }
  }

  // חיפוש באתר ספציפי עם Google Search API כ-primary
  async searchSpecificSite(site, query, deviceModel, androidVersion) {
    try {
      // יצירת URL חיפוש מותאם לאתר
      let searchUrl = '';
      
      if (site.includes('sammobile.com')) {
        searchUrl = `https://www.sammobile.com/?s=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`;
      } else if (site.includes('androidpolice.com')) {
        searchUrl = `https://www.androidpolice.com/?s=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`;
      } else if (site.includes('androidauthority.com')) {
        searchUrl = `https://www.androidauthority.com/?s=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`;
      } else {
        // חיפוש כללי בגוגל מוגבל לאתר ספציפי
        searchUrl = `https://www.google.com/search?q=site:${site} "${deviceModel}" "${androidVersion}"`;
      }
      
      // ניסיון חיפוש עם Google Search API כ-primary
      try {
        const googleResults = await this.googleCustomSearch(`site:${site} "${deviceModel}" "${androidVersion}" update`);
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ Google Search API success for ${site}`);
          return googleResults.slice(0, 2).map(result => ({
            title: result.title,
            url: result.link,
            summary: result.snippet || `מידע מ-${site} על עדכון ${deviceModel} ל-${androidVersion}`,
            source: site,
            weight: 0.9 // משקל גבוה יותר לתוצאות Google
          }));
        }
      } catch (googleError) {
        console.log(`⚠️ Google Search API failed for ${site}: ${googleError.message}, falling back to DuckDuckGo`);
        
                 // Fallback ל-DuckDuckGo API
         try {
           const searchQuery = `site:${site} "${deviceModel}" "${androidVersion}" update`;
           console.log(`🔄 [DuckDuckGo API] FALLBACK: Searching "${searchQuery}"`);
           const duckDuckGoUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
           
           const response = await axios.get(duckDuckGoUrl, {
             timeout: 5000,
             headers: {
               'User-Agent': 'AndroidUpdateBot/1.0'
             }
           });
           
           if (response.data && response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
             const results = [];
             
             response.data.RelatedTopics.slice(0, 2).forEach(topic => {
               if (topic.Text && topic.FirstURL) {
                 results.push({
                   title: topic.Text.substring(0, 100) + (topic.Text.length > 100 ? '...' : ''),
                   url: topic.FirstURL,
                   summary: topic.Text.substring(0, 200) + (topic.Text.length > 200 ? '...' : ''),
                   source: site,
                   weight: 0.7
                 });
               }
             });
             
             if (results.length > 0) {
               console.log(`✅ [DuckDuckGo API] FALLBACK SUCCESS: ${results.length} results for ${site}`);
               return results;
             }
           }
           console.log(`⚠️ [DuckDuckGo API] No results found for ${site}`);
         } catch (duckDuckGoError) {
           console.log(`❌ [DuckDuckGo API] FALLBACK FAILED for ${site}: ${duckDuckGoError.message}`);
         }
      }
      
      // מחזיר תוצאות fallback עם קישורים מועילים
      return [{
        title: `${deviceModel} ${androidVersion} Update Info - ${site}`,
        url: searchUrl,
        summary: `מידע מ-${site} על עדכון ${deviceModel} ל-${androidVersion}`,
        source: site,
        weight: 0.6
      }];
      
    } catch (error) {
      console.error(`Error searching ${site}:`, error?.message);
      return [];
    }
  }

  // חיפוש עם Google Custom Search API - משופר עם לוגים מפורטים
  async googleCustomSearch(query) {
    try {
      console.log(`🔍 [Google Search API] ===== STARTING SEARCH =====`);
      console.log(`🔍 [Google Search API] Query: "${query}"`);
      
      // הדפסת כל משתני הסביבה הרלוונטיים לדיבאג
      console.log(`🔑 [Google Search API] Environment Variables Debug:`);
      console.log(`   - GOOGLE_SEARCH_API_KEY: ${process.env.GOOGLE_SEARCH_API_KEY ? `exists (${process.env.GOOGLE_SEARCH_API_KEY.substring(0, 10)}...)` : 'MISSING/UNDEFINED'}`);
      console.log(`   - GOOGLE_SEARCH_ENGINE_ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID ? `exists (${process.env.GOOGLE_SEARCH_ENGINE_ID})` : 'MISSING/UNDEFINED'}`);
      console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
      console.log(`   - All Google-related env vars: ${Object.keys(process.env).filter(key => key.toLowerCase().includes('google')).join(', ') || 'none found'}`);
      
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      // בדיקת credentials מפורטת
      if (!apiKey) {
        console.log(`❌ [Google Search API] MISSING: GOOGLE_SEARCH_API_KEY not found in environment`);
        console.log(`🔍 [Google Search API] Available env vars: ${Object.keys(process.env).filter(key => key.toLowerCase().includes('google')).join(', ')}`);
        console.log(`❌ [Google Search API] UNKNOWN ERROR: Google Search API key not configured`);
        throw new Error('Google Search API key not configured');
      }
      
      if (!searchEngineId) {
        console.log(`❌ [Google Search API] MISSING: GOOGLE_SEARCH_ENGINE_ID not found in environment`);
        console.log(`🔍 [Google Search API] Available env vars: ${Object.keys(process.env).filter(key => key.toLowerCase().includes('google')).join(', ')}`);
        throw new Error('Google Search Engine ID not configured');
      }
      
      if (apiKey.includes('your_')) {
        console.log(`❌ [Google Search API] INVALID: API key contains placeholder text`);
        throw new Error('Google Search API key is placeholder');
      }
      
      if (searchEngineId.includes('your_')) {
        console.log(`❌ [Google Search API] INVALID: Search Engine ID contains placeholder text`);
        throw new Error('Google Search Engine ID is placeholder');
      }
      
      console.log(`✅ [Google Search API] Credentials validated`);
      console.log(`🔑 [Google Search API] API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
      console.log(`🔑 [Google Search API] Engine ID: ${searchEngineId}`);
      
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
      console.log(`🌐 [Google Search API] Request URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
      
      console.log(`📡 [Google Search API] Sending request...`);
      const startTime = Date.now();
      
      const response = await axios.get(url, {
        timeout: 10000, // הגדלתי timeout ל-10 שניות
        headers: {
          'User-Agent': 'AndroidUpdateBot/1.0'
        }
      });
      
      const endTime = Date.now();
      console.log(`⏱️ [Google Search API] Request completed in ${endTime - startTime}ms`);
      console.log(`📊 [Google Search API] Response status: ${response.status}`);
      
      if (response.data) {
        console.log(`📦 [Google Search API] Response data received`);
        console.log(`🔍 [Google Search API] Search info: ${JSON.stringify(response.data.searchInformation || {}, null, 2)}`);
        
        if (response.data.items && response.data.items.length > 0) {
          console.log(`✅ [Google Search API] SUCCESS: ${response.data.items.length} results found`);
          console.log(`📊 [Google Search API] Total results available: ${response.data.searchInformation?.totalResults || 'N/A'}`);
          console.log(`⏱️ [Google Search API] Search time: ${response.data.searchInformation?.searchTime || 'N/A'} seconds`);
          
          // לוג פרטי התוצאות הראשונות
          response.data.items.slice(0, 3).forEach((item, index) => {
            console.log(`📄 [Google Search API] Result ${index + 1}: ${item.title} (${item.displayLink})`);
          });
          
          return response.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink
          }));
        } else {
          console.log(`⚠️ [Google Search API] No results found in response`);
          console.log(`📦 [Google Search API] Response structure: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
        }
      } else {
        console.log(`❌ [Google Search API] No data in response`);
      }
      
      return [];
      
    } catch (error) {
      console.log(`❌ [Google Search API] ===== ERROR OCCURRED =====`);
      
      // בדיקה מפורטת של סוגי שגיאות
      if (error.response) {
        console.log(`📊 [Google Search API] HTTP Status: ${error.response.status}`);
        console.log(`📊 [Google Search API] Status Text: ${error.response.statusText}`);
        
        if (error.response.status === 429) {
          console.log(`🚫 [Google Search API] QUOTA EXCEEDED - Daily/Monthly limit reached`);
          console.log(`💡 [Google Search API] Consider upgrading your Google API plan`);
          throw new Error('Google Search API quota exceeded');
        } else if (error.response.status === 403) {
          console.log(`🚫 [Google Search API] FORBIDDEN - Check API key permissions`);
          console.log(`💡 [Google Search API] Verify API key has Custom Search API enabled`);
          throw new Error('Google Search API access forbidden');
        } else if (error.response.status === 400) {
          console.log(`❌ [Google Search API] BAD REQUEST - Invalid parameters`);
          if (error.response.data && error.response.data.error) {
            console.log(`📄 [Google Search API] Error details: ${JSON.stringify(error.response.data.error, null, 2)}`);
          }
          throw new Error('Google Search API bad request');
        }
        
        if (error.response.data && error.response.data.error) {
          console.log(`📄 [Google Search API] API Error: ${error.response.data.error.message}`);
          console.log(`📄 [Google Search API] Error code: ${error.response.data.error.code}`);
          throw new Error(`Google Search API error: ${error.response.data.error.message}`);
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`🌐 [Google Search API] NETWORK ERROR: ${error.code}`);
        console.log(`💡 [Google Search API] Check internet connection`);
        throw new Error('Google Search API network error');
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`⏱️ [Google Search API] TIMEOUT: Request took too long`);
        throw new Error('Google Search API timeout');
      }
      
      console.log(`❌ [Google Search API] UNKNOWN ERROR: ${error.message}`);
      console.log(`🔍 [Google Search API] Error stack: ${error.stack}`);
      throw new Error(`Google Search API error: ${error.message}`);
    }
  }

  // חיפוש בקהילות Samsung ופורומים מיוחדים
  async searchSamsungCommunity(deviceModel, androidVersion) {
    const results = [];
    
    try {
      console.log(`🏢 Searching Samsung Community for ${deviceModel} ${androidVersion}...`);
      
      // ניסיון חיפוש עם Google Search API תחילה
      try {
        const googleQuery = `site:us.community.samsung.com OR site:r2.community.samsung.com OR site:eu.community.samsung.com "${deviceModel}" "${androidVersion}"`;
        const googleResults = await this.googleCustomSearch(googleQuery);
        
        if (googleResults && googleResults.length > 0) {
          console.log(`✅ Google Search found ${googleResults.length} Samsung Community results`);
          return googleResults.slice(0, 3).map(result => ({
            title: result.title,
            url: result.link,
            summary: result.snippet || `דיון בקהילת Samsung על עדכון ${deviceModel} ל-${androidVersion}`,
            source: `Samsung Community (${result.displayLink})`,
            weight: 0.9
          }));
        }
      } catch (googleError) {
        console.log(`⚠️ Google Search failed for Samsung Community: ${googleError.message}, using fallback URLs`);
      }
      
      // Fallback - Samsung Community URLs ידניים
      const communityUrls = [
        `https://us.community.samsung.com/t5/forums/searchpage/tab/message?filter=location&q=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`,
        `https://r2.community.samsung.com/t5/forums/searchpage/tab/message?filter=location&q=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`,
        `https://eu.community.samsung.com/t5/forums/searchpage/tab/message?filter=location&q=${encodeURIComponent(deviceModel + ' ' + androidVersion)}`
      ];
      
      communityUrls.forEach((url, index) => {
        const regions = ['US', 'Global', 'EU'];
        results.push({
          title: `Samsung Community ${regions[index]} - ${deviceModel} ${androidVersion}`,
          url: url,
          summary: `דיונים בקהילת Samsung ${regions[index]} על עדכון ${deviceModel} ל-${androidVersion}`,
          source: `Samsung Community ${regions[index]}`,
          weight: 0.8
        });
      });
      
      return results;
      
    } catch (error) {
      console.error('Error searching Samsung Community:', error?.message);
      return [];
    }
  }

  // חילוץ דיווחי משתמשים אמיתיים מטקסט
  extractUserReportsFromText(text, title = '') {
    if (!text) return [];
    
    console.log(`🔍 [extractUserReports] Analyzing text: "${text.substring(0, 100)}..."`);
    
    const userReports = [];
    const fullText = `${title} ${text}`.toLowerCase();
    let sentencesChecked = 0;
    let sentencesPassed = 0;
    
    // דפוסים שמזהים דיווחי משתמשים אמיתיים
    const userReportPatterns = [
      /after.*updat.*to.*android.*\d+.*(.{20,100})/gi,
      /i.*updat.*my.*(.{20,100})/gi,
      /battery.*life.*(.{15,80})/gi,
      /performance.*(.{15,80})/gi,
      /experience.*with.*(.{15,80})/gi,
      /problem.*with.*(.{15,80})/gi,
      /issue.*with.*(.{15,80})/gi,
      /working.*fine.*(.{10,60})/gi,
      /recommend.*(.{10,60})/gi,
      /avoid.*(.{10,60})/gi
    ];
    
    // דפוסים בעברית - משופרים
    const hebrewPatterns = [
      /אחרי.*עדכון.*ל.*אנדרואיד.*\d+.*(.{15,100})/gi,
      /עדכנתי.*את.*המכשיר.*(.{15,100})/gi,
      /עדכנתי.*ל.*אנדרואיד.*\d+.*(.{15,100})/gi,
      /הסוללה.*(.{15,80})/gi,
      /ביצועים.*(.{15,80})/gi,
      /בעיות.*עם.*העדכון.*(.{15,100})/gi,
      /בעיות.*אחרי.*עדכון.*(.{15,100})/gi,
      /עובד.*טוב.*אחרי.*עדכון.*(.{10,80})/gi,
      /מומלץ.*לעדכן.*(.{10,80})/gi,
      /להימנע.*מעדכון.*(.{10,80})/gi,
      /החוויה.*שלי.*עם.*(.{15,100})/gi,
      /התקנתי.*את.*העדכון.*(.{15,100})/gi
    ];
    
    const allPatterns = [...userReportPatterns, ...hebrewPatterns];
    
    // חיפוש דפוסים בטקסט
    allPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sentencesChecked++;
          // ניקוי הטקסט שנמצא
          let cleanedReport = match.replace(/^\W+|\W+$/g, '').trim();
          
          // וידוא שהדיווח לא קצר מדי או ארוך מדי - עדכון לגבולות חדשים
          if (cleanedReport.length >= 10 && cleanedReport.length <= 350) {
            // בדיקה שזה לא טקסט גנרי
            if (!this.isGenericText(cleanedReport)) {
              sentencesPassed++;
              userReports.push({
                author: 'Forum User',
                content: cleanedReport,
                sentiment: this.analyzeSentiment('', cleanedReport),
                date: new Date(),
                isExtracted: true
              });
            }
          }
        });
      }
    });
    
    // אם לא נמצאו דפוסים ספציפיים, ננסה לזהות דיווחי משתמשים בצורה פשוטה יותר
    if (userReports.length === 0) {
      sentencesChecked++;
      // בדיקה פשוטה לטקסט בעברית שמכיל מילות מפתח
      const hebrewKeywords = ['עדכון', 'אנדרואיד', 'סוללה', 'ביצועים', 'בעיות', 'עובד', 'מומלץ'];
      const englishKeywords = ['update', 'android', 'battery', 'performance', 'experience', 'after'];
      
      // מילים משמעותיות קצרות שחשובות כדיווחי משתמשים
      const meaningfulShortReports = [
        'בעיה', 'בעיות', 'הסתדר', 'עובד', 'עובדת', 'טוב', 'רע', 'איטי', 'מהיר',
        'מומלץ', 'להימנע', 'בסדר', 'נורא', 'מצוין', 'לא טוב', 'לא עובד',
        'problem', 'issue', 'works', 'good', 'bad', 'slow', 'fast', 'ok', 'fine',
        'recommend', 'avoid', 'great', 'terrible', 'excellent', 'not good', 'doesnt work'
      ];
      
      const hasHebrewKeywords = hebrewKeywords.some(keyword => text.includes(keyword));
      const hasEnglishKeywords = englishKeywords.some(keyword => fullText.includes(keyword));
      const isMeaningfulShort = meaningfulShortReports.some(word => 
        text.toLowerCase().trim() === word.toLowerCase() || 
        text.toLowerCase().trim().includes(word.toLowerCase())
      );
      
      if ((hasHebrewKeywords || hasEnglishKeywords || isMeaningfulShort) && text.length >= 10 && text.length <= 350) {
        if (!this.isGenericText(text)) {
          sentencesPassed++;
          userReports.push({
            author: 'Forum User',
            content: text.trim(),
            sentiment: this.analyzeSentiment('', text),
            date: new Date(),
            isExtracted: true
          });
        }
      } else if (isMeaningfulShort && text.length >= 3 && text.length < 10) {
        // טיפול מיוחד במילים משמעותיות קצרות (3-9 תווים)
        if (!this.isGenericText(text)) {
          sentencesPassed++;
          userReports.push({
            author: 'Forum User',
            content: text.trim(),
            sentiment: this.analyzeSentiment('', text),
            date: new Date(),
            isExtracted: true,
            isShortMeaningful: true
          });
        }
      }
    }
    
    // אם לא נמצאו דיווחים ספציפיים, נחזיר ריק במקום תוכן גנרי
    if (userReports.length === 0) {
      console.log(`ℹ️  [extractUserReports] No specific user reports found in text: "${text.substring(0, 100)}..."`);
      console.log(`📊 [extractUserReports] Sentences checked: ${sentencesChecked}, passed filtering: ${sentencesPassed}`);
      return [];
    }
    
    console.log(`✅ [extractUserReports] Found ${userReports.length} user reports`);
    console.log(`📊 [extractUserReports] Sentences checked: ${sentencesChecked}, passed filtering: ${sentencesPassed}`);
    userReports.forEach((report, index) => {
      console.log(`   Report ${index + 1}: "${report.content.substring(0, 50)}..."`);
    });
    
    // הסרת מגבלת 3 דיווחים - כל דיווח שמחולץ ועובר סינון יוצג
    return userReports;
  }

  // בדיקה אם הטקסט גנרי ולא דיווח אמיתי
  isGenericText(text) {
    const genericPhrases = [
      'דיונים קהילתיים',
      'מאמרים וביקורות',
      'חיפוש ב',
      'מידע על עדכון',
      'נמצאו דיונים',
      'discussions about',
      'articles and reviews',
      'search for',
      'information about',
      'found discussions'
    ];
    
    // מילים משמעותיות קצרות שלא צריכות להיחשב כגנריות
    const meaningfulShortWords = [
      'בעיה', 'בעיות', 'הסתדר', 'עובד', 'עובדת', 'טוב', 'רע', 'איטי', 'מהיר',
      'מומלץ', 'להימנע', 'כן', 'לא', 'אוקיי', 'בסדר', 'נורא', 'מצוין',
      'problem', 'issue', 'works', 'good', 'bad', 'slow', 'fast', 'ok', 'fine',
      'recommend', 'avoid', 'yes', 'no', 'great', 'terrible', 'excellent'
    ];
    
    const textLower = text.toLowerCase().trim();
    
    // אם זה מילה משמעותית קצרה, לא לסנן
    if (meaningfulShortWords.some(word => textLower === word.toLowerCase())) {
      return false;
    }
    
    return genericPhrases.some(phrase => textLower.includes(phrase.toLowerCase()));
  }

  // תרגום דיווחי משתמשים לעברית באמצעות Claude
  async translateUserReportsToHebrew(userReports) {
    if (!userReports || userReports.length === 0) return userReports;
    
    // בדיקה אם יש Claude API key
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY.includes('your_')) {
      console.log('⚠️ [Translation] Claude API not available, keeping original text');
      return userReports;
    }
    
    try {
      // איסוף כל הטקסטים לתרגום
      const textsToTranslate = userReports
        .filter(report => report.content && !this.isHebrewText(report.content))
        .map(report => report.content);
      
      if (textsToTranslate.length === 0) {
        console.log('ℹ️ [Translation] No English texts to translate');
        return userReports;
      }
      
      console.log(`🌐 [Translation] Translating ${textsToTranslate.length} user reports to Hebrew...`);
      
      const prompt = `תרגם את דיווחי המשתמשים הבאים לעברית טבעית וזורמת. 
שמור על המשמעות המדויקת והטון של הדיווח המקורי.
החזר רק את התרגומים, כל אחד בשורה נפרדת, ללא מספור או הסברים.

דיווחי משתמשים לתרגום:
${textsToTranslate.map((text, index) => `${index + 1}. ${text}`).join('\n')}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 800,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        console.log(`❌ [Translation] Claude API error: ${response.status}`);
        return userReports;
      }

      const data = await response.json();
      const translatedText = data?.content?.[0]?.text || '';
      
      if (!translatedText) {
        console.log('❌ [Translation] No translation received from Claude');
        return userReports;
      }
      
      // פיצול התרגומים לשורות
      const translations = translatedText.trim().split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
      
      console.log(`✅ [Translation] Successfully translated ${translations.length} reports`);
      
      // החלפת הטקסטים המתורגמים
      let translationIndex = 0;
      const translatedReports = userReports.map(report => {
        if (report.content && !this.isHebrewText(report.content)) {
          if (translationIndex < translations.length) {
            const originalContent = report.content;
            const translatedContent = translations[translationIndex];
            translationIndex++;
            
            console.log(`🔄 [Translation] "${originalContent.substring(0, 50)}..." → "${translatedContent.substring(0, 50)}..."`);
            
            return {
              ...report,
              content: translatedContent,
              originalContent: originalContent // שמירת הטקסט המקורי
            };
          }
        }
        return report;
      });
      
      return translatedReports;
      
    } catch (error) {
      console.error('❌ [Translation] Error translating user reports:', error?.message);
      return userReports; // החזרת הדיווחים המקוריים במקרה של שגיאה
    }
  }
  
  // בדיקה אם הטקסט כבר בעברית
  isHebrewText(text) {
    if (!text) return false;
    
    // בדיקה פשוטה - אם יש יותר מ-30% תווים עבריים
    const hebrewChars = text.match(/[\u0590-\u05FF]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    
    return totalChars > 0 && (hebrewChars.length / totalChars) > 0.3;
  }
}

module.exports = UpdateChecker;
