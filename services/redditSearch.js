const axios = require('axios');

let accessToken = null;
let tokenExpiresAt = 0;

// פונקציה לקבלת אסימון גישה מ-Reddit
async function getRedditAccessToken() {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Reddit API credentials are not defined.');
    }

    // אם יש לנו אסימון והוא עדיין בתוקף, נשתמש בו
    if (accessToken && Date.now() < tokenExpiresAt) {
        return accessToken;
    }

    console.log('Requesting new Reddit access token...');
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    try {
        const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
            'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        // שמירת תוקף האסימון (פחות דקה ליתר ביטחון)
        tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
        console.log('Successfully obtained new Reddit access token.');
        return accessToken;
    } catch (error) {
        console.error('Failed to get Reddit access token:', error.response ? error.response.data : error.message);
        throw new Error('Could not authenticate with Reddit.');
    }
}

// פונקציית החיפוש המעודכנת
async function searchReddit(query) {
    try {
        const token = await getRedditAccessToken();
        const url = `https://oauth.reddit.com/search.json`; // שימוש ב-oauth.reddit.com לאימות
        
        const params = {
            q: query,
            limit: 20,
            sort: 'relevance',
            t: 'all', // חפש בכל הזמנים
            restrict_sr: false // חפש בכל רדיט ולא בסאברדיט ספציפי
        };

        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            params
        });

        if (response.data && response.data.data && response.data.data.children) {
            return response.data.data.children
                .map(post => {
                    // שלב כותרת ותוכן כדי לקבל יותר הקשר
                    const title = post.data.title || '';
                    const selftext = post.data.selftext || '';
                    return `${title}\n${selftext}`.trim();
                })
                .filter(text => text && text.length > 10); // סנן תוצאות ריקות או קצרות מדי
        }
        return [];
    } catch (error) {
        console.error('Error fetching data from Reddit:', error.response ? error.response.data : error.message);
        // במקרה של שגיאה, נחזיר מערך ריק כדי לא לעצור את כל התהליך
        return [];
    }
}

module.exports = { searchReddit };
