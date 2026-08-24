const { pool } = require('../config/db');

async function run() {
    try {
        // Check calls in general for 301
        const [rows] = await pool.query(`
            SELECT calltype, destination, dst, dstchannel, count(*) as count 
            FROM cdrs 
            WHERE (destination = '301' OR dst = '301' OR dstchannel LIKE '%301%')
            GROUP BY calltype, destination, dst, dstchannel
            LIMIT 20
        `);
        console.log('301 Matches:');
        console.log(JSON.stringify(rows, null, 2));

        // Let's also check how many calltype = '2' exist for 301
        const [rows2] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM cdrs 
            WHERE calltype = '2' AND (destination = '301' OR dstchannel REGEXP '(Local|SIP|PJSIP)/(301)[@-]')
        `);
        console.log('Total calltype=2 with current filter query:');
        console.log(rows2);
        
        // Let's check if there are any dstchannel with 301
        const [rows3] = await pool.query(`
            SELECT dstchannel, COUNT(*) as c 
            FROM cdrs 
            WHERE dstchannel LIKE '%301%' 
            GROUP BY dstchannel 
            LIMIT 5
        `);
        console.log('dstchannel with 301 examples:');
        console.log(rows3);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
