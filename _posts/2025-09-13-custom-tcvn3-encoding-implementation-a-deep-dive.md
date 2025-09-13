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
    (0x00C2, b"\xA2"),     // Â -> ¢
    // ...
];
```

### Decode Table (TCVN3 → Unicode)
```rust
const TCVN3_DECODE_TABLE: &[(&[u8], u16)] = &[
    (b"\x41\xB5", 0x00C0), // Aµ -> À
    (b"\x41\xB8", 0x00C1), // A¸ -> Á
    (b"\xA2", 0x00C2),     // ¢ -> Â
    // ...
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

Hy vọng bài viết này sẽ giúp ích được nhiều người trong việc xử lý encoding TCVN3. Cảm ơn bạn đã đọc.

