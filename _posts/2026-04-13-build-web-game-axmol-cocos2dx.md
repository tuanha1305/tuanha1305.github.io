---
title: Build Web Game bằng Cocos2dx - Axmol Engine
tags: c++ crossplatform android ios web wasm cocos2dx axmol
---

> Hướng dẫn chi tiết cách cài đặt, build và deploy game C++ lên web browser bằng Axmol Engine + WebAssembly. Hỗ trợ đầy đủ Windows, macOS và Linux.

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt Axmol Engine](#3-cài-đặt-axmol-engine)
4. [Tạo project mới](#4-tạo-project-mới)
5. [Cấu trúc project](#5-cấu-trúc-project)
6. [Cài đặt Emscripten SDK](#6-cài-đặt-emscripten-sdk)
7. [Build WASM](#7-build-wasm)
8. [Chạy game trên local](#8-chạy-game-trên-local)
9. [Deploy lên web](#9-deploy-lên-web)
10. [Tùy chỉnh build options](#10-tùy-chỉnh-build-options)
11. [Tips & Troubleshooting](#11-tips--troubleshooting)
12. [Kết luận](#12-kết-luận)

---

## 1. Giới thiệu

### Axmol Engine là gì?

[Axmol Engine](https://axmol.dev/) là game engine mã nguồn mở, được fork và phát triển hiện đại từ Cocos2d-x — một trong những engine phổ biến nhất cho game 2D. Axmol mang đến nhiều cải tiến đáng kể:

- **C++20** — Codebase hiện đại, tận dụng các tính năng mới của C++
- **Multi-platform** — Windows, macOS, Linux, iOS, Android, và **WebAssembly (WASM)**
- **Rendering backend mới** — Hỗ trợ OpenGL, Metal, D3D11, và WebGL
- **Active community** — Được maintain và phát triển liên tục

### Tại sao build game cho web?

WebAssembly cho phép chạy code C++ native trực tiếp trên browser với hiệu năng gần như native. Điều này có nghĩa:

- Người chơi **không cần cài đặt** — mở link là chơi
- **Cross-browser** — Chrome, Firefox, Safari, Edge đều hỗ trợ WASM
- **Dễ chia sẻ** — Gửi link thay vì file cài đặt
- **Cùng codebase** với bản desktop/mobile — viết một lần, build nhiều platform

### Kết quả cuối cùng

Sau khi hoàn thành hướng dẫn này, bạn sẽ có một game Axmol chạy trực tiếp trên browser thông qua WebAssembly, với đầy đủ rendering, input handling và asset loading.

---

## 2. Yêu cầu hệ thống

### Bảng tổng hợp

| Công cụ | Windows | macOS | Linux |
|---------|---------|-------|-------|
| **Compiler** | Visual Studio 2022+ | Xcode 16.4+ (macOS 15.3+) | GCC/G++ |
| **CMake** | 3.22+ | 3.22+ | 3.22+ |
| **Python** | 3.13+ | 3.13+ | 3.13+ |
| **PowerShell** | Built-in | `pwsh` (cài qua Homebrew) | `pwsh` (cài riêng) |
| **Git** | Required | Required | Required |
| **Emscripten SDK** | 3.1.73 (tự động) | 3.1.73 (tự động) | 3.1.73 (tự động) |

### Cài đặt prerequisites theo OS

#### Windows

1. Cài [Visual Studio 2022](https://visualstudio.microsoft.com/) với workload **"Desktop development with C++"**
2. Cài [Python 3.13+](https://www.python.org/downloads/)
3. Cài [Git](https://git-scm.com/download/win)
4. CMake thường đi kèm Visual Studio, hoặc cài riêng từ [cmake.org](https://cmake.org/download/)

#### macOS

```bash
# Cài Xcode từ App Store (version 16.4+, yêu cầu macOS 15.3+)
xcode-select --install

# Cài Homebrew (nếu chưa có)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Cài PowerShell (cần cho setup script)
brew install powershell/tap/powershell

# Cài CMake và Python
brew install cmake python
```

#### Linux (Ubuntu/Debian)

```bash
# Cài compiler và build tools
sudo apt update
sudo apt install -y build-essential gcc g++ cmake git python3 python3-pip

# Cài thêm dependencies cho Axmol
sudo apt install -y libx11-dev libxrandr-dev libxinerama-dev libxcursor-dev libxi-dev \
    libgl1-mesa-dev libglu1-mesa-dev libfontconfig1-dev

# Cài PowerShell
# Ubuntu 22.04+
sudo snap install powershell --classic
# Hoặc từ Microsoft repo
```

#### Linux (Arch Linux)

```bash
sudo pacman -S base-devel cmake git python gcc
# PowerShell từ AUR
yay -S powershell-bin
```

---

## 3. Cài đặt Axmol Engine

### 3.1. Clone repository

```bash
git clone https://github.com/axmolengine/axmol.git
cd axmol
```

Nếu muốn dùng bản stable:

```bash
git clone --branch release/2.x https://github.com/axmolengine/axmol.git
cd axmol
```

### 3.2. Chạy setup script

Setup script sẽ tự động cài đặt dependencies và cấu hình environment variables.

**Windows (PowerShell):**

```powershell
.\setup.ps1
```

**macOS:**

```bash
pwsh setup.ps1
```

**Linux:**

```bash
pwsh setup.ps1
```

> **Lưu ý:** Sau khi chạy setup, **restart terminal** để các environment variables có hiệu lực.

### 3.3. Kiểm tra cài đặt

Sau khi restart terminal, kiểm tra:

```bash
# Kiểm tra AX_ROOT đã được set
echo $AX_ROOT          # macOS/Linux
echo $env:AX_ROOT      # Windows PowerShell

# Kiểm tra axmol CLI
axmol --version
```

### 3.4. Cấu hình environment variables (thủ công)

Nếu setup script không tự set, bạn có thể cấu hình thủ công:

**macOS/Linux** — Thêm vào `~/.bashrc`, `~/.zshrc` hoặc `~/.profile`:

```bash
export AX_ROOT="/path/to/axmol"
export PATH="$AX_ROOT/tools/cmdline:$PATH"
```

**Windows** — Thêm vào System Environment Variables:

```powershell
# PowerShell (Admin)
[System.Environment]::SetEnvironmentVariable("AX_ROOT", "C:\path\to\axmol", "User")
$env:Path += ";$env:AX_ROOT\tools\cmdline"
```

---

## 4. Tạo project mới

Dùng `axmol` CLI để tạo project:

```bash
axmol new -p dev.axmol.mygame -d ./projects -l cpp MyGame
```

Giải thích các tham số:
- `-p dev.axmol.mygame` — Package name (dùng cho Android)
- `-d ./projects` — Thư mục chứa project
- `-l cpp` — Ngôn ngữ: C++ (có thể chọn `lua`)
- `MyGame` — Tên project

---

## 5. Cấu trúc project

Sau khi tạo, project sẽ có cấu trúc như sau:

```
MyGame/
├── CMakeLists.txt              # CMake build chính
├── .axproj                     # Metadata project (engine version, package name)
├── cmake/
│   └── modules/
│       ├── AXGameEngineOptions.cmake   # Bật/tắt features (audio, physics, 3D...)
│       ├── AXGameEngineSetup.cmake     # Setup engine path
│       ├── AXGameSourceSetup.cmake     # Chọn source theo platform
│       ├── AXGameTargetSetup.cmake     # Cấu hình target
│       ├── AXGamePlatformSetup.cmake   # Setup riêng cho từng platform
│       └── AXGameFinalSetup.cmake      # Sync resources
├── Source/                     # Code chung (cross-platform)
│   ├── AppDelegate.h/.cpp      # Khởi tạo app, cấu hình director
│   └── MainScene.h/.cpp        # Scene chính của game
├── Content/                    # Assets (images, fonts, resources)
│   ├── HelloWorld.png
│   ├── CloseNormal.png
│   ├── CloseSelected.png
│   └── fonts/
│       └── Marker Felt.ttf
├── proj.wasm/                  # Entry point cho WebAssembly
│   └── main.cpp
├── proj.win32/                 # Entry point cho Windows
├── proj.linux/                 # Entry point cho Linux
├── proj.ios_mac/               # Entry point cho iOS/macOS
└── proj.android/               # Entry point cho Android
```

### File quan trọng: `proj.wasm/main.cpp`

Đây là entry point khi build cho web:

```cpp
#include "AppDelegate.h"
#include "axmol/axmol.h"

#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <string>

using namespace ax;

namespace
{
std::unique_ptr<AppDelegate> appDelegate;
}

void axmol_wasm_app_exit()
{
    appDelegate = nullptr;
}

int main(int argc, char** argv)
{
    appDelegate.reset(new AppDelegate());
    return Application::getInstance()->run();
}
```

### File quan trọng: `Source/AppDelegate.cpp`

Cấu hình khởi tạo game — design resolution, FPS, scene đầu tiên:

```cpp
static ax::Size designResolutionSize = ax::Size(1280, 720);

bool AppDelegate::applicationDidFinishLaunching()
{
    auto director   = Director::getInstance();
    auto renderView = director->getRenderView();
    if (!renderView)
    {
        renderView = RenderViewImpl::create("MyGame");
        director->setRenderView(renderView);
    }

    director->setStatsDisplay(true);
    director->setAnimationInterval(1.0f / 60);

    renderView->setDesignResolutionSize(
        designResolutionSize.width, designResolutionSize.height,
        ResolutionPolicy::SHOW_ALL);

    auto scene = utils::createInstance<MainScene>();
    director->runWithScene(scene);
    return true;
}
```

### File quan trọng: `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.22...4.1)

set(APP_NAME MyGame)
project(${APP_NAME})

set(CMAKE_MODULE_PATH ${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules)

# Cấu hình engine và build options
include(AXGameEngineOptions)
include(AXGameEngineSetup)

# Source files
file(GLOB_RECURSE GAME_HEADER Source/*.h Source/*.hpp)
file(GLOB_RECURSE GAME_SOURCE Source/*.cpp Source/*.c)

set(GAME_INC_DIRS "${CMAKE_CURRENT_SOURCE_DIR}/Source")
set(content_folder "${CMAKE_CURRENT_SOURCE_DIR}/Content")

# Platform-specific source selection (tự động chọn proj.wasm/main.cpp khi build WASM)
include(AXGameSourceSetup)

set(APP_SOURCES ${GAME_HEADER} ${GAME_SOURCE})

include(AXGameTargetSetup)
ax_setup_app_config(${APP_NAME})
include(AXGamePlatformSetup)
include(AXGameFinalSetup)
```

CMake module `AXGameSourceSetup.cmake` tự động chọn entry point phù hợp:

```cmake
if(WASM)
  list(APPEND GAME_SOURCE proj.wasm/main.cpp)
elseif(WINDOWS)
  list(APPEND GAME_SOURCE proj.win32/main.cpp)
elseif(LINUX)
  list(APPEND GAME_SOURCE proj.linux/main.cpp)
# ... iOS, macOS, Android
endif()
```

---

## 6. Cài đặt Emscripten SDK

[Emscripten](https://emscripten.org/) là toolchain biên dịch C/C++ sang WebAssembly. Axmol sử dụng Emscripten SDK (emsdk) version **3.1.73**.

### Cách 1: Tự động (khuyên dùng)

Khi bạn chạy `axmol build -p wasm` lần đầu, Axmol CLI sẽ **tự động tải và cài đặt** emsdk nếu chưa có. Đây là cách đơn giản nhất.

### Cách 2: Cài thủ công

Nếu muốn kiểm soát việc cài đặt, bạn có thể cài emsdk thủ công:

```bash
# Clone emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Cài đặt và activate version phù hợp với Axmol
./emsdk install 3.1.73
./emsdk activate 3.1.73
```

Sau khi activate, thiết lập environment:

**macOS/Linux:**

```bash
source ./emsdk_env.sh
```

**Windows (cmd):**

```cmd
emsdk_env.bat
```

**Windows (PowerShell):**

```powershell
.\emsdk_env.ps1
```

### Kiểm tra cài đặt

```bash
emcc --version
# emcc (Emscripten gcc/clang-like replacement ...) 3.1.73

emcmake cmake --version
# cmake version 3.xx.x
```

---

## 7. Build WASM

### 7.1. Build bằng axmol CLI (khuyên dùng)

Cách đơn giản nhất — chạy từ thư mục project:

```bash
cd MyGame
axmol build -p wasm
```

Axmol CLI sẽ tự động:
1. Kiểm tra và cài emsdk nếu cần
2. Cấu hình CMake với Emscripten toolchain
3. Build project
4. Xuất output ra thư mục `build_wasm/bin/MyGame/`

### 7.2. Build bằng CMake thủ công (nâng cao)

Nếu cần kiểm soát chi tiết hơn:

```bash
cd MyGame

# Tạo thư mục build
mkdir build_wasm && cd build_wasm

# Cấu hình CMake với Emscripten
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release

# Build (thay nproc bằng số CPU cores)
# macOS/Linux:
emmake make -j$(nproc)

# Windows:
emmake cmake --build . --config Release -j
```

### 7.3. Output files

Sau khi build thành công, thư mục output sẽ chứa:

```
build_wasm/bin/MyGame/
├── MyGame.html     # File HTML — mở file này trong browser
├── MyGame.js       # JavaScript glue code (runtime Emscripten)
├── MyGame.wasm     # WebAssembly binary (code C++ đã biên dịch)
└── MyGame.data     # Game assets đóng gói (images, fonts, resources)
```

| File | Mô tả | Kích thước (ước tính) |
|------|--------|----------------------|
| `MyGame.html` | HTML shell với canvas, progress bar, dev controls | ~15KB |
| `MyGame.js` | Emscripten runtime, WebGL bindings, filesystem | ~500KB |
| `MyGame.wasm` | Binary WASM (debug build lớn hơn nhiều so với release) | 10-45MB |
| `MyGame.data` | Assets đóng gói bởi Emscripten file packager | Tùy assets |

> **Lưu ý:** Debug build sẽ tạo file `.wasm` rất lớn (~45MB). Release build sẽ nhỏ hơn đáng kể. Luôn dùng `-DCMAKE_BUILD_TYPE=Release` cho production.

---

## 8. Chạy game trên local

### Tại sao không thể mở trực tiếp file HTML?

WASM game **không thể chạy bằng cách mở file HTML trực tiếp** (`file://`) vì:

1. **CORS restrictions** — Browser chặn fetch file `.wasm` và `.data` từ `file://`
2. **SharedArrayBuffer** — Yêu cầu Cross-Origin Isolation headers mà chỉ server mới cung cấp được

Bạn cần một HTTP server với các headers đặc biệt.

### Cách 1: Dùng axmol CLI

```bash
axmol run -p wasm
```

Axmol CLI sẽ tự build (nếu cần) và khởi động server.

### Cách 2: Python dev server với Cross-Origin Isolation

Tạo file `server.py` trong thư mục chứa output build:

```python
#!/usr/bin/env python3
"""Local dev server with Cross-Origin Isolation headers for SharedArrayBuffer support."""

import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class COIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


print(f"Serving at http://localhost:{PORT}/MyGame.html")
http.server.HTTPServer(("", PORT), COIHandler).serve_forever()
```

Chạy server:

```bash
cd build_wasm/bin/MyGame/
python3 server.py
# Hoặc chỉ định port khác:
python3 server.py 3000
```

### Cách 3: Node.js server

Nếu bạn dùng Node.js:

```bash
npx http-server -p 8080 --cors \
  --header "Cross-Origin-Opener-Policy: same-origin" \
  --header "Cross-Origin-Embedder-Policy: require-corp"
```

### Truy cập game

Mở browser và truy cập:

```
http://localhost:8080/MyGame.html
```

Bạn sẽ thấy:
1. **Progress bar** — Loading assets
2. **Canvas** — Game rendering (Hello World + Axmol logo)
3. **Dev controls** — Pause, Resume, Step (nếu bật devtools)
4. **Console output** — Log messages

---

## 9. Deploy lên web

### 9.1. GitHub Pages (miễn phí)

GitHub Pages không hỗ trợ custom headers mặc định, nên cần dùng **Service Worker** để inject Cross-Origin Isolation headers.

**Bước 1:** Tải `coi-serviceworker.js`

Tải từ [coi-serviceworker](https://github.com/nicothin/coi-serviceworker) và đặt vào thư mục build output.

**Bước 2:** Thêm script tag vào `MyGame.html`

Thêm dòng này vào `<head>` của `MyGame.html`, **trước tất cả script khác**:

```html
<script src="coi-serviceworker.js"></script>
```

**Bước 3:** Push lên GitHub Pages

```bash
# Tạo branch gh-pages
git checkout --orphan gh-pages

# Copy build output
cp -r build_wasm/bin/MyGame/* .

# Commit và push
git add MyGame.html MyGame.js MyGame.wasm MyGame.data coi-serviceworker.js
git commit -m "Deploy WASM game"
git push origin gh-pages
```

**Bước 4:** Bật GitHub Pages trong Settings > Pages > Source: `gh-pages` branch

Game sẽ có sẵn tại: `https://<username>.github.io/<repo>/MyGame.html`

### 9.2. Cloudflare Pages

Cloudflare Pages tự động handle COOP/COEP headers:

1. Connect repository trên [Cloudflare Pages](https://pages.cloudflare.com/)
2. Set output directory: `build_wasm/bin/MyGame`
3. Deploy — headers được tự động thêm

### 9.3. Netlify

Tạo file `_headers` trong thư mục build output:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

Hoặc cấu hình trong `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### 9.4. Nginx (self-hosted)

```nginx
server {
    listen 80;
    server_name game.example.com;

    root /var/www/mygame;
    index MyGame.html;

    # WASM MIME type
    types {
        application/wasm wasm;
    }

    # Cross-Origin Isolation headers (bắt buộc cho SharedArrayBuffer)
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    # Cache control cho static assets
    location ~* \.(wasm|data)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Cross-Origin-Opener-Policy "same-origin" always;
        add_header Cross-Origin-Embedder-Policy "require-corp" always;
    }

    # Gzip/Brotli compression
    gzip on;
    gzip_types application/wasm application/javascript;
}
```

### 9.5. Apache (.htaccess)

```apache
# MIME type cho WASM
AddType application/wasm .wasm

# Cross-Origin Isolation headers
Header set Cross-Origin-Opener-Policy "same-origin"
Header set Cross-Origin-Embedder-Policy "require-corp"

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE application/wasm application/javascript
</IfModule>
```

---

## 10. Tùy chỉnh build options

### Engine features

File `cmake/modules/AXGameEngineOptions.cmake` cho phép bật/tắt các module của engine. Tắt những module không dùng sẽ **giảm kích thước file WASM** đáng kể.

```cmake
# Tắt Lua scripting
set(AX_ENABLE_EXT_LUA OFF CACHE BOOL "Build lua libraries" FORCE)

# Tắt GUI extensions
set(AX_ENABLE_EXT_GUI OFF CACHE BOOL "Build extension GUI" FORCE)

# Tắt Spine animations
set(AX_ENABLE_EXT_SPINE OFF CACHE BOOL "Build extension spine" FORCE)

# Tắt DragonBones
set(AX_ENABLE_EXT_DRAGONBONES OFF CACHE BOOL "Build extension DragonBones" FORCE)

# Tắt CocoStudio
set(AX_ENABLE_EXT_COCOSTUDIO OFF CACHE BOOL "Build extension cocostudio" FORCE)

# Tắt FairyGUI
set(AX_ENABLE_EXT_FAIRYGUI OFF CACHE BOOL "Build extension FairyGUI" FORCE)

# Tắt ImGui (và Inspector, SDFGen)
set(AX_ENABLE_EXT_IMGUI OFF CACHE BOOL "Build extension ImGui" FORCE)

# Tắt 3D support (nếu chỉ làm game 2D)
set(AX_ENABLE_3D OFF CACHE BOOL "Build 3D support" FORCE)

# Tắt Physics (nếu không dùng)
set(AX_ENABLE_PHYSICS OFF CACHE BOOL "Build Physics support" FORCE)

# Tắt Audio (nếu không cần)
set(AX_ENABLE_AUDIO OFF CACHE BOOL "Build audio support" FORCE)

# Tắt WebSocket
set(AX_ENABLE_WEBSOCKET OFF CACHE BOOL "Build Websocket client" FORCE)

# Tắt HTTP client
set(AX_ENABLE_HTTP OFF CACHE BOOL "Build HTTP client" FORCE)
```

### WASM-specific CMake options

Các option đặc biệt cho WASM build:

```cmake
# Custom HTML shell file (thay thế template mặc định của Emscripten)
set(AX_WASM_SHELL_FILE "${CMAKE_CURRENT_SOURCE_DIR}/wasm_shell.html")

# Bật dev tools (Pause/Resume/Step buttons trong HTML)
set(AX_WASM_ENABLE_DEVTOOLS ON)

# Initial memory allocation (mặc định 1024MB)
set(AX_WASM_INITIAL_MEMORY 512)  # Giảm nếu game nhỏ

# SIMD support
set(AX_WASM_ISA_SIMD "sse")  # hoặc "neon"

# Dùng setTimeout thay vì requestAnimationFrame
set(AX_WASM_TIMING_USE_TIMEOUT ON)
```

### Tối ưu kích thước build

Để giảm kích thước file `.wasm` cho production:

```bash
# Build Release (quan trọng nhất!)
axmol build -p wasm -DCMAKE_BUILD_TYPE=Release

# Hoặc với CMake thủ công
emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DAX_ENABLE_3D=OFF \
  -DAX_ENABLE_PHYSICS=OFF \
  -DAX_ENABLE_EXT_IMGUI=OFF \
  -DAX_ENABLE_EXT_LUA=OFF
```

---

## 11. Tips & Troubleshooting

### WASM binary quá lớn

| Vấn đề | Giải pháp |
|---------|-----------|
| Debug build (~45MB) | Dùng `Release` hoặc `MinSizeRel` build type |
| Quá nhiều features | Tắt modules không dùng trong `AXGameEngineOptions.cmake` |
| Assets lớn | Nén textures, dùng format tối ưu (WebP, compressed textures) |

### SharedArrayBuffer error

```
SharedArrayBuffer is not defined
```

**Nguyên nhân:** Browser yêu cầu Cross-Origin Isolation headers.

**Giải pháp:**
- Đảm bảo server gửi headers:
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- Dùng `server.py` hoặc `axmol run -p wasm` cho local development
- Dùng Service Worker cho GitHub Pages

### Assets không load được

```
Error while loading: HelloWorld.png
```

**Giải pháp:**
1. Kiểm tra thư mục `Content/` có chứa đúng assets
2. Đảm bảo file `.data` được serve cùng thư mục với `.html`
3. Kiểm tra MIME type: server phải trả đúng `application/octet-stream` cho `.data`

### Build lỗi: "AX_ROOT not found"

```
FATAL_ERROR: Please run setup.ps1 add system env var 'AX_ROOT' to specific the engine root
```

**Giải pháp:**
1. Chạy lại `setup.ps1`
2. Restart terminal
3. Kiểm tra: `echo $AX_ROOT` (hoặc `echo $env:AX_ROOT` trên Windows)

### Build lỗi trên Linux: thiếu dependencies

```bash
# Cài đầy đủ dev dependencies
sudo apt install -y \
  libx11-dev libxrandr-dev libxinerama-dev \
  libxcursor-dev libxi-dev libgl1-mesa-dev \
  libglu1-mesa-dev libfontconfig1-dev \
  libasound2-dev libpulse-dev
```

### WebGL context lost

Nếu game bị đen màn hình hoặc mất context:
- Giảm `AX_WASM_INITIAL_MEMORY` nếu device có ít RAM
- Kiểm tra console browser cho error messages
- Thử tắt hardware acceleration trong browser settings để debug

### Build chậm

```bash
# Sử dụng ccache để cache compilation
export CCACHE_DIR=~/.ccache
export CC="ccache gcc"
export CXX="ccache g++"

# Build với nhiều threads
emmake make -j$(nproc)
```

---

## 12. Kết luận

### Tổng kết quy trình

```
1. Cài Axmol + chạy setup.ps1
         ↓
2. Tạo project: axmol new ...
         ↓
3. Viết game code trong Source/
         ↓
4. Build WASM: axmol build -p wasm
         ↓
5. Test local: axmol run -p wasm
         ↓
6. Deploy: Push build output lên hosting
```

Với Axmol Engine, bạn có thể viết game C++ một lần và build cho **tất cả platforms** — từ desktop (Windows, macOS, Linux) đến mobile (iOS, Android) và **web browser** (WebAssembly). Cùng một codebase, chỉ khác entry point cho mỗi platform.

### Resources

- [Axmol Official Website](https://axmol.dev/)
- [Axmol GitHub Repository](https://github.com/axmolengine/axmol)
- [Axmol DevSetup Documentation](https://github.com/axmolengine/axmol/blob/dev/docs/DevSetup.md)
- [Axmol CMake Options](https://github.com/axmolengine/axmol/blob/dev/CMakeOptions.md)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Axmol GitHub Discussions](https://github.com/axmolengine/axmol/discussions)

---

*Bài viết dựa trên Axmol Engine v3.0.0 và Emscripten SDK 3.1.73. Các bước có thể thay đổi ở phiên bản mới hơn — hãy kiểm tra documentation chính thức.*
