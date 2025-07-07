# Benchmarking ThinBroker Across Languages

ThinBroker is a collection of minimal message brokers written in four different languages. Each implementation exposes the same HTTP API so the runtime and framework of each language can be compared under an identical workload. This project explores how the same functionality behaves when built with:

- **TypeScript** using Express
- **Rust** using actix-web
- **Go** using the standard `net/http` library
- **Java** using the Javalin framework

By keeping the behaviour consistent, any performance differences come primarily from the language runtimes and their concurrency models.

## Setup

Every implementation lives in its own directory. To run a server choose a language and start it as follows:

```bash
# TypeScript
cd typescript
npm run build
npm start
```

```bash
# Rust
cargo run --release --manifest-path rust/Cargo.toml
```

```bash
# Go
go run .
```

```bash
# Java
mvn -f java/pom.xml package
java -jar java/target/java-broker-1.0-SNAPSHOT-shaded.jar
```

Once a broker is running it listens on port `3000` unless a custom `PORT` environment variable is set.

## Functional overview

Each server exposes three endpoints:

- `POST /publish` – accepts `{ "topic": "/path", "data": { ... } }` and distributes the message to queues attached to that topic or any of its parents.
- `POST /attachQueue` – accepts `{ "queueId": "myQueue", "topic": "/path" }` and registers a queue so it receives messages published on that topic.
- `GET /get?queueId=myQueue` – retrieves and clears all pending messages for the queue.

This identical API is implemented in each language using simple in‑memory structures and minimal dependencies.

## Load testing

The `broker_tester` directory contains a Rust program that performs a functional check and then sends many messages concurrently. The tester prints latency percentiles (p50, p90 and p99) so the different runtimes can be compared. Invoke it with:

```bash
cargo run --release -- <server_url> <threads> <messages_per_thread>
```

For example, after starting the TypeScript version one could run:

```bash
cd broker_tester
cargo run --release -- http://localhost:3000 4 1000
```

The tester first verifies that the basic publish/attach/get cycle works, then launches the specified number of threads each publishing the given number of messages to measure how the broker handles load.

## Expected results

Because each language has distinct runtime characteristics, we can anticipate some differences before running the benchmark:

- **TypeScript (Node.js)** – single threaded and event driven, so throughput may drop under heavy contention even though the code is straightforward.
- **Go** – lightweight goroutines and an efficient scheduler often provide good concurrency with relatively low memory overhead.
- **Rust** – compiled to native code with zero‑cost abstractions. The `actix-web` framework is asynchronous, so we expect very low latency and high throughput.
- **Java** – the JVM introduces some overhead but Javalin and Java's mature threading model should still yield solid performance, albeit typically with a larger memory footprint.

Actual numbers depend on the machine, compiler optimisations and workload, but the general expectation is that Rust and Go will offer the highest raw throughput, followed by Java and then TypeScript.

## Results

| Implementation | p50 | p90 | p99 |
| -------------- | --- | --- | --- |
| TypeScript     |     |     |     |
| Go             |     |     |     |
| Rust           |     |     |     |
| Java           |     |     |     |

_Fill in the table above with the measured latencies once the benchmark has been executed on your machine._

