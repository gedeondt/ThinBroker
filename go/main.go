package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"sync"
)

type Message struct {
	Topic string          `json:"topic"`
	Data  json.RawMessage `json:"data"`
}

type Queue struct {
        Topic    []string
        mu       sync.Mutex
        Messages []Message
}

type Broker struct {
        mu     sync.RWMutex
        Queues map[string]*Queue
}

func NewBroker() *Broker {
	return &Broker{Queues: make(map[string]*Queue)}
}

func (b *Broker) AttachQueue(id, topic string) {
        b.mu.Lock()
        defer b.mu.Unlock()
        segs := parseTopic(topic)
        b.Queues[id] = &Queue{Topic: segs}
}

func (b *Broker) Publish(topic string, data json.RawMessage) {
        segs := parseTopic(topic)
        b.mu.RLock()
        qs := make([]*Queue, 0, len(b.Queues))
        for _, q := range b.Queues {
                if topicMatches(q.Topic, segs) {
                        qs = append(qs, q)
                }
        }
        b.mu.RUnlock()
        for _, q := range qs {
                q.mu.Lock()
                q.Messages = append(q.Messages, Message{Topic: topic, Data: data})
                q.mu.Unlock()
        }
}

func (b *Broker) GetMessages(id string) []Message {
        b.mu.RLock()
        q, ok := b.Queues[id]
        b.mu.RUnlock()
        if !ok {
                return nil
        }
        q.mu.Lock()
        msgs := append([]Message(nil), q.Messages...)
        q.Messages = nil
        q.mu.Unlock()
        return msgs
}

func parseTopic(topic string) []string {
	parts := strings.Split(topic, "/")
	var segs []string
	for _, p := range parts {
		if p != "" {
			segs = append(segs, p)
		}
	}
	return segs
}

func topicMatches(queueTopic, msgTopic []string) bool {
	if len(queueTopic) > len(msgTopic) {
		return false
	}
	for i := range queueTopic {
		if queueTopic[i] != msgTopic[i] {
			return false
		}
	}
	return true
}

func main() {
	broker := NewBroker()
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	http.HandleFunc("/publish", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Topic string          `json:"topic"`
			Data  json.RawMessage `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.Topic == "" {
			http.Error(w, "missing topic", http.StatusBadRequest)
			return
		}
		broker.Publish(req.Topic, req.Data)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	http.HandleFunc("/attachQueue", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			QueueID string `json:"queueId"`
			Topic   string `json:"topic"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if req.QueueID == "" || req.Topic == "" {
			http.Error(w, "missing parameters", http.StatusBadRequest)
			return
		}
		broker.AttachQueue(req.QueueID, req.Topic)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	http.HandleFunc("/get", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("queueId")
		if id == "" {
			http.Error(w, "missing queueId", http.StatusBadRequest)
			return
		}
		msgs := broker.GetMessages(id)
		json.NewEncoder(w).Encode(map[string]interface{}{"messages": msgs})
	})

	http.ListenAndServe(":"+port, nil)
}
