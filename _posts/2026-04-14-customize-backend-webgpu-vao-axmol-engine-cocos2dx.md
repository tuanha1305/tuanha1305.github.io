---
title: Customize Backend WebGPU vào Axmol Engine - Cocos2dx
tags: c++ crossplatform android ios web wasm cocos2dx axmol webgpu
---

# Customize Backend WebGPU vào Axmol Engine - Cocos2dx

---

## Kiến Trúc Hiện Tại

Trước khi động vào bất kỳ dòng code nào, cần hiểu điều gì tạo nên lớp rendering của Axmol.

### Lớp Trừu Tượng RHI

Toàn bộ quá trình rendering trong Axmol đi qua một tập hợp các interface trừu tượng nằm trong `axmol/rhi/`:

```
DriverBase          -- GPU device: tạo tài nguyên
RenderContext       -- Command encoder: ghi lại các lệnh vẽ
Buffer              -- Dữ liệu vertex / index / uniform
Texture             -- Texture 2D, cubemap + sampler
ShaderModule        -- Giai đoạn shader đã biên dịch
Program             -- Cặp vertex + fragment đã liên kết
RenderPipeline      -- Pipeline state object
RenderTarget        -- Các attachment của framebuffer
DepthStencilState   -- Cấu hình depth/stencil
VertexLayout        -- Mô tả thuộc tính vertex
```

<!-- Diagram: Kiến trúc RHI tổng quan -->
<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:24px 0">
  <defs>
    <marker id="arr1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="180" y="24" width="320" height="50" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="340" y="44" text-anchor="middle" font-size="14" font-weight="600" fill="#3C3489" font-family="sans-serif">Game / Scene Graph</text>
  <text x="340" y="62" text-anchor="middle" font-size="12" fill="#534AB7" font-family="sans-serif">Sprites, nodes, actions — không đổi</text>
  <line x1="340" y1="74" x2="340" y2="102" stroke="#888780" stroke-width="1.2" marker-end="url(#arr1)"/>
  <rect x="80" y="102" width="520" height="64" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="340" y="126" text-anchor="middle" font-size="14" font-weight="600" fill="#085041" font-family="sans-serif">RHI — Rendering Hardware Interface</text>
  <text x="340" y="150" text-anchor="middle" font-size="12" fill="#0F6E56" font-family="sans-serif">DriverBase · RenderContext · Buffer · Texture · Program · Pipeline</text>
  <line x1="340" y1="166" x2="340" y2="196" stroke="#888780" stroke-width="1.2" marker-end="url(#arr1)"/>
  <rect x="220" y="196" width="240" height="46" rx="8" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="340" y="215" text-anchor="middle" font-size="14" font-weight="600" fill="#444441" font-family="sans-serif">DriverContext</text>
  <text x="340" y="232" text-anchor="middle" font-size="12" fill="#5F5E5A" font-family="sans-serif">Auto factory + priority selection</text>
  <line x1="256" y1="242" x2="60"  y2="296" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr1)"/>
  <line x1="280" y1="242" x2="174" y2="296" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr1)"/>
  <line x1="318" y1="242" x2="288" y2="296" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr1)"/>
  <line x1="340" y1="242" x2="398" y2="296" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr1)"/>
  <line x1="378" y1="242" x2="508" y2="296" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr1)"/>
  <line x1="406" y1="242" x2="620" y2="296" stroke="#0F6E56" stroke-width="1.5" marker-end="url(#arr1)"/>
  <rect x="20"  y="296" width="80" height="52" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="60"  y="318" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">OpenGL</text>
  <text x="60"  y="336" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">p = 70</text>
  <rect x="130" y="296" width="80" height="52" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="170" y="318" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">D3D11</text>
  <text x="170" y="336" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">p = 80</text>
  <rect x="248" y="296" width="80" height="52" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="288" y="318" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">Vulkan</text>
  <text x="288" y="336" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">p = 90</text>
  <rect x="358" y="296" width="80" height="52" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="398" y="318" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">D3D12</text>
  <text x="398" y="336" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">p = 100</text>
  <rect x="468" y="296" width="80" height="52" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="508" y="318" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">Metal</text>
  <text x="508" y="336" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">p = 100</text>
  <rect x="580" y="292" width="84" height="60" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.5"/>
  <text x="622" y="312" text-anchor="middle" font-size="13" font-weight="600" fill="#085041" font-family="sans-serif">WebGPU</text>
  <text x="622" y="330" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">p = 95</text>
  <text x="622" y="346" text-anchor="middle" font-size="11" font-weight="600" fill="#0F6E56" font-family="sans-serif">★ MỚI</text>
  <text x="60"  y="372" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">Win/Linux/Mac</text>
  <text x="170" y="372" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">Windows</text>
  <text x="288" y="372" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">Win/Linux</text>
  <text x="398" y="372" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">Windows</text>
  <text x="508" y="372" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">Apple</text>
  <text x="622" y="372" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">WASM / Web</text>
</svg>

Mỗi backend triển khai các interface này trong thư mục con riêng:

```
axmol/rhi/
  opengl/    -- DriverGL, RenderContextGL, BufferGL, ...
  metal/     -- DriverMTL, RenderContextMTL, BufferMTL, ...
  d3d11/     -- Driver11, RenderContext11, Buffer11, ...
  d3d12/     -- Driver12, RenderContext12, Buffer12, ...
  vulkan/    -- DriverVK, RenderContextVK, BufferVK, ...
```

### Factory + Lựa Chọn Ưu Tiên

Việc chọn backend sử dụng mẫu **Abstract Factory** với thứ tự ưu tiên tại runtime:

```cpp
enum class DriverType { Auto = -1, OpenGL, D3D11, D3D12, Vulkan, Metal, Count };

struct DefaultDriverPriority {
    static constexpr int OpenGL = 70;
    static constexpr int D3D11  = 80;
    static constexpr int Vulkan = 90;
    static constexpr int D3D12  = 100;
    static constexpr int Metal  = 100;
};
```

Khi khởi động, `DriverContext::makeCurrentDriver()` tạo factory cho tất cả backend được bật, sắp xếp theo độ ưu tiên, và thử từng cái cho đến khi một cái khởi tạo thành công. OpenGL đóng vai trò fallback toàn năng.

### Pipeline Shader

Axmol sử dụng `axslcc`, một shader cross-compiler tùy chỉnh được xây dựng trên SPIRV-Cross. Shader nguồn được viết bằng **GLSL 310 ES** và biên dịch thành file chunk `.axslc` nhúng nhiều target:

```
.vert / .frag  (GLSL 310 ES source)
       |
    [axslcc]
       |
    .axslc chunk
       +-- GLES   (OpenGL ES)
       +-- GLSL   (Desktop GL)
       +-- HLSL   (D3D11 / D3D12)
       +-- MSL    (Metal)
       +-- SPIR-V (Vulkan)
```

Mỗi backend đọc target mà nó cần từ cùng một file chunk. Đây là yếu tố then chốt để thêm backend mới mà không cần chỉnh sửa shader nguồn.

<!-- Diagram: Pipeline biên dịch shader -->
<svg viewBox="0 0 680 360" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:24px 0">
  <defs>
    <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="20" y="20" width="130" height="52" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="85" y="40" text-anchor="middle" font-size="13" font-weight="600" fill="#3C3489" font-family="sans-serif">GLSL 310 ES</text>
  <text x="85" y="58" text-anchor="middle" font-size="11" fill="#534AB7" font-family="sans-serif">.vert / .frag</text>
  <line x1="150" y1="46" x2="180" y2="46" stroke="#888780" stroke-width="1.2" marker-end="url(#arr2)"/>
  <rect x="180" y="20" width="110" height="52" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
  <text x="235" y="40" text-anchor="middle" font-size="13" font-weight="600" fill="#633806" font-family="sans-serif">axslcc</text>
  <text x="235" y="58" text-anchor="middle" font-size="11" fill="#854F0B" font-family="sans-serif">cross-compiler</text>
  <line x1="290" y1="46" x2="320" y2="46" stroke="#888780" stroke-width="1.2" marker-end="url(#arr2)"/>
  <rect x="320" y="8" width="340" height="76" rx="10" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="490" y="28" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">.axslc chunk</text>
  <rect x="332" y="36" width="48" height="36" rx="4" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="356" y="58" text-anchor="middle" font-size="11" fill="#085041" font-family="sans-serif">GLES</text>
  <rect x="386" y="36" width="48" height="36" rx="4" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="410" y="58" text-anchor="middle" font-size="11" fill="#085041" font-family="sans-serif">GLSL</text>
  <rect x="440" y="36" width="48" height="36" rx="4" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="464" y="58" text-anchor="middle" font-size="11" fill="#085041" font-family="sans-serif">HLSL</text>
  <rect x="494" y="36" width="44" height="36" rx="4" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="516" y="58" text-anchor="middle" font-size="11" fill="#085041" font-family="sans-serif">MSL</text>
  <rect x="544" y="36" width="104" height="36" rx="4" fill="#FAEEDA" stroke="#854F0B" stroke-width="1.2"/>
  <text x="596" y="58" text-anchor="middle" font-size="11" font-weight="600" fill="#633806" font-family="sans-serif">SPIR-V ★</text>
  <line x1="356" y1="72" x2="100" y2="150" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr2)"/>
  <line x1="464" y1="72" x2="330" y2="150" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr2)"/>
  <line x1="516" y1="72" x2="476" y2="150" stroke="#B4B2A9" stroke-width="1" marker-end="url(#arr2)"/>
  <line x1="596" y1="72" x2="580" y2="150" stroke="#EF9F27" stroke-width="1.5" marker-end="url(#arr2)"/>
  <path d="M596 72 Q636 112 620 150" fill="none" stroke="#EF9F27" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arr2)"/>
  <rect x="40"  y="150" width="120" height="50" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="100" y="170" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">OpenGL</text>
  <text x="100" y="187" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">GLES / GLSL</text>
  <rect x="262" y="150" width="120" height="50" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="322" y="170" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">D3D11 / D3D12</text>
  <text x="322" y="187" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">HLSL</text>
  <rect x="420" y="150" width="96" height="50" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="468" y="170" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">Metal</text>
  <text x="468" y="187" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">MSL</text>
  <rect x="540" y="150" width="84" height="50" rx="6" fill="#F1EFE8" stroke="#5F5E5A" stroke-width="0.5"/>
  <text x="582" y="170" text-anchor="middle" font-size="13" font-weight="600" fill="#444441" font-family="sans-serif">Vulkan</text>
  <text x="582" y="187" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="sans-serif">SPIR-V</text>
  <rect x="390" y="240" width="160" height="48" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
  <text x="470" y="260" text-anchor="middle" font-size="12" font-weight="600" fill="#633806" font-family="sans-serif">Tint (Emscripten)</text>
  <text x="470" y="278" text-anchor="middle" font-size="11" fill="#854F0B" font-family="sans-serif">SPIR-V → WGSL tại runtime</text>
  <line x1="550" y1="264" x2="582" y2="264" stroke="#EF9F27" stroke-width="1.5" marker-end="url(#arr2)"/>
  <rect x="584" y="240" width="80" height="48" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.5"/>
  <text x="624" y="260" text-anchor="middle" font-size="13" font-weight="600" fill="#085041" font-family="sans-serif">WebGPU</text>
  <text x="624" y="278" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">WGSL</text>
  <path d="M582 200 L582 226 Q582 240 566 240" fill="none" stroke="#EF9F27" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#arr2)"/>
  <text x="340" y="328" text-anchor="middle" font-size="12" fill="#888780" font-family="sans-serif">★ Không cần thêm target shader mới — WebGPU tái sử dụng SPIR-V của Vulkan</text>
</svg>

### Hỗ Trợ Nền Tảng

Axmol chạy trên Windows, macOS, iOS, tvOS, Android, Linux và **WebAssembly** (qua Emscripten). Target WASM trước đây sử dụng **WebGL** thông qua backend OpenGL ES — hoạt động được, nhưng ngày càng bộc lộ hạn chế so với các API đồ họa native.

---

## Tại Sao Chọn WebGPU?

WebGPU là API đồ họa thế hệ tiếp theo cho web, được thiết kế bởi W3C GPU for the Web Community Group. Đây là một bước chuyển mình căn bản so với WebGL:

### Hiệu Năng

- **Quản lý tài nguyên tường minh.** WebGPU loại bỏ state machine ẩn khiến WebGL chậm. Bạn tạo các pipeline state object bất biến, bind group và command buffer — driver không phải đoán mò nhiều nữa.
- **Giảm overhead validation.** WebGL validate mỗi lệnh gọi ở tầng API. WebGPU dồn quá trình validation vào lúc tạo pipeline, giúp công việc per-frame nhẹ hơn.
- **Batching tốt hơn.** Command encoder cho phép ghi công việc GPU trước và nộp một lần, giảm thiểu đồng bộ CPU-GPU.

### Tính Năng Hiện Đại

- **Compute shader.** WebGL không có hỗ trợ compute. WebGPU cung cấp GPU compute đa năng đầy đủ, mở ra khả năng cho particle system, vật lý và post-processing trên GPU.
- **Render pass tường minh.** Ngữ nghĩa render pass đúng đắn cho phép tối ưu tile-based deferred rendering trên GPU mobile, quan trọng khi WebGPU chạy trên điện thoại.
- **Định dạng texture tốt hơn.** Hỗ trợ tùy chọn cho texture nén BC, ETC2 và ASTC thông qua feature query.

### Câu Chuyện Đa Nền Tảng

WebGPU không chỉ là một web API. Thư viện **Dawn** của Google triển khai cùng API này một cách native trên Windows (dùng D3D12), macOS (Metal) và Linux (Vulkan). Điều này có nghĩa là backend WebGPU có thể trở thành backend toàn năng — một implementation nhắm đến mọi nền tảng. Với Phase 1, chúng tôi chỉ target Emscripten, nhưng kiến trúc đã sẵn sàng cho tích hợp Dawn.

### Sự Chuyển Đổi Tất Yếu

WebGL đang ở chế độ bảo trì. Các nhà cung cấp trình duyệt đang đầu tư vào WebGPU. Chrome, Firefox và Safari đều đã ship hỗ trợ WebGPU. Với một game engine nhắm đến web, đây là chuyện sớm muộn mà thôi.

---

## Kiến Trúc Khi Thêm WebGPU

Mục tiêu thiết kế rất đơn giản: **WebGPU phải là backend thứ sáu, tuân theo đúng các pattern của năm backend hiện có.** Không có trường hợp đặc biệt, không rò rỉ abstraction.

### Vị Trí của WebGPU

```
axmol/rhi/
  opengl/     -- GL / GLES
  metal/      -- Apple Metal
  d3d11/      -- Direct3D 11
  d3d12/      -- Direct3D 12
  vulkan/     -- Vulkan
  webgpu/     -- WebGPU  (MỚI)
```

WebGPU có giá trị enum `DriverType::WebGPU` riêng, `WebGPUDriverFactory` riêng, và độ ưu tiên riêng (`95` — cao hơn `70` của OpenGL, khiến nó trở thành backend ưu tiên trên WASM).

### Chiến Lược Shader: Tái Sử Dụng SPIR-V

Phần thanh lịch nhất của tích hợp: **WebGPU tái sử dụng output SPIR-V mà backend Vulkan đang dùng.** Implementation WebGPU của Emscripten bao gồm shader compiler Tint của Google, tự động chuyển đổi SPIR-V sang WGSL tại runtime.

Điều này có nghĩa là:
- Không cần thay đổi gì trong `axslcc` hay file shader nguồn
- Không cần target ngôn ngữ shader mới
- Các file chunk `.axslc` đã chứa dữ liệu mà WebGPU cần

Phân công ngôn ngữ shader trong `DriverContext` giống hệt Vulkan:

```cpp
case DriverType::WebGPU:
    _currentShaderLang    = axslc::SHADER_LANG_SPIRV;
    _currentShaderProfile = 100;
    break;
```

### Backend Tham Chiếu: Vulkan

WebGPU được thiết kế theo phong cách "Vulkan-like" với quản lý tài nguyên tường minh, nên backend Vulkan là tài liệu tham khảo chính của chúng tôi:

| Khái niệm | Vulkan | WebGPU |
|---|---|---|
| Tạo device | `vkCreateDevice` | `wgpuAdapterRequestDevice` |
| Ghi command | `VkCommandBuffer` | `WGPUCommandEncoder` |
| Render pass | `vkCmdBeginRenderPass` | `wgpuCommandEncoderBeginRenderPass` |
| Pipeline state | `VkPipeline` (PSO bất biến) | `WGPURenderPipeline` (bất biến) |
| Cập nhật buffer | `vkCmdCopyBuffer` / staging | `wgpuQueueWriteBuffer` |
| Upload texture | `vkCmdCopyBufferToImage` | `wgpuQueueWriteTexture` |
| Shader input | SPIR-V | SPIR-V (qua Tint) hoặc WGSL |
| Binding descriptor | Descriptor set | Bind group |
| Present | `vkQueuePresentKHR` | `wgpuSurfacePresent` |

### Những Khác Biệt Kiến Trúc Quan Trọng

Dù mapping rất gần nhau, WebGPU có những điểm khác biệt đáng chú ý:

**1. Tính bất biến của pipeline state nghiêm ngặt hơn.** Vulkan hỗ trợ dynamic state extension (cull mode, front face, topology có thể thay đổi mà không cần rebind pipeline). WebGPU đóng cứng **mọi thứ** vào pipeline. Điều này có nghĩa là cache key của pipeline phải bao gồm cull mode, front face và primitive topology — tương tự cách backend D3D12 hoạt động.

**2. Không có primitive LINE_LOOP.** WebGPU bỏ hoàn toàn `LINE_LOOP`. Backend fallback về `LINE_STRIP`.

**3. Khởi tạo bất đồng bộ.** `wgpuInstanceRequestAdapter` và `wgpuAdapterRequestDevice` là bất đồng bộ trên web. Chúng tôi dùng `emscripten_sleep()` của Emscripten để block đến khi callback kích hoạt, đòi hỏi linker flag `-sASYNCIFY`.

**4. Quản lý buffer đơn giản hơn.** Trong khi Vulkan yêu cầu staging buffer tường minh và cấp phát bộ nhớ (qua VMA), WebGPU cung cấp `wgpuQueueWriteBuffer` và `wgpuQueueWriteTexture` — driver tự xử lý staging nội bộ. Điều này giúp đơn giản hóa đáng kể các implementation buffer và texture.

---

## Hướng Dẫn Triển Khai

### Bước 1: Hệ Thống Kiểu RHI

Nền tảng — thêm WebGPU vào hệ thống kiểu để phần còn lại của engine nhận biết nó tồn tại.

**`RHITypes.h`** — Giá trị enum và độ ưu tiên mới:
```cpp
// (xem file gốc để biết chi tiết code)
```

### Bước 5: Shader Module

Phần đơn giản nhất, nhờ tái sử dụng SPIR-V:

```cpp
void ShaderModuleImpl::compileShader(WGPUDevice device) {
    auto codeData = getChunkData();  // Trích SPIR-V từ .axslc

    WGPUShaderModuleSPIRVDescriptor spirvDesc{};
    spirvDesc.chain.sType = WGPUSType_ShaderModuleSPIRVDescriptor;
    spirvDesc.codeSize    = codeData.second / sizeof(uint32_t);
    spirvDesc.code        = reinterpret_cast<const uint32_t*>(codeData.first);

    WGPUShaderModuleDescriptor moduleDesc{};
    moduleDesc.nextInChain = &spirvDesc.chain;

    _shader = wgpuDeviceCreateShaderModule(device, &moduleDesc);
}
```

### Bước 6: Buffer và Texture

Đơn giản hơn rất nhiều so với Vulkan nhờ `wgpuQueueWriteBuffer`:

```cpp
void BufferImpl::updateData(const void* data, std::size_t size) {
    if (size > _size) {
        // Tạo lại với kích thước mới
        wgpuBufferDestroy(_buffer);
        _size = size;
        createNativeBuffer(data);
    } else {
        wgpuQueueWriteBuffer(_driver->getQueue(), _buffer, 0, data, size);
    }
}
```

Không staging buffer, không truy vấn loại bộ nhớ, không VMA allocator. WebGPU tự lo.

### Bước 7: Pipeline Cache

Đây là phần thú vị nhất về mặt kiến trúc. Pipeline WebGPU **hoàn toàn bất biến** — thậm chí còn hơn cả Vulkan (vốn có dynamic state extension). Cache key phải bao gồm mọi thứ:

```cpp
// Hash kết hợp: program ID + blend state + depth/stencil +
//               topology + cull mode + front face + render target format
uintptr_t psoKey = 0;
hashCombine(psoKey, program->getProgramId());
hashCombine(psoKey, blendDesc.blendEnabled);
hashCombine(psoKey, blendDesc.sourceRGBBlendFactor);
hashCombine(psoKey, topology);   // đóng cứng vào pipeline WebGPU
hashCombine(psoKey, cullMode);   // đóng cứng vào pipeline WebGPU
hashCombine(psoKey, frontFace);  // đóng cứng vào pipeline WebGPU
hashCombine(psoKey, rt->getColorFormat());
```

Trên thực tế, hầu hết các frame tái sử dụng cùng một vài pipeline, nên overhead tìm kiếm hash là không đáng kể.

### Bước 8: Render Context

Vòng lặp rendering cốt lõi ánh xạ gọn gàng sang model command của WebGPU:

<!-- Diagram: WebGPU rendering loop -->
<svg viewBox="0 0 680 460" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;margin:24px 0">
  <defs>
    <marker id="arr3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <line x1="80" y1="52" x2="80" y2="440" stroke="#D3D1C7" stroke-width="0.5" stroke-dasharray="4 4"/>
  <line x1="600" y1="52" x2="600" y2="440" stroke="#D3D1C7" stroke-width="0.5" stroke-dasharray="4 4"/>
  <text x="80"  y="44" text-anchor="middle" font-size="12" fill="#888780" font-family="sans-serif">CPU</text>
  <text x="600" y="44" text-anchor="middle" font-size="12" fill="#888780" font-family="sans-serif">GPU Queue</text>
  <rect x="220" y="56" width="240" height="52" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="340" y="76" text-anchor="middle" font-size="14" font-weight="600" fill="#3C3489" font-family="sans-serif">beginFrame()</text>
  <text x="340" y="96" text-anchor="middle" font-size="11" fill="#534AB7" font-family="sans-serif">getSurface · createCommandEncoder</text>
  <line x1="340" y1="108" x2="340" y2="132" stroke="#888780" stroke-width="1.2" marker-end="url(#arr3)"/>
  <rect x="220" y="132" width="240" height="52" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="340" y="152" text-anchor="middle" font-size="14" font-weight="600" fill="#085041" font-family="sans-serif">beginRenderPass()</text>
  <text x="340" y="172" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">wgpuCmdEncoderBeginRenderPass</text>
  <line x1="340" y1="184" x2="340" y2="204" stroke="#888780" stroke-width="1.2" marker-end="url(#arr3)"/>
  <rect x="120" y="204" width="440" height="148" rx="10" fill="none" stroke="#B4B2A9" stroke-width="0.8" stroke-dasharray="5 4"/>
  <text x="148" y="222" font-size="11" fill="#888780" font-family="sans-serif">vòng lặp draw calls</text>
  <rect x="148" y="228" width="164" height="44" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="230" y="246" text-anchor="middle" font-size="13" font-weight="600" fill="#085041" font-family="sans-serif">setPipeline()</text>
  <text x="230" y="263" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">Tra cache PSO</text>
  <rect x="368" y="228" width="164" height="44" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="450" y="246" text-anchor="middle" font-size="13" font-weight="600" fill="#085041" font-family="sans-serif">setBindGroup()</text>
  <text x="450" y="263" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">Texture · Uniform</text>
  <line x1="312" y1="250" x2="366" y2="250" stroke="#888780" stroke-width="1" marker-end="url(#arr3)"/>
  <rect x="230" y="300" width="220" height="38" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="340" y="322" text-anchor="middle" font-size="13" font-weight="600" fill="#085041" font-family="sans-serif">drawIndexed()</text>
  <line x1="240" y1="272" x2="290" y2="300" stroke="#888780" stroke-width="1" marker-end="url(#arr3)"/>
  <line x1="440" y1="272" x2="390" y2="300" stroke="#888780" stroke-width="1" marker-end="url(#arr3)"/>
  <line x1="340" y1="338" x2="340" y2="360" stroke="#888780" stroke-width="1.2" marker-end="url(#arr3)"/>
  <rect x="210" y="360" width="260" height="48" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
  <text x="340" y="380" text-anchor="middle" font-size="14" font-weight="600" fill="#085041" font-family="sans-serif">endRenderPass()</text>
  <text x="340" y="398" text-anchor="middle" font-size="11" fill="#0F6E56" font-family="sans-serif">wgpuRenderPassEncoderEnd</text>
  <line x1="340" y1="408" x2="340" y2="424" stroke="#888780" stroke-width="1.2" marker-end="url(#arr3)"/>
  <rect x="170" y="424" width="340" height="30" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
  <text x="340" y="442" text-anchor="middle" font-size="13" font-weight="600" fill="#3C3489" font-family="sans-serif">finish → queueSubmit → present()</text>
  <text x="80"  y="150" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">ghi lệnh</text>
  <text x="80"  y="444" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">submit</text>
  <text x="600" y="444" text-anchor="middle" font-size="11" fill="#888780" font-family="sans-serif">thực thi</text>
  <line x1="510" y1="439" x2="590" y2="439" stroke="#B4B2A9" stroke-width="1" stroke-dasharray="3 3" marker-end="url(#arr3)"/>
</svg>

```
beginFrame()
  |-- wgpuSurfaceGetCurrentTexture()
  |-- wgpuDeviceCreateCommandEncoder()
  |
  +-- beginRenderPass()
  |     |-- wgpuCommandEncoderBeginRenderPass()
  |     |-- setViewport()  -> wgpuRenderPassEncoderSetViewport()
  |     |-- drawElements() -> wgpuRenderPassEncoderDrawIndexed()
  |     +-- endRenderPass() -> wgpuRenderPassEncoderEnd()
  |
  +-- endFrame()
        |-- wgpuCommandEncoderFinish()
        |-- wgpuQueueSubmit()
        +-- wgpuSurfacePresent()
```

Quản lý surface sử dụng canvas của Emscripten:

```cpp
WGPUSurfaceDescriptorFromCanvasHTMLSelector canvasDesc{};
canvasDesc.chain.sType = WGPUSType_SurfaceDescriptorFromCanvasHTMLSelector;
canvasDesc.selector    = "#canvas";
_surface = wgpuInstanceCreateSurface(instance, &surfaceDesc);
```

---

## Build và Kiểm Thử

### Build

Với các thay đổi CMake đã có, build cho WASM với WebGPU chỉ cần thay một flag:

```bash
# Trước (WebGL)
cmake -DAX_RENDER_API=gl -DCMAKE_TOOLCHAIN_FILE=$EMSDK/emscripten/cmake/Modules/Platform/Emscripten.cmake ..

# Sau (WebGPU -- giờ là mặc định cho WASM)
cmake -DAX_RENDER_API=wgpu -DCMAKE_TOOLCHAIN_FILE=$EMSDK/emscripten/cmake/Modules/Platform/Emscripten.cmake ..
```

Hoặc đơn giản là bỏ `AX_RENDER_API` — auto selection giờ ưu tiên WebGPU trên WASM.

### Chiến Lược Kiểm Thử

1. **Smoke test**: Chạy `cpp-tests` trong Chrome với WebGPU được bật. Kiểm tra rendering sprite 2D cơ bản.
2. **Kiểm tra tính năng**: Kiểm tra có hệ thống các chế độ blend, stencil operation, depth testing, instanced rendering.
3. **Ma trận trình duyệt**: Chrome (chính), Firefox, Safari — tất cả đều hỗ trợ WebGPU.
4. **Fallback**: Build với `AX_RENDER_API=wgpu;gl` để xác minh GL fallback khi WebGPU không khả dụng.
5. **So sánh hiệu năng**: So sánh frame time giữa WebGL và WebGPU trên cùng scene kiểm thử.

### Hạn Chế Đã Biết

- **readPixels**: Chưa triển khai. WebGPU yêu cầu mapping staging buffer bất đồng bộ (`wgpuBufferMapAsync`), cần tích hợp cẩn thận với callback API đồng bộ của `readPixels` trong engine.
- **LINE_LOOP**: Được giả lập bằng `LINE_STRIP`. Hầu hết code engine dùng triangle, nên vấn đề này hiếm khi gặp.
- **Phụ thuộc SPIR-V**: Spec WebGPU chỉ bắt buộc WGSL. Tint của Emscripten xử lý chuyển đổi SPIR-V hiện tại, nhưng một target WGSL output trong `axslcc` tương lai sẽ bền vững hơn.

---

## Tổng Kết File

Implementation chỉnh sửa **10 file hiện có** và thêm **22 file mới**:

**Các file đã chỉnh sửa:**
- `axmol/rhi/RHITypes.h` -- Enum DriverType, độ ưu tiên
- `axmol/rhi/DriverContext.h` -- Helper `isWebGPU()`
- `axmol/rhi/DriverContext.cpp` -- Đăng ký factory, ngôn ngữ shader
- `axmol/rhi/DriverFactory.h` -- `WebGPUDriverFactory`
- `axmol/CMakeLists.txt` -- API hợp lệ, auto selection, macro propagation
- `axmol/rhi/CMakeLists.txt` -- Đăng ký file nguồn
- `axmol/platform/PlatformConfig.h` -- Macro `AX_ENABLE_WGPU`
- `axmol/platform/desktop/RenderViewImpl.cpp` -- Surface handle
- `cmake/Modules/AXConfigDefine.cmake` -- Linker flag
- `cmake/Modules/AXSLCC.cmake` -- Chia sẻ target SPIR-V

**Các file mới (tất cả trong `axmol/rhi/webgpu/`):**

| File | Mục đích |
|---|---|
| `UtilsWGPU.h/.cpp` | Chuyển đổi format (14 hàm) |
| `DriverWGPU.h/.cpp` | Khởi tạo device, tạo tài nguyên, truy vấn feature |
| `ShaderModuleWGPU.h/.cpp` | SPIR-V sang WGPUShaderModule |
| `ProgramWGPU.h/.cpp` | Wrapper module VS + FS |
| `BufferWGPU.h/.cpp` | Quản lý GPU buffer |
| `TextureWGPU.h/.cpp` | Tạo và upload texture |
| `VertexLayoutWGPU.h/.cpp` | Layout thuộc tính vertex |
| `DepthStencilStateWGPU.h/.cpp` | Cấu hình depth/stencil |
| `RenderTargetWGPU.h/.cpp` | Attachment của framebuffer |
| `RenderPipelineWGPU.h/.cpp` | Tạo pipeline + cache |
| `RenderContextWGPU.h/.cpp` | Mã hóa command + present |

---

## Bài Học Rút Ra

1. **Abstraction tốt sẽ trả lại xứng đáng.** Lớp RHI được thiết kế chính xác cho kịch bản này. Thêm backend thứ sáu không cần thay đổi gì ở renderer, scene graph hay bất kỳ code cấp game nào. Các interface trừu tượng định nghĩa hợp đồng; chúng ta chỉ điền vào thêm một implementation nữa.

2. **SPIR-V là định dạng trao đổi shader toàn năng.** Bằng cách biên dịch sang SPIR-V một lần và để các công cụ backend xử lý bước cuối (SPIRV-Cross cho MSL/HLSL/GLSL, Tint cho WGSL), pipeline shader vẫn gọn gàng và dễ mở rộng.

3. **WebGPU gần Vulkan hơn vẻ ngoài.** Việc ánh xạ khái niệm gần như 1:1. Điểm ma sát chính là tính bất biến của pipeline state (cull mode và topology đóng cứng vào) và khởi tạo bất đồng bộ — cả hai đều xử lý được một cách đơn giản.

4. **Đơn giản hơn không có nghĩa là kém năng lực hơn.** `wgpuQueueWriteBuffer` và `wgpuQueueWriteTexture` của WebGPU loại bỏ cả mảng boilerplate của Vulkan (staging buffer, cấp phát bộ nhớ, layout transition) mà không hi sinh hiệu năng. Các implementation buffer và texture có kích thước xấp xỉ một nửa so với phiên bản Vulkan.

5. **Nền tảng web đang bắt kịp.** WebGPU trao cho ứng dụng web quyền truy cập vào những tính năng GPU mà ứng dụng native đã được hưởng từ lâu. Với một engine đa nền tảng như Axmol, điều này thu hẹp khoảng cách về chất lượng rendering giữa web và native.

---

*Công trình này thêm backend WebGPU nền tảng vào Axmol Engine. Phase 2 sẽ khám phá tích hợp Dawn cho WebGPU native trên desktop, hỗ trợ compute shader, và profiling hiệu năng so với các backend hiện có.*

**Bài viết liên quan:** [Build Web Game bằng Cocos2dx - Axmol Engine]({% post_url 2026-04-13-build-web-game-axmol-cocos2dx %})
