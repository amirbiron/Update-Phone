# שימוש בNode.js LTS Alpine image (קטן ומהיר)
FROM node:18-alpine

# הגדרת תיקיית העבודה
WORKDIR /app

# העתקת package files
COPY package*.json ./

# יצירת משתמש לא-root לאבטחה
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# התקנת תלויות
RUN npm install --omit=dev && npm cache clean --force

# העתקת קבצי האפליקציה
COPY --chown=nodeuser:nodejs . .

# יצירת תיקיות נדרשות
RUN mkdir -p logs && chown -R nodeuser:nodejs logs
RUN mkdir -p temp && chown -R nodeuser:nodejs temp

# הגדרת הרשאות
RUN chmod +x node_modules/.bin/*

# החלפה למשתמש לא-root
USER nodeuser

# חשיפת הפורט
EXPOSE 3000

# בדיקת בריאות
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# הפעלת האפליקציה
CMD ["npm", "start"]
