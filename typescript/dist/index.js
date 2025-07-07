"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
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
        for (const [, queue] of this.queues) {
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
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/publish', (req, res) => {
    const { topic, data } = req.body || {};
    if (!topic) {
        res.status(400).json({ error: 'Missing topic' });
        return;
    }
    broker.publish(topic, data);
    res.json({ status: 'ok' });
});
app.post('/attachQueue', (req, res) => {
    const { queueId, topic } = req.body || {};
    if (!queueId || !topic) {
        res.status(400).json({ error: 'Missing parameters' });
        return;
    }
    broker.attachQueue(queueId, topic);
    res.json({ status: 'ok' });
});
app.get('/get', (req, res) => {
    const queueId = req.query.queueId;
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
