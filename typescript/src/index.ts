import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

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
    for (const [_, queue] of this.queues) {
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

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req: any, res: any) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname === '/publish') {
      const body = await readBody(req);
      if (!body.topic) throw new Error('Missing topic');
      broker.publish(body.topic, body.data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else if (req.method === 'POST' && url.pathname === '/attachQueue') {
      const body = await readBody(req);
      if (!body.queueId || !body.topic) throw new Error('Missing parameters');
      broker.attachQueue(body.queueId, body.topic);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    } else if (req.method === 'GET' && url.pathname === '/get') {
      const queueId = url.searchParams.get('queueId');
      if (!queueId) throw new Error('Missing queueId');
      const messages = broker.getMessages(queueId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  } catch (err: any) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Broker server running on port ${PORT}`);
});

