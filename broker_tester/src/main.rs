use std::env;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize)]
struct PublishRequest<'a> {
    topic: &'a str,
    data: &'a str,
}

#[derive(Serialize)]
struct AttachRequest<'a> {
    #[serde(rename = "queueId")]
    queue_id: &'a str,
    topic: &'a str,
}

#[derive(Deserialize)]
struct ReceivedMessage {
    topic: String,
    data: Value,
}

#[derive(Deserialize)]
struct GetResponse {
    messages: Vec<ReceivedMessage>,
}

fn percentile(data: &Vec<u128>, pct: f64) -> u128 {
    if data.is_empty() {
        return 0;
    }
    let idx = ((pct / 100.0) * ((data.len() - 1) as f64)).round() as usize;
    data[idx]
}

fn run_basic_test(base_url: &str) -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();

    client
        .post(format!("{}/attachQueue", base_url))
        .json(&AttachRequest {
            queue_id: "test",
            topic: "/foo",
        })
        .send()?
        .error_for_status()?;

    client
        .post(format!("{}/publish", base_url))
        .json(&PublishRequest {
            topic: "/foo/bar",
            data: "hello",
        })
        .send()?
        .error_for_status()?;

    client
        .post(format!("{}/publish", base_url))
        .json(&PublishRequest {
            topic: "/bar",
            data: "noop",
        })
        .send()?
        .error_for_status()?;

    let resp = client
        .get(format!("{}/get?queueId=test", base_url))
        .send()?
        .error_for_status()?;
    let body: GetResponse = resp.json()?;
    if body.messages.len() != 1 {
        return Err("expected one message".into());
    }
    let msg = &body.messages[0];
    if msg.topic != "/foo/bar" || msg.data != Value::String("hello".into()) {
        return Err("message content mismatch".into());
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 4 {
        eprintln!("Usage: {} <server_url> <threads> <messages_per_thread>", args[0]);
        return;
    }
    let url = args[1].clone();
    let threads: usize = args[2].parse().expect("invalid threads");
    let messages: usize = args[3].parse().expect("invalid messages");

    if let Err(e) = run_basic_test(&url) {
        eprintln!("basic test failed: {}", e);
        return;
    }
    println!("basic functionality test passed");

    let times: Arc<Mutex<Vec<u128>>> = Arc::new(Mutex::new(Vec::new()));
    let mut handles = Vec::new();
    for _ in 0..threads {
        let times = Arc::clone(&times);
        let url = url.clone();
        handles.push(thread::spawn(move || {
            let client = Client::new();
            for _ in 0..messages {
                let start = Instant::now();
                let _ = client
                    .post(format!("{}/publish", url))
                    .json(&PublishRequest {
                        topic: "/bench",
                        data: "x",
                    })
                    .send();
                let elapsed = start.elapsed().as_millis();
                times.lock().unwrap().push(elapsed);
            }
        }));
    }

    for h in handles {
        h.join().unwrap();
    }

    let mut data = times.lock().unwrap();
    data.sort();

    println!("p50: {} ms", percentile(&data, 50.0));
    println!("p90: {} ms", percentile(&data, 90.0));
    println!("p99: {} ms", percentile(&data, 99.0));
}
