import express from 'express';

interface Queue {
  topic: string[];
  messages: any[];
}

class Broker {
  private queues: Map<string, Queue> = new Map();

  attachQueue(id: string, topic: string) {
    const segments = this.parseTopic(topic);
    this.queues.set(id, { topic: segments, messages: [] });
  }

  publish(topic: string, data: any) {
    const segments = this.parseTopic(topic);
    for (const [, queue] of this.queues) {
      if (this.topicMatches(queue.topic, segments)) {
        queue.messages.push({ topic, data });
      }
    }
  }

  getMessages(id: string): any[] {
    const queue = this.queues.get(id);
    if (!queue) return [];
    const messages = queue.messages.slice();
    queue.messages.length = 0;
    return messages;
  }

  private parseTopic(topic: string): string[] {
    return topic.split('/').filter(Boolean);
  }

  private topicMatches(queueTopic: string[], messageTopic: string[]): boolean {
    if (queueTopic.length > messageTopic.length) return false;
    for (let i = 0; i < queueTopic.length; i++) {
      if (queueTopic[i] !== messageTopic[i]) return false;
    }
    return true;
  }
}

const broker = new Broker();
const app = express();
app.use(express.json());

app.post('/publish', (req: any, res: any) => {
  const { topic, data } = req.body || {};
  if (!topic) {
    res.status(400).json({ error: 'Missing topic' });
    return;
  }
  broker.publish(topic, data);
  res.json({ status: 'ok' });
});

app.post('/attachQueue', (req: any, res: any) => {
  const { queueId, topic } = req.body || {};
  if (!queueId || !topic) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }
  broker.attachQueue(queueId, topic);
  res.json({ status: 'ok' });
});

app.get('/get', (req: any, res: any) => {
  const queueId = req.query.queueId as string;
  if (!queueId) {
    res.status(400).json({ error: 'Missing queueId' });
    return;
  }
  const messages = broker.getMessages(queueId);
  res.json({ messages });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Broker server running on port ${PORT}`);
});
