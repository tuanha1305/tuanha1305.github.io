---
title: Hướng dẫn build thư viện cURL cho Android
tags: curl android prebuild android-ndk ndk android
---

Khi phát triển ứng dụng Android native sử dụng NDK, việc tích hợp thư viện cURL cho các tác vụ HTTP/HTTPS là khá phổ biến. Tuy nhiên, việc build cURL từ source code cho Android có thể phức tạp và tốn thời gian. Bài viết này sẽ hướng dẫn bạn cách build cURL cho Android và tạo prebuilt binaries để tái sử dụng.

## Tại sao cần Prebuild cURL?
1. Tiết kiệm thời gian build: Không cần build lại từ source mỗi lần
2. Nhất quán: Đảm bảo tất cả developer sử dụng cùng version
3. CI/CD friendly: Dễ tích hợp vào pipeline tự động
4. Cross-platform: Support multiple Android architectures

## Yêu cầu hệ thống

**Dependencies cần thiết**
- Android NDK (r21 trở lên)
- CMake (3.10.2 trở lên)
- Git
- Python 3
- OpenSSL for Android (optional, cho HTTPS support)

## Kiểm tra môi trường
```bash
# Kiểm tra NDK
echo $ANDROID_NDK_HOME

# Kiểm tra CMake
cmake --version

# Kiểm tra Git
git --version
```

## Build cURL
```bash
# Clone cURL repository
git clone https://github.com/tuanha1305/prebuilt-curl-android.git
chmod +x ./build.sh
# Build cURL
./build.sh
```

## Cách sử dụng Prebuilt cURL

### 1. Tải prebuilt libraries
### 2. Tích hợp vào dự án Android
**Sử dụng với CMake**
```
# Trong CMakeLists.txt của bạn
add_subdirectory(path/to/curl-android-prebuilt/prebuilt)

# Link với native library của bạn
target_link_libraries(your-native-lib
    curl
    ssl
    crypto
    log
    z
)
```
**Sử dụng với ndk-build**
```makefile
# Trong Android.mk của bạn
include $(CLEAR_VARS)
LOCAL_MODULE := your-native-lib
LOCAL_SRC_FILES := your-source.cpp

# Include prebuilt cURL
include path/to/curl-android-prebuilt/prebuilt/Android.mk

LOCAL_STATIC_LIBRARIES := curl ssl crypto
LOCAL_LDLIBS := -llog -lz

include $(BUILD_SHARED_LIBRARY)
```
### 3. Code example sử dụng cURL
```cpp
#include <curl/curl.h>
#include <android/log.h>
#include <string>

#define LOG_TAG "CurlExample"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

// Callback để nhận data
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    size_t totalSize = size * nmemb;
    userp->append((char*)contents, totalSize);
    return totalSize;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_example_app_MainActivity_makeHttpRequest(JNIEnv* env, jobject /* this */, jstring url) {
    const char* urlStr = env->GetStringUTFChars(url, 0);
    
    CURL* curl;
    CURLcode res;
    std::string response;
    
    curl = curl_easy_init();
    if(curl) {
        // Set URL
        curl_easy_setopt(curl, CURLOPT_URL, urlStr);
        
        // Set callback function
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        // SSL options
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        
        // Perform request
        res = curl_easy_perform(curl);
        
        if(res != CURLE_OK) {
            LOGI("curl_easy_perform() failed: %s", curl_easy_strerror(res));
        }
        
        curl_easy_cleanup(curl);
    }
    
    env->ReleaseStringUTFChars(url, urlStr);
    return env->NewStringUTF(response.c_str());
}
```

Script build và deployment này có thể được customize cho các thư viện native khác, giúp streamline quá trình phát triển Android NDK.

#curl #android #prebuild #android-ndk #ndk #android