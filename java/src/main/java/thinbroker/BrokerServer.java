package thinbroker;

import io.javalin.Javalin;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class BrokerServer {
    static class Message {
        public String topic;
        public JsonNode data;
        Message(String topic, JsonNode data) {
            this.topic = topic;
            this.data = data;
        }
    }

    static class Queue {
        List<String> topic;
        List<Message> messages = new ArrayList<>();
        Queue(List<String> topic) { this.topic = topic; }
    }

    static class Broker {
        Map<String, Queue> queues = new HashMap<>();

        void attachQueue(String id, String topic) {
            List<String> segments = parseTopic(topic);
            queues.put(id, new Queue(segments));
        }

        void publish(String topic, JsonNode data) {
            List<String> segments = parseTopic(topic);
            for (Queue q : queues.values()) {
                if (topicMatches(q.topic, segments)) {
                    q.messages.add(new Message(topic, data));
                }
            }
        }

        List<Message> getMessages(String id) {
            Queue q = queues.get(id);
            if (q == null) return Collections.emptyList();
            List<Message> out = new ArrayList<>(q.messages);
            q.messages.clear();
            return out;
        }

        static List<String> parseTopic(String topic) {
            String[] parts = topic.split("/");
            List<String> segs = new ArrayList<>();
            for (String p : parts) {
                if (!p.isEmpty()) segs.add(p);
            }
            return segs;
        }

        static boolean topicMatches(List<String> queueTopic, List<String> messageTopic) {
            if (queueTopic.size() > messageTopic.size()) return false;
            for (int i = 0; i < queueTopic.size(); i++) {
                if (!queueTopic.get(i).equals(messageTopic.get(i))) return false;
            }
            return true;
        }
    }

    public static void main(String[] args) throws Exception {
        Broker broker = new Broker();
        ObjectMapper mapper = new ObjectMapper();

        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "3000"));
        Javalin app = Javalin.create(config -> {}).start(port);

        app.post("/publish", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            String topic = body.get("topic").asText();
            JsonNode data = body.get("data");
            broker.publish(topic, data);
            ctx.json(Map.of("status", "ok"));
        });

        app.post("/attachQueue", ctx -> {
            JsonNode body = mapper.readTree(ctx.body());
            String queueId = body.get("queueId").asText();
            String topic = body.get("topic").asText();
            broker.attachQueue(queueId, topic);
            ctx.json(Map.of("status", "ok"));
        });

        app.get("/get", ctx -> {
            String id = ctx.queryParam("queueId");
            if (id == null) {
                ctx.status(400).json(Map.of("error", "Missing queueId"));
                return;
            }
            List<Message> msgs = broker.getMessages(id);
            ctx.json(Map.of("messages", msgs));
        });
    }
}
