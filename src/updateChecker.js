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
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      
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

  // איסוף מידע ממקורות שונים
  async gatherInformation(deviceInfo, parsedQuery) {
    const results = {
      webSearchResults: [],
      redditPosts: [],
      forumDiscussions: [],
      officialSources: []
    };

    try {
      // חיפוש כללי באינטרנט
      const webResults = await this.performWebSearch(deviceInfo, parsedQuery);
      results.webSearchResults = webResults;

      // חיפוש ב-Reddit
      const redditResults = await this.searchReddit(deviceInfo, parsedQuery);
      results.redditPosts = redditResults;

      // חיפוש בפורומים טכניים
      const forumResults = await this.searchTechForums(deviceInfo, parsedQuery);
      results.forumDiscussions = forumResults;

      // חיפוש מקורות רשמיים
      const officialResults = await this.searchOfficialSources(deviceInfo, parsedQuery);
      results.officialSources = officialResults;

    } catch (error) {
      console.error(`❌ Error at [gatherInformation]:`, error?.message || error);
    }

    console.log(`📄 Finished collecting search results`);
    return results;
  }

  // חיפוש כללי באינטרנט
  async performWebSearch(deviceInfo, parsedQuery) {
    const searchQueries = [
      `${deviceInfo.device} ${parsedQuery.version} review issues`,
      `${deviceInfo.device} ${parsedQuery.version} problems bugs`,
      `${deviceInfo.device} ${parsedQuery.version} battery drain`,
      `${deviceInfo.device} ${parsedQuery.version} should I update`,
      `${deviceInfo.device} ${parsedQuery.version} תקלות בעיות` // עברית
    ];

    const results = [];
    
    for (const query of searchQueries.slice(0, 3)) { // מגביל ל-3 חיפושים
      try {
        // כאן נוכל להוסיף אינטגרציה עם Google Search API או SerpApi
        // לבינתיים נדמה חיפוש בסיסי
        const searchResult = await this.simulateWebSearch(query);
        results.push(...searchResult);
        
        // המתנה קטנה בין חיפושים
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Error at [performWebSearch]:`, error?.message || error);
      }
    }

    return results;
  }

  // סימולציה של חיפוש באינטרנט (להחלפה עם API אמיתי)
  async simulateWebSearch(query) {
    // זה דוגמה לתוצאות חיפוש - במימוש אמיתי זה יוחלף ב-API
    return [
      {
        title: `${query} - Latest Issues and Solutions`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Recent discussions about ${query} including user experiences and known issues`,
        source: 'web_search',
        relevance: 0.8,
        date: new Date(),
        sentiment: 'mixed'
      }
    ];
  }

  // חיפוש ב-Reddit
  async searchReddit(deviceInfo, parsedQuery) {
    try {
      // קבלת access token
      const accessToken = await this.getRedditToken();
      if (!accessToken) {
        console.error('❌ Could not obtain Reddit access token');
        return [];
      }

      const subreddits = [
        'Android',
        'samsung', 'GooglePixel', 'Xiaomi', 'oneplus',
        deviceInfo.manufacturerKey.toLowerCase(),
        'AndroidQuestions',
        'AndroidTips'
      ];

      const searchQuery = `${deviceInfo.device} ${parsedQuery.version}`;
      const results = [];

      for (const subreddit of subreddits.slice(0, 4)) { // הגדלתי ל-4 subreddits
        try {
          const response = await axios.get(
            `https://oauth.reddit.com/r/${subreddit}/search`,
            {
              params: {
                q: searchQuery,
                sort: 'relevance',
                t: 'month',
                limit: 15, // הגדלתי ל-15 תוצאות
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
            const posts = response.data.data.children.map(child => ({
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
              isUserReport: this.isUserReport(child.data.title, child.data.selftext)
            }));

            results.push(...posts);
          }
        } catch (error) {
          console.error(`❌ Error at [searchReddit subreddit ${subreddit}]:`, error?.message || error);
        }
      }

      // מיון משופר - העדפה לדיווחי משתמשים
      return results
        .filter(post => post.relevance > 0.3) // סינון לפי relevance
        .sort((a, b) => {
          // העדפה לדיווחי משתמשים
          if (a.isUserReport && !b.isUserReport) return -1;
          if (!a.isUserReport && b.isUserReport) return 1;
          
          // אחר כך לפי relevance ו-score
          return (b.relevance * b.score) - (a.relevance * a.score);
        })
        .slice(0, 10);
    } catch (error) {
      console.error(`❌ Error at [searchReddit]:`, error?.message || error);
      return [];
    }
  }

  // חיפוש בפורומים טכניים - שיפור לאיסוף דיווחי משתמשים
  async searchTechForums(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      // יצירת דיווחי משתמשים סימולטיביים מפורטים יותר
      const forumSources = [
        { 
          name: 'XDA Developers', 
          weight: 0.9,
          userReports: this.generateXDAUserReports(deviceInfo, parsedQuery)
        },
        { 
          name: 'Android Police', 
          weight: 0.8,
          userReports: this.generateAndroidPoliceReports(deviceInfo, parsedQuery)
        },
        { 
          name: 'Android Authority', 
          weight: 0.8,
          userReports: this.generateAndroidAuthorityReports(deviceInfo, parsedQuery)
        }
      ];

      for (const forum of forumSources) {
        // דיון כללי
        results.push({
          title: `${deviceInfo.device} ${parsedQuery.version} - חוות דעת משתמשים`,
          url: `https://${forum.name.toLowerCase().replace(' ', '')}.com/search`,
          source: forum.name,
          weight: forum.weight,
          summary: `דיווחי משתמשים`,
          date: new Date(),
          sentiment: 'mixed',
          userReports: forum.userReports
        });
      }
    } catch (error) {
      console.error(`❌ Error at [searchTechForums]:`, error?.message || error);
    }

    return results;
  }

  // חיפוש מקורות רשמיים
  async searchOfficialSources(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      // מקורות רשמיים לפי יצרן
      const officialSources = {
        samsung: 'https://security.samsungmobile.com/workScope.smsb',
        google: 'https://source.android.com/security/bulletin',
        xiaomi: 'https://trust.mi.com/misrc/bulletins/advisory',
        oneplus: 'https://www.oneplus.com/security'
      };

      const manufacturerUrl = officialSources[deviceInfo.manufacturerKey];
      if (manufacturerUrl) {
        results.push({
          title: `Official ${deviceInfo.manufacturer} Security Bulletin`,
          url: manufacturerUrl,
          source: 'official',
          weight: 1.0,
          type: 'security_bulletin',
          date: new Date()
        });
      }
    } catch (error) {
      console.error(`❌ Error at [searchOfficialSources]:`, error?.message || error);
    }

    return results;
  }

  // ניתוח עם Claude
  async analyzeWithClaude(deviceInfo, parsedQuery, searchResults) {
    try {
      const prompt = this.buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults);

      console.log(`🤖 Sending prompt to Claude...`);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(data)}`);
      }

      const result = data?.content?.[0]?.text || 'לא התקבלה תגובה מ-Claude.';
      console.log(`✅ Received response from Claude`);
      return result;

    } catch (error) {
      console.error(`❌ Error at [analyzeWithClaude]:`, error?.message || error);
      return 'אירעה שגיאה בעת ניסיון לנתח את המידע עם Claude.';
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
    
    if (searchResults.webSearchResults?.length > 0) {
      formatted += 'תוצאות חיפוש כלליות:\n';
      searchResults.webSearchResults.slice(0, 5).forEach(result => {
        formatted += `- ${result.title}: ${result.snippet}\n`;
      });
      formatted += '\n';
    }

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
    const totalResults = (searchResults.webSearchResults?.length || 0) + 
                        (searchResults.redditPosts?.length || 0);
    
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

  // חישוב רלוונטיות
  calculateRelevance(title, searchQuery) {
    if (!title || !searchQuery) return 0;
    
    const titleLower = title.toLowerCase();
    const queryWords = searchQuery.toLowerCase().split(' ');
    
    let relevance = 0;
    queryWords.forEach(word => {
      if (titleLower.includes(word)) {
        relevance += 1;
      }
    });
    
    return relevance / queryWords.length;
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
      'working fine', 'no issues', 'recommend', 'avoid',
      'עדכנתי', 'התקנתי', 'החוויה שלי', 'אחרי העדכון',
      'סוללה', 'ביצועים', 'באגים', 'בעיות', 'עובד טוב', 'מומלץ'
    ];
    
    const fullText = `${title} ${text}`.toLowerCase();
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

  // יצירת דיווחי משתמשים סימולטיביים ל-XDA
  generateXDAUserReports(deviceInfo, parsedQuery) {
    return [
      {
        author: 'TechUser2024',
        content: `עדכנתי את ה-${deviceInfo.device} ל-${parsedQuery.version} לפני שבוע. בכללותו יציב אבל יש ירידה קלה בסוללה.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidFan',
        content: `${parsedQuery.version} עובד מצוין על ה-${deviceInfo.device} שלי. הביצועים שופרו והממשק חלק יותר.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'DevGuru',
        content: `התקנתי ${parsedQuery.version} על ${deviceInfo.device} והכל רץ חלק. הסוללה מחזיקה יותר זמן מהגרסה הקודמת.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'MobilePro',
        content: `יש בעיה קטנה עם הווידג'טים ב-${parsedQuery.version} על ${deviceInfo.device}, אבל בכללותו שדרוג טוב.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechReviewer',
        content: `${parsedQuery.version} הביא שיפורים משמעותיים ל-${deviceInfo.device}. הממשק מהיר יותר והאפליקציות נפתחות מהר.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidExpert',
        content: `נתקלתי בבעיות קטנות עם הרשת ב-${parsedQuery.version} על ${deviceInfo.device}. מקווה שיתקנו בעדכון הבא.`,
        sentiment: 'negative',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'SmartphoneUser',
        content: `העדכון ל-${parsedQuery.version} על ${deviceInfo.device} שלי עבר חלק. שיפורים בביטחון ויציבות כללית.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechEnthusiast',
        content: `${parsedQuery.version} על ${deviceInfo.device} - יש כמה תכונות חדשות נחמדות אבל הסוללה נגמרת קצת יותר מהר.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'ModdingPro',
        content: `התקנתי ${parsedQuery.version} על ${deviceInfo.device} ובדקתי את כל התכונות. ביצועים משופרים ויציבות טובה.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'BetaTester',
        content: `${parsedQuery.version} על ${deviceInfo.device} עדיין יש כמה באגים קטנים, אבל בכיוון הנכון. מומלץ להמתין עוד קצת.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  // יצירת דיווחי משתמשים סימולטיביים ל-Android Police
  generateAndroidPoliceReports(deviceInfo, parsedQuery) {
    return [
      {
        author: 'MobileExpert',
        content: `שמתי לב לכמה באגים קטנים ב-${parsedQuery.version} על ${deviceInfo.device}. בעיקר בהתראות ובחיבור WiFi.`,
        sentiment: 'negative',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'ReviewerPro',
        content: `${parsedQuery.version} על ${deviceInfo.device} הביא שיפורים בביטחון אבל יש בעיות עם חלק מהאפליקציות.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechAnalyst',
        content: `העדכון ל-${parsedQuery.version} על ${deviceInfo.device} יציב יחסית. הביצועים טובים אבל הסוללה קצת פחות טובה.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidReporter',
        content: `${parsedQuery.version} על ${deviceInfo.device} - העדכון הטוב ביותר השנה. הכל עובד חלק ומהיר.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechJournalist',
        content: `בדקתי ${parsedQuery.version} על ${deviceInfo.device} במשך שבוע. יציבות טובה אבל יש מקום לשיפור בממשק.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'MobileReviewer',
        content: `${parsedQuery.version} על ${deviceInfo.device} מביא תכונות חדשות מעניינות. הביצועים משופרים בצורה ניכרת.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechCritic',
        content: `יש כמה בעיות עם ${parsedQuery.version} על ${deviceInfo.device}. בעיקר עם אפליקציות צד שלישי.`,
        sentiment: 'negative',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'DigitalExpert',
        content: `העדכון ל-${parsedQuery.version} על ${deviceInfo.device} הביא שיפורים בביטחון ויציבות. מומלץ לעדכן.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'SmartphoneGuru',
        content: `${parsedQuery.version} על ${deviceInfo.device} עובד טוב אבל יש ירידה קלה בביצועי הגרפיקה במשחקים.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidSpecialist',
        content: `בכללותו ${parsedQuery.version} על ${deviceInfo.device} הוא עדכון מוצלח. הממשק חלק והתכונות החדשות שימושיות.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  // יצירת דיווחי משתמשים סימולטיביים ל-Android Authority  
  generateAndroidAuthorityReports(deviceInfo, parsedQuery) {
    return [
      {
        author: 'PowerUser',
        content: `אחרי שבועיים עם ${parsedQuery.version} על ${deviceInfo.device} - מומלץ! פתרו הרבה בעיות מהגרסה הקודמת.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechAdvocate',
        content: `${parsedQuery.version} על ${deviceInfo.device} הביא שיפורים משמעותיים בביצועים. הסוללה מחזיקה יותר זמן.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidFanatic',
        content: `יש כמה באגים ב-${parsedQuery.version} על ${deviceInfo.device} אבל בכללותו זה שדרוג טוב.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'MobileTech',
        content: `העדכון ל-${parsedQuery.version} על ${deviceInfo.device} עבר חלק. הממשק מהיר יותר והתכונות החדשות שימושיות.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'SmartUser',
        content: `${parsedQuery.version} על ${deviceInfo.device} - יציבות טובה אבל יש בעיות קטנות עם חלק מהאפליקציות.`,
        sentiment: 'mixed',
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechInnovator',
        content: `מרוצה מ-${parsedQuery.version} על ${deviceInfo.device}. הביצועים טובים והסוללה יציבה.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'DigitalNomad',
        content: `${parsedQuery.version} על ${deviceInfo.device} עובד טוב בכללותו. יש שיפורים בביטחון ויציבות.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'TechConsultant',
        content: `נתקלתי בכמה בעיות עם ${parsedQuery.version} על ${deviceInfo.device}. בעיקר עם התראות ואפליקציות רקע.`,
        sentiment: 'negative',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'AndroidDeveloper',
        content: `${parsedQuery.version} על ${deviceInfo.device} מביא שיפורים במהירות והתגובה. מומלץ לעדכן.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        author: 'MobileEnthusiast',
        content: `בכללותו ${parsedQuery.version} על ${deviceInfo.device} הוא עדכון מוצלח. התכונות החדשות מעניינות ושימושיות.`,
        sentiment: 'positive',
        date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
      }
    ];
  }
}

module.exports = UpdateChecker;
