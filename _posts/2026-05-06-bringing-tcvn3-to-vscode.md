---
title: Bringing TCVN3 to VS Code — codec + tool + 1-line install
tags: tcvn3 vscode javascript encoding vietnamese
---

[Bài trước](/2025/09/13/custom-tcvn3-encoding-implementation-a-deep-dive.html) tôi đã mổ xẻ TCVN3 ở mức codec — bảng mapping 134 ký tự, luồng greedy longest-match, và performance trick. Lần này tôi đóng gói nó thành một thứ chạy thật trong VS Code: mở file TCVN3, save không corrupt, search Vietnamese ra match, cài 1 dòng.

> **Repo**: [github.com/tuanha1305/vs-code-tcvn3-customize](https://github.com/tuanha1305/vs-code-tcvn3-customize)
> **Tested on**: Windows 11, VS Code 1.93+
> **Platforms**: Windows / macOS / Linux

Bài này nói về 3 thứ:
1. **Customize** — cụ thể đã thay đổi cái gì trong iconv-lite và VS Code.
2. **Tối ưu** — kỹ thuật và con số benchmark.
3. **Tool & install** — cài 1 dòng cho từng nền tảng.

---

## 1. Customize — patch 3 lớp

VS Code không hỗ trợ TCVN3 vì 3 lớp khác nhau đều cần dữ liệu encoding:

| Lớp | File | Vai trò |
|---|---|---|
| **Codec engine** | `node_modules/@vscode/iconv-lite-umd/lib/iconv-lite-umd.js` | Encode/decode bytes ↔ string khi mở/save file |
| **Search backend** | `out/vs/workbench/api/node/extensionHostProcess.js` | Build args cho ripgrep (`Ctrl+Shift+F`) |
| **UI picker** | `out/vs/workbench/workbench.desktop.main.js` | Hardcode list encoding hiện trong dropdown |

Cả 3 đều phải patch — chỉ patch codec thì search lỗi `Encoding 'tcvn3' is not supported`, chỉ patch UI thì click chọn không có gì xảy ra.

### 1.1 Codec: webpack-bundle iconv-lite có TCVN3

VS Code dùng [`@vscode/iconv-lite-umd`](https://www.npmjs.com/package/@vscode/iconv-lite-umd) — bản UMD bundled từ [iconv-lite](https://github.com/ashtuchkin/iconv-lite). Cách Microsoft build cũng đơn giản: webpack-bundle iconv-lite thành 1 file UMD ~298KB.

Tôi fork iconv-lite, thêm file `encodings/tcvn3.js`:

```js
// encodings/tcvn3.js
var MAPPING = [
  ["\u00C0", "A\u00B5"], ["\u00C1", "A\u00B8"], ["\u00C2", "\u00A2"],
  // ... 134 entries — port từ Tcvn3MappingTables.cs / Rust port của bài trước
]

exports.tcvn3      = Tcvn3Codec
exports.tcvn31     = "tcvn3"      // alias TCVN-3
exports.vntcvn3    = "tcvn3"

function Tcvn3Codec () { /* build encode/decode tables once */ }
Tcvn3Codec.prototype.encoder = Tcvn3Encoder
Tcvn3Codec.prototype.decoder = Tcvn3Decoder
```

Đăng ký 1 dòng vào `encodings/index.js`:

```js
var modules = [
  require("./internal"),
  require("./utf16"),
  // ...
  require("./tcvn3"),    // ← thêm
]
```

Build với webpack `target: "web"` (match upstream để chạy được trong Electron sandboxed renderer):

```js
// webpack.config.js
module.exports = {
  mode: "production",
  target: "web",
  entry: "../iconv-lite/lib/index.js",
  output: {
    library: { type: "umd" },
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
}
```

Kết quả: `iconv-lite-umd.js` 309KB (chỉ +11KB so với upstream cho 134-entry codec). API exports identical → drop-in replace file của VS Code.

### 1.2 Search: auto-encode pattern → byte form

ripgrep dùng crate Rust `encoding_rs`, không có TCVN3. Khi user set `"files.encoding": "tcvn3"`, VS Code đẩy `--encoding tcvn3` vào rg → rg fail.

Cách workaround: **không pass `--encoding`, thay vào đó dịch search pattern Unicode → TCVN3 bytes biểu diễn dưới dạng regex `\xHH`**, rg sẽ search byte-level.

User gõ `"Tên"`, patch tự động dịch thành `T\xAAn`:

```js
function encodeSearchPattern(unicode) {
  let result = ""
  for (const ch of unicode) {
    const cp = ch.charCodeAt(0)
    const bytes = TCVN3_MAP[cp]
    if (bytes) {
      for (const b of bytes) {
        result += b >= 0x80
          ? `\\x${b.toString(16).toUpperCase().padStart(2, "0")}`
          : escapeRegexMeta(String.fromCharCode(b))
      }
    } else {
      result += escapeRegexMeta(ch)
    }
  }
  return result
}

// Test
encodeSearchPattern("Tên")        // "T\xAAn"
encodeSearchPattern("Phẩm chất")  // "Ph\xC8m ch\xCAt"
encodeSearchPattern("Đắng cấp")   // "\xA7\xBEng c\xCAp"
```

Patch chỉ inject ~50 dòng vào đầu `extensionHostProcess.js` + thay 1 anchor (chỗ push `--encoding` cho rg).

### 1.3 UI: thêm entry vào dropdown picker

`workbench.desktop.main.js` có object cứng:

```js
windows1258: { labelLong: "Vietnamese (Windows 1258)", labelShort: "Windows 1258", order: 35 }
```

Inject 1 entry kế bên:

```js
,tcvn3: { labelLong: "Vietnamese (TCVN3)", labelShort: "TCVN3", order: 35.5 }
```

Sau patch: dropdown "Reopen with Encoding" và "Save with Encoding" có thêm "Vietnamese (TCVN3)".

---

## 2. Tối ưu — 31× speedup decoder, round-trip safety

### 2.1 Encoder: pack mapping vào Uint32Array

Lookup naïve dùng `Map<int, Buffer>` — mỗi char phải đọc property `mapped[0]`, check `length`, có thể đọc `mapped[1]`. Tối ưu: pack toàn bộ mapping Unicode→TCVN3 vào `Uint32Array(0x10000)`, mỗi slot 32-bit:

```
bits  0..7  : byte 0
bits  8..15 : byte 1 (0 nếu chỉ 1 byte)
bits 16..17 : length (1 hoặc 2)
slot = 0    : unmapped (sentinel)
```

Encode loop chỉ còn 1 array access + bitwise:

```js
for (let i = 0; i < str.length; i++) {
  const cp = str.charCodeAt(i)
  const packed = encodeTable[cp]
  if (packed !== 0) {
    buf[pos++] = packed & 0xFF
    if (packed >= (2 << 16)) buf[pos++] = (packed >> 8) & 0xFF
  } else if (cp < 0x80) {
    buf[pos++] = cp
  }
  // ...
}
```

### 2.2 Decoder: pre-allocated UCS-2 buffer thay vì cons-string

Decoder ban đầu dùng `out += String.fromCharCode(...)` — pattern thông thường nhưng V8 build cây cons-string khổng lồ với input lớn. Đo:

| Input | Throughput |
|---|---|
| 100 KB | 242 MB/s |
| 1 MB | 29 MB/s |
| 10 MB | 19 MB/s |
| 100 MB | **12 MB/s** |

Decoder rớt thê thảm khi scale. 1GB → ~90 giây. Lag.

Fix: dùng pre-allocated UCS-2 buffer (giống `sbcs-codec.js` upstream), ghi codepoint dưới dạng 16-bit LE, gọi `.toString("ucs2")` ở cuối:

```js
const out = Buffer.alloc((buf.length + 1) * 2)
let p = 0
for (let i = 0; i < buf.length; i++) {
  const cp = decodedCodepoint(...)
  out[p]     = cp & 0xFF
  out[p + 1] = (cp >> 8) & 0xFF
  p += 2
}
return out.toString("ucs2", 0, p)
```

Kết quả sau optimize:

| Input | Encoder | Decoder | Speedup decoder |
|---|---|---|---|
| 1 MB | 925 MB/s | 416 MB/s | **14×** |
| 10 MB | 987 MB/s | 390 MB/s | **21×** |
| 100 MB | 730 MB/s | 390 MB/s | **31×** |
| **1 GB streaming** | **913 MB/s (1.1s)** | **396 MB/s (2.0s)** | linear scale |

Mở file 1GB: decode 2 giây, không lag.

### 2.3 Round-trip safety: PUA passthrough

Đây là invariant cứng. Nếu codec không round-trip identical, save = corrupt file.

Vấn đề: byte trong file không phải TCVN3 (ví dụ chunk GBK Trung Quốc trong file mixed) — decoder pass-through thành Latin-1 `U+00XX`. Nhưng `U+00C0 'À'`, `U+00C1 'Á'`, ... lại có TCVN3 encoding 2-byte. Re-encode → 1 byte thành 2 byte → corrupt.

```
byte 0xC0 → decode → 'À' (U+00C0)
'À' → encode → "Aµ" (0x41 0xB5)   ⚠️ 1 byte → 2 bytes
```

Test trên 79 file thật của user: **22/79 file corrupt** sau decode-encode.

Fix: thay vì Latin-1 passthrough, dùng **Unicode Private Use Area** (U+E000..U+E0FF) — không collide với ký tự Vietnamese:

```js
// init decoder table
for (let i = 0; i < 256; i++) {
  singleByteDecode[i] = i < 0x80 ? i : (0xE000 + i)
}
// overlay 134 TCVN3 mappings (replaces PUA default for mapped bytes)
for (const [unicodeCh, tcvn3Bytes] of MAPPING) { ... }

// reverse for encoder
for (let b = 0x80; b < 0x100; b++) {
  if (encodeTable[0xE000 + b] === 0)
    encodeTable[0xE000 + b] = (1 << 16) | b
}
```

Sau fix: **86/86 file round-trip byte-identical**.

Trade-off: byte không trong TCVN3 hiển thị thành ô vuông □ trong editor (PUA không có glyph). Nhưng data 100% an toàn — save không corrupt path GBK trong file game.

---

## 3. Tool — public repo

[`vs-code-tcvn3-customize`](https://github.com/tuanha1305/vs-code-tcvn3-customize):

```
vs-code-tcvn3-customize/
├── install.sh / install.ps1                # bootstrap installer (pure shell, no Node)
├── uninstall.sh / uninstall.ps1
├── dist/                                   # COMMITTED pre-built artifacts
│   ├── iconv-lite-umd.js                   # UMD bundle 309KB
│   ├── search-patch-prepend.js             # raw text — prepend block
│   ├── search-patch-anchor.txt             # raw text — anchor (1 line)
│   ├── search-patch-replacement.txt        # raw text — replacement (1 line)
│   ├── workbench-patch-anchor.txt          # raw text
│   ├── workbench-patch-injection.txt       # raw text
│   └── version.json                        # { version, bundleSha256 }
├── scripts/
│   ├── apply.js                            # legacy Node entry point (advanced)
│   ├── restore.js
│   └── generate-dist.js                    # rebuild dist/ từ src/
├── src/                                    # source
│   ├── iconv-lite/                         # iconv-lite + TCVN3 codec
│   ├── build/                              # webpack config
│   └── search-patch.js                     # generator
└── .github/workflows/build.yml             # CI verify dist/ matches src/
```

**Zero-runtime install path**: `dist/` ship plain text fragments. Bootstrap installers download từng file qua `curl` / `Invoke-WebRequest` rồi dùng tools sẵn có của OS để cắt/ghép byte:

- bash: `grep -aobF` tìm offset → `head -c` + `tail -c +N` cắt → `cat` ghép.
- PowerShell: `IndexOf` + `Substring` native string ops.

Không dùng `sed`/`awk` (escaping anchor strings có ký tự regex là pain), không cần Node/Python.

CI verify mỗi commit: rebuild bundle từ source → so sánh với committed `dist/`. Nếu lệch, fail. **Bundle SHA256 deterministic** → ai cũng có thể reproduce byte-for-byte từ source.

Tool patch 3 file của VS Code, tự backup originals:

| Patch | File backup | Restore bằng |
|---|---|---|
| Codec | `iconv-lite-umd.original.js` | `uninstall` |
| Search | `extensionHostProcess.js.tcvn3-backup` | `uninstall` |
| UI | `workbench.desktop.main.js.tcvn3-backup` | `uninstall` |

---

## 4. Cài đặt — 1 dòng cho từng nền tảng

> ⚠️ **Quit VS Code hoàn toàn trước khi cài** (Task Manager / Activity Monitor — kiểm tra không còn process `Code` background).

### 4.1 Linux / macOS

Yêu cầu: chỉ `curl`. **Không cần Node.js, không cần Python**. Installer là pure bash, dùng POSIX tools sẵn có (`grep`, `head -c`, `tail -c`, `cat`).

```bash
curl -fsSL https://raw.githubusercontent.com/tuanha1305/vs-code-tcvn3-customize/main/install.sh | bash -s -- --with-ui
```

Patch cả 3 lớp (codec + search + UI dropdown) trong 1 lệnh.

**VS Code Insiders / VSCodium / path không chuẩn**:

```bash
curl -fsSL https://.../install.sh | bash -s -- --with-ui --vscode "/path/to/resources/app"
```

### 4.2 Windows (PowerShell)

Yêu cầu: PowerShell 5+ (sẵn có trên Windows 10/11). **Không cần Node.js, không cần gì cả** — installer dùng `Invoke-WebRequest` + native string ops.

```powershell
$env:TCVN3_WITH_UI=1; irm https://raw.githubusercontent.com/tuanha1305/vs-code-tcvn3-customize/main/install.ps1 | iex
```

Nếu PowerShell báo execution policy error, chạy 1 lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**VS Code đang chạy không quit được** (CI, container):

```powershell
$env:TCVN3_WITH_UI=1; $env:TCVN3_FORCE=1; irm https://.../install.ps1 | iex
```

### 4.3 Sau khi cài

Mở `settings.json` (`Ctrl+Shift+P` → `Preferences: Open User Settings (JSON)`) hoặc workspace settings (`.vscode/settings.json`):

```jsonc
{
  "files.encoding": "tcvn3",
  "files.autoGuessEncoding": false
}
```

Mở file `.txt` TCVN3 — text hiện đúng tiếng Việt. Search `Ctrl+Shift+F` gõ "Tên" → tìm thấy match trong file.

Khuyến nghị set encoding ở **workspace level** (chỉ folder chứa file TCVN3) thay vì user level — tránh ảnh hưởng project khác.

### 4.4 Gỡ cài đặt

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/tuanha1305/vs-code-tcvn3-customize/main/uninstall.sh | bash

# Windows
irm https://raw.githubusercontent.com/tuanha1305/vs-code-tcvn3-customize/main/uninstall.ps1 | iex
```

Khôi phục lại từ 3 file backup. VS Code trở về nguyên trạng.

### 4.5 Re-apply sau khi VS Code update

VS Code auto-update overwrites file đã patch. Sau mỗi lần update, chạy lại 1-liner install.

---

## 5. Kết

Tóm tắt:
- Codec TCVN3 ([implement chi tiết ở bài trước](/2025/09/13/custom-tcvn3-encoding-implementation-a-deep-dive.html)) port sang JS, build thành UMD bundle drop-in replace cho VS Code.
- Tối ưu: encoder packed Uint32 lookup, decoder UCS-2 buffer thay cons-string → 31× speedup; PUA passthrough → round-trip byte-identical 86/86 file thật.
- Search auto-encode Unicode → TCVN3 byte regex, dropdown picker có entry "Vietnamese (TCVN3)".
- Tool 1-liner install cho cả 3 platform, CI verify dist/ reproducible.

Repo: **[github.com/tuanha1305/vs-code-tcvn3-customize](https://github.com/tuanha1305/vs-code-tcvn3-customize)**.
Bài codec: **[Custom TCVN3 Encoding Implementation - A Deep Dive](/2025/09/13/custom-tcvn3-encoding-implementation-a-deep-dive.html)**.

Bug report / star repo welcome.
