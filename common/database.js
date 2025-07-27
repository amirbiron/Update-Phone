async function initializeDatabase() {
  return new Promise(resolve => {
    console.log("Simulating database connection...");
    setTimeout(() => {
      console.log("Database connection established.");
      resolve(true);
    }, 500);
  });
}

module.exports = {
  initializeDatabase
};
