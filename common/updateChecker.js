const axios = require('axios');

class UpdateChecker {
  constructor() {
    this.trustedSites = [
      'reddit.com', 'xda-developers.com', 'androidpolice.com', 
      'androidauthority.com', 'gsmarena.com', 'sammobile.com', '9to5google.com',
      'community.samsung.com'
    ];
    this.blacklistedDomains = ['tiktok.com', 'facebook.com', 'instagram.com', 'twitter.com', 'youtube.com'];
  }

  // --- פונקציה ראשית ---
  async checkForUpdates(deviceModel, currentVersion) {
    try {
      console.log(`🔍 [checkForUpdates] Starting multi-stage search for ${deviceModel} version ${currentVersion}`);
      const deviceInfo = { device: deviceModel, manufacturer: this.getManufacturer(deviceModel) };
      const parsedQuery = { version: currentVersion };
      
      const searchResults = await this.gatherInformation(deviceInfo, parsedQuery);
      
      console.log(`🧠 [checkForUpdates] Starting analysis...`);
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      
      return {
        searchResults,
        analysis: analysisResult,
        deviceInfo,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error(`❌ FATAL ERROR in [checkForUpdates]:`, error.message);
      return this.getErrorFallback(deviceModel, error.message);
    }
  }

  // --- איסוף מידע רב-שלבי ---
  async gatherInformation(deviceInfo, parsedQuery) {
    // בדיקה מקדימה של מפתח ה-API
    if (!process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY.includes('your_')) {
      console.error('❌ Google API Key is not configured. Cannot perform search.');
      return { forumDiscussions: [] };
    }

    // שלב 1: חיפוש סופר-ממוקד
    console.log('⭐ Stage 1: Highly-focused search on trusted sites.');
    let query = `"${deviceInfo.device}" "${parsedQuery.version}" (update OR review OR problems)`;
    let results = await this.runFocusedSearch(query);
    if (results.length > 0) {
      console.log(`✅ Stage 1 successful with ${results.length} results.`);
      return { forumDiscussions: results };
    }

    // שלב 2: חיפוש רחב יותר (בלי מספר גרסה)
    console.log('⭐ Stage 2: Broader search on trusted sites.');
    query = `"${deviceInfo.device}" update OR "android 15"`;
    results = await this.runFocusedSearch(query);
    if (results.length > 0) {
      console.log(`✅ Stage 2 successful with ${results.length} results.`);
      return { forumDiscussions: results };
    }

    // שלב 3: חיפוש כללי עם רשימה שחורה
    console.log('⭐ Stage 3: General web search with blacklist.');
    const blacklistQuery = this.blacklistedDomains.map(d => `-site:${d}`).join(' ');
    query = `"${deviceInfo.device}" "${parsedQuery.version}" update ${blacklistQuery}`;
    results = await this.runGeneralSearch(query);
    if (results.length > 0) {
      console.log(`✅ Stage 3 successful with ${results.length} results.`);
      return { forumDiscussions: results };
    }

    console.log('ℹ️ All search stages failed to find results.');
    return { forumDiscussions: [] };
  }

  // --- מנועי חיפוש ---

  async runFocusedSearch(query) {
    const siteQuery = this.trustedSites.map(site => `site:${site}`).join(' OR ');
    const fullQuery = `(${siteQuery}) ${query}`;
    const results = await this.googleCustomSearch(fullQuery);
    return this.processGoogleResults(results);
  }
  
  async runGeneralSearch(query) {
    const results = await this.googleCustomSearch(query);
    return this.processGoogleResults(results);
  }

  async googleCustomSearch(query) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=7`;
      const response = await axios.get(url, { timeout: 8000 });
      return response.data?.items || [];
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      console.error(`❌ Google Search API Error (Status: ${status || 'N/A'}): ${message}`);
      return []; // החזרת מערך ריק במקום קריסה
    }
  }

  // --- עיבוד וניתוח ---
  
  processGoogleResults(items) {
      return items.map(item => ({
          title: item.title,
          url: item.link,
          source: item.displayLink,
          summary: item.snippet,
      }));
  }

  async analyzeWithClaude(deviceInfo, parsedQuery, searchResults) {
    if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY.includes('your_')) {
      return this.getFallbackAnalysis(searchResults);
    }
    try {
      const prompt = this.buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults);
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
        { headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' }, timeout: 15000 }
      );
      return this.parseClaudeResponse(response.data?.content?.[0]?.text);
    } catch (error) {
      console.error(`❌ Claude API Error: ${error.message}`);
      return this.getFallbackAnalysis(searchResults);
    }
  }

  buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults) {
    const resultsText = (searchResults.forumDiscussions || [])
      .map(d => `Source: ${d.source}\nTitle: ${d.title}\nSummary: ${d.summary}\n---`)
      .join('\n\n');
      
    if (!resultsText) {
      return `Analyze the update for device "${deviceInfo.device}" to version "${parsedQuery.version}". No specific user reports were found. Provide a generic recommendation. The response must be in JSON format: {"stabilityRating": 5, "majorIssues": ["No specific information found."], "benefits": [], "recommendation": "wait", "reasoning": "No user reports are available yet. It's recommended to wait for more information.", "confidence": "low"}`;
    }

    return `Analyze the search results for an update to "${parsedQuery.version}" on device "${deviceInfo.device}".
Search Results:
${resultsText}
Based ONLY on the provided information, generate a JSON response: {"stabilityRating": number, "majorIssues": [], "benefits": [], "recommendation": "recommended"|"wait"|"not_recommended", "reasoning": "", "confidence": "high"|"medium"|"low"}`;
  }

  parseClaudeResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return { ...JSON.parse(jsonMatch[0]), analysisMethod: 'claude' };
    } catch (e) {
      console.error('Could not parse Claude JSON response.');
    }
    return this.getFallbackAnalysis({ forumDiscussions: [] });
  }

  // --- פונקציות עזר וגיבוי ---

  getFallbackAnalysis(searchResults) {
    const hasResults = searchResults?.forumDiscussions?.length > 0;
    return {
      stabilityRating: 5,
      majorIssues: hasResults ? ["Review search results for details."] : ["Limited information available."],
      benefits: [],
      recommendation: "wait",
      reasoning: "Analysis based on limited data. It is recommended to wait for more user reports.",
      confidence: "low",
      analysisMethod: 'fallback',
    };
  }

  getErrorFallback(deviceModel, errorMessage) {
    return {
      error: errorMessage,
      searchResults: { forumDiscussions: [] },
      analysis: this.getFallbackAnalysis({ forumDiscussions: [] }),
      deviceInfo: { device: deviceModel, manufacturer: this.getManufacturer(deviceModel) },
      lastChecked: new Date(),
    };
  }
  
  getManufacturer(deviceModel) {
      const model = deviceModel.toLowerCase();
      if (model.includes('samsung') || model.includes('galaxy')) return 'Samsung';
      if (model.includes('google') || model.includes('pixel')) return 'Google';
      return 'Unknown';
  }
}

module.exports = UpdateChecker;
