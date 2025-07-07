# Java Broker Example

This folder contains a minimal message broker implemented in Java using the Javalin framework.

## Running

Build and start the server with:

```sh
mvn -f java/pom.xml package
java -jar java/target/java-broker-1.0-SNAPSHOT-shaded.jar
```

Alternatively, if you have a plugin to run directly:

```sh
mvn -f java/pom.xml exec:java -Dexec.mainClass=thinbroker.BrokerServer
```

## API

The API matches the TypeScript and Rust implementations:

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
