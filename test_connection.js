const net = require('net');

function testPort(host, port) {
    return new Promise((resolve) => {
        const sock = new net.Socket();
        sock.setTimeout(3000);
        sock.on('connect', () => {
            console.log(`✅ Port ${port} sur ${host} : OUVERT`);
            sock.destroy();
            resolve(true);
        });
        sock.on('error', (e) => {
            console.log(`❌ Port ${port} sur ${host} : ${e.message}`);
            resolve(false);
        });
        sock.on('timeout', () => {
            console.log(`⏱️ Port ${port} sur ${host} : TIMEOUT (3s)`);
            sock.destroy();
            resolve(false);
        });
        sock.connect(port, host);
    });
}

async function main() {
    console.log('=== Test de connectivité SQL Server ===\n');
    
    // Test 1: Port 1433 (default instance)
    await testPort('DLADIR2017', 1433);
    
    // Test 2: Try common dynamic ports for SQLEXPRESS
    const commonPorts = [1433, 1434, 2433, 3433, 4433, 5433, 6433, 7433, 8433, 9433, 
                         10333, 11333, 12333, 13333, 14333, 15333, 16333, 17333, 18333, 19333,
                         20333, 21333, 22333, 23333, 24333, 25333, 26333, 27333, 28333, 29333,
                         30333, 31333, 32333, 33333, 34333, 35333, 36333, 37333, 38333, 39333,
                         40333, 41333, 42333, 43333, 44333, 45333, 46333, 47333, 48333, 49333,
                         50333, 51333, 52333, 53333, 54333, 55333, 56333, 57333, 58333, 59333,
                         49671, 49751, 49831, 49911, 49991, 50001, 50011];
    
    for (const port of commonPorts) {
        await testPort('DLADIR2017', port);
    }
    
    console.log('\n=== Test terminé ===');
}

main().catch(console.error);
