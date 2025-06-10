# My Blog

Một theme Jekyll tùy biến cao dành cho trang cá nhân, trang nhóm, blog, dự án, tài liệu, v.v. Dự án này được xây dựng dựa trên Jekyll và được triển khai trên GitHub Pages.

## Tính năng
- Thiết kế đáp ứng : Hiển thị tốt trên mọi thiết bị từ desktop đến mobile
- Nhiều skin : Hỗ trợ nhiều skin khác nhau (default, dark, forest, ocean, chocolate, orange)
- Nhiều theme highlight code : Hỗ trợ nhiều theme highlight code khác nhau
- Tùy biến cao : Dễ dàng tùy chỉnh thông qua file cấu hình
- Hỗ trợ SEO : Tích hợp các thẻ meta và sitemap cho SEO
- Hỗ trợ Markdown nâng cao : Hỗ trợ MathJax, Mermaid, Chart
- Tích hợp comment : Hỗ trợ nhiều hệ thống comment như Disqus, Gitalk, Valine
- Phân tích : Hỗ trợ Google Analytics


## Yêu cầu
- Ruby >= 2.4.0
- RubyGems
- Bundler
- Jekyll
- Git


## Cài đặt
**Cài đặt trực tiếp**
```bash
# Clone repository
git clone https://github.com/tuanha1305/tuanha1305.github.io.git blog
cd blog

# Cài đặt dependencies
bundle install

# Chạy server local
bundle exec jekyll serve
```
**Sử dụng Docker**
```bash
# Build và chạy container
docker build -f Dockerfile.dev -t jekyll-blog .
docker run -it --rm -v "$PWD":/usr/src/app -p 4000:4000 jekyll-blog bundle exec jekyll serve -H 0.0.0.0
```

Sau khi chạy, bạn có thể truy cập blog tại địa chỉ http://localhost:4000

## Cấu hình
Chỉnh sửa file _config.yml để cấu hình blog theo ý muốn:

- `Thông tin cá nhân` : Tên, avatar, bio, thông tin liên hệ
- `Giao diện` : Skin, theme highlight code
- `Tính năng` : Bật/tắt các tính năng như MathJax, Mermaid, Chart
- `Comment` : Cấu hình hệ thống comment
- `Analytics` : Cấu hình Google Analytics


## Viết bài
Để tạo một bài viết mới, tạo file .md trong thư mục `_posts` với định dạng tên `YYYY-MM-DD-title.md` và thêm front matter:
```yaml
---
title: Tiêu đề bài viết
tags: [tag1, tag2]
---

Nội dung bài viết...

<!--more-->

Nội dung chi tiết...
```

## Giấy phép
Dự án được phát hành dưới giấy phép MIT. Xem file LICENSE để biết thêm chi tiết

## Liên hệ
Nếu bạn có bất kỳ câu hỏi hoặc đề xuất nào, vui lòng tạo issue hoặc liên hệ qua email tuanictu97@gmail.com .