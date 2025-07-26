const { 
  formatUserReports, 
  formatForumReports, 
  splitUserReports,
  hasUserReports 
} = require('./common/utils');

// יצירת נתונים לבדיקה
function createTestData() {
  return {
    redditPosts: [
      {
        title: "Reddit Post 1",
        score: 10,
        relevance: 0.9,
        sentiment: 'positive',
        selftext: "Full selftext content for Reddit post",
        url: "https://reddit.com/post1",
        userReports: [
          { content: "User report 1 from Reddit - this update has been working great for me, no issues at all", sentiment: 'positive' },
          { content: "User report 2 from Reddit - experiencing some minor bugs but overall performance is good", sentiment: 'neutral' },
          { content: "User report 3 from Reddit - battery drain seems worse after this update, not happy", sentiment: 'negative' },
          { content: "User report 4 from Reddit - camera quality improved significantly, very pleased", sentiment: 'positive' },
          { content: "User report 5 from Reddit - wifi connectivity issues appeared after update", sentiment: 'neutral' }
        ]
      }
    ],
    forumDiscussions: [
      {
        title: "Forum Discussion 1",
        source: "XDA Developers",
        url: "https://xda.com/discussion1",
        userReports: [
          { content: "User report 1 from forum - experiencing significant performance improvements after update", sentiment: 'positive', author: "User1", date: new Date() },
          { content: "User report 2 from forum - some apps crash occasionally but mostly stable", sentiment: 'neutral', author: "User2", date: new Date() },
          { content: "User report 3 from forum - major camera improvements and better battery optimization", sentiment: 'negative', author: "User3", date: new Date() },
          { content: "User report 4 from forum - no major issues, everything works as expected after update", sentiment: 'positive', author: "User4", date: new Date() }
        ]
      }
    ]
  };
}

// בדיקה עבור פונקציה formatUserReports
function testFormatUserReports() {
  console.log("=== Testing formatUserReports ===");
  const testData = createTestData();
  const result = formatUserReports(testData);
  
  console.log("Result length:", result.length);
  console.log("Result:\n", result);
  
  // ספירת כמות דיווחי המשתמשים בתוצאה
  const userReportMatches = result.match(/User report \d+ from/g);
  console.log("Number of user reports found:", userReportMatches ? userReportMatches.length : 0);
  
  return result;
}

// בדיקה עבור פונקציה splitUserReports  
function testSplitUserReports() {
  console.log("\n=== Testing splitUserReports ===");
  const testData = createTestData();
  const result = splitUserReports(testData);
  
  console.log("Number of sections:", result.length);
  result.forEach((section, index) => {
    console.log(`Section ${index + 1}:`, section.title);
    const userReportMatches = section.content.match(/User report \d+ from/g);
    console.log(`  User reports in section: ${userReportMatches ? userReportMatches.length : 0}`);
  });
  
  return result;
}

// בדיקה עבור פונקציה formatForumReports
function testFormatForumReports() {
  console.log("\n=== Testing formatForumReports ===");
  const testData = createTestData();
  const result = formatForumReports(testData.forumDiscussions);
  
  console.log("Result length:", result.length);
  console.log("Result:\n", result);
  
  const userReportMatches = result.match(/User report \d+ from/g);
  console.log("Number of user reports found:", userReportMatches ? userReportMatches.length : 0);
  
  return result;
}

// הרצת הבדיקות
console.log("🧪 Testing current behavior BEFORE changes...\n");

try {
  testFormatUserReports();
  testSplitUserReports();
  testFormatForumReports();
  
  console.log("\n✅ All tests completed successfully");
} catch (error) {
  console.error("❌ Test failed:", error);
}