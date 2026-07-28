use std::{
    collections::{HashMap, VecDeque},
    sync::{Mutex, OnceLock},
    time::Duration,
};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::{ACCEPT, CONTENT_LENGTH, CONTENT_TYPE};

const AVATAR_CACHE_ENTRY_LIMIT: usize = 128;
const AVATAR_CACHE_BYTES_LIMIT: usize = 16 * 1024 * 1024;
const MAX_AVATAR_BYTES: usize = 1024 * 1024;

#[derive(Default)]
struct AvatarCache {
    entries: HashMap<String, String>,
    order: VecDeque<String>,
    total_bytes: usize,
}

impl AvatarCache {
    fn get(&mut self, key: &str) -> Option<String> {
        let value = self.entries.get(key)?.clone();
        self.order.retain(|cached_key| cached_key != key);
        self.order.push_back(key.to_owned());
        Some(value)
    }

    fn insert(&mut self, key: String, value: String) {
        if let Some(previous) = self.entries.remove(&key) {
            self.total_bytes = self.total_bytes.saturating_sub(previous.len());
            self.order.retain(|cached_key| cached_key != &key);
        }

        self.total_bytes += value.len();
        self.order.push_back(key.clone());
        self.entries.insert(key, value);

        while self.entries.len() > AVATAR_CACHE_ENTRY_LIMIT
            || self.total_bytes > AVATAR_CACHE_BYTES_LIMIT
        {
            let Some(eviction_key) = self.order.pop_front() else {
                break;
            };

            if let Some(evicted) = self.entries.remove(&eviction_key) {
                self.total_bytes = self.total_bytes.saturating_sub(evicted.len());
            }
        }
    }
}

static AVATAR_CACHE: OnceLock<Mutex<AvatarCache>> = OnceLock::new();
static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn avatar_cache() -> &'static Mutex<AvatarCache> {
    AVATAR_CACHE.get_or_init(|| Mutex::new(AvatarCache::default()))
}

fn http_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
            .expect("failed to create QQ avatar HTTP client")
    })
}

fn validate_qq(qq: &str) -> Result<&str, String> {
    let qq = qq.trim();

    if qq.is_empty() || qq.len() > 20 || !qq.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err("QQ 号必须是 1 至 20 位数字".into());
    }

    Ok(qq)
}

fn normalize_avatar_size(size: Option<u16>) -> u16 {
    match size {
        Some(value) if value > 100 => 640,
        _ => 100,
    }
}

/// Fetches a QQ avatar through Rust and returns a data URL.
///
/// The source project performs the same server-side proxy step because loading
/// qlogo2 directly inside a browser/webview can be affected by TLS, hotlinking,
/// or cross-origin restrictions.
#[tauri::command]
async fn fetch_qq_avatar(qq: String, size: Option<u16>) -> Result<String, String> {
    let qq = validate_qq(&qq)?;
    let size = normalize_avatar_size(size);
    let url = format!("https://qlogo2.store.qq.com/qzone/{qq}/{qq}/{size}");

    let cached = avatar_cache()
        .lock()
        .map_err(|_| "QQ 头像缓存不可用")?
        .get(&url);
    if let Some(cached) = cached {
        return Ok(cached);
    }

    let mut response = http_client()
        .get(&url)
        .header(ACCEPT, "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
        .send()
        .await
        .map_err(|error| format!("QQ 头像请求失败: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("QQ 头像服务返回 {}", response.status()));
    }

    if let Some(upstream_info) = response
        .headers()
        .get("x-info")
        .and_then(|value| value.to_str().ok())
    {
        if upstream_info.starts_with("notexist") || upstream_info.starts_with("illref") {
            return Err(format!("QQ 头像不可用: {upstream_info}"));
        }
    }

    let content_length = response
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<usize>().ok());
    if let Some(content_length) = content_length {
        if content_length > MAX_AVATAR_BYTES {
            return Err("QQ 头像文件过大".into());
        }
    }

    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next());
    let content_type = match content_type {
        Some(value) if value.starts_with("image/") => value.to_owned(),
        Some(_) => return Err("QQ 头像服务返回的不是图片".into()),
        None => "image/jpeg".to_owned(),
    };

    let mut bytes = Vec::with_capacity(content_length.unwrap_or_default());
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("读取 QQ 头像失败: {error}"))?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_AVATAR_BYTES {
            return Err("QQ 头像文件过大".into());
        }
        bytes.extend_from_slice(&chunk);
    }

    if bytes.is_empty() {
        return Err("QQ 头像服务返回了空图片".into());
    }

    let data_url = format!("data:{content_type};base64,{}", STANDARD.encode(&bytes));
    avatar_cache()
        .lock()
        .map_err(|_| "QQ 头像缓存不可用")?
        .insert(url, data_url.clone());

    Ok(data_url)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_qq_avatar, greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qq_avatar_sizes_are_limited_to_supported_values() {
        assert_eq!(normalize_avatar_size(None), 100);
        assert_eq!(normalize_avatar_size(Some(80)), 100);
        assert_eq!(normalize_avatar_size(Some(100)), 100);
        assert_eq!(normalize_avatar_size(Some(160)), 640);
        assert_eq!(normalize_avatar_size(Some(640)), 640);
    }

    #[test]
    fn qq_validation_rejects_non_numeric_input() {
        assert!(validate_qq("").is_err());
        assert!(validate_qq("19a021").is_err());
        assert!(validate_qq("1902141259").is_ok());
    }

    #[test]
    fn avatar_cache_is_bounded_and_refreshes_recent_entries() {
        let mut cache = AvatarCache::default();

        for index in 0..=AVATAR_CACHE_ENTRY_LIMIT {
            cache.insert(index.to_string(), "avatar".into());
        }

        assert_eq!(cache.entries.len(), AVATAR_CACHE_ENTRY_LIMIT);
        assert!(!cache.entries.contains_key("0"));
        assert!(cache.get("1").is_some());

        cache.insert("latest".into(), "avatar".into());
        assert!(cache.entries.contains_key("1"));
        assert!(!cache.entries.contains_key("2"));
    }

    #[test]
    #[ignore = "requires access to the external QQ avatar service"]
    fn fetches_real_qq_avatar_as_a_data_url() {
        let avatar =
            tauri::async_runtime::block_on(fetch_qq_avatar("1902141259".into(), Some(100)))
                .expect("known QQ avatar should be fetched");

        assert!(avatar.starts_with("data:image/"));
        assert!(avatar.len() > 1_000);
    }

    #[test]
    #[ignore = "requires access to the external QQ avatar service"]
    fn rejects_qq_placeholder_images() {
        let error = tauri::async_runtime::block_on(fetch_qq_avatar("2749206318".into(), Some(100)))
            .expect_err("unknown QQ should not be accepted as a real avatar");

        assert!(error.contains("notexist"));
    }
}
