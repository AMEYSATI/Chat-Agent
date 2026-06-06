import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {Redis} from 'ioredis';
import { sequelize, Conversation, Message } from './db/database.js';
import { addChatJob, connectionOptions } from './queue/chatQueue.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.post('/chat/message', async (req, res): Promise<any> => {
  const { sessionId, message } = req.body;

 
  if (!sessionId || !message || !message.trim()) {
    return res.status(400).json({ error: 'Missing sessionId or valid message text.' });
  }

  try {

    await Conversation.findOrCreate({ where: { id: sessionId } });

    await Message.create({ conversationId: sessionId, sender: 'user', text: message.trim() });

    const redisSubscriber = new Redis(connectionOptions);
    const channelName = `chat:reply:${sessionId}`;
    await redisSubscriber.subscribe(channelName);

    await addChatJob(sessionId, message.trim());

    const workerReply: string = await new Promise((resolve) => {
      redisSubscriber.on('message', (channel, msg) => {
        if (channel === channelName) {
          resolve(msg); 
        }
      });
    });

    await redisSubscriber.unsubscribe(channelName);
    await redisSubscriber.quit();

    return res.json({ reply: workerReply });

  } catch (error) {
    console.error('Ingestion pipeline error:', error);
    return res.status(500).json({ error: 'Internal pipeline error occurred.' });
  }
});

app.get('/chat/history/:sessionId', async (req, res): Promise<any> => {
  try {
    const messages = await Message.findAll({
      where: { conversationId: req.params.sessionId },
      order: [['createdAt', 'ASC']],
    });
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: 'Could not fetch history.' });
  }
});

async function startServer() {
  try {
    await sequelize.sync({ alter: true }); 
    console.log('Supabase PostgreSQL synced successfully via Sequelize.');
    
    app.listen(PORT, () => {
      console.log(`Ingestion Gateway listening live on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

startServer();
