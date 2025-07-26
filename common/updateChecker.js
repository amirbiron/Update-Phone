const axios = require('axios');

class UpdateChecker {
  constructor() {
    // רשימת האתרים האמינים היחידה שהבוט יחפש בהם
    this.trustedSites = [
      'reddit.com',
      'xda-developers.com',
      'androidpolice.com',
      'androidauthority.com',
      'gsmarena.com',
      'sammobile.com',
      '9to5google.com',
      'community.samsung.com',
    ];

    // רשימה שחורה של דומיינים שיסוננו תמיד
    this.blacklistedDomains = ['tiktok.com', 'facebook.com', 'instagram.com', 'twitter.com'];

    this.claudeApiUrl = 'https://api.anthropic.com/v1/messages';
  }

  // פונקציה ראשית שהבוט קורא לה
  async checkForUpdates(deviceModel, currentVersion) {
    try {
      console.log(`🔍 [checkForUpdates] Starting focused search for ${deviceModel} version ${currentVersion}`);
      
      const deviceInfo = this.createDeviceInfo(deviceModel);
      const parsedQuery = { version: currentVersion };
      
      const searchResults = await this.gatherInformation(deviceInfo, parsedQuery);
      
      console.log(`🧠 [checkForUpdates] Starting analysis...`);
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      console.log(`✅ [checkForUpdates] Analysis completed`);
      
      return {
        searchResults,
        analysis: analysisResult,
        deviceInfo,
        lastChecked: new Date(),
        sources: this.trustedSites, // המקורות הם תמיד הרשימה האמינה
      };

    } catch (error) {
      console.error(`❌ FATAL ERROR in [checkForUpdates]:`, error?.message || error);
      // החזרת אובייקט ברירת מחדל תקין כדי למנוע קריסה
      return {
        error: 'Failed to check for updates due to a fatal error.',
        searchResults: { redditPosts: [], forumDiscussions: [], officialSources: [] },
        analysis: this.getFallbackAnalysis(this.createDeviceInfo(deviceModel), { version: currentVersion }, {}),
        deviceInfo: this.createDeviceInfo(deviceModel),
        lastChecked: new Date(),
        sources: this.trustedSites,
      };
    }
  }

  // איסוף מידע ממוקד ממקורות אמינים בלבד
  async gatherInformation(deviceInfo, parsedQuery) {
    const results = {
      redditPosts: [],
      forumDiscussions: [],
      officialSources: []
    };

    try {
      // בדיקה שיש מפתחות API של גוגל
      const hasGoogleAPI = process.env.GOOGLE_SEARCH_API_KEY &&
                           process.env.GOOGLE_SEARCH_ENGINE_ID &&
                           !process.env.GOOGLE_SEARCH_API_KEY.includes('your_');
      
      if (!hasGoogleAPI) {
        console.log(`⚠️ [Google Search API] Credentials not configured. Cannot perform search.`);
        return this.getEmptyResults();
      }

      // בניית שאילתת חיפוש ממוקדת
      const siteQuery = this.trustedSites.map(site => `site:${site}`).join(' OR ');
      const mainQuery = `(${siteQuery}) "${deviceInfo.device}" "${parsedQuery.version}" (update OR review OR problems OR issues OR battery OR performance)`;

      console.log(`🔍 [gatherInformation] Executing focused query: ${mainQuery}`);
      const googleResults = await this.googleCustomSearch(mainQuery);

      if (!googleResults || googleResults.length === 0) {
        console.log(`ℹ️ [gatherInformation] No results found from trusted sources.`);
        return this.getEmptyResults();
      }

      // עיבוד וסינון התוצאות
      const processedResults = this.processGoogleResults(googleResults, deviceInfo);
      
      results.forumDiscussions = processedResults; // כל התוצאות האמינות ייכנסו לכאן
      
      const totalResults = results.forumDiscussions.length;
      console.log(`✅ [gatherInformation] Focused search completed: Found ${totalResults} relevant results.`);

    } catch (error) {
      console.error(`❌ Error in [gatherInformation]:`, error?.message || error);
    }
    
    return results;
  }

  // עיבוד תוצאות החיפוש של גוגל
  processGoogleResults(googleResults, deviceInfo) {
    return googleResults
      .filter(result => !this.blacklistedDomains.some(domain => result.link.includes(domain)))
      .map(result => {
        const sourceName = this.trustedSites.find(site => result.displayLink.includes(site)) || result.displayLink;
        return {
          title: result.title,
          url: result.link,
          source: sourceName,
          summary: result.snippet,
          date: new Date(),
          sentiment: this.analyzeSentiment(result.title, result.snippet),
          // חילוץ "דיווח" מה-snippet, אבל בצורה פשוטה יותר
          userReports: [{
            author: 'Web Source',
            content: result.snippet,
            sentiment: this.analyzeSentiment(result.title, result.snippet),
            date: new Date()
          }]
        };
      });
  }

  // חיפוש עם Google Custom Search API
  async googleCustomSearch(query) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
      
      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data.items && response.data.items.length > 0) {
        console.log(`✅ [Google Search API] SUCCESS: ${response.data.items.length} results found for query.`);
        return response.data.items;
      } else {
        console.log(`⚠️ [Google Search API] No results found in response for query.`);
        return [];
      }
    } catch (error) {
      console.error(`❌ [Google Search API] ERROR: ${error?.response?.data?.error?.message || error.message}`);
      // לא זורקים שגיאה כדי שהאפליקציה לא תקרוס, פשוט מחזירים מערך ריק
      return [];
    }
  }

  // ניתוח עם Claude
  async analyzeWithClaude(deviceInfo, parsedQuery, searchResults) {
    try {
      if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY.includes('your_')) {
        console.log('⚠️ [Claude AI] Not configured. Falling back to basic analysis.');
        return this.getFallbackAnalysis(deviceInfo, parsedQuery, searchResults);
      }

      const prompt = this.buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults);

      const response = await axios.post(this.claudeApiUrl, {
        model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307', // שימוש במודל מהיר וזול יותר
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });
      
      const resultText = response.data?.content?.[0]?.text;
      if (!resultText) {
          throw new Error("Empty response from Claude");
      }

      console.log(`✅ [Claude AI] SUCCESS: Analysis completed.`);
      return this.parseClaudeResponse(resultText);

    } catch (error) {
      console.error(`❌ [Claude AI] ERROR: ${error.message}. Falling back to basic analysis.`);
      return this.getFallbackAnalysis(deviceInfo, parsedQuery, searchResults);
    }
  }
  
  // בניית הפרומפט לניתוח
  buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults) {
    const resultsText = this.formatSearchResultsForAnalysis(searchResults);
    
    return `Analyze the following information about an Android update and provide a recommendation for the user.
Device: ${deviceInfo.device}
Requested Update: ${parsedQuery.version}

Collected Information from trusted sources:
${resultsText}

Based ONLY on the provided information, generate a JSON response with the following structure:
{
  "stabilityRating": number (1-10, based on user reports),
  "majorIssues": ["List of key reported issues"],
  "benefits": ["List of key reported benefits"],
  "recommendation": "recommended" | "wait" | "not_recommended",
  "reasoning": "A brief explanation for your recommendation.",
  "confidence": "high" | "medium" | "low"
}`;
  }

  // עיצוב תוצאות החיפוש עבור הפרומפט
  formatSearchResultsForAnalysis(searchResults) {
    if (!searchResults.forumDiscussions || searchResults.forumDiscussions.length === 0) {
      return 'No specific information was found about this update.';
    }
    
    return searchResults.forumDiscussions
      .slice(0, 5) // שימוש ב-5 התוצאות הכי רלוונטיות
      .map(d => `Source: ${d.source}\nTitle: ${d.title}\nSnippet: ${d.summary}\n---`)
      .join('\n\n');
  }

  // פיענוח תשובת Claude
  parseClaudeResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        return { ...parsedJson, analysisMethod: 'claude' };
      }
    } catch (error) {
      console.error(`❌ Error parsing Claude JSON response:`, error.message);
    }
    // אם הפיענוח נכשל, נחזיר ניתוח בסיסי
    return this.getFallbackAnalysis({}, {}, {});
  }

  // ניתוח חלופי במקרה של כשל
  getFallbackAnalysis(deviceInfo, parsedQuery, searchResults) {
    const hasResults = searchResults.forumDiscussions && searchResults.forumDiscussions.length > 0;
    
    return {
      stabilityRating: hasResults ? 6 : 5,
      majorIssues: hasResults ? ["Check sources for details"] : ["Limited information available"],
      benefits: [],
      recommendation: "wait",
      reasoning: "Analysis is based on limited data. It is recommended to wait for more user reports.",
      confidence: "low",
      analysisMethod: 'fallback'
    };
  }
  
  // פונקציות עזר
  getEmptyResults() {
    return { redditPosts: [], forumDiscussions: [], officialSources: [] };
  }

  createDeviceInfo(deviceModel) {
    const manufacturer = deviceModel.toLowerCase().includes('samsung') ? 'Samsung' :
                         deviceModel.toLowerCase().includes('google') ? 'Google' : 'Unknown';
    return { device: deviceModel, manufacturer };
  }

  analyzeSentiment(title, text) {
    const fullText = `${title} ${text}`.toLowerCase();
    const positiveWords = ['good', 'great', 'stable', 'fast', 'improved'];
    const negativeWords = ['bad', 'slow', 'drain', 'crash', 'bug', 'issue', 'problem'];
    
    const positiveCount = positiveWords.filter(word => fullText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => fullText.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}

module.exports = UpdateChecker;
