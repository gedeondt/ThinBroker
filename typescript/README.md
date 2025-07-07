# TypeScript Broker Example

This folder contains a minimal message broker implemented in TypeScript using the Express framework.

## Scripts

- `npm run build` – compile the TypeScript sources into `dist`.
- `npm start` – run the compiled server.

## API

### POST /publish

Body JSON:

```
{ "topic": "/topic/sub", "data": { ... } }
```

Publishes a message. Queues attached to the topic or any parent topic receive the message.

### POST /attachQueue

Body JSON:

```
{ "queueId": "myQueue", "topic": "/topic" }
```

Registers a queue to receive messages from a topic.

### GET /get?queueId=myQueue

Retrieves and clears messages for the specified queue.
