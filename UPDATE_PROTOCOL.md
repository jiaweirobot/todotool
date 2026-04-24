# TodoTool 自动更新协议规范

## 概述

基于 `tauri-plugin-updater` v2，客户端定期向更新服务器查询新版本。服务器返回标准 JSON 响应，客户端据此决定是否下载并安装更新。

---

## 1. 请求格式

### 端点模板
```
GET https://{server}/todotool/{target}/{arch}/{current_version}
```

### 路径参数
| 参数 | 说明 | 示例值 |
|------|------|--------|
| `target` | 操作系统 | `windows`, `linux`, `darwin` |
| `arch` | CPU 架构 | `x86_64`, `aarch64` |
| `current_version` | 客户端当前版本 | `1.0.0` |

### 实际请求示例
```
GET https://update.example.com/todotool/windows/x86_64/1.0.0
```

### 请求头
```
User-Agent: tauri-updater
```

---

## 2. 响应格式

### 有新版本时 — HTTP 200
```json
{
  "version": "1.1.0",
  "notes": "### 新增\n- 支持拖拽排序\n- 新增「薰衣草」主题\n\n### 修复\n- 修复暗色主题下文字对比度不足",
  "pub_date": "2026-05-01T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...(Base64 签名)",
      "url": "https://releases.example.com/todotool/1.1.0/TodoTool_1.1.0_x64-setup.nsis.zip"
    },
    "windows-aarch64": {
      "signature": "...",
      "url": "https://releases.example.com/todotool/1.1.0/TodoTool_1.1.0_arm64-setup.nsis.zip"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://releases.example.com/todotool/1.1.0/TodoTool_1.1.0_amd64.AppImage.tar.gz"
    }
  }
}
```

### 无新版本时 — HTTP 204
无响应体。客户端收到 204 即认为当前已是最新版本。

---

## 3. 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | 是 | 新版本号，遵循 SemVer |
| `notes` | string | 否 | 更新日志，支持 Markdown |
| `pub_date` | string | 否 | 发布时间，ISO 8601 格式 |
| `platforms` | object | 是 | 各平台的安装包信息 |
| `platforms.{key}.url` | string | 是 | 安装包下载地址 |
| `platforms.{key}.signature` | string | 是 | 安装包签名（Ed25519） |

### Platform Key 格式
```
{os}-{arch}
```
有效组合：
- `windows-x86_64`
- `windows-aarch64`
- `linux-x86_64`
- `linux-aarch64`
- `darwin-x86_64`
- `darwin-aarch64`

---

## 4. 签名机制

使用 **Ed25519** 非对称签名确保安装包完整性。

### 生成密钥对
```bash
# 生成公钥 + 私钥（会提示输入密码）
npx tauri signer generate -w ~/.tauri/todotool.key
```

输出：
- 私钥文件: `~/.tauri/todotool.key`（用于构建时签名，**严禁泄露**）
- 公钥: 终端打印的一行 Base64 字符串

### 客户端配置
将公钥填入 `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "<生成的公钥 Base64>",
      "endpoints": ["https://update.example.com/todotool/{{target}}/{{arch}}/{{current_version}}"]
    }
  }
}
```

### 构建签名包
```bash
# 设置环境变量
export TAURI_SIGNING_PRIVATE_KEY="<私钥内容或文件路径>"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<密码>"

# 构建（自动生成 .sig 签名文件）
npx tauri build
```

构建后会在输出目录生成：
- `TodoTool_1.1.0_x64-setup.nsis.zip` — 安装包
- `TodoTool_1.1.0_x64-setup.nsis.zip.sig` — 签名文件

`.sig` 文件的内容就是 JSON 响应中 `signature` 字段的值。

---

## 5. 更新服务器 API 设计

### 最小实现

后台系统需要实现以下接口：

#### 5.1 检查更新（客户端调用）
```
GET /todotool/{target}/{arch}/{current_version}
```
- 比较 `current_version` 与最新版本
- 有更新返回 200 + JSON，无更新返回 204

#### 5.2 上传新版本（管理后台调用）
```
POST /api/releases
Content-Type: multipart/form-data

version=1.1.0
notes=更新日志内容
platform=windows-x86_64
file=@TodoTool_1.1.0_x64-setup.nsis.zip
signature=@TodoTool_1.1.0_x64-setup.nsis.zip.sig
```

#### 5.3 查询版本列表（管理后台调用）
```
GET /api/releases
```
```json
[
  {
    "version": "1.1.0",
    "notes": "...",
    "pub_date": "2026-05-01T12:00:00Z",
    "platforms": ["windows-x86_64", "linux-x86_64"]
  }
]
```

#### 5.4 删除版本（管理后台调用）
```
DELETE /api/releases/1.1.0
```

---

## 6. 数据库表设计（更新后台）

```sql
CREATE TABLE releases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    notes TEXT DEFAULT '',
    pub_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE release_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,          -- 'windows-x86_64', 'linux-x86_64', etc.
    url TEXT NOT NULL,               -- 下载地址
    signature TEXT NOT NULL,         -- .sig 文件内容
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, platform)
);
```

---

## 7. 客户端更新流程

```
┌─────────────┐
│  用户点击    │
│ "检查更新"   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ GET /todotool/   │
│ {target}/{arch}/ │
│ {current_version}│
└──────┬───────────┘
       │
   ┌───┴───┐
   │ 204?  │──── 是 ──→ 显示"已是最新版本"
   └───┬───┘
       │ 否(200)
       ▼
┌──────────────────┐
│ 显示新版本信息    │
│ 版本号 + 更新日志 │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ 下载安装包        │
│ 验证 Ed25519 签名 │
└──────┬───────────┘
       │
   ┌───┴───┐
   │ 验证  │──── 失败 ──→ 提示"更新包验证失败"
   │ 通过? │
   └───┬───┘
       │ 通过
       ▼
┌──────────────────┐
│ 安装并重启应用    │
└──────────────────┘
```

---

## 8. 发布新版本 Checklist

1. 更新 `src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中的 `version`
2. 更新 `package.json` 中的 `version`
3. 更新 `CHANGELOG.md`
4. 设置签名环境变量
5. 运行 `npx tauri build`
6. 将生成的安装包 + `.sig` 文件上传到更新服务器
7. 通过管理 API 创建新版本记录
