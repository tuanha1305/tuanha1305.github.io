---
title: Hướng dẫn Build RTMP module cho Nginx để tạo Service Livestream
tags: rtmp android nginx rtmp-dump
---

# Hướng dẫn Build RTMP module cho Nginx để tạo Service Livestream

## Giới thiệu

RTMP (Real-Time Messaging Protocol) là giao thức được sử dụng rộng rãi để streaming video trực tuyến. Nginx với module RTMP cho phép bạn tạo một server livestream mạnh mẽ và linh hoạt. Bài viết này sẽ hướng dẫn chi tiết cách build và cấu hình nginx với module RTMP để tạo Service Livestream.

## Yêu cầu hệ thống

- Ubuntu/Debian hoặc CentOS/RHEL
- Quyền root hoặc sudo
- Kết nối internet ổn định
- Ít nhất 2GB RAM và 20GB dung lượng ổ cứng

## Cài đặt các dependencies

### Trên Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y build-essential libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev libgd-dev libxml2 libxml2-dev uuid-dev
```

### Trên CentOS/RHEL:

```bash
sudo yum groupinstall -y "Development Tools"
sudo yum install -y pcre-devel zlib-devel openssl-devel gd-devel libxml2-devel libuuid-devel
```

## Download và build nginx với RTMP module

### Bước 1: Tạo thư mục làm việc

```bash
mkdir ~/nginx-rtmp
cd ~/nginx-rtmp
```

### Bước 2: Download nginx và nginx-rtmp-module

```bash
# Download nginx
wget http://nginx.org/download/nginx-1.24.0.tar.gz
tar -xzf nginx-1.24.0.tar.gz

# Download nginx-rtmp-module
wget https://github.com/arut/nginx-rtmp-module/archive/master.zip
unzip master.zip
```

### Bước 3: Build nginx với RTMP module

```bash
cd nginx-1.24.0

# Configure nginx với các module cần thiết
./configure \
    --prefix=/etc/nginx \
    --sbin-path=/usr/sbin/nginx \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log \
    --pid-path=/var/run/nginx.pid \
    --lock-path=/var/run/nginx.lock \
    --http-client-body-temp-path=/var/cache/nginx/client_temp \
    --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
    --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
    --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
    --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
    --with-http_ssl_module \
    --with-http_realip_module \
    --with-http_addition_module \
    --with-http_sub_module \
    --with-http_dav_module \
    --with-http_flv_module \
    --with-http_mp4_module \
    --with-http_gunzip_module \
    --with-http_gzip_static_module \
    --with-http_secure_link_module \
    --with-http_stub_status_module \
    --with-http_auth_request_module \
    --with-threads \
    --with-stream \
    --with-stream_ssl_module \
    --with-http_slice_module \
    --add-module=../nginx-rtmp-module-master

# Compile
make

# Install
sudo make install
```

### Bước 4: Tạo thư mục cache cho nginx

```bash
sudo mkdir -p /var/cache/nginx
sudo mkdir -p /var/cache/nginx/client_temp
sudo mkdir -p /var/cache/nginx/proxy_temp
sudo mkdir -p /var/cache/nginx/fastcgi_temp
sudo mkdir -p /var/cache/nginx/uwsgi_temp
sudo mkdir -p /var/cache/nginx/scgi_temp
```

## Cấu hình nginx với RTMP

### Tạo file cấu hình nginx

```bash
sudo nano /etc/nginx/nginx.conf
```

### Nội dung file cấu hình:

```nginx
worker_processes auto;
events {
    worker_connections 1024;
}

# RTMP configuration
rtmp {
    server {
        listen 1935; # Port RTMP mặc định
        chunk_size 4096;
        
        # Ứng dụng livestream chính
        application live {
            live on;
            
            # Cho phép publish từ bất kỳ đâu
            allow publish all;
            
            # Cho phép play từ bất kỳ đâu
            allow play all;
            
            # Ghi lại stream
            record all;
            record_path /var/recordings;
            record_suffix .flv;
            
            # Chuyển đổi sang HLS
            hls on;
            hls_path /var/hls;
            hls_fragment 3;
            hls_playlist_length 60;
            
            # Chuyển đổi sang DASH
            dash on;
            dash_path /var/dash;
            
            # Callback khi có publisher
            on_publish http://localhost/auth;
            
            # Callback khi ngắt kết nối
            on_done http://localhost/done;
        }
        
        # Ứng dụng playback
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
    
    sendfile        on;
    keepalive_timeout  65;
    
    server {
        listen 80;
        server_name localhost;
        
        # Serve HLS files
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /var;
            expires -1;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
        
        # Serve DASH files
        location /dash {
            root /var;
            expires -1;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
        
        # Statistics
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }
        
        location /stat.xsl {
            root /etc/nginx/html;
        }
        
        # Control interface
        location /control {
            rtmp_control all;
        }
        
        # Authentication endpoint
        location /auth {
            return 200;
        }
        
        # Done callback endpoint
        location /done {
            return 200;
        }
    }
}
```

### Tạo các thư mục cần thiết

```bash
sudo mkdir -p /var/recordings
sudo mkdir -p /var/hls
sudo mkdir -p /var/dash
sudo mkdir -p /etc/nginx/html

# Phân quyền
sudo chown -R nginx:nginx /var/recordings /var/hls /var/dash
sudo chmod -R 755 /var/recordings /var/hls /var/dash
```

## Tạo systemd service

### Tạo file service

```bash
sudo nano /etc/systemd/system/nginx.service
```

### Nội dung file service:

```ini
[Unit]
Description=The nginx HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/var/run/nginx.pid
ExecStartPre=/usr/sbin/nginx -t
ExecStart=/usr/sbin/nginx
ExecReload=/bin/kill -s HUP $MAINPID
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=process
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Kích hoạt service

```bash
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

## Kiểm tra và test

### Kiểm tra nginx đã chạy

```bash
sudo systemctl status nginx
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :1935
```

### Test streaming với OBS Studio

1. Mở OBS Studio
2. Vào Settings > Stream
3. Chọn Service: Custom
4. Server: `rtmp://your-server-ip:1935/live`
5. Stream Key: `test` (hoặc bất kỳ key nào)
6. Nhấn Start Streaming

### Test playback

```bash
# Sử dụng VLC hoặc ffplay
vlc rtmp://your-server-ip:1935/live/test

# Hoặc sử dụng ffplay
ffplay rtmp://your-server-ip:1935/live/test
```

### Xem statistics

Truy cập `http://your-server-ip/stat` để xem thống kê realtime.

## Cấu hình nâng cao

### Bảo mật với authentication

```nginx
# Thêm vào application live
on_publish http://localhost/auth;

# Trong server HTTP
location /auth {
    if ($arg_user != 'your-username') {
        return 403;
    }
    if ($arg_pass != 'your-password') {
        return 403;
    }
    return 200;
}
```

### Chất lượng adaptive streaming

```nginx
application live {
    live on;
    
    # Tạo multiple bitrates
    exec ffmpeg -i rtmp://localhost/live/$name 
        -c:v libx264 -c:a aac -b:v 256k -b:a 32k -vf "scale=480:270" -f flv rtmp://localhost/live/$name_low
        -c:v libx264 -c:a aac -b:v 768k -b:a 96k -vf "scale=854:480" -f flv rtmp://localhost/live/$name_mid
        -c:v libx264 -c:a aac -b:v 1024k -b:a 128k -vf "scale=1280:720" -f flv rtmp://localhost/live/$name_high;
}
```

### Monitoring và logging

```nginx
# Thêm vào rtmp server
access_log /var/log/nginx/rtmp_access.log;

# Custom log format
log_format rtmp_combined '$remote_addr - $remote_user [$time_local] '
                        '"$command" "$app" "$name" "$args" - '
                        '$bytes_sent $request_time "$tcurl" "$pageurl"';
```

## Troubleshooting

### Lỗi thường gặp

1. **Port 1935 bị block**: Kiểm tra firewall
```bash
sudo ufw allow 1935
sudo firewall-cmd --permanent --add-port=1935/tcp
```

2. **Permission denied**: Kiểm tra quyền thư mục
```bash
sudo chown -R nginx:nginx /var/recordings /var/hls /var/dash
```

3. **Module not found**: Kiểm tra việc build
```bash
nginx -V | grep rtmp
```

### Debug

```bash
# Xem log realtime
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/rtmp_access.log

# Test cấu hình
sudo nginx -t
```

## Kết luận

Bài viết đã hướng dẫn chi tiết cách build nginx với module RTMP để tạo service livestream. Với cấu hình này, bạn có thể:

- Nhận stream từ OBS, mobile apps
- Chuyển đổi sang HLS, DASH
- Ghi lại streams
- Monitoring realtime
- Bảo mật với authentication

## Tham khảo

- [nginx-rtmp-module GitHub](https://github.com/arut/nginx-rtmp-module)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [RTMP Specification](https://www.adobe.com/devnet/rtmp.html)

---

*Tags: rtmp, android, nginx, rtmp-dump, livestream, streaming, video*