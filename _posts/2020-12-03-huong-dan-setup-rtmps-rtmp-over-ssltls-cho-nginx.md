---
title: Hướng dẫn Setup RTMPS - RTMP over SSL/TLS cho Nginx
tags: rtmps ssl tls nginx rtmp security streaming encryption
---

# Hướng dẫn Setup RTMPS - RTMP over SSL/TLS cho Nginx

## Giới thiệu

RTMPS (RTMP over SSL/TLS) là phiên bản bảo mật của giao thức RTMP, sử dụng mã hóa SSL/TLS để bảo vệ dữ liệu streaming. Điều này đặc biệt quan trọng khi streaming nội dung nhạy cảm hoặc khi cần tuân thủ các tiêu chuẩn bảo mật cao. Bài viết này sẽ hướng dẫn chi tiết cách setup RTMPS với nginx.

## Tại sao cần RTMPS?

### Lợi ích của RTMPS:
- **Bảo mật**: Mã hóa end-to-end giữa client và server
- **Chống nghe lén**: Dữ liệu được mã hóa, không thể đọc được khi bị chặn
- **Xác thực server**: Đảm bảo client kết nối đúng server
- **Tuân thủ**: Đáp ứng yêu cầu bảo mật của các tổ chức lớn
- **SEO**: Một số platform ưu tiên HTTPS/RTMPS

### Nhược điểm:
- Tăng CPU usage do mã hóa/giải mã
- Latency cao hơn một chút
- Phức tạp hơn trong việc debug

## Yêu cầu hệ thống

- Nginx đã build với `--with-http_ssl_module` và `nginx-rtmp-module`
- OpenSSL 1.1.1 trở lên
- SSL certificate (Let's Encrypt, commercial, hoặc self-signed)
- Port 443 và 1936 (hoặc port tùy chọn) mở

## Chuẩn bị SSL Certificate

### Option 1: Sử dụng Let's Encrypt (Miễn phí)

```bash
# Cài đặt certbot
sudo apt update
sudo apt install certbot

# Tạo certificate cho domain
sudo certbot certonly --standalone -d yourdomain.com

# Certificate sẽ được lưu tại:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Option 2: Tạo Self-signed Certificate (Test)

```bash
# Tạo thư mục chứa certificate
sudo mkdir -p /etc/nginx/ssl

# Tạo private key
sudo openssl genrsa -out /etc/nginx/ssl/nginx.key 2048

# Tạo certificate request
sudo openssl req -new -key /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.csr

# Tạo self-signed certificate
sudo openssl x509 -req -days 365 -in /etc/nginx/ssl/nginx.csr -signkey /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt

# Tạo combined certificate file
sudo cat /etc/nginx/ssl/nginx.crt /etc/nginx/ssl/nginx.key > /etc/nginx/ssl/nginx.pem
```

### Option 3: Commercial Certificate

```bash
# Tải certificate files từ CA provider
# Thường bao gồm: domain.crt, intermediate.crt, domain.key

# Combine certificates
sudo cat domain.crt intermediate.crt > /etc/nginx/ssl/fullchain.pem
sudo cp domain.key /etc/nginx/ssl/privkey.pem
```

## Cấu hình Nginx với RTMPS

### File cấu hình nginx.conf đầy đủ:

```nginx
worker_processes auto;
events {
    worker_connections 1024;
}

# RTMP configuration with SSL
rtmp {
    server {
        listen 1935; # RTMP không mã hóa
        listen 1936 ssl; # RTMPS với SSL
        
        chunk_size 4096;
        timeout 10s;
        
        # SSL Configuration cho RTMPS
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        
        # SSL Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # RTMPS Application
        application live {
            live on;
            
            # Chỉ cho phép publish qua RTMPS
            allow publish all;
            deny publish all;
            
            # Allow play từ cả RTMP và RTMPS
            allow play all;
            
            # Recording
            record all;
            record_path /var/recordings;
            record_suffix .flv;
            record_unique on;
            
            # HLS output
            hls on;
            hls_path /var/hls;
            hls_fragment 3;
            hls_playlist_length 60;
            hls_continuous on;
            
            # DASH output  
            dash on;
            dash_path /var/dash;
            dash_fragment 3;
            dash_playlist_length 60;
            
            # Authentication callback
            on_publish http://localhost/auth;
            on_publish_done http://localhost/publish_done;
            
            # Play callbacks
            on_play http://localhost/play_auth;
            on_play_done http://localhost/play_done;
            
            # Record callbacks
            on_record_done http://localhost/record_done;
            
            # Exec commands for transcoding
            exec_publish ffmpeg -i rtmp://localhost/live/$name 
                -c:v libx264 -preset medium -b:v 1000k -maxrate 1000k -bufsize 2000k
                -vf scale=1280:720 -c:a aac -b:a 128k -ac 2 -ar 44100
                -f flv rtmp://localhost/hls/$name_720p;
                
            exec_publish ffmpeg -i rtmp://localhost/live/$name
                -c:v libx264 -preset medium -b:v 500k -maxrate 500k -bufsize 1000k  
                -vf scale=854:480 -c:a aac -b:a 96k -ac 2 -ar 44100
                -f flv rtmp://localhost/hls/$name_480p;
        }
        
        # HLS application
        application hls {
            live on;
            hls on;
            hls_path /var/hls;
            hls_fragment 3;
            hls_playlist_length 20;
            
            # Deny direct publishing to HLS app
            deny publish all;
        }
        
        # Playback application cho recorded files
        application playback {
            live on;
            play /var/recordings;
        }
    }
}

# HTTP configuration
http {
    include       mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;
        
        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling on;
        ssl_stapling_verify on;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # HLS files
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /var;
            expires -1;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Headers *;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        }
        
        # DASH files
        location /dash {
            types {
                application/dash+xml mpd;
                video/mp4 mp4;
            }
            root /var;
            expires -1;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
        
        # RTMP Statistics
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
            
            # Basic auth cho statistics
            auth_basic "RTMP Statistics";
            auth_basic_user_file /etc/nginx/.htpasswd;
        }
        
        location /stat.xsl {
            root /etc/nginx/html;
        }
        
        # Control interface
        location /control {
            rtmp_control all;
            
            # Chỉ allow từ localhost
            allow 127.0.0.1;
            deny all;
        }
        
        # Authentication endpoints
        location /auth {
            # Authentication logic
            return 200 "OK";
        }
        
        location /publish_done {
            return 200;
        }
        
        location /play_auth {
            return 200;
        }
        
        location /play_done {
            return 200;
        }
        
        location /record_done {
            return 200;
        }
        
        # Web interface
        location / {
            root /var/www/html;
            index index.html index.htm;
        }
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$host$request_uri;
    }
}
```

## Tạo Web Interface

### Tạo thư mục web

```bash
sudo mkdir -p /var/www/html
```

### Tạo file index.html

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RTMPS Streaming Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .code { background: #f4f4f4; padding: 10px; font-family: monospace; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 RTMPS Streaming Server</h1>
        
        <div class="section">
            <h2>📡 Streaming URLs</h2>
            <p><strong>RTMPS (Secure):</strong></p>
            <div class="code">rtmps://yourdomain.com:1936/live/YOUR_STREAM_KEY</div>
            
            <p><strong>RTMP (Non-secure):</strong></p>
            <div class="code">rtmp://yourdomain.com:1935/live/YOUR_STREAM_KEY</div>
        </div>
        
        <div class="section">
            <h2>📺 Playback URLs</h2>
            <p><strong>HLS:</strong></p>
            <div class="code">https://yourdomain.com/hls/YOUR_STREAM_KEY.m3u8</div>
            
            <p><strong>DASH:</strong></p>
            <div class="code">https://yourdomain.com/dash/YOUR_STREAM_KEY.mpd</div>
        </div>
        
        <div class="section">
            <h2>📊 Statistics</h2>
            <p><a href="/stat" target="_blank">View Server Statistics</a></p>
        </div>
        
        <div class="section">
            <h2>🎥 Test Player</h2>
            <video id="player" controls width="100%" height="400">
                <source src="https://yourdomain.com/hls/test.m3u8" type="application/vnd.apple.mpegurl">
                Your browser does not support the video tag.
            </video>
            
            <script src="https://vjs.zencdn.net/7.18.1/video.min.js"></script>
            <link href="https://vjs.zencdn.net/7.18.1/video-css" rel="stylesheet">
            <script>
                var player = videojs('player', {
                    fluid: true,
                    responsive: true
                });
            </script>
        </div>
    </div>
</body>
</html>
```

## Cấu hình Authentication

### Tạo htpasswd file cho statistics

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

### Advanced Authentication với API

```bash
# Tạo file auth.php
sudo nano /var/www/html/auth.php
```

```php
<?php
// Simple authentication endpoint
header('Content-Type: application/json');

$stream_key = $_POST['name'] ?? $_GET['name'] ?? '';
$publisher_ip = $_SERVER['REMOTE_ADDR'];

// Log the request
error_log("Auth request: Stream={$stream_key}, IP={$publisher_ip}");

// Valid stream keys (trong thực tế nên lưu trong database)
$valid_keys = [
    'test123',
    'demo456',
    'live789'
];

if (in_array($stream_key, $valid_keys)) {
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Authorized']);
} else {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
}
?>
```

## Testing RTMPS

### Test với OBS Studio

1. **Settings > Stream**
   - Service: Custom
   - Server: `rtmps://yourdomain.com:1936/live`
   - Stream Key: `test123`

2. **Settings > Advanced**
   - Enable: "Enforce streaming service encoder settings"

3. **Start Streaming**

### Test với FFmpeg

```bash
# Streaming đến RTMPS
ffmpeg -f v4l2 -i /dev/video0 -f alsa -i default \
    -c:v libx264 -preset medium -b:v 1000k \
    -c:a aac -b:a 128k \
    -f flv rtmps://yourdomain.com:1936/live/test123

# Playback từ RTMPS
ffplay rtmps://yourdomain.com:1936/live/test123

# Playback HLS
ffplay https://yourdomain.com/hls/test123.m3u8
```

### Test với VLC

```bash
# Play RTMPS stream  
vlc rtmps://yourdomain.com:1936/live/test123

# Play HLS stream
vlc https://yourdomain.com/hls/test123.m3u8
```

## Mobile App Integration

### Android với ExoPlayer

```kotlin
// build.gradle
implementation 'com.google.android.exoplayer:exoplayer:2.18.1'

// MainActivity.kt
val player = ExoPlayer.Builder(this).build()
val mediaItem = MediaItem.fromUri("https://yourdomain.com/hls/test123.m3u8")
player.setMediaItem(mediaItem)
player.prepare()
player.play()
```

### iOS với AVPlayer

```swift
import AVKit

let url = URL(string: "https://yourdomain.com/hls/test123.m3u8")!
let player = AVPlayer(url: url)
let playerViewController = AVPlayerViewController()
playerViewController.player = player
present(playerViewController, animated: true) {
    player.play()
}
```

## Monitoring và Logging

### Log Analysis

```bash
# Monitor RTMP connections
sudo tail -f /var/log/nginx/error.log | grep rtmp

# Monitor SSL handshakes  
sudo tail -f /var/log/nginx/error.log | grep SSL

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout | grep "Not After"
```

### Performance Monitoring

```bash
# Monitor nginx processes
htop

# Monitor network connections
sudo netstat -tlnp | grep nginx

# Monitor SSL performance
openssl s_client -connect yourdomain.com:1936 -servername yourdomain.com
```

## Security Best Practices

### Firewall Configuration

```bash
# UFW rules
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  
sudo ufw allow 1936/tcp
sudo ufw deny 1935/tcp  # Block non-secure RTMP

# iptables rules
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 1936 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 1935 -j DROP
```

### Rate Limiting

```nginx
# Thêm vào http block
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Thêm vào location /auth
limit_req zone=api burst=5 nodelay;
```

### IP Whitelisting

```nginx
# Chỉ cho phép từ specific IPs
location /control {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    rtmp_control all;
}
```

## Troubleshooting

### Common SSL Issues

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:1936

# Check certificate chain
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Test RTMPS connectivity
ffmpeg -f lavfi -i testsrc=duration=10:size=320x240:rate=30 \
    -f flv rtmps://yourdomain.com:1936/live/test
```

### Performance Issues

```bash
# Check CPU usage
top -p $(pgrep nginx)

# Monitor memory usage
ps aux | grep nginx

# Check SSL overhead
sar -u 1 10  # During streaming
```

### Debug Logs

```nginx
# Thêm vào nginx.conf để debug
error_log /var/log/nginx/debug.log debug;

# RTMP debug
rtmp {
    access_log /var/log/nginx/rtmp.log;
}
```

## Auto-renewal Certificate

### Setup Cron cho Let's Encrypt

```bash
# Tạo script renewal
sudo nano /etc/cron.monthly/renew-ssl

#!/bin/bash
certbot renew --quiet
systemctl reload nginx

# Phân quyền executable
sudo chmod +x /etc/cron.monthly/renew-ssl
```

## Kết luận

RTMPS cung cấp lớp bảo mật quan trọng cho streaming applications, đặc biệt phù hợp cho:

- **Enterprise streaming**: Nội dung nhạy cảm, meetings
- **Education**: Online learning platforms  
- **Healthcare**: Telemedicine applications
- **Finance**: Secure communications

Setup RTMPS đòi hỏi cấu hình phức tạp hơn RTMP thông thường, nhưng benefits về security rất đáng giá. Với hướng dẫn này, bạn có thể deploy một streaming server an toàn và robust.

## Tham khảo

- [nginx-rtmp-module SSL Documentation](https://github.com/arut/nginx-rtmp-module/wiki/SSL)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [OpenSSL Configuration](https://www.openssl.org/docs/)
- [RTMP Specification](https://www.adobe.com/devnet/rtmp.html)

---

*Tags: rtmps, ssl, tls, nginx, rtmp, security, streaming, encryption*