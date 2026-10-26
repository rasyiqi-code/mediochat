use serde_json::Value;
use std::fs;
use std::path::PathBuf;

pub struct StorageManager {
    config_path: PathBuf,
}

impl StorageManager {
    pub fn new() -> Self {
        // Find or create local app data directory
        let base_dir = dirs_or_fallback();
        let config_dir = base_dir.join("mediochat");
        let _ = fs::create_dir_all(&config_dir);
        let config_path = config_dir.join("config.json");

        Self { config_path }
    }

    pub fn load_config(&self) -> Result<Value, String> {
        if !self.config_path.exists() {
            return Ok(serde_json::json!({}));
        }

        let content = fs::read_to_string(&self.config_path)
            .map_err(|e| format!("Gagal membaca config: {}", e))?;

        serde_json::from_str(&content)
            .map_err(|e| format!("Gagal parsing JSON config: {}", e))
    }

    pub fn save_config(&self, data: Value) -> Result<(), String> {
        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| format!("Gagal serialize config: {}", e))?;

        fs::write(&self.config_path, content)
            .map_err(|e| format!("Gagal menulis file config: {}", e))?;

        Ok(())
    }
}

fn dirs_or_fallback() -> PathBuf {
    if let Ok(cfg) = std::env::var("XDG_CONFIG_HOME") {
        return PathBuf::from(cfg);
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".config");
    }
    PathBuf::from(".")
}
