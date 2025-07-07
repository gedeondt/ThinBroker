# ThinBroker

This repository contains a minimal message broker.  A TypeScript implementation is provided using the Express framework and a Rust implementation using actix-web.  Messages can be published to topics and consumed from attached queues.

The `typescript` directory holds the server implementation.  Build the server with

```sh
cd typescript
npm run build
npm start
```

The `rust` directory contains the same broker implemented in Rust.  Build and run it with

```sh
cargo run --manifest-path rust/Cargo.toml
```

A simple load tester is provided in the `broker_tester` directory.  It is a Rust command line program that sends messages to the broker using multiple threads and reports latency percentiles.

Run it with:

```sh
cargo run --release -- <server_url> <threads> <messages_per_thread>
```

The output displays the p50, p90 and p99 response times in milliseconds.
