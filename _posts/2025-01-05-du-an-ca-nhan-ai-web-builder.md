---
title: Dự án cá nhân - AI Web Builder - Vibe Coding
categories: [project]
cover: "/assets/vibe-coding.png"
---

# **AI Web Builder – Vibe Coding**

## **1. Tổng quan**

**AI Web Builder – Vibe Coding** là dự án cá nhân nhằm xây dựng một nền tảng AI giúp người dùng tạo website hoàn chỉnh **chỉ bằng mô tả**, hoặc **clone từ URL có sẵn**, sau đó AI tự động:

- Phân tích website hoặc yêu cầu người dùng  
- Trích xuất nội dung, phong cách, cấu trúc  
- Sinh mã nguồn React/Vite/Tailwind đầy đủ  
- Tự động tạo **sandbox môi trường chạy thực tế**  
- Cập nhật mã theo thời gian thực qua **streaming**  
- Áp dụng code vào sandbox, tự refresh preview  
- Ghi nhớ ngữ cảnh, hiểu intent và cho phép chỉnh sửa liên tục  

Toàn bộ hệ thống được thiết kế theo hướng **multi-agent**, kết hợp:

- **Analyze Intent Agent**
- **Builder Agent (Code Generator)**
- **Code Applier Engine**
- **Sandbox Manager (E2B Sandbox hoặc Sandpack)**
- **Conversation Memory + Project Context**

Đây là phiên bản “Vibe” vì ngoài clone web, hệ thống có thể:

- Trích xuất **Brand Guidelines từ URL**  
- Áp dụng phong cách vào component mới  
- Tạo các page/design theo vibe của brand  

---

## **2. User Flow (Luồng hoạt động)**

### **2.1 Luồng chính: Nhập Promot → Analyze Intent → Tasks → Generate → Apply → Preview**

