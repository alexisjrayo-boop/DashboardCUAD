const { pool } = require('../config/db');

async function run() {
    try {
        const [rows] = await pool.query(`
            SELECT MIN(calldate) as minDate, MAX(calldate) as maxDate, COUNT(*) as count 
            FROM cdrs 
            WHERE calltype = '2' AND (destination = '301' OR dstchannel REGEXP '(Local|SIP|PJSIP)/(301)[@-]')
        `);
        console.log('301 Incoming calls Date range:');
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
