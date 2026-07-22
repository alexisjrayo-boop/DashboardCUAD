
function testLogic(row) {
    let linea_receptora = null;
    // Mocking row access based on format
    let calltype, dstVal;

    if (Array.isArray(row)) {
        calltype = row[25];
        dstVal = row[5] ? String(row[5]) : '';
    } else {
        calltype = row.calltype;
        dstVal = row.dst ? String(row.dst) : '';
    }

    if (calltype === 'Incoming') {
        if (dstVal.startsWith('5')) {
            linea_receptora = "TUXTEPEC (2878750303 - 2878759701)";
        } else if (dstVal.startsWith('7')) {
            linea_receptora = "SALINA CRUZ 9716884348";
        } else if (dstVal.startsWith('6')) {
            linea_receptora = "JUCHITAN 9717120739";
        } else if (dstVal.startsWith('3')) {
            linea_receptora = "CORDOBA";
        }
    }
    return linea_receptora;
}

// Test Cases
const cases = [
    { name: "Tuxtepec Match", row: { calltype: 'Incoming', dst: '501' }, expected: "TUXTEPEC (2878750303 - 2878759701)" },
    { name: "Salina Cruz Match", row: { calltype: 'Incoming', dst: '702' }, expected: "SALINA CRUZ 9716884348" },
    { name: "Juchitan Match", row: { calltype: 'Incoming', dst: '605' }, expected: "JUCHITAN 9717120739" },
    { name: "Cordoba Match", row: { calltype: 'Incoming', dst: '301' }, expected: "CORDOBA" },
    { name: "No Match", row: { calltype: 'Incoming', dst: '800' }, expected: null },
    { name: "Outgoing Call", row: { calltype: 'Outgoing', dst: '501' }, expected: null },
    { name: "Array Format Tuxtepec", row: [0, 0, 0, 0, 0, '555', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Incoming'], expected: "TUXTEPEC (2878750303 - 2878759701)" }
];

let failed = false;
cases.forEach(c => {
    const result = testLogic(c.row);
    if (result === c.expected) {
        console.log(`PASS: ${c.name}`);
    } else {
        console.error(`FAIL: ${c.name}. Expected '${c.expected}', got '${result}'`);
        failed = true;
    }
});

if (failed) process.exit(1);
