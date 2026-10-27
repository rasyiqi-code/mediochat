pub mod ai;
pub mod network;
pub mod storage;

use ai::{AIClient, AIProviderConfig, Stakeholder, TaskDecompositionResult, TestConnectionResult};
use network::{LocalNodeInfo, PeerDevice, PeerDiscoveryService};
use storage::StorageManager;
use tauri::State;

struct AppState {
    ai_client: AIClient,
    peer_service: PeerDiscoveryService,
    storage: StorageManager,
}

#[tauri::command]
async fn ai_decompose_task(
    state: State<'_, AppState>,
    provider: AIProviderConfig,
    text: String,
    stakeholders: Option<Vec<Stakeholder>>,
) -> Result<TaskDecompositionResult, String> {
    state
        .ai_client
        .decompose_task(&text, &provider, stakeholders.as_deref())
        .await
}

#[tauri::command]
async fn ai_chat_completion(
    state: State<'_, AppState>,
    provider: AIProviderConfig,
    prompt: String,
    system_prompt: Option<String>,
) -> Result<String, String> {
    state
        .ai_client
        .chat_completion(&prompt, &provider, system_prompt.as_deref(), false)
        .await
}

#[tauri::command]
async fn ai_fetch_models(
    state: State<'_, AppState>,
    provider: AIProviderConfig,
) -> Result<Vec<String>, String> {
    state.ai_client.fetch_models(&provider).await
}

#[tauri::command]
async fn ai_test_connection(
    state: State<'_, AppState>,
    provider: AIProviderConfig,
) -> Result<TestConnectionResult, String> {
    Ok(state.ai_client.test_connection(&provider).await)
}

#[tauri::command]
fn get_lan_peers(state: State<'_, AppState>) -> Result<Vec<PeerDevice>, String> {
    Ok(state.peer_service.get_peers())
}

#[tauri::command]
fn broadcast_lan_presence(state: State<'_, AppState>) -> Result<(), String> {
    state.peer_service.broadcast_presence()
}

#[tauri::command]
fn get_local_node_info(state: State<'_, AppState>) -> Result<LocalNodeInfo, String> {
    Ok(state.peer_service.get_local_node_info())
}

#[tauri::command]
fn load_app_config(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    state.storage.load_config()
}

#[tauri::command]
fn save_app_config(
    state: State<'_, AppState>,
    config: serde_json::Value,
) -> Result<(), String> {
    state.storage.save_config(config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        ai_client: AIClient::new(),
        peer_service: PeerDiscoveryService::new(),
        storage: StorageManager::new(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            ai_decompose_task,
            ai_chat_completion,
            ai_fetch_models,
            ai_test_connection,
            get_lan_peers,
            broadcast_lan_presence,
            get_local_node_info,
            load_app_config,
            save_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
