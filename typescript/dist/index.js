"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
class Broker {
    constructor() {
        this.queues = new Map();
    }
    attachQueue(id, topic) {
        const segments = this.parseTopic(topic);
        this.queues.set(id, { topic: segments, messages: [] });
    }
    publish(topic, data) {
        const segments = this.parseTopic(topic);
        for (const [_, queue] of this.queues) {
            if (this.topicMatches(queue.topic, segments)) {
                queue.messages.push({ topic, data });
            }
        }
    }
    getMessages(id) {
        const queue = this.queues.get(id);
        if (!queue)
            return [];
        const messages = queue.messages.slice();
        queue.messages.length = 0;
        return messages;
    }
    parseTopic(topic) {
        return topic.split('/').filter(Boolean);
    }
    topicMatches(queueTopic, messageTopic) {
        if (queueTopic.length > messageTopic.length)
            return false;
        for (let i = 0; i < queueTopic.length; i++) {
            if (queueTopic[i] !== messageTopic[i])
                return false;
        }
        return true;
    }
}
const broker = new Broker();
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(data || '{}'));
            }
            catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}
const server = (0, http_1.createServer)(async (req, res) => {
    const url = new url_1.URL(req.url || '', `http://${req.headers.host}`);
    try {
        if (req.method === 'POST' && url.pathname === '/publish') {
            const body = await readBody(req);
            if (!body.topic)
                throw new Error('Missing topic');
            broker.publish(body.topic, body.data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        }
        else if (req.method === 'POST' && url.pathname === '/attachQueue') {
            const body = await readBody(req);
            if (!body.queueId || !body.topic)
                throw new Error('Missing parameters');
            broker.attachQueue(body.queueId, body.topic);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
        }
        else if (req.method === 'GET' && url.pathname === '/get') {
            const queueId = url.searchParams.get('queueId');
            if (!queueId)
                throw new Error('Missing queueId');
            const messages = broker.getMessages(queueId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ messages }));
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
    }
    catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Broker server running on port ${PORT}`);
});
