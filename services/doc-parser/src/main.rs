use actix_multipart::Multipart;
use actix_web::{error, get, post, web, App, Error, HttpResponse, HttpServer, Responder};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::io::Write;
use std::path::PathBuf;
use uuid::Uuid;

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

#[derive(Serialize)]
struct ParseFileResponse {
    document_id: String,
    status: String,
    detected_type: String,
    word_count: usize,
    chapters: Vec<String>,
    text_preview: String,
    extracted_text: String,
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
    println!("Received document metadata:");
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

#[post("/parse-file")]
async fn parse_file(mut payload: Multipart) -> Result<HttpResponse, Error> {
    let mut document_id = String::new();
    let mut file_name = String::new();
    let mut mime_type = String::new();
    let mut temp_file_path: Option<PathBuf> = None;

    while let Some(item) = payload.next().await {
        let mut field = item?;

        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "file" {
            let temp_path = std::env::temp_dir().join(format!("{}.pdf", Uuid::new_v4()));
            let mut temp_file = std::fs::File::create(&temp_path)
                .map_err(error::ErrorInternalServerError)?;

            while let Some(chunk) = field.next().await {
                let data = chunk?;
                temp_file
                    .write_all(&data)
                    .map_err(error::ErrorInternalServerError)?;
            }

            temp_file_path = Some(temp_path);
        } else {
            let mut bytes = Vec::new();

            while let Some(chunk) = field.next().await {
                let data = chunk?;
                bytes.extend_from_slice(&data);
            }

            let value = String::from_utf8(bytes).unwrap_or_default();

            match field_name.as_str() {
                "document_id" => document_id = value,
                "file_name" => file_name = value,
                "mime_type" => mime_type = value,
                _ => {}
            }
        }
    }

    if document_id.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "document_id wajib dikirim"
        })));
    }

    if file_name.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "file_name wajib dikirim"
        })));
    }

    if mime_type != "application/pdf" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Untuk tahap ini parser baru mendukung PDF"
        })));
    }

    let Some(path) = temp_file_path else {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "File PDF tidak ditemukan dalam request"
        })));
    };

    let extracted_text = match pdf_extract::extract_text(&path) {
        Ok(text) => text,
        Err(err) => {
            println!("PDF extract error: {:?}", err);

            let _ = std::fs::remove_file(&path);

            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Gagal membaca isi PDF"
            })));
        }
    };

    let _ = std::fs::remove_file(&path);

    let detected_type = detect_document_type(&file_name);
    let word_count = count_words(&extracted_text);
    let chapters = detect_chapters(&extracted_text);
    let text_preview = make_preview(&extracted_text, 700);

    Ok(HttpResponse::Ok().json(ParseFileResponse {
        document_id,
        status: "parsed".to_string(),
        detected_type,
        word_count,
        chapters,
        text_preview,
        extracted_text,
        message: "PDF berhasil dibaca oleh Rust parser".to_string(),
    }))
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

fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

fn make_preview(text: &str, max_chars: usize) -> String {
    text.chars().take(max_chars).collect()
}

fn detect_chapters(text: &str) -> Vec<String> {
    let mut found = HashSet::new();

    for line in text.lines() {
        let upper = line.trim().to_uppercase();

        if upper.starts_with("BAB I") {
            found.insert("BAB I".to_string());
        }

        if upper.starts_with("BAB II") {
            found.insert("BAB II".to_string());
        }

        if upper.starts_with("BAB III") {
            found.insert("BAB III".to_string());
        }

        if upper.starts_with("BAB IV") {
            found.insert("BAB IV".to_string());
        }

        if upper.starts_with("BAB V") {
            found.insert("BAB V".to_string());
        }

        if upper.contains("DAFTAR PUSTAKA") {
            found.insert("DAFTAR PUSTAKA".to_string());
        }

        if upper.contains("ABSTRAK") || upper.contains("ABSTRACT") {
            found.insert("ABSTRAK".to_string());
        }
    }

    let mut chapters: Vec<String> = found.into_iter().collect();
    chapters.sort();
    chapters
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
            .service(parse_file)
    })
    .bind((host, port))?
    .run()
    .await
}