
import { Redis } from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyRedis() {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const username = process.env.REDIS_USERNAME;
    const password = process.env.REDIS_PASSWORD;

    console.log(`Connecting to Redis at ${host}:${port} with user: ${username}`);

    const client = new Redis({
        host,
        port,
        username,
        password,
        lazyConnect: true,
    });

    try {
        await client.connect();
        console.log('Successfully connected to Redis!');
        const ping = await client.ping();
        console.log(`Ping response: ${ping}`);
        await client.quit();
        process.exit(0);
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
}

verifyRedis();
