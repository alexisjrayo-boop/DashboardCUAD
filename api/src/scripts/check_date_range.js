const { pool } = require('../config/db');

async function run() {
    try {
        const [rows] = await pool.query('SELECT MIN(calldate) as minDate, MAX(calldate) as maxDate, COUNT(*) as total FROM cdrs');
        console.log('CDR DATE RANGE:');
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
