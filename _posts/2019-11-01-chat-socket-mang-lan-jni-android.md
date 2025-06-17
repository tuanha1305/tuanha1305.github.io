---
title: Chat Socket Mạng Lan C++ trong Android
tags: ndk android android-ndk
---

# Xây dựng ứng dụng Chat Socket LAN với C++ JNI trên Android

## Giới thiệu

Chào các bạn! Hôm nay mình sẽ chia sẻ kinh nghiệm về việc xây dựng một ứng dụng chat sử dụng socket trong mạng LAN, được viết bằng C++ và tích hợp vào Android thông qua `JNI (Java Native Interface)`. Đây là một dự án thực tế mà mình đã làm khi apply vào VCCorp cho vị trí **Lập trình viên SDK Mobile**.

## Tại sao lại chọn Socket Programming?

Socket programming là nền tảng của hầu hết các ứng dụng mạng hiện đại. Khi bạn gửi tin nhắn qua WhatsApp, xem video trên YouTube, hay chơi game online - tất cả đều dựa trên socket. Hiểu rõ socket sẽ giúp bạn:

- Xây dựng được các ứng dụng real-time
- Tối ưu hiệu năng mạng
- Debug các vấn đề network hiệu quả
- Thiết kế kiến trúc distributed systems

## Socket là gì?

Socket có thể hiểu đơn giản là một "cổng giao tiếp" giữa hai máy tính trong mạng. Giống như việc hai người nói chuyện qua điện thoại - mỗi người cần một số điện thoại (địa chỉ IP + port) và một "đường dây" (socket connection) để truyền tải thông tin.

```
[Client A] ←------Socket Connection------→ [Server]
                                              ↑
[Client B] ←------Socket Connection------→ [Server]
```

## TCP vs UDP: Lựa chọn giao thức phù hợp

### TCP (Transmission Control Protocol)

**Đặc điểm:**
- **Connection-oriented**: Cần thiết lập kết nối trước khi truyền dữ liệu
- **Reliable**: Đảm bảo dữ liệu được gửi đúng thứ tự và không bị mất
- **Flow control**: Điều khiển tốc độ gửi để tránh quá tải
- **Error correction**: Tự động phát hiện và sửa lỗi

**Quy trình TCP 3-way handshake:**
```
Client                    Server
  |                         |
  |-------SYN------→        |
  |                         |
  |←----SYN-ACK-----        |
  |                         |
  |-------ACK------→        |
  |                         |
  |   Connection established|
```

**Ưu điểm:**
- Dữ liệu được đảm bảo chính xác 100%
- Thứ tự dữ liệu được bảo toàn
- Phù hợp cho các ứng dụng quan trọng

**Nhược điểm:**
- Chậm hơn UDP do overhead
- Tốn băng thông hơn

### UDP (User Datagram Protocol)

**Đặc điểm:**
- **Connectionless**: Gửi dữ liệu ngay không cần thiết lập kết nối
- **Unreliable**: Không đảm bảo dữ liệu đến đích
- **No flow control**: Gửi nhanh nhất có thể
- **Minimal overhead**: Header nhỏ gọn

**Ưu điểm:**
- Tốc độ nhanh
- Ít tốn tài nguyên
- Phù hợp real-time applications

**Nhược điểm:**
- Có thể mất dữ liệu
- Không đảm bảo thứ tự

### So sánh TCP vs UDP

| Tiêu chí | TCP | UDP |
|----------|-----|-----|
| **Độ tin cậy** | Cao (99.99%) | Thấp (~95-98%) |
| **Tốc độ** | Chậm hơn | Nhanh hơn |
| **Kích thước header** | 20 bytes | 8 bytes |
| **Use cases** | Chat, Email, File transfer | Gaming, Video streaming, DNS |

## Tại sao chọn TCP cho ứng dụng Chat?

Với ứng dụng chat, việc đảm bảo tin nhắn được gửi đến chính xác là quan trọng nhất. Bạn không muốn tin nhắn "Anh yêu em" bị mất hoặc thành "Anh em" phải không? 😄

Do đó, TCP là lựa chọn hoàn hảo cho chat app vì:
- Đảm bảo 100% tin nhắn được gửi đến
- Thứ tự tin nhắn được bảo toàn
- Tự động xử lý các vấn đề network

## Kiến trúc ứng dụng Chat Socket

### 1. Mô hình Client-Server

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Android App   │    │   Android App   │    │   Android App   │
│   (Client A)    │    │    (Server)     │    │   (Client B)    │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │    UI     │  │    │  │    UI     │  │    │  │    UI     │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Java    │  │    │  │   Java    │  │    │  │   Java    │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ C++ (JNI) │  │    │  │ C++ (JNI) │  │    │  │ C++ (JNI) │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────TCP─────────┴───────────TCP─────────┘
```

### 2. Flow hoạt động của ứng dụng

#### **Khởi động Server:**
```
1. User chọn "Start Server"
2. App tạo socket server tại port 8888
3. Server lắng nghe (listen) các kết nối đến
4. Hiển thị IP local để client biết địa chỉ kết nối
```

#### **Client kết nối:**
```
1. User nhập IP của server
2. Chọn "Connect as Client"
3. App tạo socket client
4. Thực hiện kết nối đến server
5. Server chấp nhận kết nối và tạo thread riêng để xử lý client này
```

#### **Gửi tin nhắn:**
```
Client A                Server                 Client B
   |                      |                      |
   |---"Hello B!"------→  |                      |
   |                      |----"Hello B!"----→   |
   |                      |                      |
   |                      | ←----"Hi A!"-------  |
   | ←----"Hi A!"---------|                      |
```

### 3. Luồng dữ liệu qua các tầng

```
┌─────────────────────────────────────────────┐
│              Android UI Layer                
│  (EditText, RecyclerView, Buttons)          │
└─────────────┬───────────────────────────────┘
              │ JNI Call
┌─────────────▼───────────────────────────────┐
│              Java Layer                     │
│  (MainActivity, ChatSocketJNI)              │
└─────────────┬───────────────────────────────┘
              │ Native Method Call
┌─────────────▼───────────────────────────────┐
│              C++ Native Layer               │
│  (Socket operations, Threading)             │
└─────────────┬───────────────────────────────┘
              │ System Call
┌─────────────▼───────────────────────────────┐
│            Linux Kernel                     │
│  (TCP/IP Stack, Network Driver)             │
└─────────────────────────────────────────────┘
```

## Deep Dive: C++ Socket Implementation

### 1. Tạo Server Socket

```cpp
// Tạo socket
int serverSocket = socket(AF_INET, SOCK_STREAM, 0);

// Cấu hình địa chỉ server
struct sockaddr_in serverAddr;
serverAddr.sin_family = AF_INET;        // IPv4
serverAddr.sin_addr.s_addr = INADDR_ANY; // Lắng nghe tất cả interfaces
serverAddr.sin_port = htons(8888);      // Port 8888

// Bind socket với địa chỉ
bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr));

// Lắng nghe kết nối (queue tối đa 5 pending connections)
listen(serverSocket, 5);
```

**Giải thích:**
- `AF_INET`: Sử dụng IPv4
- `SOCK_STREAM`: Sử dụng TCP
- `INADDR_ANY`: Server sẽ lắng nghe trên tất cả network interfaces
- `htons()`: Chuyển đổi byte order từ host sang network

### 2. Accept kết nối từ Client

```cpp
while (isRunning) {
    struct sockaddr_in clientAddr;
    socklen_t clientLen = sizeof(clientAddr);
    
    // Chờ và chấp nhận kết nối mới
    int clientSocket = accept(serverSocket, 
                             (struct sockaddr*)&clientAddr, 
                             &clientLen);
    
    if (clientSocket >= 0) {
        // Lưu client socket để broadcast tin nhắn
        clientSockets.push_back(clientSocket);
        
        // Tạo thread riêng để xử lý client này
        std::thread(&ChatSocket::handleClient, this, clientSocket).detach();
    }
}
```

### 3. Xử lý tin nhắn từ Client

```cpp
void handleClient(int clientSocket) {
    char buffer[1024];
    std::string incompleteMessage;
    
    while (isRunning) {
        // Nhận dữ liệu từ client
        int bytesReceived = recv(clientSocket, buffer, sizeof(buffer)-1, 0);
        
        if (bytesReceived <= 0) {
            // Client ngắt kết nối
            break;
        }
        
        buffer[bytesReceived] = '\0';
        incompleteMessage += buffer;
        
        // Xử lý các tin nhắn hoàn chỉnh (kết thúc bằng '\n')
        size_t pos = 0;
        while ((pos = incompleteMessage.find('\n')) != std::string::npos) {
            std::string message = incompleteMessage.substr(0, pos);
            incompleteMessage.erase(0, pos + 1);
            
            // Broadcast tin nhắn đến tất cả clients khác
            broadcastMessage(message, clientSocket);
        }
    }
    
    // Cleanup khi client disconnect
    removeClient(clientSocket);
}
```

**Điểm quan trọng:**
- **Message framing**: Sử dụng '\n' để phân tách các tin nhắn
- **Partial receives**: TCP có thể gửi dữ liệu theo chunks, cần ghép lại
- **Thread per client**: Mỗi client được xử lý bởi một thread riêng

### 4. Broadcast tin nhắn

```cpp
void broadcastMessage(const std::string& message, int senderSocket) {
    std::string fullMessage = message + "\n";
    
    std::lock_guard<std::mutex> lock(clientsMutex);
    for (int clientSocket : clientSockets) {
        if (clientSocket != senderSocket) {
            send(clientSocket, fullMessage.c_str(), fullMessage.length(), 0);
        }
    }
}
```

## JNI Integration: Kết nối C++ với Java

### 1. Callback từ C++ lên Java

```cpp
void notifyMessageReceived(const std::string& message) {
    JNIEnv* env;
    
    // Attach thread hiện tại với JVM
    if (jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) return;
    
    // Tạo Java String từ C++ string
    jstring jMessage = env->NewStringUTF(message.c_str());
    
    // Gọi method Java
    env->CallVoidMethod(callbackObject, onMessageReceivedMethod, jMessage);
    
    // Cleanup
    env->DeleteLocalRef(jMessage);
    jvm->DetachCurrentThread();
}
```

**Lưu ý quan trọng:**
- Luôn phải `AttachCurrentThread` khi gọi JNI từ native thread
- Phải `DetachCurrentThread` sau khi sử dụng
- Cleanup các local references để tránh memory leak

### 2. Threading Model

```
Main Thread (Java)
├── UI Operations
├── JNI Calls
│
Native Threads (C++)
├── Server Thread (accept connections)
├── Client Thread 1 (handle client 1)
├── Client Thread 2 (handle client 2)
└── Client Thread N (handle client N)
```

## Error Handling và Best Practices

### 1. Network Error Handling

```cpp
// Kiểm tra socket creation
if (serverSocket < 0) {
    LOGE("Socket creation failed: %s", strerror(errno));
    return false;
}

// Kiểm tra bind
if (bind(serverSocket, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
    LOGE("Bind failed: %s", strerror(errno));
    close(serverSocket);
    return false;
}
```

### 2. Memory Management

```cpp
// RAII pattern
class SocketWrapper {
    int socket_;
public:
    SocketWrapper(int socket) : socket_(socket) {}
    ~SocketWrapper() { 
        if (socket_ >= 0) close(socket_); 
    }
    int get() const { return socket_; }
};
```

### 3. Thread Safety

```cpp
class ThreadSafeClientList {
    std::vector<int> clients_;
    std::mutex mutex_;
    
public:
    void addClient(int socket) {
        std::lock_guard<std::mutex> lock(mutex_);
        clients_.push_back(socket);
    }
    
    void removeClient(int socket) {
        std::lock_guard<std::mutex> lock(mutex_);
        clients_.erase(std::remove(clients_.begin(), clients_.end(), socket),
                      clients_.end());
    }
};
```

## Performance Optimization

### 1. Connection Pooling
Thay vì tạo/đóng kết nối liên tục, maintain một pool các kết nối sẵn sàng.

### 2. Message Buffering
```cpp
class MessageBuffer {
    std::queue<std::string> messages_;
    std::mutex mutex_;
    
public:
    void addMessage(const std::string& msg) {
        std::lock_guard<std::mutex> lock(mutex_);
        messages_.push(msg);
        
        // Batch send khi đủ messages hoặc timeout
        if (messages_.size() >= BATCH_SIZE) {
            flushMessages();
        }
    }
};
```

### 3. Non-blocking I/O với epoll (Linux)
```cpp
int epfd = epoll_create1(0);
struct epoll_event event, events[MAX_EVENTS];

// Add server socket to epoll
event.events = EPOLLIN;
event.data.fd = serverSocket;
epoll_ctl(epfd, EPOLL_CTL_ADD, serverSocket, &event);

while (true) {
    int nfds = epoll_wait(epfd, events, MAX_EVENTS, -1);
    
    for (int i = 0; i < nfds; ++i) {
        if (events[i].data.fd == serverSocket) {
            // Accept new connection
        } else {
            // Handle client data
        }
    }
}
```

## Testing và Debugging

### 1. Local Testing
```bash
# Terminal 1: Start server
adb shell am start -n io.github.tuanha1305/.MainActivity

# Terminal 2: Monitor logs
adb logcat | grep ChatSocketJNI
```

### 2. Network Debugging
```cpp
// Add detailed logging
#define NETWORK_DEBUG 1

#if NETWORK_DEBUG
    LOGI("Sending message: %s (length: %d)", message.c_str(), message.length());
    LOGI("Bytes sent: %d", bytesSent);
#endif
```

### 3. Memory Leak Detection
```cpp
// Valgrind for native code
valgrind --tool=memcheck --leak-check=full ./your_app

// AddressSanitizer
// Add to CMakeLists.txt:
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address")
```

## Kết luận

Xây dựng ứng dụng chat socket với C++ JNI trên Android là một challenge thú vị, giúp bạn hiểu sâu về:

1. **Network Programming**: TCP/IP, socket API
2. **Systems Programming**: Threading, synchronization
3. **Mobile Development**: Android NDK, JNI
4. **Performance**: Memory management, optimization

**Key takeaways:**
- `TCP` cho `reliability`, `UDP` cho `speed`
- Proper error handling và resource management
- `Thread safety` là `must-have`
- `JNI bridge` cần careful memory management

**Next steps để improve:**
- Support file transfer
- Implement reconnection logic
- Add encryption (TLS/SSL)

Hy vọng bài viết này giúp các bạn hiểu rõ hơn về socket programming và cách áp dụng vào thực tế. Chúc các bạn coding vui vẻ! 🚀

---

**#ndk #android #android-ndk #chat #socket #tcp #udp**