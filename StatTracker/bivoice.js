const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('STORAGE PATH'); // Update with your database file path

const currentDate = new Date();

// Update the specified column for all rows
const updateCommand = `
  UPDATE users
  SET bi_voice = 0.0
`;

db.run(updateCommand, (error) => {
  if (error) {
    console.error(`Update failed: ${error.message}`);
  } else {
    console.log('Update successful.');
  }

  // Close the database connection
  db.close();
});