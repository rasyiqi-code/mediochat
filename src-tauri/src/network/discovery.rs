use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{SocketAddr, UdpSocket};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

const DISCOVERY_PORT: u16 = 42424;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeerDevice {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub port: u16,
    #[serde(rename = "isOnline")]
    pub is_online: bool,
    #[serde(rename = "lastSeen")]
    pub last_seen: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PresencePacket {
    id: String,
    name: String,
    timestamp: u64,
}

pub struct PeerDiscoveryService {
    peers: Arc<Mutex<HashMap<String, PeerDevice>>>,
    local_id: String,
    local_name: Arc<Mutex<String>>,
}

impl PeerDiscoveryService {
    pub fn new() -> Self {
        let local_id = uuid::Uuid::new_v4().to_string();
        let hostname = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("USER"))
            .unwrap_or_else(|_| "MedioChat-Node".to_string());

        let service = Self {
            peers: Arc::new(Mutex::new(HashMap::new())),
            local_id,
            local_name: Arc::new(Mutex::new(format!("{} (Local)", hostname))),
        };

        service.start_listener();
        service
    }

    fn start_listener(&self) {
        let peers = Arc::clone(&self.peers);
        let my_id = self.local_id.clone();

        std::thread::Builder::new()
            .name("mediochat-udp-discovery".to_string())
            .spawn(move || {
                let bind_addr = format!("0.0.0.0:{}", DISCOVERY_PORT);
                let socket = match UdpSocket::bind(&bind_addr) {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("Tidak dapat mengikat UDP socket port {}: {}", DISCOVERY_PORT, e);
                        return;
                    }
                };

                let mut buf = [0u8; 1024];
                loop {
                    if let Ok((len, src)) = socket.recv_from(&mut buf) {
                        if let Ok(pkt) = serde_json::from_slice::<PresencePacket>(&buf[..len]) {
                            if pkt.id != my_id {
                                let ip = match src {
                                    SocketAddr::V4(v4) => v4.ip().to_string(),
                                    SocketAddr::V6(v6) => v6.ip().to_string(),
                                };

                                if let Ok(mut lock) = peers.lock() {
                                    lock.insert(
                                        pkt.id.clone(),
                                        PeerDevice {
                                            id: pkt.id,
                                            name: pkt.name,
                                            ip,
                                            port: DISCOVERY_PORT,
                                            is_online: true,
                                            last_seen: pkt.timestamp,
                                        },
                                    );
                                }
                            }
                        }
                    }
                }
            })
            .ok();
    }

    pub fn broadcast_presence(&self) -> Result<(), String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let name = self
            .local_name
            .lock()
            .map(|guard| guard.clone())
            .unwrap_or_else(|_| "MedioChat-Node".to_string());

        let packet = PresencePacket {
            id: self.local_id.clone(),
            name,
            timestamp: now,
        };

        let data = serde_json::to_vec(&packet)
            .map_err(|e| format!("Gagal serialize packet: {}", e))?;

        let socket = UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| format!("Gagal bind temporary socket: {}", e))?;

        socket
            .set_broadcast(true)
            .map_err(|e| format!("Gagal set socket broadcast: {}", e))?;

        let broadcast_addr = format!("255.255.255.255:{}", DISCOVERY_PORT);
        socket
            .send_to(&data, &broadcast_addr)
            .map_err(|e| format!("Gagal broadcast packet ke {}: {}", broadcast_addr, e))?;

        Ok(())
    }

    pub fn get_peers(&self) -> Vec<PeerDevice> {
        if let Ok(lock) = self.peers.lock() {
            let mut list: Vec<PeerDevice> = lock.values().cloned().collect();
            list.sort_by(|a, b| a.name.cmp(&b.name));
            list
        } else {
            Vec::new()
        }
    }
}
