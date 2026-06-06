import { Worker, Job } from 'bullmq';
import {Redis} from 'ioredis';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { sequelize, Message } from '../db/database.js';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.get('/health', (req, res) => {
  res.status(200).send('Worker service is actively consuming BullMQ queues!');
});

app.listen(PORT, () => {
  console.log(`Service active on port ${PORT}`);
});

// I used the above express server to host worker service as web service since background worker service requires monthly billing but webservice was free.

const redisUrl = process.env.REDIS_URL;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!redisUrl) {
  throw new Error('REDIS_URL is missing from environment variables!');
}

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is missing from environment variables!');
}

const redisUri = new URL(redisUrl);

const connectionOptions = {
  host: redisUri.hostname,
  port: parseInt(redisUri.port || '6379'),
  username: redisUri.username || undefined,
  password: redisUri.password || undefined,
  tls: {},
  maxRetriesPerRequest: null,
};

const redisPublisher = new Redis(connectionOptions);


const ai = new GoogleGenAI({ apiKey: geminiApiKey });

console.log('Background Worker engine initialized. Standing by for jobs...');

const worker = new Worker(
  'chat-processing',
  async (job: Job) => {
    const { sessionId, text } = job.data;
    const channelName = `chat:reply:${sessionId}`;

    console.log(`[Job ${job.id}] Processing message for session: ${sessionId}`);

    try {
        const historicalMessages = await Message.findAll({
        where: { conversationId: sessionId },
        order: [['createdAt', 'ASC']],
        limit: 10,
    });

        const contentsPayload = historicalMessages.map((msg) => ({
        role: msg.get('sender') === 'user' ? 'user' : 'model',
        parts: [{ text: String(msg.get('text') || '') }],
    }));

        contentsPayload.push({
        role: 'user',
        parts: [{ text: String(text || '') }]
    });


      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsPayload,
        config: {
          systemInstruction: 'You are a helpful customer support agent for Spur. Keep answers concise, factual, and professional.',
        },
      });
      const aiReply = response.text || "I'm sorry, I generated an empty response.";

      await Message.create({
        conversationId: sessionId,
        sender: 'ai',
        text: aiReply,
      });


      await redisPublisher.publish(channelName, aiReply);
      console.log(`[Job ${job.id}] Successfully delivered response.`);

    } catch (error) {
      console.error(`Error processing Job ${job.id}:`, error);

      const fallbackText = "I'm sorry, I encountered an internal connection error. Please try again shortly.";

      try {
        
        await Message.create({
          conversationId: sessionId,
          sender: 'ai',
          text: fallbackText,
        });
        
       
        await redisPublisher.publish(channelName, fallbackText);
      } catch (pubError) {
        console.error('Failed to issue emergency fallback broadcast:', pubError);
      }
    }
  },
  {
    connection: connectionOptions,
    concurrency: 5, 
  }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed fundamentally:`, err);
});
