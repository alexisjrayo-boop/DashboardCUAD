const tests = [
    {
        desc: 'Incoming: Trunk Dest with Local Channel',
        row: {
            calltype: '2',
            destination: '9717120739',
            dstchannel: 'Local/301@cos-all-00000de7;1'
        },
        expected: { destination: '301' }
    },
    {
        desc: 'Incoming: SIP Channel (Fix for User Report)',
        row: {
            calltype: '2',
            destination: '2878750303',
            dstchannel: 'SIP/514-00005c35'
        },
        expected: { destination: '514' }
    },
    {
        desc: 'Incoming: SIP Channel complex (New User Report)',
        row: {
            calltype: '2',
            destination: '2878750303',
            dstchannel: 'SIP/301-yj54uj325r-00005ca1'
        },
        expected: { destination: '301' }
    },
    {
        desc: 'Outgoing: Trunk Src with Local Channel',
        row: {
            calltype: '3',
            src: '9717120739',
            channel: 'Local/381@cos-all-00000de8;1'
        },
        expected: { src: '381' }
    },
    {
        desc: 'Incoming: SIP Channel (No change expected - Trunk logic)',
        row: {
            calltype: '2',
            destination: '9717120739',
            dstchannel: 'SIP/172.25.109.193-00005c31'
        },
        expected: { destination: '9717120739' }
    }
];

// Logic Implementation Copy
const processRow = (row) => {
    const newRow = { ...row };

    // 1. Incoming Calls
    if (newRow.calltype === '2' && newRow.destination && newRow.destination.length > 4) {
        if (newRow.dstchannel) {
            const match = newRow.dstchannel.match(/(?:Local|SIP)\/(\d+)[@-]/);
            if (match && match[1]) {
                newRow.destination = match[1];
            }
        }
    }

    // 2. Outgoing Calls
    if (newRow.calltype === '3' && newRow.src && newRow.src.length > 4) {
        if (newRow.channel) {
            const match = newRow.channel.match(/(?:Local|SIP)\/(\d+)[@-]/);
            if (match && match[1]) {
                newRow.src = match[1];
            }
        }
    }

    return newRow;
};

console.log('Running Tests...');
tests.forEach(test => {
    const output = processRow(test.row);
    const passed = Object.keys(test.expected).every(key => output[key] === test.expected[key]);
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.desc}`);
    if (!passed) {
        console.log('  Input:', test.row);
        console.log('  Expected:', test.expected);
        console.log('  Actual:', output);
    }
});
