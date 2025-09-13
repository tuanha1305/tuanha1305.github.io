---
title: Custom TCVN3 Encoding Implementation - A Deep Dive
tags: tcvn3 encoding rust
---

TCVN3 (Vietnamese legacy encoding) là một encoding đa byte được sử dụng để mã hóa văn bản tiếng Việt trước khi Unicode trở nên phổ biến. Trong 1 dự án gần đây của tôi có sử dụng đến encoding này. Bài viết này sẽ chia sẻ cách implement một encoder/decoder TCVN3 hoàn chỉnh.

## Tổng quan về TCVN3

TCVN3 sử dụng cả single-byte và two-byte sequences để mã hóa ký tự tiếng Việt:
- ASCII (0x00-0x7F): giữ nguyên
- Ký tự tiếng Việt: sử dụng 1-2 bytes với mapping tables

### Kiến trúc tổng thể

```rust
pub struct Tcvn3Decoder {
    pending: Option<u8>, // Byte đang chờ xử lý
}

pub struct Tcvn3Encoder;
```

## Bảng mapping chính - Mapping Tables

Hệ thống sử dụng hai bảng lookup tables:
- TCVN3_ENCODE_TABLE: Unicode → TCVN3 bytes
- TCVN3_DECODE_TABLE: TCVN3 bytes → Unicode

### Encode Table (Unicode → TCVN3)
```rust
const TCVN3_ENCODE_TABLE: &[(u16, &[u8])] = &[
    (0x00C0, b"\x41\xB5"), // À -> Aµ
    (0x00C1, b"\x41\xB8"), // Á -> A¸
    (0x00C2, b"\xA2"), // Â -> ¢
    (0x00C3, b"\x41\xB7"), // Ã -> A·
    (0x00C8, b"\x45\xCC"), // È -> EÌ
    (0x00C9, b"\x45\xD0"), // É -> EÐ
    (0x00CA, b"\xA3"), // Ê -> £
    (0x00CC, b"\x49\xD7"), // Ì -> I×
    (0x00CD, b"\x49\xDD"), // Í -> IÝ
    (0x00D2, b"\x4F\xDF"), // Ò -> Oß
    (0x00D3, b"\x4F\xE3"), // Ó -> Oã
    (0x00D4, b"\xA4"), // Ô -> ¤
    (0x00D5, b"\x4F\xE2"), // Õ -> Oâ
    (0x00D9, b"\x55\xEF"), // Ù -> Uï
    (0x00DA, b"\x55\xF3"), // Ú -> Uó
    (0x00DD, b"\x59\xFD"), // Ý -> Yý
    (0x00E0, b"\xB5"), // à -> µ
    (0x00E1, b"\xB8"), // á -> ¸
    (0x00E2, b"\xA9"), // â -> ©
    (0x00E3, b"\xB7"), // ã -> ·
    (0x00E8, b"\xCC"), // è -> Ì
    (0x00E9, b"\xD0"), // é -> Ð
    (0x00EA, b"\xAA"), // ê -> ª
    (0x00EC, b"\xD7"), // ì -> ×
    (0x00ED, b"\xDD"), // í -> Ý
    (0x00F2, b"\xDF"), // ò -> ß
    (0x00F3, b"\xE3"), // ó -> ã
    (0x00F4, b"\xAB"), // ô -> «
    (0x00F5, b"\xE2"), // õ -> â
    (0x00F9, b"\xEF"), // ù -> ï
    (0x00FA, b"\xF3"), // ú -> ó
    (0x00FD, b"\xFD"), // ý -> ý
    (0x0102, b"\xA1"), // Ă -> ¡
    (0x0103, b"\xA8"), // ă -> ¨
    (0x0110, b"\xA7"), // Đ -> §
    (0x0111, b"\xAE"), // đ -> ®
    (0x0128, b"\x49\xDC"), // Ĩ -> IÜ
    (0x0129, b"\xDC"), // ĩ -> Ü
    (0x0168, b"\x55\xF2"), // Ũ -> Uò
    (0x0169, b"\xF2"), // ũ -> ò
    (0x01A0, b"\xA5"), // Ơ -> ¥
    (0x01A1, b"\xAC"), // ơ -> ¬
    (0x01AF, b"\xA6"), // Ư -> ¦
    (0x01B0, b"\xAD"), // ư -> ­
    (0x1EA0, b"\x41\xB9"), // Ạ -> A¹
    (0x1EA1, b"\xB9"), // ạ -> ¹
    (0x1EA2, b"\x41\xB6"), // Ả -> A¶
    (0x1EA3, b"\xB6"), // ả -> ¶
    (0x1EA4, b"\xA2\xCA"), // Ấ -> ¢Ê
    (0x1EA5, b"\xCA"), // ấ -> Ê
    (0x1EA6, b"\xA2\xC7"), // Ầ -> ¢Ç
    (0x1EA7, b"\xC7"), // ầ -> Ç
    (0x1EA8, b"\xA2\xC8"), // Ẩ -> ¢È
    (0x1EA9, b"\xC8"), // ẩ -> È
    (0x1EAA, b"\xA2\xC9"), // Ẫ -> ¢É
    (0x1EAB, b"\xC9"), // ẫ -> É
    (0x1EAC, b"\xA2\xCB"), // Ậ -> ¢Ë
    (0x1EAD, b"\xCB"), // ậ -> Ë
    (0x1EAE, b"\xA1\xBE"), // Ắ -> ¡¾
    (0x1EAF, b"\xBE"), // ắ -> ¾
    (0x1EB0, b"\xA1\xBB"), // Ằ -> ¡»
    (0x1EB1, b"\xBB"), // ằ -> »
    (0x1EB2, b"\xA1\xBC"), // Ẳ -> ¡¼
    (0x1EB3, b"\xBC"), // ẳ -> ¼
    (0x1EB4, b"\xA1\xBD"), // Ẵ -> ¡½
    (0x1EB5, b"\xBD"), // ẵ -> ½
    (0x1EB6, b"\xA1\xC6"), // Ặ -> ¡Æ
    (0x1EB7, b"\xC6"), // ặ -> Æ
    (0x1EB8, b"\x45\xD1"), // Ẹ -> EÑ
    (0x1EB9, b"\xD1"), // ẹ -> Ñ
    (0x1EBA, b"\x45\xCE"), // Ẻ -> EÎ
    (0x1EBB, b"\xCE"), // ẻ -> Î
    (0x1EBC, b"\x45\xCF"), // Ẽ -> EÏ
    (0x1EBD, b"\xCF"), // ẽ -> Ï
    (0x1EBE, b"\xA3\xD5"), // Ế -> £Õ
    (0x1EBF, b"\xD5"), // ế -> Õ
    (0x1EC0, b"\xA3\xD2"), // Ề -> £Ò
    (0x1EC1, b"\xD2"), // ề -> Ò
    (0x1EC2, b"\xA3\xD3"), // Ể -> £Ó
    (0x1EC3, b"\xD3"), // ể -> Ó
    (0x1EC4, b"\xA3\xD4"), // Ễ -> £Ô
    (0x1EC5, b"\xD4"), // ễ -> Ô
    (0x1EC6, b"\xA3\xD6"), // Ệ -> £Ö
    (0x1EC7, b"\xD6"), // ệ -> Ö
    (0x1EC8, b"\x49\xD8"), // Ỉ -> IØ
    (0x1EC9, b"\xD8"), // ỉ -> Ø
    (0x1ECA, b"\x49\xDE"), // Ị -> IÞ
    (0x1ECB, b"\xDE"), // ị -> Þ
    (0x1ECC, b"\x4F\xE4"), // Ọ -> Oä
    (0x1ECD, b"\xE4"), // ọ -> ä
    (0x1ECE, b"\x4F\xE1"), // Ỏ -> Oá
    (0x1ECF, b"\xE1"), // ỏ -> á
    (0x1ED0, b"\xA4\xE8"), // Ố -> ¤è
    (0x1ED1, b"\xE8"), // ố -> è
    (0x1ED2, b"\xA4\xE5"), // Ồ -> ¤å
    (0x1ED3, b"\xE5"), // ồ -> å
    (0x1ED4, b"\xA4\xE6"), // Ổ -> ¤æ
    (0x1ED5, b"\xE6"), // ổ -> æ
    (0x1ED6, b"\xA4\xE7"), // Ỗ -> ¤ç
    (0x1ED7, b"\xE7"), // ỗ -> ç
    (0x1ED8, b"\xA4\xE9"), // Ộ -> ¤é
    (0x1ED9, b"\xE9"), // ộ -> é
    (0x1EDA, b"\xA5\xED"), // Ớ -> ¥í
    (0x1EDB, b"\xED"), // ớ -> í
    (0x1EDC, b"\xA5\xEA"), // Ờ -> ¥ê
    (0x1EDD, b"\xEA"), // ờ -> ê
    (0x1EDE, b"\xA5\xEB"), // Ở -> ¥ë
    (0x1EDF, b"\xEB"), // ở -> ë
    (0x1EE0, b"\xA5\xEC"), // Ỡ -> ¥ì
    (0x1EE1, b"\xEC"), // ỡ -> ì
    (0x1EE2, b"\xA5\xEE"), // Ợ -> ¥î
    (0x1EE3, b"\xEE"), // ợ -> î
    (0x1EE4, b"\x55\xF4"), // Ụ -> Uô
    (0x1EE5, b"\xF4"), // ụ -> ô
    (0x1EE6, b"\x55\xF1"), // Ủ -> Uñ
    (0x1EE7, b"\xF1"), // ủ -> ñ
    (0x1EE8, b"\xA6\xF8"), // Ứ -> ¦ø
    (0x1EE9, b"\xF8"), // ứ -> ø
    (0x1EEA, b"\xA6\xF5"), // Ừ -> ¦õ
    (0x1EEB, b"\xF5"), // ừ -> õ
    (0x1EEC, b"\xA6\xF6"), // Ử -> ¦ö
    (0x1EED, b"\xF6"), // ử -> ö
    (0x1EEE, b"\xA6\xF7"), // Ữ -> ¦÷
    (0x1EEF, b"\xF7"), // ữ -> ÷
    (0x1EF0, b"\xA6\xF9"), // Ự -> ¦ù
    (0x1EF1, b"\xF9"), // ự -> ù
    (0x1EF2, b"\x59\xFA"), // Ỳ -> Yú
    (0x1EF3, b"\xFA"), // ỳ -> ú
    (0x1EF4, b"\x59\xFE"), // Ỵ -> Yþ
    (0x1EF5, b"\xFE"), // ỵ -> þ
    (0x1EF6, b"\x59\xFB"), // Ỷ -> Yû
    (0x1EF7, b"\xFB"), // ỷ -> û
    (0x1EF8, b"\x59\xFC"), // Ỹ -> Yü
    (0x1EF9, b"\xFC"), // ỹ -> ü
];
```

### Decode Table (TCVN3 → Unicode)
```rust
const TCVN3_DECODE_TABLE: &[(&[u8], u16)] = &[
    (b"\x41\xB5", 0x00C0), // Aµ -> À
    (b"\x41\xB8", 0x00C1), // A¸ -> Á
    (b"\xA2", 0x00C2), // ¢ -> Â
    (b"\x41\xB7", 0x00C3), // A· -> Ã
    (b"\x45\xCC", 0x00C8), // EÌ -> È
    (b"\x45\xD0", 0x00C9), // EÐ -> É
    (b"\xA3", 0x00CA), // £ -> Ê
    (b"\x49\xD7", 0x00CC), // I× -> Ì
    (b"\x49\xDD", 0x00CD), // IÝ -> Í
    (b"\x4F\xDF", 0x00D2), // Oß -> Ò
    (b"\x4F\xE3", 0x00D3), // Oã -> Ó
    (b"\xA4", 0x00D4), // ¤ -> Ô
    (b"\x4F\xE2", 0x00D5), // Oâ -> Õ
    (b"\x55\xEF", 0x00D9), // Uï -> Ù
    (b"\x55\xF3", 0x00DA), // Uó -> Ú
    (b"\x59\xFD", 0x00DD), // Yý -> Ý
    (b"\xB5", 0x00E0), // µ -> à
    (b"\xB8", 0x00E1), // ¸ -> á
    (b"\xA9", 0x00E2), // © -> â
    (b"\xB7", 0x00E3), // · -> ã
    (b"\xCC", 0x00E8), // Ì -> è
    (b"\xD0", 0x00E9), // Ð -> é
    (b"\xAA", 0x00EA), // ª -> ê
    (b"\xD7", 0x00EC), // × -> ì
    (b"\xDD", 0x00ED), // Ý -> í
    (b"\xDF", 0x00F2), // ß -> ò
    (b"\xE3", 0x00F3), // ã -> ó
    (b"\xAB", 0x00F4), // « -> ô
    (b"\xE2", 0x00F5), // â -> õ
    (b"\xEF", 0x00F9), // ï -> ù
    (b"\xF3", 0x00FA), // ó -> ú
    (b"\xFD", 0x00FD), // ý -> ý
    (b"\xA1", 0x0102), // ¡ -> Ă
    (b"\xA8", 0x0103), // ¨ -> ă
    (b"\xA7", 0x0110), // § -> Đ
    (b"\xAE", 0x0111), // ® -> đ
    (b"\x49\xDC", 0x0128), // IÜ -> Ĩ
    (b"\xDC", 0x0129), // Ü -> ĩ
    (b"\x55\xF2", 0x0168), // Uò -> Ũ
    (b"\xF2", 0x0169), // ò -> ũ
    (b"\xA5", 0x01A0), // ¥ -> Ơ
    (b"\xAC", 0x01A1), // ¬ -> ơ
    (b"\xA6", 0x01AF), // ¦ -> Ư
    (b"\xAD", 0x01B0), // ­ -> ư
    (b"\x41\xB9", 0x1EA0), // A¹ -> Ạ
    (b"\xB9", 0x1EA1), // ¹ -> ạ
    (b"\x41\xB6", 0x1EA2), // A¶ -> Ả
    (b"\xB6", 0x1EA3), // ¶ -> ả
    (b"\xA2\xCA", 0x1EA4), // ¢Ê -> Ấ
    (b"\xCA", 0x1EA5), // Ê -> ấ
    (b"\xA2\xC7", 0x1EA6), // ¢Ç -> Ầ
    (b"\xC7", 0x1EA7), // Ç -> ầ
    (b"\xA2\xC8", 0x1EA8), // ¢È -> Ẩ
    (b"\xC8", 0x1EA9), // È -> ẩ
    (b"\xA2\xC9", 0x1EAA), // ¢É -> Ẫ
    (b"\xC9", 0x1EAB), // É -> ẫ
    (b"\xA2\xCB", 0x1EAC), // ¢Ë -> Ậ
    (b"\xCB", 0x1EAD), // Ë -> ậ
    (b"\xA1\xBE", 0x1EAE), // ¡¾ -> Ắ
    (b"\xBE", 0x1EAF), // ¾ -> ắ
    (b"\xA1\xBB", 0x1EB0), // ¡» -> Ằ
    (b"\xBB", 0x1EB1), // » -> ằ
    (b"\xA1\xBC", 0x1EB2), // ¡¼ -> Ẳ
    (b"\xBC", 0x1EB3), // ¼ -> ẳ
    (b"\xA1\xBD", 0x1EB4), // ¡½ -> Ẵ
    (b"\xBD", 0x1EB5), // ½ -> ẵ
    (b"\xA1\xC6", 0x1EB6), // ¡Æ -> Ặ
    (b"\xC6", 0x1EB7), // Æ -> ặ
    (b"\x45\xD1", 0x1EB8), // EÑ -> Ẹ
    (b"\xD1", 0x1EB9), // Ñ -> ẹ
    (b"\x45\xCE", 0x1EBA), // EÎ -> Ẻ
    (b"\xCE", 0x1EBB), // Î -> ẻ
    (b"\x45\xCF", 0x1EBC), // EÏ -> Ẽ
    (b"\xCF", 0x1EBD), // Ï -> ẽ
    (b"\xA3\xD5", 0x1EBE), // £Õ -> Ế
    (b"\xD5", 0x1EBF), // Õ -> ế
    (b"\xA3\xD2", 0x1EC0), // £Ò -> Ề
    (b"\xD2", 0x1EC1), // Ò -> ề
    (b"\xA3\xD3", 0x1EC2), // £Ó -> Ể
    (b"\xD3", 0x1EC3), // Ó -> ể
    (b"\xA3\xD4", 0x1EC4), // £Ô -> Ễ
    (b"\xD4", 0x1EC5), // Ô -> ễ
    (b"\xA3\xD6", 0x1EC6), // £Ö -> Ệ
    (b"\xD6", 0x1EC7), // Ö -> ệ
    (b"\x49\xD8", 0x1EC8), // IØ -> Ỉ
    (b"\xD8", 0x1EC9), // Ø -> ỉ
    (b"\x49\xDE", 0x1ECA), // IÞ -> Ị
    (b"\xDE", 0x1ECB), // Þ -> ị
    (b"\x4F\xE4", 0x1ECC), // Oä -> Ọ
    (b"\xE4", 0x1ECD), // ä -> ọ
    (b"\x4F\xE1", 0x1ECE), // Oá -> Ỏ
    (b"\xE1", 0x1ECF), // á -> ỏ
    (b"\xA4\xE8", 0x1ED0), // ¤è -> Ố
    (b"\xE8", 0x1ED1), // è -> ố
    (b"\xA4\xE5", 0x1ED2), // ¤å -> Ồ
    (b"\xE5", 0x1ED3), // å -> ồ
    (b"\xA4\xE6", 0x1ED4), // ¤æ -> Ổ
    (b"\xE6", 0x1ED5), // æ -> ổ
    (b"\xA4\xE7", 0x1ED6), // ¤ç -> Ỗ
    (b"\xE7", 0x1ED7), // ç -> ỗ
    (b"\xA4\xE9", 0x1ED8), // ¤é -> Ộ
    (b"\xE9", 0x1ED9), // é -> ộ
    (b"\xA5\xED", 0x1EDA), // ¥í -> Ớ
    (b"\xED", 0x1EDB), // í -> ớ
    (b"\xA5\xEA", 0x1EDC), // ¥ê -> Ờ
    (b"\xEA", 0x1EDD), // ê -> ờ
    (b"\xA5\xEB", 0x1EDE), // ¥ë -> Ở
    (b"\xEB", 0x1EDF), // ë -> ở
    (b"\xA5\xEC", 0x1EE0), // ¥ì -> Ỡ
    (b"\xEC", 0x1EE1), // ì -> ỡ
    (b"\xA5\xEE", 0x1EE2), // ¥î -> Ợ
    (b"\xEE", 0x1EE3), // î -> ợ
    (b"\x55\xF4", 0x1EE4), // Uô -> Ụ
    (b"\xF4", 0x1EE5), // ô -> ụ
    (b"\x55\xF1", 0x1EE6), // Uñ -> Ủ
    (b"\xF1", 0x1EE7), // ñ -> ủ
    (b"\xA6\xF8", 0x1EE8), // ¦ø -> Ứ
    (b"\xF8", 0x1EE9), // ø -> ứ
    (b"\xA6\xF5", 0x1EEA), // ¦õ -> Ừ
    (b"\xF5", 0x1EEB), // õ -> ừ
    (b"\xA6\xF6", 0x1EEC), // ¦ö -> Ử
    (b"\xF6", 0x1EED), // ö -> ử
    (b"\xA6\xF7", 0x1EEE), // ¦÷ -> Ữ
    (b"\xF7", 0x1EEF), // ÷ -> ữ
    (b"\xA6\xF9", 0x1EF0), // ¦ù -> Ự
    (b"\xF9", 0x1EF1), // ù -> ự
    (b"\x59\xFA", 0x1EF2), // Yú -> Ỳ
    (b"\xFA", 0x1EF3), // ú -> ỳ
    (b"\x59\xFE", 0x1EF4), // Yþ -> Ỵ
    (b"\xFE", 0x1EF5), // þ -> ỵ
    (b"\x59\xFB", 0x1EF6), // Yû -> Ỷ
    (b"\xFB", 0x1EF7), // û -> ỷ
    (b"\x59\xFC", 0x1EF8), // Yü -> Ỹ
    (b"\xFC", 0x1EF9), // ü -> ỹ
];
```

**Lưu ý quan trọng**: Thứ tự trong decode table rất quan trọng - sequences dài hơn phải được đặt trước để tránh false matching.

## Flow Encoding (Unicode → TCVN3)

### Luồng xử lý chính

```mermaid
Input Unicode/UTF-8
        ↓
┌─────────────────┐
│ Parse characters│ ← Tách từng ký tự từ UTF-8/UTF-16
│ from input      │
└─────────────────┘
        ↓
┌─────────────────┐
│ ASCII pass-     │ ← Ký tự ASCII giữ nguyên
│ through?        │
└─────────────────┘
        ↓
┌─────────────────┐
│ Lookup in       │ ← Tìm trong bảng encode table
│ ENCODE_TABLE    │
└─────────────────┘
        ↓
┌─────────────────┐
│ Found mapping?  │ ← Có mapping → copy bytes
│                 │   Không → Unmappable error
└─────────────────┘
        ↓
Output TCVN3 bytes
```

```rust
fn tcvn3_encode_from_utf8_impl(src: &str, dst: &mut [u8]) -> (EncoderResult, usize, usize) {
    for ch in src.chars() {
        let unicode = ch as u32;
        
        // 1. Kiểm tra ASCII passthrough
        if unicode < 0x80 {
            dst[dst_pos] = unicode as u8;
            continue;
        }
        
        // 2. Lookup trong encode table
        for &(code, bytes) in TCVN3_ENCODE_TABLE {
            if code == unicode as u16 {
                // Copy bytes sequence
                dst[dst_pos..dst_pos + bytes.len()].copy_from_slice(bytes);
                found = true;
                break;
            }
        }
        
        // 3. Xử lý unmappable character
        if !found {
            return EncoderResult::Unmappable(ch);
        }
    }
}
```

### Các trường hợp đặc biệt

1. **ASCII Preservation**: Ký tự ASCII (0x00-0x7F) được giữ nguyên
2. **Buffer Overflow**: Kiểm tra space trước khi write
3. **Unmappable Characters**: Return error với character gây lỗi

## Flow Decoding (TCVN3 → Unicode)

### Luồng xử lý chính

```mermaid
Input TCVN3 bytes
        ↓
┌─────────────────┐
│ Check 2-byte    │ ← Ưu tiên kiểm tra chuỗi 2 byte trước
│ sequences first │
└─────────────────┘
        ↓
┌─────────────────┐
│ Check 1-byte    │ ← Sau đó kiểm tra byte đơn
│ sequences       │
└─────────────────┘
        ↓
┌─────────────────┐
│ Handle ASCII    │ ← Cuối cùng xử lý ASCII (< 0x80)
│ (< 0x80)        │
└─────────────────┘
        ↓
┌─────────────────┐
│ Replacement     │ ← Ký tự không nhận diện → '?'
│ character       │
└─────────────────┘
        ↓
Output UTF-8/UTF-16
```

```rust
pub fn decode_to_utf8_raw(&mut self, src: &[u8], dst: &mut [u8], last: bool) -> (DecoderResult, usize, usize) {
    'outer: loop {
        // 1. Kiểm tra two-byte sequences trước
        if src_pos + 1 < src.len() {
            let two_bytes = &src[src_pos..src_pos + 2];
            for &(pattern, unicode) in TCVN3_DECODE_TABLE {
                if pattern.len() == 2 && two_bytes == pattern {
                    // Convert unicode to UTF-8
                    let ch = char::from_u32_unchecked(unicode as u32);
                    let utf8_bytes = ch.encode_utf8(&mut utf8_buffer).as_bytes();
                    // Copy to destination
                    src_pos += 2;
                    continue 'outer;
                }
            }
        }
        
        // 2. Kiểm tra single-byte sequences
        let one_byte = &src[src_pos..src_pos + 1];
        for &(pattern, unicode) in TCVN3_DECODE_TABLE {
            if pattern.len() == 1 && one_byte == pattern {
                // Similar processing...
                continue 'outer;
            }
        }
        
        // 3. ASCII passthrough
        if first_byte < 0x80 {
            dst[dst_pos] = first_byte;
            src_pos += 1;
            dst_pos += 1;
            continue;
        }
        
        // 4. Unknown byte - replacement character
        dst[dst_pos] = b'?'; // hoặc 0xFFFD cho UTF-16
    }
}
```

### Xử lý pending bytes

Một tính năng quan trọng là xử lý incomplete sequences:

```rust
// Khi hết input nhưng có thể có sequence chưa hoàn chỉnh
if !last && src_pos + 1 >= src.len() {
    self.pending = Some(first_byte);
    return (DecoderResult::InputEmpty, src_pos, dst_pos);
}
```

## Tối ưu hóa Performance

### 1. Lookup Table Optimization
Thay vì linear search, có thể sử dụng:
- HashMap cho O(1) lookup
- Binary search cho sorted tables
- Trie structure cho prefix matching

### 2. Buffer Management
```rust
pub fn max_utf8_buffer_length(&self, byte_length: usize) -> Option<usize> {
    // Mỗi TCVN3 byte có thể tạo ra tối đa 4 UTF-8 bytes
    byte_length.checked_mul(4)
}
```

### 3. SIMD Optimization
Để khai thác tối đa sức mạnh của `SIMD (Single Instruction, Multiple Data)`trong việc xử lý vector và tăng hiệu năng, tôi sẽ trình bày chi tiết cách áp dụng và tối ưu trong một bài viết riêng tại đây.


## Kết luận
Bạn có thể tham khảo thêm impl chi tiết trong [repo **encoding\_rs** (nhánh *vietnamese-encoding*)](https://github.com/tuanha1305/encoding_rs/tree/vietnamese-encoding).

Hy vọng bài viết này sẽ giúp ích được nhiều người trong việc xử lý encoding `TCVN3`. Cảm ơn bạn đã đọc.

## References
* Unicode & Vietnamese Legacy Character Encodings: [https://vietunicode.sourceforge.net/charset](https://vietunicode.sourceforge.net/charset)
