use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone, Serialize)]
struct Message {
    topic: String,
    data: serde_json::Value,
}

#[derive(Clone)]
struct Queue {
    topic: Vec<String>,
    messages: Vec<Message>,
}

struct Broker {
    queues: Mutex<HashMap<String, Queue>>,
}

impl Broker {
    fn new() -> Self {
        Broker {
            queues: Mutex::new(HashMap::new()),
        }
    }

    fn attach_queue(&self, id: String, topic: String) {
        let segments = Self::parse_topic(&topic);
        let mut qs = self.queues.lock().unwrap();
        qs.insert(
            id,
            Queue {
                topic: segments,
                messages: Vec::new(),
            },
        );
    }

    fn publish(&self, topic: &str, data: serde_json::Value) {
        let segments = Self::parse_topic(topic);
        let mut qs = self.queues.lock().unwrap();
        for queue in qs.values_mut() {
            if Self::topic_matches(&queue.topic, &segments) {
                queue.messages.push(Message {
                    topic: topic.to_string(),
                    data: data.clone(),
                });
            }
        }
    }

    fn get_messages(&self, id: &str) -> Vec<Message> {
        let mut qs = self.queues.lock().unwrap();
        if let Some(queue) = qs.get_mut(id) {
            let msgs = queue.messages.clone();
            queue.messages.clear();
            msgs
        } else {
            Vec::new()
        }
    }

    fn parse_topic(topic: &str) -> Vec<String> {
        topic
            .split('/')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect()
    }

    fn topic_matches(queue_topic: &[String], message_topic: &[String]) -> bool {
        if queue_topic.len() > message_topic.len() {
            return false;
        }
        for (q, m) in queue_topic.iter().zip(message_topic.iter()) {
            if q != m {
                return false;
            }
        }
        true
    }
}

#[derive(Deserialize)]
struct PublishRequest {
    topic: String,
    data: serde_json::Value,
}

async fn publish(
    broker: web::Data<Arc<Broker>>,
    body: web::Json<PublishRequest>,
) -> impl Responder {
    broker.publish(&body.topic, body.data.clone());
    HttpResponse::Ok().json(json!({"status": "ok"}))
}

#[derive(Deserialize)]
struct AttachRequest {
    #[serde(rename = "queueId")]
    queue_id: String,
    topic: String,
}

async fn attach_queue(
    broker: web::Data<Arc<Broker>>,
    body: web::Json<AttachRequest>,
) -> impl Responder {
    broker.attach_queue(body.queue_id.clone(), body.topic.clone());
    HttpResponse::Ok().json(json!({"status": "ok"}))
}

async fn get_messages_handler(
    broker: web::Data<Arc<Broker>>,
    query: web::Query<HashMap<String, String>>,
) -> impl Responder {
    if let Some(id) = query.get("queueId") {
        let msgs = broker.get_messages(id);
        HttpResponse::Ok().json(json!({"messages": msgs}))
    } else {
        HttpResponse::BadRequest().json(json!({"error": "Missing queueId"}))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let broker = Arc::new(Broker::new());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(broker.clone()))
            .route("/publish", web::post().to(publish))
            .route("/attachQueue", web::post().to(attach_queue))
            .route("/get", web::get().to(get_messages_handler))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}
