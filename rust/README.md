# Rust Broker Example

This folder contains a minimal message broker implemented in Rust using the `actix-web` framework.

## Running

Build and start the server with:

```sh
cargo run --manifest-path rust/Cargo.toml
```

## API

The API matches the TypeScript implementation:

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
