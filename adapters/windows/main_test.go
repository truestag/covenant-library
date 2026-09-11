package main

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestLocalOllamaAdapter(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/tags", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"models": []map[string]string{{"name": "llama3.2:3b"}}})
	})
	mux.HandleFunc("/api/generate", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "[KJV/GEN:1:1]") {
			t.Errorf("grounding source ID missing from generation request: %s", string(body))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"response": "Creation is grounded in the supplied text [KJV/GEN:1:1]."})
	})
	server := httptest.NewServer(mux)
	defer server.Close()
	old := os.Getenv("COVENANT_OLLAMA_URL")
	defer os.Setenv("COVENANT_OLLAMA_URL", old)
	if err := os.Setenv("COVENANT_OLLAMA_URL", server.URL); err != nil {
		t.Fatal(err)
	}

	models, err := ollamaModels(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if preferredModel(models) != "llama3.2:3b" {
		t.Fatalf("unexpected models: %#v", models)
	}
	prompt, ids := buildStudyPrompt("What does this say?", []aiContextItem{{ID: "KJV/GEN:1:1", Kind: "library text", Text: "In the beginning God created the heaven and the earth."}})
	if len(ids) != 1 || ids[0] != "KJV/GEN:1:1" {
		t.Fatalf("unexpected ids: %#v", ids)
	}
	answer, err := generateWithOllama(context.Background(), "llama3.2:3b", prompt)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(answer, "KJV/GEN:1:1") {
		t.Fatalf("answer did not preserve citation: %q", answer)
	}
}

func TestOllamaURLRejectsRemoteHosts(t *testing.T) {
	old := os.Getenv("COVENANT_OLLAMA_URL")
	defer os.Setenv("COVENANT_OLLAMA_URL", old)
	_ = os.Setenv("COVENANT_OLLAMA_URL", "https://example.com/api")
	if got := ollamaAPIBase(); got != "http://127.0.0.1:11434/api" {
		t.Fatalf("remote URL was accepted: %s", got)
	}
}
