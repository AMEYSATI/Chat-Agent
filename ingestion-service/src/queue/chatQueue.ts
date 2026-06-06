import { Queue } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is missing from environment variables!');
}

const redisUri = new URL(redisUrl);

export const connectionOptions = {
  host: redisUri.hostname,
  port: parseInt(redisUri.port || '6379'),
  username: redisUri.username || undefined,
  password: redisUri.password || undefined,
  tls: {},
  maxRetriesPerRequest: null,
};


export const chatQueue = new Queue('chat-processing', {
  connection: connectionOptions,
});

export async function addChatJob(sessionId: string, text: string) {
  return await chatQueue.add('process-message', { sessionId, text });
}