const {exec} = require('child_process');
const currentDate = new Date();

const backupCommand = `sqlite3 STORAGE PATH ".backup STORAGE PATH/backup_${currentDate.toISOString()}.db"`;// Update with your database file path

exec(backupCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Backup failed: ${stderr}`);
  } else {
    console.log(`Backup successful: backup_${currentDate.toISOString()}.db`);
  }
});