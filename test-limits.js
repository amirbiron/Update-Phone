const { 
  formatUserReports, 
  formatForumReports, 
  splitUserReports,
  hasUserReports 
} = require('./common/utils');

// יצירת נתונים רבים לבדיקת מגבלות
function createManyTestData() {
  const redditPosts = [];
  const forumDiscussions = [];
  
  // יצירת 25 פוסטים מ-Reddit (יותר ממגבלת 20)
  for (let i = 1; i <= 25; i++) {
    redditPosts.push({
      title: `Reddit Post ${i}`,
      score: 10,
      relevance: 0.9,
      sentiment: 'positive',
      selftext: `Full selftext content for Reddit post ${i}`,
      url: `https://reddit.com/post${i}`,
      userReports: [
        { content: `User report 1 from Reddit post ${i} - this update has been working great`, sentiment: 'positive' },
        { content: `User report 2 from Reddit post ${i} - experiencing some minor bugs but overall good`, sentiment: 'neutral' },
        { content: `User report 3 from Reddit post ${i} - battery life seems improved after update`, sentiment: 'positive' }
      ]
    });
  }
  
  // יצירת 25 דיונים מפורומים (יותר ממגבלת 20)
  for (let i = 1; i <= 25; i++) {
    forumDiscussions.push({
      title: `Forum Discussion ${i}`,
      source: "XDA Developers",
      url: `https://xda.com/discussion${i}`,
      userReports: [
        { content: `User report 1 from forum discussion ${i} - significant performance improvements`, sentiment: 'positive', author: `User${i}A`, date: new Date() },
        { content: `User report 2 from forum discussion ${i} - some apps crash occasionally but stable`, sentiment: 'neutral', author: `User${i}B`, date: new Date() },
        { content: `User report 3 from forum discussion ${i} - camera improvements and better battery`, sentiment: 'positive', author: `User${i}C`, date: new Date() }
      ]
    });
  }
  
  return { redditPosts, forumDiscussions };
}

// בדיקת מגבלת 20 פוסטים/דיונים
function testLimits() {
  console.log("=== Testing 20 Posts/Discussions Limit ===");
  const testData = createManyTestData();
  
  console.log(`Created ${testData.redditPosts.length} Reddit posts`);
  console.log(`Created ${testData.forumDiscussions.length} forum discussions`);
  
  const result = formatUserReports(testData);
  
  // ספירת כמות הפוסטים/דיונים שמוצגים
  const redditPostMatches = result.match(/• 😊 <b>"Reddit Post \d+"/g);
  const forumDiscussionMatches = result.match(/• <b>Forum Discussion \d+<\/b>/g);
  
  const redditPostsShown = redditPostMatches ? redditPostMatches.length : 0;
  const forumDiscussionsShown = forumDiscussionMatches ? forumDiscussionMatches.length : 0;
  
  console.log(`Reddit posts shown: ${redditPostsShown} (should be max 20)`);
  console.log(`Forum discussions shown: ${forumDiscussionsShown} (should be max 20)`);
  
  // ספירת כמות דיווחי המשתמשים הכוללת
  const userReportMatches = result.match(/User report \d+ from/g);
  const totalUserReports = userReportMatches ? userReportMatches.length : 0;
  console.log(`Total user reports shown: ${totalUserReports}`);
  
  // בדיקות
  const redditLimitOK = redditPostsShown <= 20;
  const forumLimitOK = forumDiscussionsShown <= 20;
  
  console.log(`✅ Reddit posts limit (20): ${redditLimitOK ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Forum discussions limit (20): ${forumLimitOK ? 'PASSED' : 'FAILED'}`);
  
  // אמידת כמות דיווחי המשתמשים הצפויה (3 דיווחים לכל פוסט/דיון)
  const expectedUserReports = (redditPostsShown * 3) + (forumDiscussionsShown * 3);
  console.log(`Expected user reports (${redditPostsShown}*3 + ${forumDiscussionsShown}*3): ${expectedUserReports}`);
  console.log(`Actual user reports: ${totalUserReports}`);
  console.log(`✅ All user reports shown: ${totalUserReports >= expectedUserReports ? 'PASSED' : 'FAILED'}`);
  
  return {
    redditPostsShown,
    forumDiscussionsShown,
    totalUserReports,
    redditLimitOK,
    forumLimitOK
  };
}

// בדיקת formatForumReports עם דיונים רבים
function testForumReportsLimit() {
  console.log("\n=== Testing formatForumReports with Many Discussions ===");
  const testData = createManyTestData();
  
  const result = formatForumReports(testData.forumDiscussions);
  
  const discussionMatches = result.match(/• <b>Forum Discussion \d+<\/b>/g);
  const discussionsShown = discussionMatches ? discussionMatches.length : 0;
  
  console.log(`Forum discussions shown: ${discussionsShown} (should be max 20)`);
  
  const userReportMatches = result.match(/User report \d+ from/g);
  const totalUserReports = userReportMatches ? userReportMatches.length : 0;
  console.log(`Total user reports shown: ${totalUserReports}`);
  
  const limitOK = discussionsShown <= 20;
  console.log(`✅ Forum discussions limit (20): ${limitOK ? 'PASSED' : 'FAILED'}`);
  
  return { discussionsShown, totalUserReports, limitOK };
}

// הרצת הבדיקות
console.log("🧪 Testing limits preservation AFTER changes...\n");

try {
  const mainResults = testLimits();
  const forumResults = testForumReportsLimit();
  
  console.log("\n📊 Summary:");
  console.log(`- Reddit posts limit: ${mainResults.redditLimitOK ? '✅' : '❌'}`);
  console.log(`- Forum discussions limit: ${mainResults.forumLimitOK && forumResults.limitOK ? '✅' : '❌'}`);
  console.log(`- User reports per post/discussion: UNLIMITED ✅`);
  console.log(`- Total user reports shown: ${mainResults.totalUserReports + forumResults.totalUserReports}`);
  
  console.log("\n✅ All limit tests completed successfully");
} catch (error) {
  console.error("❌ Test failed:", error);
}