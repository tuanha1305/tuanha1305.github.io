---
title: Hướng dẫn Build RTMP Dump và cách sử dụng cho Android
tags: rtmp, android, prebuild, android-ndk, ndk, android, rtmp-dump
---

## Giới thiệu về RTMPDump

RTMPDump là một bộ công cụ mã nguồn mở để xử lý giao thức RTMP (Real-Time Messaging Protocol) của Adobe. Nó bao gồm thư viện librtmp và các công cụ dòng lệnh để phát trực tuyến (stream) nội dung qua RTMP.

## Build RTMPDump cho Android
1. Cài đặt NDK: Tải Android NDK từ trang chủ Android
2. Tạo Android.mk
    ```makefile
    LOCAL_PATH := $(call my-dir)
    include $(CLEAR_VARS)

    LOCAL_MODULE := rtmp
    LOCAL_SRC_FILES := rtmp.c amf.c hashswf.c log.c

    include $(BUILD_SHARED_LIBRARY)
    ```
3. Build với NDK:
    ```bash
    ndk-build NDK_PROJECT_PATH=. APP_BUILD_SCRIPT=Android.mk
    ```

## Sử dụng RTMPDump trên Android để đẩy stream từ camera
**Dưới đây là luồng xử lý chính**:
```
+-------------------+       +----------------+       +----------------+       +---------------+
|   Android Camera  |       |  MediaCodec    |       |  RTMP Packager |       | RTMP Server   |
|                   |       |  (Encoder)     |       |  (FLV Format)  |       | (e.g. Nginx)  |
+-------------------+       +----------------+       +----------------+       +---------------+
        |                         |                         |                        |
        | 1. Camera Data          |                         |                        |
        | (YUV/NV21 frames)       |                         |                        |
        |------------------------>|                         |                        |
        |                         |                         |                        |
        |                         | 2. Encoded Video        |                        |
        |                         | (H.264 NAL Units)       |                        |
        |                         |------------------------>|                        |
        |                         |                         |                        |
        |                         |                         | 3. FLV Tagged Data     |
        |                         |                         | (Video/Audio Tags)     |
        |                         |                         |------------------------>|
        |                         |                         |                        |
        |                         |                         | 4. RTMP Handshake      |
        |                         |                         | & Chunk Protocol       |
        |                         |                         |=======================>|
        |                         |                         |                        |
        |                         |                         | 5. Stream Continuously |
        |                         |                         |------------------------>|
        |                         |                         |                        |
```

**Chi tiết từng bước**:
1. Camera Capture:
```
[Camera] --YUV Frame--> [SurfaceTexture] --> [ImageReader]
```
2. Video Encoding:
```
[ImageReader] --YUV Data--> [MediaCodec InputBuffer] 
[MediaCodec] --H.264 NAL Units--> [Encoder Callback]
```
3. RTMP Packaging:
```
[NAL Units] --AVC Decoder Config--> [FLV Header]
[NAL Units] --AVC NALU--> [FLV Video Tag]
[Optional Audio] --AAC--> [FLV Audio Tag]
```
4. RTMP Network Protocol:
```
[FLV Tags] --RTMP Chunks--> [Socket]
Handshake Sequence:
C0C1 --> S0S1S2 --> C2 --> Stream Begin
```
5. Server-side Processing:
```
[RTMP Server] --Demux--> [HLS/DASH] or [Re-stream]
```
Biểu đồ timeline:
```
+----------+   +-----------+   +------------+   +-----------+
| Capture  |-->| Encode    |-->| Package    |-->| Transport |
| (Camera) |   | (H.264)   |   | (FLV/RTMP) |   | (TCP)     |
+----------+   +-----------+   +------------+   +-----------+
   1-30ms         5-20ms          2-10ms         10-100ms
   (depends on    (hardware       (CPU-bound)    (network 
   resolution)    accelerated)                   dependent)
```


#rtmp #android #prebuild #android-ndk #ndk #android #rtmp-dump
