const cdrRepository = require('../repositories/cdrRepository');

const getAllCdrs = async (filters) => {
    // 1. Get Raw Data from DB
    const rows = await cdrRepository.getStoredCdrsFromDb(filters);

    // 2. Business Logic: Post-Processing for Extensions
    // Extract real extension from channels if fields show trunk numbers
    const processedRows = rows.map(row => {
        const newRow = { ...row };

        // 1. Incoming Calls (Calltype 2) - Fix Destination
        if (newRow.calltype === '2' && newRow.destination && newRow.destination.length > 4) {
            // Try to extract from dstchannel (e.g., Local/301@... or SIP/514-...)
            if (newRow.dstchannel) {
                const match = newRow.dstchannel.match(/(?:Local|SIP)\/(\d+)[@-]/);
                if (match && match[1]) {
                    newRow.destination = match[1];
                }
            }
        }

        // 2. Outgoing Calls (Calltype 3) - Fix Source (src)
        if (newRow.calltype === '3' && newRow.src && newRow.src.length > 4) {
            // Try to extract from channel (e.g., Local/301@... or SIP/514-...)
            if (newRow.channel) {
                const match = newRow.channel.match(/(?:Local|SIP)\/(\d+)[@-]/);
                if (match && match[1]) {
                    newRow.src = match[1];
                }
            }
        }

        return newRow;
    });

    return processedRows;
};

module.exports = {
    getAllCdrs
};
