const axios = require('axios');

class UpdateChecker {
  constructor() {
    this.trustedSites = [
      'reddit.com', 'xda-developers.com', 'androidpolice.com', 
      'androidauthority.com', 'gsmarena.com', 'sammobile.com', '9to5google.com'
    ];
    this.redditApiUrl = 'https://www.reddit.com';
    this.duckDuckGoApiUrl = 'https://api.duckduckgo.com/';
  }

  // פונקציה ראשית שהבוט קורא לה
  async checkForUpdates(deviceModel, currentVersion) {
    try {
      console.log(`🔍 [checkForUpdates] Starting search for ${deviceModel} version ${currentVersion}`);
      const deviceInfo = { device: deviceModel, manufacturer: this.getManufacturer(deviceModel) };
      const parsedQuery = { version: currentVersion };
      
      const searchResults = await this.gatherInformation(deviceInfo, parsedQuery);
      
      console.log(`🧠 [checkForUpdates] Starting analysis...`);
      const analysisResult = await this.analyzeWithClaude(deviceInfo, parsedQuery, searchResults);
      
      return {
        searchResults,
        analysis: analysisResult,
        deviceInfo,
        lastChecked: new Date(),
        sources: this.trustedSites,
      };
    } catch (error) {
      console.error(`❌ FATAL ERROR in [checkForUpdates]:`, error.message);
      return this.getErrorFallback(deviceModel, currentVersion, error.message);
    }
  }

  // איסוף מידע עם תוכנית גיבוי
  async gatherInformation(deviceInfo, parsedQuery) {
    // שלב 1: ניסיון חיפוש ממוקד עם Google Custom Search API
    const hasGoogleAPI = process.env.GOOGLE_SEARCH_API_KEY && !process.env.GOOGLE_SEARCH_API_KEY.includes('your_');
    if (hasGoogleAPI) {
      console.log('⭐ Primary Method: Attempting Google Custom Search API.');
      const siteQuery = this.trustedSites.map(site => `site:${site}`).join(' OR ');
      const mainQuery = `(${siteQuery}) "${deviceInfo.device}" "${parsedQuery.version}" update`;
      
      const googleResults = await this.googleCustomSearch(mainQuery);
      if (googleResults && googleResults.length > 0) {
        console.log(`✅ Google Search successful with ${googleResults.length} results.`);
        return { forumDiscussions: this.processGoogleResults(googleResults) };
      }
      console.log('⚠️ Google Search returned no results. Proceeding to fallback methods.');
    } else {
      console.log('⚠️ Google API not configured. Using fallback methods.');
    }

    // שלב 2: תוכנית גיבוי - חיפוש ישיר ב-Reddit וב-DuckDuckGo
    console.log('🔄 Fallback Method: Searching Reddit and DuckDuckGo directly.');
    const searchQuery = `"${deviceInfo.device}" "${parsedQuery.version}" update`;
    
    const [redditResults, duckduckgoResults] = await Promise.all([
      this.searchRedditDirect(searchQuery),
      this.searchDuckDuckGo(searchQuery)
    ]);

    const combinedResults = [...redditResults, ...duckduckgoResults];
    
    if (combinedResults.length === 0) {
        console.log(`ℹ️ [gatherInformation] No results found from any source.`);
    }

    return { forumDiscussions: combinedResults };
  }

  // --- שיטות חיפוש ---

  async googleCustomSearch(query) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
      const response = await axios.get(url, { timeout: 7000 });
      return response.data?.items || [];
    } catch (error) {
      console.error(`❌ Google Search API Error: ${error.message}`);
      return [];
    }
  }

  async searchRedditDirect(query) {
    try {
      const url = `${this.redditApiUrl}/search.json?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=5`;
      const response = await axios.get(url, { headers: {'User-Agent': 'UpdateBot/1.0'}, timeout: 5000 });
      const posts = response.data?.data?.children || [];
      return posts.map(post => ({
        title: post.data.title,
        url: `${this.redditApiUrl}${post.data.permalink}`,
        source: `reddit.com/r/${post.data.subreddit}`,
        summary: post.data.selftext || post.data.title,
      }));
    } catch (error) {
      console.error(`❌ Reddit direct search Error: ${error.message}`);
      return [];
    }
  }

  async searchDuckDuckGo(query) {
    try {
      const siteQuery = this.trustedSites
        .filter(site => site !== 'reddit.com') // כבר חיפשנו ברדיט
        .map(site => `site:${site}`).join(' OR ');
      const fullQuery = `(${siteQuery}) ${query}`;
      const url = `${this.duckDuckGoApiUrl}?q=${encodeURIComponent(fullQuery)}&format=json&no_html=1`;
      const response = await axios.get(url, { headers: {'User-Agent': 'UpdateBot/1.0'}, timeout: 5000 });
      const results = response.data?.Results || response.data?.RelatedTopics || [];
      return results.slice(0, 5).map(result => ({
        title: result.Text,
        url: result.FirstURL,
        source: new URL(result.FirstURL).hostname,
        summary: result.Text,
      }));
    } catch (error) {
      console.error(`❌ DuckDuckGo search Error: ${error.message}`);
      return [];
    }
  }

  // --- עיבוד וניתוח ---

  processGoogleResults(results) {
    return results.map(result => ({
      title: result.title,
      url: result.link,
      source: result.displayLink,
      summary: result.snippet,
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
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          timeout: 15000,
        }
      );
      return this.parseClaudeResponse(response.data?.content?.[0]?.text);
    } catch (error) {
      console.error(`❌ Claude API Error: ${error.message}`);
      return this.getFallbackAnalysis(searchResults);
    }
  }

  buildAnalysisPrompt(deviceInfo, parsedQuery, searchResults) {
    const resultsText = (searchResults.forumDiscussions || [])
      .slice(0, 5)
      .map(d => `Source: ${d.source}\nTitle: ${d.title}\nSummary: ${d.summary}\n---`)
      .join('\n\n');
      
    if (!resultsText) {
        return `Analyze the update for device "${deviceInfo.device}" to version "${parsedQuery.version}". No specific user reports were found. Provide a generic recommendation based on the device's age and type. The response must be in JSON format: {"stabilityRating": 5, "majorIssues": ["No specific information found."], "benefits": [], "recommendation": "wait", "reasoning": "No user reports are available yet. It's recommended to wait for more information.", "confidence": "low"}`;
    }

    return `Analyze the following search results for an update to "${parsedQuery.version}" on the device "${deviceInfo.device}".
Search Results:
${resultsText}

Based ONLY on the provided information, generate a JSON response with the following structure:
{
  "stabilityRating": number (1-10),
  "majorIssues": ["List of key reported issues"],
  "benefits": ["List of key reported benefits"],
  "recommendation": "recommended" | "wait" | "not_recommended",
  "reasoning": "A brief explanation for your recommendation.",
  "confidence": "high" | "medium" | "low"
}`;
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

  getFallbackAnalysis(searchResults) {
    const hasResults = searchResults.forumDiscussions && searchResults.forumDiscussions.length > 0;
    return {
      stabilityRating: hasResults ? 6 : 5,
      majorIssues: hasResults ? ["Check sources for details"] : ["Limited information available"],
      benefits: [],
      recommendation: "wait",
      reasoning: "Analysis is based on limited data. It is recommended to wait for more information.",
      confidence: "low",
      analysisMethod: 'fallback',
    };
  }

  getErrorFallback(deviceModel, currentVersion, errorMessage) {
    return {
        error: errorMessage,
        searchResults: { forumDiscussions: [] },
        analysis: this.getFallbackAnalysis({ forumDiscussions: [] }),
        deviceInfo: { device: deviceModel, manufacturer: this.getManufacturer(deviceModel) },
        lastChecked: new Date(),
        sources: [],
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
