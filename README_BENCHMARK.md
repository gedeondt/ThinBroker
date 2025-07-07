# Language Benchmark

This repository contains several implementations of a minimal message broker. The main purpose is to compare the performance and ergonomics of different languages through an equivalent application.

## Available implementations

- **TypeScript** (`typescript/`): uses Express.
- **Rust** (`rust/`): uses actix-web.
- **Go** (`go/`): employs the `net/http` library.
- **Java** (`java/`): uses the Javalin framework.

Each folder includes a README with specific compilation and execution steps.

## Basic execution

1. Build and run the implementation of the language you want to measure.
2. Run the load tester located in `broker_tester` providing the server URL and desired load.
3. The results show p50, p90 and p99 latencies in milliseconds, useful for comparison across languages.

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

## Benchmark intent

The implementations share the same API and internal structure to isolate the differences of each language. In this way, the load tests mainly reflect the impact of the runtime, the performance of the network libraries and the ease of development.

The `broker_tester` first performs a functionality check and then sends multiple messages to measure the response time. The obtained figures serve as a reference to select the most suitable language according to performance or simplicity needs.
