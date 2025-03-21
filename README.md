# Cloudflare R2 Images

Cloudflare R2 Images 是一个用于处理和存储图像的服务，支持通过代理获取图像并将其存储到 Cloudflare R2 存储桶中，同时提供缓存和条件请求支持。

## 功能

- **图像存储**：支持将图像存储到 Cloudflare R2 存储桶中。
- **代理请求**：支持通过 URL 代理获取图像并存储。
- **缓存控制**：支持设置缓存头以优化性能。
- **条件请求**：支持 `ETag` 和 `If-None-Match` 头以减少带宽使用。
- **文件哈希**：基于文件内容生成唯一哈希值，用于文件命名。

## 文件结构

```
/workspaces/cloudflare_r2_images
├── _worker.js        # Cloudflare Worker 主逻辑
├── utils/hash.js     # 工具函数，用于生成 SHA-256 哈希
├── README.md         # 项目文档
```

## 安装与运行

1. **克隆项目**：
   ```bash
   git clone https://github.com/your-repo/cloudflare_r2_images.git
   cd cloudflare_r2_images
   ```

2. **配置环境**：
   在 Cloudflare Workers 的环境变量中配置以下内容：
   - `BUCKET`：Cloudflare R2 存储桶实例。

3. **部署到 Cloudflare Workers**：
   使用 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) 部署：
   ```bash
   wrangler publish
   ```

## 使用说明

### 1. 存储图像

通过代理请求存储图像：
```bash
curl -X GET "https://your-worker-url/https://example.com/image.jpg"
```
返回：
```json
{
  "url": "https://your-worker-url/image/<hashed-filename>.jpg"
}
```

### 2. 获取图像

通过以下 URL 获取存储的图像：
```
https://your-worker-url/image/<hashed-filename>.jpg
```

支持缓存和条件请求：
- 添加 `If-None-Match` 头以减少带宽使用。

## 开发与贡献

欢迎贡献代码！请提交 Pull Request 或报告问题。

## 许可证

本项目采用 [MIT License](LICENSE)。