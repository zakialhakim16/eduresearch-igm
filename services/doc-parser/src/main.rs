use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[derive(Deserialize)]
struct ParseRequest {
    document_id: String,
    file_name: String,
    storage_path: String,
    mime_type: String,
}

#[derive(Serialize)]
struct ParseResponse {
    document_id: String,
    status: String,
    detected_type: String,
    word_count: usize,
    chapters: Vec<String>,
    message: String,
}

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        service: "doc-parser".to_string(),
    })
}

#[post("/parse")]
async fn parse_document(payload: web::Json<ParseRequest>) -> impl Responder {
    println!("Received document:");
    println!("document_id: {}", payload.document_id);
    println!("file_name: {}", payload.file_name);
    println!("storage_path: {}", payload.storage_path);
    println!("mime_type: {}", payload.mime_type);

    let detected_type = detect_document_type(&payload.file_name);

    HttpResponse::Ok().json(ParseResponse {
        document_id: payload.document_id.clone(),
        status: "parsed".to_string(),
        detected_type,
        word_count: 0,
        chapters: vec![],
        message: "Dummy parser berhasil menerima dokumen".to_string(),
    })
}

fn detect_document_type(file_name: &str) -> String {
    let lower_name = file_name.to_lowercase();

    if lower_name.contains("proposal") {
        return "proposal".to_string();
    }

    if lower_name.contains("skripsi") {
        return "skripsi".to_string();
    }

    if lower_name.contains("jurnal") {
        return "jurnal".to_string();
    }

    if lower_name.contains("kp") || lower_name.contains("pkl") {
        return "laporan_kp".to_string();
    }

    "unknown".to_string()
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let host = "127.0.0.1";
    let port = 8001;

    println!("doc-parser running at http://{}:{}", host, port);

    HttpServer::new(|| {
        App::new()
            .service(health)
            .service(parse_document)
    })
    .bind((host, port))?
    .run()
    .await
}