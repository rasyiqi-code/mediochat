use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIProviderConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String, // "ollama" | "gemini" | "qwen" | "openai" | "custom"
    #[serde(rename = "baseUrl")]
    pub base_url: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "selectedModel")]
    pub selected_model: String,
    #[serde(rename = "availableModels")]
    pub available_models: Vec<String>,
    #[serde(rename = "audioModel")]
    pub audio_model: Option<String>,
    #[serde(rename = "customHeaders")]
    pub custom_headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stakeholder {
    pub id: String,
    pub name: String,
    pub role: String,
    pub division: String,
    pub email: Option<String>,
    pub skills: Option<Vec<String>>,
    pub is_current_user: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDecompositionItem {
    pub divisi: String, // "backend" | "frontend" | "desain" | "qa" | "devops" | "general"
    pub deskripsi: String,
    pub prioritas: String, // "tinggi" | "sedang" | "rendah"
    pub estimasi_jam: Option<u32>,
    pub assignee_name: Option<String>,
    pub assignee_role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDecompositionResult {
    pub ringkasan: String,
    pub tanggal_deadline: Option<String>,
    pub daftar_tugas: Vec<TaskDecompositionItem>,
    pub ai_relay_briefing: Option<String>,
    pub intent_type: Option<String>,
    pub target_stakeholders: Option<Vec<String>>,
    pub urgency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub message: String,
    #[serde(rename = "latencyMs")]
    pub latency_ms: u64,
    #[serde(rename = "availableModels")]
    pub available_models: Option<Vec<String>>,
}
