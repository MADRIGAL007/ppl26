
import * as db from './db';

const run = async () => {
    await db.initDB();
    setTimeout(async () => {
        const users = await db.getAllUsers();
        console.log('--- USERS ---');
        users.forEach(u => {
            console.log(`User: ${u.username}, Role: ${u.role}, Code: ${u.uniqueCode}, Pass: ${u.password}`);
        });
        console.log('-------------');
        process.exit(0);
    }, 1000);
};
run();
