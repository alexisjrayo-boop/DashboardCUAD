const { pool } = require('../config/db');

const addIndexes = async () => {
    const indexes = [
        { name: 'idx_calldate', col: 'calldate' },
        { name: 'idx_disposition', col: 'disposition' },
        { name: 'idx_src_dst', col: 'src, destination' }, // Composite index often helps
        { name: 'idx_destination', col: 'destination' }, // Individual for single column lookup
        { name: 'idx_src', col: 'src' }, // Individual for single column lookup
        { name: 'idx_calltype', col: 'calltype' }
    ];

    console.log('Starting Database Optimization...');

    const connection = await pool.getConnection();

    try {
        for (const idx of indexes) {
            try {
                // Check if index exists is tricky in standard SQL without querying schema, 
                // but simpler is to try create and catch "Duplicate key name" error.
                // Or better, querying information_schema

                const [rows] = await connection.query(
                    `SELECT COUNT(1) IndexIsThere FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE table_schema=DATABASE() AND table_name='cdrs' AND index_name=?`,
                    [idx.name]
                );

                if (rows[0].IndexIsThere === 0) {
                    console.log(`Adding index: ${idx.name} on (${idx.col})...`);
                    await connection.query(`CREATE INDEX ${idx.name} ON cdrs (${idx.col})`);
                    console.log(`✓ Index ${idx.name} added.`);
                } else {
                    console.log(`- Index ${idx.name} already exists.`);
                }

            } catch (err) {
                console.error(`Error processing index ${idx.name}:`, err.message);
            }
        }

        console.log('Optimization Complete.');

    } catch (error) {
        console.error('Fatal DB Error:', error);
    } finally {
        connection.release();
        process.exit();
    }
};

addIndexes();
