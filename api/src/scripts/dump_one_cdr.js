const { pool } = require('../config/db');

async function dump() {
    try {
        const [rows] = await pool.query('SELECT * FROM cdrs LIMIT 5');
        console.log('CDR ROWS:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

dump();
