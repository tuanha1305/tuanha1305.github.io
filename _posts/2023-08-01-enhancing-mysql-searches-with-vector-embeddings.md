---
title: Nâng cao khả năng tìm kiếm MySQL với Vector Embeddings
tags: vector mysql embeddings semantic-search
---

## Giới thiệu về Vector Embeddings trong MySQL

Vector embeddings là biểu diễn số hóa của dữ liệu (văn bản, hình ảnh...) nắm bắp ý nghĩa ngữ nghĩa trong không gian đa chiều. Mặc dù MySQL không được thiết kế sẵn cho các thao tác vector, bạn vẫn có thể triển khai khả năng tìm kiếm vector để cải thiện các tìm kiếm.

Hãy tưởng tượng việc biến MySQL thành một công cụ tìm kiếm mạnh mẽ có khả năng hiểu được những sắc thái tinh tế của ngôn ngữ con người. Vector embeddings chính là thành phần bí mật giúp thực hiện điều đó.

## Phương pháp truyền thống và hạn chế

### Cách tiếp cận thông thường

Phương pháp truyền thống để lưu trữ vector embeddings trong MySQL thường sử dụng:
- Trường BLOB để lưu trữ dữ liệu vector
- Trường JSON để lưu trữ vector dưới dạng mảng JSON
- Tính toán khoảng cách Euclidean để tìm vector tương tự nhất

```sql
-- Cách thông thường lưu trữ embeddings
CREATE TABLE embeddings_basic (
    id INT PRIMARY KEY,
    vector_data BLOB,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vấn đề của phương pháp brute-force

Phương pháp này có những hạn chế lớn:
- **Hiệu suất kém**: Phải tính toán khoảng cách với tất cả vector trong database
- **Tốn tài nguyên**: CPU và memory tăng tuyến tính theo kích thước dataset
- **Không mở rộng được**: Trở nên chậm chạp với dataset lớn

## Giải pháp mysql_vss: Thay đổi cuộc chơi

### Giới thiệu mysql_vss Plugin

Plugin mysql_vss được phát triển để giải quyết những hạn chế trên bằng cách tích hợp thư viện Annoy (Approximate Nearest Neighbors Oh Yeah) của Spotify vào MySQL. Điều này mang lại:

- **Tìm kiếm nhanh**: Sử dụng thuật toán approximate nearest neighbor
- **Tích hợp native**: Hoạt động trực tiếp trong MySQL
- **Dễ sử dụng**: Tương thích với syntax MySQL hiện có

### Thiết lập Schema cho mysql_vss

```sql
-- Bảng embeddings tối ưu cho mysql_vss
CREATE TABLE IF NOT EXISTS embeddings (
    ID INT PRIMARY KEY,
    vector JSON NOT NULL,
    original_text TEXT NOT NULL,
    annoy_index INT
    -- Các trường khác như foreign keys nếu cần
);

-- Tạo function tìm kiếm vector
CREATE FUNCTION vss_search RETURNS STRING SONAME 'libmysql_vss.so';
```

**Lưu ý quan trọng**: Với phiên bản v0.0.1, Annoy Index được lazy load khi function được gọi lần đầu tiên.

## Triển khai thực tế với mysql_vss

### Ví dụ ứng dụng Python

```python
import mysql.connector
import json
from embedding_util import generate_embeddings

# Cấu hình kết nối database
db_config = {
    "host": "127.0.0.1",
    "user": "mysql", 
    "password": "password1234",
    "database": "wordpress",
    "port": 3306
}

try:
    # Kết nối database
    db_connection = mysql.connector.connect(**db_config)
    cursor = db_connection.cursor()
    
    # Lấy dữ liệu từ bảng posts
    cursor.execute("SELECT ID, post_content FROM wp_posts;")
    records = cursor.fetchall()
    
    # Tạo embeddings cho từng post
    for record in records:
        post_id, post_content = record
        embedding = generate_embeddings(post_content)
        
        # Lưu embedding vào database
        insert_query = """
        INSERT IGNORE INTO embeddings (ID, vector, original_text)
        VALUES (%s, %s, %s);
        """
        cursor.execute(insert_query, (post_id, json.dumps(embedding), post_content))
    
    db_connection.commit()
    
    # Thực hiện tìm kiếm semantic
    query = "Bạn có nội dung nào về sinh vật biển không?"
    query_embedding = generate_embeddings(query)
    query_embedding_str = json.dumps(query_embedding)
    
    # Tìm kiếm với mysql_vss
    search_query = """
    SELECT e.original_text
    FROM embeddings AS e
    WHERE FIND_IN_SET(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) > 0
    ORDER BY FIELD(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) DESC
    """
    
    cursor.execute(search_query, (query_embedding_str, query_embedding_str))
    results = cursor.fetchall()
    
    # Hiển thị kết quả
    print(f"TRUY VẤN: {query}")
    if results:
        for idx, row in enumerate(results):
            print(f"KẾT QUẢ {idx + 1}: {row[0][:200]}...")
    else:
        print("Không tìm thấy kết quả phù hợp.")
        
except mysql.connector.Error as err:
    print("Lỗi:", err)
finally:
    cursor.close()
    db_connection.close()
```

## So sánh hiệu suất

### mysql_vss vs Phương pháp truyền thống

| Tiêu chí | Phương pháp truyền thống | mysql_vss |
|----------|-------------------------|-----------|
| **Tốc độ tìm kiếm** | O(n) - tuyến tính | O(log n) - logarithmic |
| **Sử dụng CPU** | Cao với dataset lớn | Tối ưu |
| **Khả năng mở rộng** | Kém | Tốt |
| **Độ chính xác** | 100% | ~95% (approximate) |

### Lợi ích của mysql_vss

1. **Hiệu suất vượt trội**: Nhanh hơn hàng bậc magnitude so với brute-force
2. **Tích hợp seamless**: Sử dụng syntax MySQL quen thuộc
3. **Real-time search**: Cho phép tìm kiếm thời gian thực trên dataset lớn
4. **Linh hoạt**: Tương thích với mọi model vector embedding

## Ứng dụng thực tế

### 1. E-Commerce nâng cao
```sql
-- Tìm sản phẩm tương tự dựa trên mô tả
SELECT p.product_name, p.description, p.price
FROM products p
JOIN embeddings e ON p.id = e.ID
WHERE FIND_IN_SET(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) > 0
ORDER BY FIELD(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) DESC
LIMIT 10;
```

### 2. Content Recommendation
```sql
-- Gợi ý bài viết liên quan
SELECT a.title, a.content, a.publish_date
FROM articles a
JOIN embeddings e ON a.id = e.ID  
WHERE FIND_IN_SET(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) > 0
AND a.id != %s -- Loại trừ bài hiện tại
LIMIT 5;
```

### 3. Chatbot thông minh
```sql
-- Tìm câu trả lời phù hợp từ knowledge base
SELECT kb.question, kb.answer, kb.category
FROM knowledge_base kb
JOIN embeddings e ON kb.id = e.ID
WHERE FIND_IN_SET(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) > 0
ORDER BY FIELD(e.ID, (SELECT CAST(vss_search(%s) AS CHAR))) DESC
LIMIT 3;
```

## Hạn chế hiện tại và tương lai

### Hạn chế của phiên bản hiện tại

⚠️ **Lưu ý quan trọng**: mysql_vss hiện tại chưa sẵn sàng cho production!

- **Dimensionality cố định**: Chỉ hỗ trợ kích thước vector nhất định
- **Chưa stress test**: Chưa được kiểm tra với dataset siêu lớn  
- **Tính năng hạn chế**: Một số feature advanced chưa có

### Cải tiến trong tương lai

- **Dynamic index reloading**: Cập nhật index không cần restart
- **Flexible dimensionality**: Hỗ trợ nhiều kích thước vector khác nhau
- **Better scaling**: Tối ưu hóa cho dataset lớn hơn
- **Advanced metrics**: Hỗ trợ nhiều phương pháp đo khoảng cách

## Kết luận

mysql_vss đại diện cho một bước tiến quan trọng trong việc đưa khả năng tìm kiếm semantic vào MySQL. Mặc dù vẫn còn một số hạn chế, plugin này mở ra nhiều cơ hội thú vị:

mysql_vss không chỉ là một plugin - đây là cầu nối giữa traditional database và modern AI, mở ra kỷ nguyên mới cho MySQL trong thời đại AI và semantic search.
