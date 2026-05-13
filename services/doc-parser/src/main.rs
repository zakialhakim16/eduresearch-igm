use actix_cors::Cors;
use actix_multipart::Multipart;
use actix_web::http::header;
use actix_web::http::Method;
use actix_web::{error, get, post, web, App, Error, HttpResponse, HttpServer, Responder};
use futures_util::StreamExt;
use regex::Regex;
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
    chapters: Vec<ChapterInfo>,
    message: String,
}

#[derive(Serialize)]
struct ParseFileResponse {
    document_id: String,
    status: String,
    detected_type: String,
    word_count: usize,
    chapters: Vec<ChapterInfo>,
    text_preview: String,
    extracted_text: String,
    references: Vec<String>,
    keywords: Vec<String>,
    quality: DocumentQuality,
    message: String,
}

#[derive(Serialize)]
struct ChapterInfo {
    title: String,
    word_count: usize,
    start_line: usize,
}

#[derive(Serialize)]
struct DocumentQuality {
    total: usize,
    has_abstract: bool,
    has_chapters: bool,
    has_references: bool,
    has_methodology: bool,
    word_count_adequate: bool,
    notes: Vec<String>,
}

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(HealthResponse {
        status: "ok".to_string(),
        service: "doc-parser-v2".to_string(),
    })
}

#[post("/parse")]
async fn parse_document(payload: web::Json<ParseRequest>) -> impl Responder {
    println!("Received document metadata:");
    println!("document_id: {}", payload.document_id);
    println!("file_name: {}", payload.file_name);
    println!("storage_path: {}", payload.storage_path);
    println!("mime_type: {}", payload.mime_type);

    let detected_type = detect_document_type(&payload.file_name, None);

    HttpResponse::Ok().json(ParseResponse {
        document_id: payload.document_id.clone(),
        status: "parsed".to_string(),
        detected_type,
        word_count: 0,
        chapters: vec![],
        message: "Enhanced parser v2 berhasil menerima dokumen".to_string(),
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

    let detected_type = detect_document_type(&file_name, Some(&extracted_text));
    let word_count = count_words(&extracted_text);
    let chapters = detect_chapters_with_content(&extracted_text);
    let text_preview = make_preview(&extracted_text, 700);
    let references = extract_references(&extracted_text);
    let keywords = extract_keywords(&extracted_text);
    let quality = assess_quality(&extracted_text, &detected_type, &chapters, word_count);

    Ok(HttpResponse::Ok().json(ParseFileResponse {
        document_id,
        status: "parsed".to_string(),
        detected_type,
        word_count,
        chapters,
        text_preview,
        extracted_text,
        references,
        keywords,
        quality,
        message: "PDF berhasil dianalisis oleh Enhanced Rust Parser v2".to_string(),
    }))
}

fn detect_document_type_from_filename(file_name: &str) -> String {
    let lower_name = file_name.to_lowercase();

    if lower_name.contains("proposal") || lower_name.contains("usulan") {
        return "proposal".to_string();
    }

    if lower_name.contains("skripsi")
        || lower_name.contains("tugas-akhir")
        || lower_name.contains("tugasakhir")
        || lower_name.contains("-ta-")
        || lower_name.contains("_ta_")
        || lower_name.contains("thesis")
        || lower_name.contains("tesis")
    {
        return "skripsi".to_string();
    }

    if lower_name.contains("jurnal")
        || lower_name.contains("artikel")
        || lower_name.contains("journal")
        || lower_name.contains("paper")
    {
        return "jurnal".to_string();
    }

    if lower_name.contains("pkl")
        || lower_name.contains("laporan_kp")
        || lower_name.contains("kerja-praktik")
        || lower_name.contains("kerjapraktik")
        || lower_name.contains("kerja praktik")
        || lower_name.contains("kerja_praktik")
        || (lower_name.contains("kp") && lower_name.contains("laporan"))
    {
        return "laporan_kp".to_string();
    }

    if lower_name.contains("template") {
        return "template".to_string();
    }

    "unknown".to_string()
}

/// Heuristik dari awal teks (setelah nama file tidak cukup).
fn detect_document_type_from_content(content: &str) -> Option<String> {
    let head: String = content.chars().take(8000).collect();
    let u = head.to_uppercase();

    if u.contains("LAPORAN KERJA PRAKTEK")
        || u.contains("LAPORAN PRAKTEK KERJA")
        || u.contains("LAPORAN KERJA PRAKTIK")
        || u.contains("LAPORAN PKL")
        || (u.contains("KERJA PRAKTEK") && u.contains("LAPORAN"))
    {
        return Some("laporan_kp".to_string());
    }

    if u.contains("PROPOSAL PENELITIAN")
        || u.contains("PROPOSAL TESIS")
        || u.contains("PROPOSAL SKRIPSI")
    {
        return Some("proposal".to_string());
    }

    if u.contains("\nSKRIPSI\n")
        || u.contains("\r\nSKRIPSI\r\n")
        || u.starts_with("SKRIPSI\n")
        || u.starts_with("SKRIPSI\r\n")
    {
        return Some("skripsi".to_string());
    }

    if u.contains("ARTIKEL ILMIAH")
        || (u.contains("ABSTRACT") && u.contains("KEYWORDS"))
        || (u.contains("ABSTRAK") && u.contains("KATA KUNCI"))
    {
        return Some("jurnal".to_string());
    }

    None
}

fn detect_document_type(file_name: &str, content: Option<&str>) -> String {
    let from_name = detect_document_type_from_filename(file_name);
    if from_name != "unknown" {
        return from_name;
    }
    if let Some(text) = content {
        if let Some(from_content) = detect_document_type_from_content(text) {
            return from_content;
        }
    }
    "unknown".to_string()
}

fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

fn make_preview(text: &str, max_chars: usize) -> String {
    text.chars().take(max_chars).collect()
}

fn detect_chapters_with_content(text: &str) -> Vec<ChapterInfo> {
    let mut chapters = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    
    let chapter_patterns = vec![
        ("BAB I", "BAB I"),
        ("BAB II", "BAB II"),
        ("BAB III", "BAB III"),
        ("BAB IV", "BAB IV"),
        ("BAB V", "BAB V"),
        ("ABSTRAK", "ABSTRAK"),
        ("ABSTRACT", "ABSTRACT"),
        ("DAFTAR PUSTAKA", "DAFTAR PUSTAKA"),
        ("LATAR BELAKANG", "Latar Belakang"),
        ("TINJAUAN PUSTAKA", "Tinjauan Pustaka"),
        ("METODE PENELITIAN", "Metode Penelitian"),
        ("HASIL DAN PEMBAHASAN", "Hasil dan Pembahasan"),
        ("KESIMPULAN DAN SARAN", "Kesimpulan dan Saran"),
    ];

    for (i, line) in lines.iter().enumerate() {
        let upper = line.trim().to_uppercase();
        
        for (pattern, title) in &chapter_patterns {
            if upper.contains(pattern) {
                let chapter_text = extract_chapter_content(&lines, i);
                chapters.push(ChapterInfo {
                    title: title.to_string(),
                    word_count: count_words(&chapter_text),
                    start_line: i + 1,
                });
                break;
            }
        }
    }

    chapters.sort_by(|a, b| a.start_line.cmp(&b.start_line));
    chapters.dedup_by(|a, b| a.title == b.title);
    chapters
}

fn extract_chapter_content(lines: &[&str], start_idx: usize) -> String {
    let mut end_idx = lines.len();
    let current_title = lines[start_idx].trim().to_uppercase();

    for i in (start_idx + 1)..lines.len() {
        let upper = lines[i].trim().to_uppercase();

        let is_new_chapter =
            upper.starts_with("BAB ")
                || upper.contains("ABSTRAK")
                || upper.contains("ABSTRACT")
                || upper.contains("DAFTAR PUSTAKA")
                || upper.contains("REFERENSI")
                || upper.contains("REFERENCES");

        if is_new_chapter && upper != current_title {
            end_idx = i;
            break;
        }
    }

    let chapter_lines = &lines[start_idx..end_idx];
    chapter_lines.join("\n")
}

fn extract_references(text: &str) -> Vec<String> {
    let mut references = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    let mut in_references = false;
    
    for line in lines {
        let upper = line.trim().to_uppercase();
        
        if upper.contains("DAFTAR PUSTAKA") || upper.contains("REFERENSI") {
            in_references = true;
            continue;
        }
        
        if in_references && !line.trim().is_empty() {
            let clean_ref = line.trim().to_string();
            if clean_ref.len() > 10 && !clean_ref.starts_with("http") {
                references.push(clean_ref);
            }
        }
    }
    
    references.truncate(20);
    references
}

fn extract_keywords(text: &str) -> Vec<String> {
    let common_words = HashSet::from([
        "dan", "yang", "dari", "pada", "dengan", "untuk", "adalah", "ini", "tersebut",
        "dalam", "akan", "tidak", "oleh", "atau", "juga", "sudah", "bisa",
        "lebih", "karena", "seperti", "jika", "mereka", "kita", "para", "antara",
        "the", "and", "of", "to", "in", "is", "for", "with", "are", "be", "this",
        "that", "have", "from", "at", "by", "as", "was", "were", "been", "has",
    ]);
    
    let word_regex = Regex::new(r"\b[a-zA-Z]{3,}\b").unwrap();
    let words: Vec<String> = word_regex.find_iter(text)
        .map(|m| m.as_str().to_lowercase())
        .collect();
    
    let mut word_counts = std::collections::HashMap::new();
    for word in &words {
        if !common_words.contains(word.as_str()) && word.len() >= 4 {
            *word_counts.entry(word.clone()).or_insert(0) += 1;
        }
    }
    
    let mut keywords: Vec<(String, usize)> = word_counts.into_iter()
        .filter(|(_, count)| *count >= 2)
        .collect();
    
    keywords.sort_by(|a, b| b.1.cmp(&a.1));
    keywords.truncate(15);
    keywords.into_iter().map(|(word, _)| word).collect()
}

fn assess_quality(text: &str, _doc_type: &str, chapters: &[ChapterInfo], word_count: usize) -> DocumentQuality {
    let has_abstract = text.to_uppercase().contains("ABSTRAK") || text.to_uppercase().contains("ABSTRACT");
    let has_chapters = chapters.len() >= 3;
    let has_references = text.to_uppercase().contains("DAFTAR PUSTAKA") || text.to_uppercase().contains("REFERENSI");
    let has_methodology = text.to_uppercase().contains("METODE") || text.to_uppercase().contains("METHODOLOGY");
    let word_count_adequate = word_count >= 2000;
    
    let mut notes = Vec::new();
    if !has_abstract { notes.push("Tidak memiliki abstrak".to_string()); }
    if !has_chapters { notes.push("Struktur bab kurang lengkap".to_string()); }
    if !has_references { notes.push("Tidak memiliki daftar pustaka".to_string()); }
    if !has_methodology { notes.push("Tidak memiliki metode penelitian".to_string()); }
    if !word_count_adequate { notes.push("Jumlah kata kurang dari 2000".to_string()); }
    
    let total_score = [
        has_abstract as usize,
        has_chapters as usize,
        has_references as usize,
        has_methodology as usize,
        word_count_adequate as usize,
    ].iter().sum::<usize>() * 20;
    
    DocumentQuality {
        total: total_score,
        has_abstract,
        has_chapters,
        has_references,
        has_methodology,
        word_count_adequate,
        notes,
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8001);

    let bind_addr = format!("{host}:{port}");
    println!("Enhanced doc-parser v2 listening on http://{bind_addr}");

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
            .allowed_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
            .allowed_headers(vec![header::CONTENT_TYPE, header::ACCEPT])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .service(health)
            .service(parse_document)
            .service(parse_file)
    })
    .bind(&bind_addr)?
    .run()
    .await
}
