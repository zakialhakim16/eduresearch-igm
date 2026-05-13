use actix_cors::Cors;
use actix_web::http::header;
use actix_web::http::Method;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[derive(Serialize)]
struct WorkMetadata {
    doi: String,
    title: Option<String>,
    year: Option<i64>,
    journal: Option<String>,
    publisher: Option<String>,
    #[serde(rename = "type")]
    work_type: Option<String>,
}

#[derive(serde::Deserialize)]
struct MetadataQuery {
    /// DOI mentah, mis. `10.1037/0003-066x.59.8.847`
    doi: String,
}

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        service: "journal-scraper".to_string(),
    })
}

fn crossref_user_agent() -> String {
    let mail = std::env::var("CROSSREF_MAILTO").unwrap_or_else(|_| "dev@localhost".to_string());
    format!("EduResearch-JournalScraper/1.0 (mailto:{mail})")
}

fn map_crossref_message(doi: &str, msg: &Value) -> WorkMetadata {
    let title = msg
        .get("title")
        .and_then(|t| t.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let year = msg
        .pointer("/issued/date-parts/0/0")
        .and_then(|y| y.as_i64().or_else(|| y.as_f64().map(|f| f as i64)));

    let journal = msg
        .get("container-title")
        .and_then(|t| t.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(str::to_string);

    let publisher = msg
        .get("publisher")
        .and_then(|p| p.as_str())
        .map(str::to_string);

    let work_type = msg
        .get("type")
        .and_then(|t| t.as_str())
        .map(str::to_string);

    WorkMetadata {
        doi: doi.to_string(),
        title,
        year,
        journal,
        publisher,
        work_type,
    }
}

#[get("/metadata")]
async fn metadata(q: web::Query<MetadataQuery>) -> impl Responder {
    let doi = q.doi.trim();
    if doi.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Parameter doi wajib diisi"
        }));
    }

    let enc = urlencoding::encode(doi);
    let url = format!("https://api.crossref.org/works/{enc}");

    let client = match reqwest::Client::builder()
        .user_agent(crossref_user_agent())
        .timeout(std::time::Duration::from_secs(20))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Gagal membuat HTTP client: {e}")
            }))
        }
    };

    let response = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return HttpResponse::BadGateway().json(serde_json::json!({
                "error": format!("Gagal menghubungi Crossref: {e}")
            }))
        }
    };

    let status = response.status();
    let body: Value = match response.json().await {
        Ok(b) => b,
        Err(e) => {
            return HttpResponse::BadGateway().json(serde_json::json!({
                "error": format!("Respons Crossref bukan JSON: {e}")
            }))
        }
    };

    if !status.is_success() {
        let reason = body
            .pointer("/message/0")
            .and_then(|v| v.as_str())
            .or_else(|| body.get("message").and_then(|m| m.as_str()))
            .unwrap_or("Permintaan ditolak Crossref");
        return HttpResponse::build(
            actix_web::http::StatusCode::from_u16(status.as_u16())
                .unwrap_or(actix_web::http::StatusCode::BAD_GATEWAY),
        )
        .json(serde_json::json!({ "error": reason }));
    }

    let msg = match body.get("message") {
        Some(m) if m.is_object() => m,
        _ => {
            return HttpResponse::BadGateway().json(serde_json::json!({
                "error": "Format respons Crossref tidak dikenali"
            }))
        }
    };

    HttpResponse::Ok().json(map_crossref_message(doi, msg))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8002);

    let bind_addr = format!("{host}:{port}");
    println!("journal-scraper listening on http://{bind_addr}");

    HttpServer::new(|| {
        let cors = Cors::default()
            .allowed_origin_fn(|origin, _req_head| {
                let b = origin.as_bytes();
                b.ends_with(b".vercel.app")
                    || b.ends_with(b"vercel.app")
                    || b.starts_with(b"http://localhost")
                    || b.starts_with(b"https://localhost")
                    || b.starts_with(b"http://127.0.0.1")
                    || b.starts_with(b"https://127.0.0.1")
            })
            .allowed_methods(vec![Method::GET, Method::OPTIONS])
            .allowed_headers(vec![header::CONTENT_TYPE, header::ACCEPT])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .service(health)
            .service(metadata)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
