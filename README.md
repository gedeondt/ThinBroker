# ThinBroker

ThinBroker is a minimal message broker implemented in several languages. The project serves as a benchmark to compare the performance and ergonomics of each language while sharing the same functionality.

Messages can be published to topics, queues can be attached to any topic and messages are retrieved from those queues. All implementations expose the same HTTP API.

## Intent

The main goal is to measure how different runtimes and frameworks behave under the same workload. By keeping the internal structure and API identical, the load tester focuses on the runtime cost and development experience of each language.

## Available implementations

- **TypeScript** (`typescript/`) – uses Express.
- **Rust** (`rust/`) – uses actix-web.
- **Go** (`go/`) – uses the standard `net/http` library.
- **Java** (`java/`) – uses the Javalin framework.

Each folder contains a README with details about compilation and execution.

## Building and running

### TypeScript

```sh
cd typescript
npm run build
npm start
```

### Rust

```sh
cargo run --manifest-path rust/Cargo.toml
```

### Go

```sh
go run .
```

### Java

```sh
mvn -f java/pom.xml package
java -jar java/target/java-broker-1.0-SNAPSHOT-shaded.jar
```

## Testing with the load tester

A simple load tester lives in the `broker_tester` directory. It first performs a functionality check and then sends multiple messages using several threads to report latency percentiles (p50, p90 and p99).

Run it with:

```sh
cargo run --release -- <server_url> <threads> <messages_per_thread>
```

### Example

```bash
# Start the TypeScript version
cd typescript
npm run build
npm start

# Launch the load tester from another terminal
cd broker_tester
cargo run --release -- http://localhost:3000 4 1000
```

The output displays the p50, p90 and p99 response times in milliseconds.
