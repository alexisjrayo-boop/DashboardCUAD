
const { pool } = require('../src/config/db');
require('dotenv').config({ path: '../.env' });

async function check() {
    try {
        const [rows] = await pool.query('DESCRIBE cdrs');
        console.log('Columns in cdrs table:');
        rows.forEach(row => console.log(row.Field));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
