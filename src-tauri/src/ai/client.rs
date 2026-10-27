use crate::ai::models::{
    AIProviderConfig, Stakeholder, TaskDecompositionItem, TaskDecompositionResult, TestConnectionResult,
};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde_json::{json, Value};
use std::str::FromStr;
use std::time::Instant;

const SYSTEM_DECOMPOSITION_PROMPT: &str = r#"Anda adalah AI Relay & Executive Coordinator untuk sistem MedioChat (Team AI Bridge).
PRINSIP UTAMA: Komunikasi di MedioChat BUKAN Human-to-Human langsung, melainkan HUMAN -> AI -> HUMAN.
Tugas Anda adalah membaca pesan dari pengirim (Human A) dan menyampaikan intisari kebutuhan kepada rekan tim (Human B / Tim) dengan bahasa Indonesia yang ALAMI, LUWES, dan RAMAH (seperti asisten tim yang cakap).

ATURAN PENTING GAYA BAHASA:
1. "ai_relay_briefing":
   - Tulis langsung apa yang disampaikan/dibutuhkan pengirim tanpa tanda kutip di awal dan akhir.
   - Contoh instruksi: "Budi butuh dump skema database PostgreSQL dari Andi sebelum besok sore untuk modul payment."
   - Contoh info: "Citra mengabarkan bahwa form onboarding sudah selesai di-update dan siap dicoba."
   - JIKA PESAN HANYA SAPAAN/CASUAL (misal: "halo", "hai", "selamat pagi", "apa kabar", "tes"):
     Sampaikan sapaan santai: "[Nama Pengirim] menyapa tim: Halo semuanya!"
     DAN "daftar_tugas" HARUS KOSONG []! Jangan mengarang tugas jika hanya sapaan.
2. "daftar_tugas":
   - Hanya isi jika pengirim memang meminta atau menginstruksikan pekerjaan teknis spesifik.
   - Pilihlah salah satu divisi yang paling tepat: "backend" | "frontend" | "desain" | "qa" | "devops" | "general".
   - Cocokkan dengan stakeholder tim yang relevan untuk "assignee_name" dan "assignee_role".

Prioritas: "tinggi" | "sedang" | "rendah".
Tipe intent: "request_data" | "task_instruction" | "status_update" | "confirmation_needed" | "general_info".
Tingkat urgensi: "segera" | "normal" | "santai".

KEMBALIKAN HANYA VALID JSON MURNI TANPA MARKDOWN DAN TANPA TEKS LAIN. Format:
{
  "ai_relay_briefing": "Teks pengabaran alami dari AI ke tim (tanpa tanda kutip)",
  "intent_type": "request_data",
  "target_stakeholders": ["Nama personil penerima atau divisi target"],
  "urgency": "normal",
  "ringkasan": "Ringkasan ringkas dalam 1 kalimat",
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
                if let Some(briefing) = res.ai_relay_briefing.as_deref() {
                    let unquoted = briefing.trim().trim_matches('"').trim_matches('\'').trim();
                    if unquoted.eq_ignore_ascii_case("halo") || unquoted.eq_ignore_ascii_case("hi") || unquoted.eq_ignore_ascii_case("pagi") {
                        let sender = sender_name.unwrap_or("Rekan tim");
                        res.ai_relay_briefing = Some(format!("{} menyapa tim: Halo!", sender));
                        res.daftar_tugas = vec![];
                    } else {
                        res.ai_relay_briefing = Some(unquoted.to_string());
                    }
                } else {
                    let fallback = if let Some(s) = sender_name {
                        format!("{} mengabarkan: {}", s, text)
                    } else {
                        format!("Pesan masuk dari tim: {}", text)
                    };
                    res.ai_relay_briefing = Some(fallback);
                }
                Ok(res)
            }
            Err(e) => {
                eprintln!("JSON parse error on decomposition: {}. Raw: {}", e, raw_output);
                let raw_sender = sender_name.unwrap_or("Rekan Tim");
                let clean_sender = raw_sender.split('(').next().unwrap_or(raw_sender).trim();
                let clean_text = text.trim().trim_matches('"').trim_matches('\'').trim();
                let lower = clean_text.to_lowercase();

                // 1. Casual Greetings
                let is_casual = lower == "halo"
                    || lower == "hai"
                    || lower == "pagi"
                    || lower == "selamat pagi"
                    || lower == "siang"
                    || lower == "sore"
                    || lower == "malam"
                    || lower == "tes"
                    || lower == "ping";

                if is_casual {
                    return Ok(TaskDecompositionResult {
                        ringkasan: "Sapaan tim".to_string(),
                        tanggal_deadline: None,
                        daftar_tugas: vec![],
                        ai_relay_briefing: Some(format!("{} menyapa tim: Halo!", clean_sender)),
                        intent_type: Some("general_info".to_string()),
                        target_stakeholders: Some(vec!["Semua Tim".to_string()]),
                        urgency: Some("santai".to_string()),
                    });
                }

                // 2. Identify Target Stakeholder from team directory
                let mut target_stakeholder: Option<&Stakeholder> = None;
                if let Some(team) = stakeholders {
                    for s in team {
                        let s_name_lower = s.name.to_lowercase();
                        let parts: Vec<&str> = s_name_lower.split_whitespace().collect();
                        let joined = parts.join("");

                        if lower.contains(&s_name_lower)
                            || lower.contains(&joined)
                            || parts.first().map(|p| lower.contains(p)).unwrap_or(false)
                        {
                            target_stakeholder = Some(s);
                            break;
                        }
                    }
                }

                // 3. Match Division Keywords
                let matched_division = if lower.contains("desain") || lower.contains("ui") || lower.contains("ux") || lower.contains("figma") || lower.contains("mockup") {
                    "desain"
                } else if lower.contains("backend") || lower.contains("api") || lower.contains("database") || lower.contains("db") || lower.contains("sql") || lower.contains("postgres") {
                    "backend"
                } else if lower.contains("frontend") || lower.contains("vue") || lower.contains("react") || lower.contains("css") || lower.contains("halaman") || lower.contains("tampilan") {
                    "frontend"
                } else if lower.contains("devops") || lower.contains("deploy") || lower.contains("docker") || lower.contains("server") {
                    "devops"
                } else if lower.contains("qa") || lower.contains("test") || lower.contains("testing") || lower.contains("audit") || lower.contains("bug") {
                    "qa"
                } else if let Some(target) = target_stakeholder {
                    target.division.as_str()
                } else {
                    "general"
                };

                // If target stakeholder not found yet, pick from matched division
                let final_target = target_stakeholder.or_else(|| {
                    stakeholders.and_then(|team| team.iter().find(|s| s.division == matched_division))
                });

                // 4. Action verb detection
                let action_verbs = [
                    "tolong", "minta", "siapkan", "buat", "buatkan", "kerjakan",
                    "selesaikan", "update", "perbarui", "bantu", "perbaiki", "fix",
                    "deploy", "test", "uji", "cek", "kirim", "ekspor", "dump", "butuh", "perlu"
                ];
                let has_action_verb = action_verbs.iter().any(|v| lower.contains(v));

                // If only mentioning someone's name without action verbs
                if !has_action_verb && final_target.is_some() && lower.split_whitespace().count() <= 4 {
                    let target = final_target.unwrap();
                    return Ok(TaskDecompositionResult {
                        ringkasan: format!("Panggilan personil @{}", target.name),
                        tanggal_deadline: None,
                        daftar_tugas: vec![],
                        ai_relay_briefing: Some(format!("{} memanggil @{}.", clean_sender, target.name)),
                        intent_type: Some("general_info".to_string()),
                        target_stakeholders: Some(vec![target.name.clone()]),
                        urgency: Some("normal".to_string()),
                    });
                }

                // Clean action description
                let mut clean_action = clean_text.to_string();
                if let Some(target) = final_target {
                    let target_name_lower = target.name.to_lowercase();
                    let parts: Vec<&str> = target_name_lower.split_whitespace().collect();
                    let first = parts.first().copied().unwrap_or("");
                    let joined = parts.join("");
                    clean_action = clean_action
                        .replace(&format!("tolong @{}", target.name), "")
                        .replace(&format!("tolong @{}", joined), "")
                        .replace(&format!("tolong @{}", first), "")
                        .replace(&format!("@{}", first), "")
                        .replace(&format!("tolong {}", target.name), "")
                        .replace(&format!("tolong {}", joined), "")
                        .replace(&format!("tolong {}", first), "")
                        .replace("tolong", "")
                        .replace("minta tolong", "")
                        .replace("siapakn", "siapkan")
                        .replace("siapin", "siapkan")
                        .replace("uinya", "UI-nya")
                        .replace("ui", "UI")
                        .trim()
                        .to_string();
                } else {
                    clean_action = clean_action.replace("tolong", "").trim().to_string();
                }

                if clean_action.is_empty() {
                    clean_action = clean_text.to_string();
                }

                let mut chars = clean_action.chars();
                clean_action = match chars.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
                };

                let target_name = final_target.map(|t| t.name.clone()).unwrap_or_else(|| "Tim".to_string());
                let target_role = final_target.map(|t| t.role.clone());

                let briefing = if let Some(target) = final_target {
                    if lower.contains("butuh") {
                        format!("@{}, {} butuh bantuanmu nih: {}.", target.name, clean_sender, clean_action)
                    } else {
                        format!("@{}, {} minta tolong untuk {} nih.", target.name, clean_sender, clean_action.to_lowercase())
                    }
                } else {
                    format!("Halo tim! {} menyampaikan kebutuhan sprint: {}.", clean_sender, clean_action)
                };

                let tasks = if has_action_verb {
                    vec![TaskDecompositionItem {
                        divisi: matched_division.to_string(),
                        deskripsi: clean_action.clone(),
                        prioritas: if lower.contains("urgent") || lower.contains("segera") || lower.contains("asap") {
                            "tinggi".to_string()
                        } else {
                            "sedang".to_string()
                        },
                        estimasi_jam: Some(3),
                        assignee_name: Some(target_name.clone()),
                        assignee_role: target_role,
                    }]
                } else {
                    vec![]
                };

                Ok(TaskDecompositionResult {
                    ringkasan: clean_action,
                    tanggal_deadline: Some("Besok".to_string()),
                    daftar_tugas: tasks,
                    ai_relay_briefing: Some(briefing),
                    intent_type: Some(if lower.contains("butuh") { "request_data".to_string() } else { "task_instruction".to_string() }),
                    target_stakeholders: Some(vec![target_name]),
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
