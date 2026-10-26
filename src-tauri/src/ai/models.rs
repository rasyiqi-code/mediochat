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
pub struct TaskDecompositionItem {
    pub divisi: String, // "backend" | "frontend" | "desain" | "qa" | "devops" | "general"
    pub deskripsi: String,
    pub prioritas: String, // "tinggi" | "sedang" | "rendah"
    pub estimasi_jam: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDecompositionResult {
    pub ringkasan: String,
    pub tanggal_deadline: Option<String>,
    pub daftar_tugas: Vec<TaskDecompositionItem>,
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
