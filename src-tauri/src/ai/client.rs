use crate::ai::models::{
    AIProviderConfig, Stakeholder, TaskDecompositionItem, TaskDecompositionResult, TestConnectionResult,
};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use std::str::FromStr;
use std::time::Instant;

const SYSTEM_DECOMPOSITION_PROMPT: &str = r#"Anda adalah AI Relay & Executive Coordinator untuk sistem MedioChat (Team AI Bridge).
PRINSIP UTAMA: Komunikasi di MedioChat BUKAN Human-to-Human langsung, melainkan HUMAN -> AI -> HUMAN.
Tugas Anda adalah membaca pesan dari pengirim (Human A) dan menyampaikan intisari kebutuhan kepada penerima (Human B / Tim) seolah-olah Anda adalah asisten eksekutif cerdas yang memberitahu:
- Contoh: "Budi (PM) butuh data skema database PostgreSQL dari Andi (Backend) sebelum besok sore."
- Contoh: "Citra (Frontend) mengabarkan bahwa form onboarding sudah selesai di-update dan siap diuji oleh QA (Fani)."
- Contoh: "Andi (Backend) menginformasikan bahwa auth API staging sudah di-update dan siap dicoba oleh tim Frontend."

Pilihlah salah satu divisi yang paling tepat untuk setiap tugas:
- "backend" (API, database, server, otentikasi, logic bisnis)
- "frontend" (UI, Vue/React, CSS, komponen, form, responsive)
- "desain" (Figma, mockup, ilustrasi, asset visual, design system)
- "qa" (Testing, audit bug, end-to-end test, validasi)
- "devops" (Deployment, CI/CD, Docker, server, cloud)
- "general" (Tugas umum, koordinasi, dokumentasi, rapat)

Prioritas harus salah satu dari: "tinggi", "sedang", "rendah".
Tipe intent: "request_data" | "task_instruction" | "status_update" | "confirmation_needed" | "general_info".
Tingkat urgensi: "segera" | "normal" | "santai".

KEMBALIKAN HANYA VALID JSON MURNI TANPA KOMENTAR DAN TANPA TEKS LAIN. Format persis seperti ini:
{
  "ai_relay_briefing": "Gaya bicara AI kepada tim/penerima yang menjelaskan siapa pengirimnya dan apa yang ia butuhkan/instruksikan",
  "intent_type": "request_data",
  "target_stakeholders": ["Nama personil penerima atau divisi target"],
  "urgency": "segera",
  "ringkasan": "Ringkasan ringkas instruksi kerja ini dalam 1-2 kalimat",
  "tanggal_deadline": "Besok, 17:00 / Lusa / tanggal spesifik atau null",
  "daftar_tugas": [
    {
      "divisi": "backend",
      "deskripsi": "Deskripsi aksi spesifik yang perlu dikerjakan",
      "prioritas": "tinggi",
      "estimasi_jam": 4,
      "assignee_name": "Nama Stakeholder atau null",
      "assignee_role": "Role Stakeholder atau null"
    }
  ]
}"#;

pub struct AIClient {
    client: reqwest::Client,
}

impl AIClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    fn build_headers(&self, provider: &AIProviderConfig) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        if !provider.api_key.trim().is_empty() {
            let auth_val = format!("Bearer {}", provider.api_key.trim());
            if let Ok(val) = HeaderValue::from_str(&auth_val) {
                headers.insert(AUTHORIZATION, val);
            }
        }

        if let Some(custom) = &provider.custom_headers {
            for (k, v) in custom {
                if let (Ok(h_name), Ok(h_val)) = (HeaderName::from_str(k), HeaderValue::from_str(v)) {
                    headers.insert(h_name, h_val);
                }
            }
        }

        headers
    }

    fn extract_json_str<'a>(&self, raw: &'a str) -> &'a str {
        let mut clean = raw.trim();
        if let Some(stripped) = clean.strip_prefix("```json") {
            clean = stripped.trim();
        } else if let Some(stripped) = clean.strip_prefix("```") {
            clean = stripped.trim();
        }

        if let Some(stripped) = clean.strip_suffix("```") {
            clean = stripped.trim();
        }

        if let (Some(start), Some(end)) = (clean.find('{'), clean.rfind('}')) {
            if end > start {
                return &clean[start..=end];
            }
        }

        clean
    }

    fn normalize_base_url<'a>(&self, url: &'a str) -> &'a str {
        url.trim().trim_end_matches('/')
    }

    fn build_chat_messages(&self, system_prompt: &str, user_prompt: &str) -> Value {
        json!([
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ])
    }

    fn extract_string_array(&self, arr: &[Value], key: &str) -> Vec<String> {
        arr.iter()
            .filter_map(|item| item.get(key).and_then(|v| v.as_str()))
            .map(|s| s.to_string())
            .collect()
    }

    pub async fn chat_completion(
        &self,
        prompt: &str,
        provider: &AIProviderConfig,
        system_prompt: Option<&str>,
        require_json: bool,
    ) -> Result<String, String> {
        let sys = system_prompt.unwrap_or("You are a helpful assistant.");

        match provider.provider_type.as_str() {
            "ollama" => self.call_ollama(prompt, provider, sys, require_json).await,
            "gemini" => self.call_gemini(prompt, provider, sys, require_json).await,
            _ => self.call_openai_compatible(prompt, provider, sys, require_json).await,
        }
    }

    async fn call_ollama(
        &self,
        prompt: &str,
        provider: &AIProviderConfig,
        system_prompt: &str,
        require_json: bool,
    ) -> Result<String, String> {
        let base_url = self.normalize_base_url(&provider.base_url);
        let endpoint_native = format!("{}/api/chat", base_url);
        let headers = self.build_headers(provider);
        let messages = self.build_chat_messages(system_prompt, prompt);

        let mut payload = json!({
            "model": provider.selected_model,
            "messages": messages.clone(),
            "stream": false
        });

        if require_json {
            payload["format"] = json!("json");
        }

        // Try native /api/chat
        if let Ok(res) = self.client.post(&endpoint_native)
            .headers(headers.clone())
            .json(&payload)
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(body) = res.json::<Value>().await {
                    if let Some(content) = body.pointer("/message/content").and_then(|v| v.as_str()) {
                        return Ok(content.to_string());
                    }
                }
            }
        }

        // Fallback to OpenAI-compatible /v1/chat/completions on Ollama
        let endpoint_v1 = format!("{}/v1/chat/completions", base_url);
        let mut v1_payload = json!({
            "model": provider.selected_model,
            "messages": messages,
            "stream": false
        });
        if require_json {
            v1_payload["response_format"] = json!({ "type": "json_object" });
        }

        let res_v1 = self.client.post(&endpoint_v1)
            .headers(headers)
            .json(&v1_payload)
            .send()
            .await
            .map_err(|e| format!("Koneksi ke Ollama gagal: {}", e))?;

        if !res_v1.status().is_success() {
            let status = res_v1.status();
            let text = res_v1.text().await.unwrap_or_default();
            return Err(format!("Ollama Error (HTTP {}): {}", status, text));
        }

        let body = res_v1.json::<Value>().await
            .map_err(|e| format!("Gagal membaca JSON dari Ollama: {}", e))?;

        body.pointer("/choices/0/message/content")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Respons Ollama tidak memiliki format choices[0].message.content".to_string())
    }

    async fn call_gemini(
        &self,
        prompt: &str,
        provider: &AIProviderConfig,
        system_prompt: &str,
        require_json: bool,
    ) -> Result<String, String> {
        let api_key = provider.api_key.trim();
        if api_key.is_empty() {
            return Err("Google Gemini API Key belum diisi di Pengaturan.".to_string());
        }

        let model = if provider.selected_model.is_empty() {
            "gemini-1.5-flash"
        } else {
            provider.selected_model.as_str()
        };

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );

        let combined_text = format!("{}\n\n---\nInput:\n{}", system_prompt, prompt);
        let mut body = json!({
            "contents": [{
                "role": "user",
                "parts": [{ "text": combined_text }]
            }]
        });

        if require_json {
            body["generationConfig"] = json!({
                "responseMimeType": "application/json"
            });
        }

        let res = self.client.post(&url)
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Koneksi ke Gemini gagal: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Gemini API Error (HTTP {}): {}", status, text));
        }

        let val: Value = res.json().await
            .map_err(|e| format!("Gagal mem-parsing respon Gemini: {}", e))?;

        val.pointer("/candidates/0/content/parts/0/text")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Gemini tidak mengembalikan teks jawaban valid.".to_string())
    }

    async fn call_openai_compatible(
        &self,
        prompt: &str,
        provider: &AIProviderConfig,
        system_prompt: &str,
        require_json: bool,
    ) -> Result<String, String> {
        let base_url = self.normalize_base_url(&provider.base_url);
        let mut endpoint = format!("{}/chat/completions", base_url);
        if base_url.ends_with("/chat/completions") {
            endpoint = base_url.to_string();
        }

        let headers = self.build_headers(provider);
        let messages = self.build_chat_messages(system_prompt, prompt);
        let mut payload = json!({
            "model": provider.selected_model,
            "messages": messages,
            "stream": false
        });

        if require_json {
            payload["response_format"] = json!({ "type": "json_object" });
        }

        let res = self.client.post(&endpoint)
            .headers(headers)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Koneksi ke provider gagal: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let text = res.text().await.unwrap_or_default();
            return Err(format!("Provider Error (HTTP {}): {}", status, text));
        }

        let body = res.json::<Value>().await
            .map_err(|e| format!("Gagal membaca JSON dari provider: {}", e))?;

        body.pointer("/choices/0/message/content")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Format respons provider tidak valid".to_string())
    }

    pub async fn decompose_task(
        &self,
        text: &str,
        provider: &AIProviderConfig,
        stakeholders: Option<&[Stakeholder]>,
        sender_name: Option<&str>,
    ) -> Result<TaskDecompositionResult, String> {
        let sender_line = if let Some(sender) = sender_name {
            format!("\nPENGIRIM PESAN: {}\n", sender)
        } else {
            String::new()
        };

        let system_prompt = if let Some(team) = stakeholders {
            if !team.is_empty() {
                let mut dir = format!("{}\nBerikut adalah direktori Stakeholder & Anggota Tim Perusahaan:\n", sender_line);
                for s in team {
                    let skills_str = s.skills.as_deref().map(|sk| sk.join(", ")).unwrap_or_default();
                    dir.push_str(&format!(
                        "- Nama: \"{}\" | Role: \"{}\" | Divisi: \"{}\" | Keahlian: [{}]\n",
                        s.name, s.role, s.division, skills_str
                    ));
                }
                dir.push_str("\nINSTRUKSI PENUGASAN & RELAY:\n1. Jelaskan pada \"ai_relay_briefing\" dengan nada bicara AI asisten: \"[Nama Pengirim] butuh data/mengabarkan [inti kebutuhan] kepada [Target Personil/Tim]...\"\n2. Cocokkan setiap tugas dengan stakeholder di atas berdasarkan relevansi divisi dan keahliannya. Masukkan nama pada \"assignee_name\" dan jabatannya pada \"assignee_role\". Jika tidak ada tugas teknis, \"daftar_tugas\" boleh kosong [].\n");
                format!("{}\n{}", SYSTEM_DECOMPOSITION_PROMPT, dir)
            } else {
                format!("{}\n{}", SYSTEM_DECOMPOSITION_PROMPT, sender_line)
            }
        } else {
            format!("{}\n{}", SYSTEM_DECOMPOSITION_PROMPT, sender_line)
        };

        let raw_output = self
            .chat_completion(text, provider, Some(&system_prompt), true)
            .await?;

        let clean_json = self.extract_json_str(&raw_output);
        match serde_json::from_str::<TaskDecompositionResult>(clean_json) {
            Ok(mut res) => {
                if res.ai_relay_briefing.is_none() || res.ai_relay_briefing.as_deref() == Some("") {
                    let fallback = if let Some(s) = sender_name {
                        format!("{} menyampaikan: \"{}\"", s, text)
                    } else {
                        format!("Pesan masuk dari tim: \"{}\"", text)
                    };
                    res.ai_relay_briefing = Some(fallback);
                }
                Ok(res)
            }
            Err(e) => {
                eprintln!("JSON parse error on decomposition: {}. Raw: {}", e, raw_output);
                let fallback_briefing = if let Some(s) = sender_name {
                    format!("{} menginformasikan: \"{}\"", s, text)
                } else {
                    format!("Pesan dari tim: \"{}\"", text)
                };
                Ok(TaskDecompositionResult {
                    ringkasan: if text.len() > 120 { format!("{}...", &text[..120]) } else { text.to_string() },
                    tanggal_deadline: Some("Besok".to_string()),
                    daftar_tugas: vec![TaskDecompositionItem {
                        divisi: "general".to_string(),
                        deskripsi: text.to_string(),
                        prioritas: "sedang".to_string(),
                        estimasi_jam: Some(2),
                        assignee_name: None,
                        assignee_role: None,
                    }],
                    ai_relay_briefing: Some(fallback_briefing),
                    intent_type: Some("general_info".to_string()),
                    target_stakeholders: Some(vec!["Semua Tim".to_string()]),
                    urgency: Some("normal".to_string()),
                })
            }
        }
    }

    pub async fn fetch_models(&self, provider: &AIProviderConfig) -> Result<Vec<String>, String> {
        let base_url = self.normalize_base_url(&provider.base_url);
        let headers = self.build_headers(provider);

        if provider.provider_type == "ollama" {
            // Try /api/tags
            let tags_url = format!("{}/api/tags", base_url);
            if let Ok(res) = self.client.get(&tags_url).headers(headers.clone()).send().await {
                if res.status().is_success() {
                    if let Ok(val) = res.json::<Value>().await {
                        if let Some(arr) = val.get("models").and_then(|v| v.as_array()) {
                            let list = self.extract_string_array(arr, "name");
                            if !list.is_empty() {
                                return Ok(list);
                            }
                        }
                    }
                }
            }

            // Fallback to /v1/models
            let v1_url = format!("{}/v1/models", base_url);
            if let Ok(res) = self.client.get(&v1_url).headers(headers).send().await {
                if res.status().is_success() {
                    if let Ok(val) = res.json::<Value>().await {
                        if let Some(arr) = val.get("data").and_then(|v| v.as_array()) {
                            let list = self.extract_string_array(arr, "id");
                            if !list.is_empty() {
                                return Ok(list);
                            }
                        }
                    }
                }
            }

            return Err("Gagal mengambil model dari Ollama. Pastikan endpoint aktif.".to_string());
        }

        if provider.provider_type == "gemini" {
            let api_key = provider.api_key.trim();
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                api_key
            );
            let res = self.client.get(&url).send().await
                .map_err(|e| format!("Gagal memanggil Gemini: {}", e))?;

            if !res.status().is_success() {
                return Err("Gagal mengambil model dari Gemini. Cek API Key Anda.".to_string());
            }

            let val: Value = res.json().await.map_err(|e| e.to_string())?;
            if let Some(arr) = val.get("models").and_then(|v| v.as_array()) {
                let list: Vec<String> = arr.iter()
                    .filter_map(|m| m.get("name").and_then(|n| n.as_str()))
                    .map(|n| n.trim_start_matches("models/").to_string())
                    .filter(|n| n.contains("gemini"))
                    .collect();
                return Ok(list);
            }
        }

        // OpenAI or Custom
        let endpoint = if base_url.contains("/v1") {
            format!("{}/models", base_url)
        } else {
            format!("{}/v1/models", base_url)
        };

        let res = self.client.get(&endpoint).headers(headers).send().await
            .map_err(|e| format!("Gagal menghubungi server models: {}", e))?;

        if !res.status().is_success() {
            return Err("Server tidak mendukung endpoint list models. Tambahkan model secara manual.".to_string());
        }

        let val: Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(arr) = val.get("data").and_then(|v| v.as_array()) {
            let list = self.extract_string_array(arr, "id");
            if !list.is_empty() {
                return Ok(list);
            }
        }

        Err("Format response list models tidak dikenali".to_string())
    }

    pub async fn test_connection(&self, provider: &AIProviderConfig) -> TestConnectionResult {
        let start = Instant::now();
        match self.chat_completion("Ping! Balas dengan kata OK saja.", provider, None, false).await {
            Ok(resp) => {
                let latency = start.elapsed().as_millis() as u64;
                let models = self.fetch_models(provider).await.ok();
                TestConnectionResult {
                    success: true,
                    message: format!("Terhubung! Respon: \"{}\"", resp.trim()),
                    latency_ms: latency,
                    available_models: models,
                }
            }
            Err(e) => {
                let latency = start.elapsed().as_millis() as u64;
                TestConnectionResult {
                    success: false,
                    message: e,
                    latency_ms: latency,
                    available_models: None,
                }
            }
        }
    }
}
