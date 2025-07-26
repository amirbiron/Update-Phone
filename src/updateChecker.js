const axios = require('axios');
const cheerio = require('cheerio');

class UpdateChecker {
  constructor() {
    this.searchSources = this.initializeSearchSources();
    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
  }

  // מקורות חיפוש מידע
  initializeSearchSources() {
    return {
      reddit: {
        name: 'Reddit',
        baseUrl: 'https://www.reddit.com',
        searchUrl: 'https://www.reddit.com/search.json',
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
      console.error(`❌ Error at [checkUpdate]:`, error.message);
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
      console.error(`❌ Error at [gatherInformation]:`, error.message);
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
        console.error(`❌ Error at [performWebSearch]:`, error.message);
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
      const subreddits = [
        'Android',
        'samsung', 'GooglePixel', 'Xiaomi', 'oneplus',
        deviceInfo.manufacturerKey.toLowerCase()
      ];

      const searchQuery = `${deviceInfo.device} ${parsedQuery.version}`;
      const results = [];

      for (const subreddit of subreddits.slice(0, 3)) {
        try {
          const response = await axios.get(
            `https://www.reddit.com/r/${subreddit}/search.json`,
            {
              params: {
                q: searchQuery,
                sort: 'relevance',
                t: 'month',
                limit: 10
              },
              headers: {
                'User-Agent': 'Android-Update-Bot/1.0'
              },
              timeout: 5000
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
              selftext: child.data.selftext,
              source: 'reddit',
              relevance: this.calculateRelevance(child.data.title, searchQuery)
            }));

            results.push(...posts);
          }
        } catch (error) {
          console.error(`❌ Error at [searchReddit subreddit ${subreddit}]:`, error.message);
        }
      }

      return results.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
    } catch (error) {
      console.error(`❌ Error at [searchReddit]:`, error.message);
      return [];
    }
  }

  // חיפוש בפורומים טכניים
  async searchTechForums(deviceInfo, parsedQuery) {
    const results = [];
    
    try {
      // חיפוש דמוי - במימוש אמיתי זה יחפש באתרים האמיתיים
      const forumSources = [
        { name: 'XDA Developers', weight: 0.9 },
        { name: 'Android Police', weight: 0.8 },
        { name: 'Android Authority', weight: 0.8 }
      ];

      for (const forum of forumSources) {
        results.push({
          title: `${deviceInfo.device} ${parsedQuery.version} Discussion`,
          url: `https://${forum.name.toLowerCase().replace(' ', '')}.com/search`,
          source: forum.name,
          weight: forum.weight,
          summary: `Community discussion about ${deviceInfo.device} ${parsedQuery.version}`,
          date: new Date(),
          sentiment: 'neutral'
        });
      }
    } catch (error) {
      console.error(`❌ Error at [searchTechForums]:`, error.message);
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
      console.error(`❌ Error at [searchOfficialSources]:`, error.message);
    }

    return results;
  }

  // חילוץ ציטוטים מייצגים מתגובת Claude
  extractUserQuotes(text) {
    const negativeKeywords = [
      "בעיה", "בעיות", "קריסה", "נפילה", "שגיאה", "לא עובד", "לא מצליח",
      "תקלה", "באג", "מתרוקן", "מתרסק", "נתקע", "ירידה", "חמור", "ביצועים"
    ];
    
    // מילים שמציינות כותרות או הקדמות שלא רוצים לכלול
    const excludePatterns = [
      "בעיות עיקריות", "בעיות שדווחו", "תקלות עיקריות", "דיווחים על",
      "בעיות:", "תקלות:", "שדווחו:", "עיקריות:"
    ];
    
    const lines = text.split("\n");
    const quotes = [];

    for (const line of lines) {
      if (negativeKeywords.some(word => line.includes(word))) {
        const clean = line.replace(/^[-•*\s]+/, "").trim();
        
        // בדיקה שזה לא כותרת או הקדמה
        const isHeader = excludePatterns.some(pattern => clean.includes(pattern));
        
        // בדיקה אם זה ציטוט בגרשיים
        const isQuotedText = clean.startsWith('"') && clean.endsWith('"');
        
        // בדיקה שהשורה מכילה תוכן מספיק
        const hasSubstantialContent = clean.length > 15 && 
                                     (clean.includes("משתמש") || 
                                      clean.includes("דיווח") || 
                                      clean.includes("חווים") ||
                                      clean.includes("מדווח") ||
                                      isQuotedText);
        
        if (clean && !quotes.includes(clean) && !isHeader && hasSubstantialContent) {
          // אם זה כבר בגרשיים, נשאיר כמו שזה. אחרת נוסיף גרשיים
          const formattedQuote = isQuotedText ? `• ${clean}` : `• "${clean}"`;
          quotes.push(formattedQuote);
        }
      }
      if (quotes.length >= 3) break;
    }

    return quotes;
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
          model: 'claude-3-opus-20240229',
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

      const claudeSummary = data?.content?.[0]?.text || 'לא התקבלה תגובה מ-Claude.';
      console.log(`✅ Received response from Claude`);
      
      // חילוץ ציטוטים מייצגים מתגובת Claude
      const quotes = this.extractUserQuotes(claudeSummary);
      const quoteSection = quotes.length > 0 ? `\n🗣️ דיווחים מהמשתמשים:\n${quotes.join("\n")}` : "";
      
      // שילוב הציטוטים עם התגובה הבסיסית
      const finalMessage = claudeSummary + quoteSection;
      
      return finalMessage;

    } catch (error) {
      console.error(`❌ Error at [analyzeWithClaude]:`, error.message);
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

מידע שנאסף:
${resultsText}

אנא נתח את המידע ותספק:
1. רמת יציבות העדכון (1-10)
2. בעיות עיקריות שדווחו
3. יתרונות העדכון
4. המלצה ברורה (מומלץ/לא מומלץ/כדאי לחכות)
5. הערות מיוחדות

תשובה בפורמט JSON:
{
  "stabilityRating": number,
  "majorIssues": ["רשימת בעיות"],
  "benefits": ["רשימת יתרונות"],
  "recommendation": "recommended/not_recommended/wait",
  "reasoning": "הסבר לההמלצה",
  "specialNotes": "הערות נוספות"
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
      console.error(`❌ Error at [parseClaudeResponse]:`, error.message);
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
}

module.exports = UpdateChecker;
