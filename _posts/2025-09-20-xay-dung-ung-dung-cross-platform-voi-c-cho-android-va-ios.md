---
title: Xây Dựng Ứng Dụng Cross-Platform với C++ cho Android và iOS
tags: c++ crossplatform android ios swift objective
---

Việc phát triển ứng dụng cross-platform là một xu hướng quan trọng trong ngành mobile development. Thay vì viết code riêng biệt cho từng nền tảng, chúng ta có thể sử dụng C++ để tạo ra một core logic chung, sau đó tích hợp vào các ứng dụng Android và iOS thông qua JNI và Objective-C++.

Bài viết này sẽ hướng dẫn:
- Thiết lập môi trường phát triển với Android NDK
- Sử dụng CMake để quản lý build process
- Tạo một C++ library có thể sử dụng trên cả Android và iOS
- Tích hợp library vào ứng dụng native với các binding cần thiết

## 1. Tại Sao?

**Ưu điểm**:
- `Performance cao`: Gần như native performance, rất phù hợp cho game, AI, image processing
- `Code reuse`: Viết một lần, sử dụng trên nhiều platform
- `Ecosystem phong phú`: Nhiều thư viện C++ mature và stable
- `Memory control`: Kiểm soát hoàn toàn việc quản lý bộ nhớ
- `Industry standard`: Được sử dụng rộng rãi trong các dự án lớn

## 2. Thiết Lập Môi Trường Phát Triển

### 2.1. Cài Đặt Android NDK
```
# Sử dụng Android Studio SDK Manager (recommended)
# Tools > SDK Manager > SDK Tools > NDK (Side by side)

# Hoặc command line
sdkmanager "ndk;25.2.9519653"

# Set environment variables
export ANDROID_NDK_HOME=$HOME/Android/Sdk/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_NDK_HOME
```

### 2.2. Cài Đặt CMake

```
# Ubuntu/Debian
sudo apt-get install cmake ninja-build

# macOS
brew install cmake ninja

# Windows (sử dụng vcpkg hoặc Visual Studio)
# Download từ https://cmake.org/download/
```

### 2.3. Xcode (cho iOS development)
```
# Chỉ cần trên macOS
xcode-select --install
```

## 3. Cấu Trúc Dự án
```
CrossPlatformProject/
├── core/                           # C++ Core Library
│   ├── include/
│   │   ├── math_engine.h          # Public API
│   │   └── platform_utils.h       # Platform abstractions
│   ├── src/
│   │   ├── math_engine.cpp
│   │   ├── platform_utils.cpp
│   │   └── internal/              # Private implementation
│   ├── tests/
│   │   └── test_math_engine.cpp
│   └── CMakeLists.txt
├── platforms/
│   ├── android/                   # Android integration
│   │   ├── app/
│   │   │   ├── src/main/
│   │   │   │   ├── cpp/          # JNI bindings
│   │   │   │   │   ├── jni_bridge.cpp
│   │   │   │   │   └── CMakeLists.txt
│   │   │   │   └── java/         # Kotlin/Java code
│   │   │   │       └── com/example/mathapp/
│   │   │   │           └── MathEngine.kt
│   │   │   └── build.gradle
│   │   └── gradle.properties
│   └── ios/                       # iOS integration
│       ├── MathApp/
│       │   ├── MathEngine.swift   # Swift wrapper
│       │   ├── MathEngineBridge.h # Objective-C bridge
│       │   ├── MathEngineBridge.mm
│       │   └── Info.plist
│       └── MathApp.xcodeproj
├── scripts/                       # Build automation
│   ├── build_android.sh
│   ├── build_ios.sh
│   └── setup.sh
└── CMakeLists.txt                 # Root build file
```

## 4. Tạo C++ Core Library

**include/math_engine.h**
```
#ifndef MATH_ENGINE_H
#define MATH_ENGINE_H

#include <string>
#include <vector>

// C interface for cross-platform compatibility
#ifdef __cplusplus
extern "C" {
#endif

// Basic math operations
int math_add(int a, int b);
double math_distance(double x1, double y1, double x2, double y2);
double math_dot_product(const double* vec1, const double* vec2, int size);

// String operations
const char* math_get_version();
const char* math_platform_info();

// Memory management helpers
void math_free_string(const char* str);

#ifdef __cplusplus
}

// C++ interface for advanced features
namespace MathEngine {
    class Calculator {
    public:
        Calculator();
        ~Calculator();
        
        // Vector operations
        std::vector<double> multiply_matrix(
            const std::vector<std::vector<double>>& matrix,
            const std::vector<double>& vector
        );
        
        // Statistical functions
        double mean(const std::vector<double>& data);
        double standard_deviation(const std::vector<double>& data);
        
        // Configuration
        void set_precision(int decimal_places);
        int get_precision() const;
        
    private:
        int precision_;
        void* internal_state_; // Opaque pointer for implementation details
    };
    
    // Factory functions
    std::unique_ptr<Calculator> create_calculator();
}

#endif // __cplusplus

#endif // MATH_ENGINE_H
```

**src/math_engine.cpp**

```
#include "math_engine.h"
#include "platform_utils.h"
#include <cmath>
#include <numeric>
#include <sstream>
#include <iomanip>
#include <memory>

// C interface implementation
extern "C" {
    int math_add(int a, int b) {
        return a + b;
    }
    
    double math_distance(double x1, double y1, double x2, double y2) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        return std::sqrt(dx * dx + dy * dy);
    }
    
    double math_dot_product(const double* vec1, const double* vec2, int size) {
        if (!vec1 || !vec2 || size <= 0) return 0.0;
        
        double result = 0.0;
        for (int i = 0; i < size; ++i) {
            result += vec1[i] * vec2[i];
        }
        return result;
    }
    
    const char* math_get_version() {
        static std::string version = "1.0.0";
        return version.c_str();
    }
    
    const char* math_platform_info() {
        static std::string info = get_platform_info();
        return info.c_str();
    }
    
    void math_free_string(const char* str) {
        // In this implementation, we use static strings
        // In a more complex scenario, you might need dynamic allocation
    }
}

// C++ implementation
namespace MathEngine {
    
    struct CalculatorImpl {
        int precision = 6;
        // Add more internal state as needed
    };
    
    Calculator::Calculator() : precision_(6) {
        internal_state_ = new CalculatorImpl();
    }
    
    Calculator::~Calculator() {
        delete static_cast<CalculatorImpl*>(internal_state_);
    }
    
    std::vector<double> Calculator::multiply_matrix(
        const std::vector<std::vector<double>>& matrix,
        const std::vector<double>& vector
    ) {
        if (matrix.empty() || matrix[0].size() != vector.size()) {
            return {};
        }
        
        std::vector<double> result(matrix.size(), 0.0);
        for (size_t i = 0; i < matrix.size(); ++i) {
            for (size_t j = 0; j < vector.size(); ++j) {
                result[i] += matrix[i][j] * vector[j];
            }
        }
        return result;
    }
    
    double Calculator::mean(const std::vector<double>& data) {
        if (data.empty()) return 0.0;
        return std::accumulate(data.begin(), data.end(), 0.0) / data.size();
    }
    
    double Calculator::standard_deviation(const std::vector<double>& data) {
        if (data.size() < 2) return 0.0;
        
        double mean_val = mean(data);
        double variance = 0.0;
        
        for (double value : data) {
            double diff = value - mean_val;
            variance += diff * diff;
        }
        
        variance /= (data.size() - 1);
        return std::sqrt(variance);
    }
    
    void Calculator::set_precision(int decimal_places) {
        precision_ = decimal_places;
        static_cast<CalculatorImpl*>(internal_state_)->precision = decimal_places;
    }
    
    int Calculator::get_precision() const {
        return precision_;
    }
    
    std::unique_ptr<Calculator> create_calculator() {
        return std::make_unique<Calculator>();
    }
}
```

**include/platform_utils.h**

```
#ifndef PLATFORM_UTILS_H
#define PLATFORM_UTILS_H

#include <string>

// Platform detection
std::string get_platform_info();
bool is_android();
bool is_ios();

// Logging utilities
void platform_log(const std::string& message);
void platform_error(const std::string& error);

// File system helpers
std::string get_documents_path();
std::string get_cache_path();

#endif // PLATFORM_UTILS_H
```

**src/platform_utils.cpp**

```
#include "platform_utils.h"
#include <sstream>

#ifdef ANDROID
    #include <android/log.h>
    #define LOG_TAG "MathEngine"
#elif defined(__APPLE__)
    #include <TargetConditionals.h>
    #if TARGET_OS_IOS
        #import <Foundation/Foundation.h>
    #endif
#endif

std::string get_platform_info() {
    std::stringstream info;
    
#ifdef ANDROID
    info << "Android NDK";
#elif defined(__APPLE__)
    #if TARGET_OS_IOS
        info << "iOS";
    #elif TARGET_OS_OSX
        info << "macOS";
    #else
        info << "Apple Platform";
    #endif
#elif defined(_WIN32)
    info << "Windows";
#elif defined(__linux__)
    info << "Linux";
#else
    info << "Unknown Platform";
#endif

    info << " - Built with CMake";
    return info.str();
}

bool is_android() {
#ifdef ANDROID
    return true;
#else
    return false;
#endif
}

bool is_ios() {
#if defined(__APPLE__) && TARGET_OS_IOS
    return true;
#else
    return false;
#endif
}

void platform_log(const std::string& message) {
#ifdef ANDROID
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "%s", message.c_str());
#elif defined(__APPLE__) && TARGET_OS_IOS
    NSLog(@"%s", message.c_str());
#else
    // Fallback to stdout for desktop platforms
    printf("[INFO] %s\n", message.c_str());
#endif
}

void platform_error(const std::string& error) {
#ifdef ANDROID
    __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "%s", error.c_str());
#elif defined(__APPLE__) && TARGET_OS_IOS
    NSLog(@"ERROR: %s", error.c_str());
#else
    fprintf(stderr, "[ERROR] %s\n", error.c_str());
#endif
}

std::string get_documents_path() {
    // Implementation depends on platform
#ifdef ANDROID
    // On Android, typically use app's internal storage
    return "/data/data/com.yourpackage.app/files/";
#elif defined(__APPLE__) && TARGET_OS_IOS
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
    return std::string([documentsDirectory UTF8String]) + "/";
#else
    return "./documents/";
#endif
}

std::string get_cache_path() {
#ifdef ANDROID
    return "/data/data/com.yourpackage.app/cache/";
#elif defined(__APPLE__) && TARGET_OS_IOS
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString *cacheDirectory = [paths objectAtIndex:0];
    return std::string([cacheDirectory UTF8String]) + "/";
#else
    return "./cache/";
#endif
}
```

## 5. CMake Configuration

**Root CMakeLists.txt**

```
cmake_minimum_required(VERSION 3.18)
project(CrossPlatformMath VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build options
option(BUILD_TESTS "Build test suite" ON)
option(BUILD_SHARED_LIBS "Build shared libraries" OFF)

# Platform detection
if(ANDROID)
    set(PLATFORM_NAME "Android")
    add_definitions(-DANDROID)
elseif(IOS)
    set(PLATFORM_NAME "iOS")
    add_definitions(-DIOS)
elseif(APPLE)
    set(PLATFORM_NAME "macOS")
    add_definitions(-DMACOS)
elseif(WIN32)
    set(PLATFORM_NAME "Windows")
    add_definitions(-DWINDOWS)
else()
    set(PLATFORM_NAME "Linux")
    add_definitions(-DLINUX)
endif()

message(STATUS "Building for platform: ${PLATFORM_NAME}")

# Include core library
add_subdirectory(core)

# Platform-specific configurations
if(ANDROID)
    # Android specific settings will be handled in app's CMakeLists.txt
elseif(IOS)
    # iOS specific settings
    set(CMAKE_OSX_DEPLOYMENT_TARGET "12.0")
    set(CMAKE_XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "12.0")
endif()
```

**core/CMakeLists.txt**

```
# Core library CMake configuration
set(CORE_SOURCES
    src/math_engine.cpp
    src/platform_utils.cpp
)

set(CORE_HEADERS
    include/math_engine.h
    include/platform_utils.h
)

# Create the library
add_library(mathengine ${CORE_SOURCES} ${CORE_HEADERS})

# Include directories
target_include_directories(mathengine 
    PUBLIC 
        include
    PRIVATE 
        src
)

# Platform-specific linking
if(ANDROID)
    # Link Android libraries
    find_library(log-lib log)
    target_link_libraries(mathengine ${log-lib})
elseif(IOS)
    # iOS Framework linking
    target_link_libraries(mathengine "-framework Foundation")
endif()

# Compiler-specific options
target_compile_options(mathengine PRIVATE
    $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:Clang>:-Wall -Wextra -Wpedantic>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

# Tests
if(BUILD_TESTS)
    add_subdirectory(tests)
endif()

# Installation
install(TARGETS mathengine
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(FILES ${CORE_HEADERS}
    DESTINATION include/mathengine
)
```

## 6.Android Integration

`JNI Bridge` (platforms/android/app/src/main/cpp/jni_bridge.cpp)

```
#include <jni.h>
#include <string>
#include "math_engine.h"

extern "C" JNIEXPORT jint JNICALL
Java_com_example_mathapp_MathEngine_add(JNIEnv *env, jobject /* this */, jint a, jint b) {
    return math_add(a, b);
}

extern "C" JNIEXPORT jdouble JNICALL
Java_com_example_mathapp_MathEngine_distance(JNIEnv *env, jobject /* this */, 
                                            jdouble x1, jdouble y1, jdouble x2, jdouble y2) {
    return math_distance(x1, y1, x2, y2);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_example_mathapp_MathEngine_getVersion(JNIEnv *env, jobject /* this */) {
    return env->NewStringUTF(math_get_version());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_example_mathapp_MathEngine_getPlatformInfo(JNIEnv *env, jobject /* this */) {
    return env->NewStringUTF(math_platform_info());
}

extern "C" JNIEXPORT jdouble JNICALL
Java_com_example_mathapp_MathEngine_dotProduct(JNIEnv *env, jobject /* this */, 
                                              jdoubleArray vec1, jdoubleArray vec2) {
    jsize len1 = env->GetArrayLength(vec1);
    jsize len2 = env->GetArrayLength(vec2);
    
    if (len1 != len2) return 0.0;
    
    jdouble *arr1 = env->GetDoubleArrayElements(vec1, nullptr);
    jdouble *arr2 = env->GetDoubleArrayElements(vec2, nullptr);
    
    double result = math_dot_product(arr1, arr2, len1);
    
    env->ReleaseDoubleArrayElements(vec1, arr1, 0);
    env->ReleaseDoubleArrayElements(vec2, arr2, 0);
    
    return result;
}
```

`Kotlin Wrapper` (platforms/android/app/src/main/java/com/example/mathapp/MathEngine.kt)

```
// platforms/android/app/src/main/java/com/example/mathapp/MathEngine.kt
package com.example.mathapp

class MathEngine {
    companion object {
        init {
            System.loadLibrary("mathengine")
        }
    }
    
    external fun add(a: Int, b: Int): Int
    external fun distance(x1: Double, y1: Double, x2: Double, y2: Double): Double
    external fun getVersion(): String
    external fun getPlatformInfo(): String
    external fun dotProduct(vec1: DoubleArray, vec2: DoubleArray): Double
    
    // Higher-level Kotlin functions
    fun calculateDistance(point1: Pair<Double, Double>, point2: Pair<Double, Double>): Double {
        return distance(point1.first, point1.second, point2.first, point2.second)
    }
    
    fun sumArray(numbers: IntArray): Int {
        return numbers.fold(0) { acc, n -> add(acc, n) }
    }
}
```

## 7. iOS Integration

`Objective-C++ Bridge` (platforms/ios/MathEngine.mm)

```
// platforms/ios/MathApp/MathEngineBridge.h
#import <Foundation/Foundation.h>

@interface MathEngineBridge : NSObject

+ (NSInteger)addA:(NSInteger)a withB:(NSInteger)b;
+ (double)distanceFromX1:(double)x1 y1:(double)y1 toX2:(double)x2 y2:(double)y2;
+ (NSString*)getVersion;
+ (NSString*)getPlatformInfo;
+ (double)dotProductWithVec1:(NSArray<NSNumber*>*)vec1 vec2:(NSArray<NSNumber*>*)vec2;

@end
```

```
// platforms/ios/MathApp/MathEngineBridge.mm
#import "MathEngineBridge.h"
#include "math_engine.h"

@implementation MathEngineBridge

+ (NSInteger)addA:(NSInteger)a withB:(NSInteger)b {
    return math_add((int)a, (int)b);
}

+ (double)distanceFromX1:(double)x1 y1:(double)y1 toX2:(double)x2 y2:(double)y2 {
    return math_distance(x1, y1, x2, y2);
}

+ (NSString*)getVersion {
    return [NSString stringWithUTF8String:math_get_version()];
}

+ (NSString*)getPlatformInfo {
    return [NSString stringWithUTF8String:math_platform_info()];
}

+ (double)dotProductWithVec1:(NSArray<NSNumber*>*)vec1 vec2:(NSArray<NSNumber*>*)vec2 {
    if (vec1.count != vec2.count) return 0.0;
    
    double *arr1 = (double*)malloc(vec1.count * sizeof(double));
    double *arr2 = (double*)malloc(vec2.count * sizeof(double));
    
    for (NSUInteger i = 0; i < vec1.count; i++) {
        arr1[i] = vec1[i].doubleValue;
        arr2[i] = vec2[i].doubleValue;
    }
    
    double result = math_dot_product(arr1, arr2, (int)vec1.count);
    
    free(arr1);
    free(arr2);
    
    return result;
}

@end
```

`Swift Wrapper` (platforms/ios/MathApp/MathEngine.swift)

```
// platforms/ios/MathApp/MathEngine.swift
import Foundation

public class MathEngine {
    
    public static func add(_ a: Int, _ b: Int) -> Int {
        return Int(MathEngineBridge.add(a, withB: b))
    }
    
    public static func distance(from point1: (Double, Double), to point2: (Double, Double)) -> Double {
        return MathEngineBridge.distance(fromX1: point1.0, y1: point1.1, 
                                       toX2: point2.0, y2: point2.1)
    }
    
    public static var version: String {
        return MathEngineBridge.getVersion()
    }
    
    public static var platformInfo: String {
        return MathEngineBridge.getPlatformInfo()
    }
    
    public static func dotProduct(vec1: [Double], vec2: [Double]) -> Double {
        let nsVec1 = vec1.map { NSNumber(value: $0) }
        let nsVec2 = vec2.map { NSNumber(value: $0) }
        return MathEngineBridge.dotProduct(withVec1: nsVec1, vec2: nsVec2)
    }
    
    // Swift-specific convenience methods
    public static func sum(_ numbers: [Int]) -> Int {
        return numbers.reduce(0) { add($0, $1) }
    }
    
    public static func magnitude(of vector: [Double]) -> Double {
        return sqrt(dotProduct(vec1: vector, vec2: vector))
    }
}
```

## 8. Build Scripts

**scripts/build_android.sh**

```
#!/bin/bash

# Build script for Android
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/android"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Configure CMake for Android
cmake -S "$PROJECT_ROOT" -B "$BUILD_DIR" \
    -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake" \
    -DANDROID_ABI=arm64-v8a \
    -DANDROID_PLATFORM=android-21 \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTS=OFF

# Build
cmake --build "$BUILD_DIR" --parallel $(nproc)

echo "Android build completed successfully!"
echo "Library location: $BUILD_DIR/core/libmathengine.a"
```

**scripts/build_ios.sh**

```
#!/bin/bash

# Build script for iOS
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/ios"

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Configure CMake for iOS
cmake -S "$PROJECT_ROOT" -B "$BUILD_DIR" \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=12.0 \
    -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTS=OFF \
    -DIOS=ON

# Build
cmake --build "$BUILD_DIR" --parallel $(sysctl -n hw.ncpu)

echo "iOS build completed successfully!"
echo "Library location: $BUILD_DIR/core/libmathengine.a"
```

## 9. Testing

**core/tests/test_math_engine.cpp**

```
#include "math_engine.h"
#include <cassert>
#include <iostream>
#include <vector>
#include <cmath>

void test_basic_operations() {
    assert(math_add(2, 3) == 5);
    assert(math_add(-1, 1) == 0);
    
    double dist = math_distance(0, 0, 3, 4);
    assert(std::abs(dist - 5.0) < 0.001);
    
    std::cout << "✓ Basic operations tests passed" << std::endl;
}

void test_dot_product() {
    double vec1[] = {1.0, 2.0, 3.0};
    double vec2[] = {4.0, 5.0, 6.0};
    
    double result = math_dot_product(vec1, vec2, 3);
    assert(std::abs(result - 32.0) < 0.001); // 1*4 + 2*5 + 3*6 = 32
    
    std::cout << "✓ Dot product tests passed" << std::endl;
}

void test_cpp_interface() {
    auto calc = MathEngine::create_calculator();
    
    std::vector<double> data = {1.0, 2.0, 3.0, 4.0, 5.0};
    double mean_val = calc->mean(data);
    assert(std::abs(mean_val - 3.0) < 0.001);
    
    double std_dev = calc->standard_deviation(data);
    assert(std_dev > 0); // Should be > 0 for non-constant data
    
    std::cout << "✓ C++ interface tests passed" << std::endl;
}

int main() {
    std::cout << "Running MathEngine tests..." << std::endl;
    std::cout << "Platform: " << math_platform_info() << std::endl;
    std::cout << "Version: " << math_get_version() << std::endl;
    
    test_basic_operations();
    test_dot_product();
    test_cpp_interface();
    
    std::cout << "All tests passed! ✓" << std::endl;
    return 0;
}
```

## 10. Sử Dụng 

### 10.1. Android

```
class MainActivity : AppCompatActivity() {
    private val mathEngine = MathEngine()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Test basic operations
        val sum = mathEngine.add(5, 3)
        Log.d("MathEngine", "5 + 3 = $sum")
        
        // Test distance calculation
        val distance = mathEngine.calculateDistance(
            Pair(0.0, 0.0), 
            Pair(3.0, 4.0)
        )
        Log.d("MathEngine", "Distance: $distance")
        
        // Display platform info
        val info = mathEngine.getPlatformInfo()
        findViewById<TextView>(R.id.platformInfo).text = info
    }
}
```

### 10.2. iOS

```
class ViewController: UIViewController {
    @IBOutlet weak var resultLabel: UILabel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Test basic operations
        let sum = MathEngine.add(5, 3)
        print("5 + 3 = \(sum)")
        
        // Test distance calculation
        let distance = MathEngine.distance(
            from: (0.0, 0.0), 
            to: (3.0, 4.0)
        )
        print("Distance: \(distance)")
        
        // Display platform info
        resultLabel.text = MathEngine.platformInfo
        
        // Test vector operations
        let vec1 = [1.0, 2.0, 3.0]
        let vec2 = [4.0, 5.0, 6.0]
        let dotProduct = MathEngine.dotProduct(vec1: vec1, vec2: vec2)
        print("Dot product: \(dotProduct)")
    }
}
```

## 11. Kết Luận

Việc xây dựng ứng dụng cross-platform với C++ mang lại nhiều lợi ích:

- `Code reuse cao`: Logic business chỉ cần viết một lần
- `Performance tốt`: C++ native performance trên cả hai nền tảng
- `Maintainability`: Dễ duy trì và debug
- `Scalability`: Dễ dàng thêm các nền tảng khác