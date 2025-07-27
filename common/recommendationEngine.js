function generateRecommendation(releaseYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - releaseYear;

    if (age <= 1) {
        return "מכשיר חדש ומומלץ! תומך בכל העדכונים האחרונים.";
    }
    if (age <= 3) {
        return "מכשיר מצוין, עדיין רלוונטי ויקבל עדכונים בשנים הקרובות.";
    }
    if (age <= 5) {
        return "מכשיר סביר, אך ייתכן שלא יקבל עדכוני תוכנה גדולים בעתיד.";
    }
    return "מכשיר ישן. מומלץ לשקול שדרוג.";
}

module.exports = {
    generateRecommendation
};
