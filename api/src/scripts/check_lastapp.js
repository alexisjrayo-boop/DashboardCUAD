const { pool } = require('../config/db');

async function check() {
    try {
        const [rows] = await pool.query('SELECT lastapp, COUNT(*) as count FROM cdrs GROUP BY lastapp ORDER BY count DESC');
        console.log('DISTINCT lastapp VALUES:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

check();
