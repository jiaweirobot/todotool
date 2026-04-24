# TodoTool 打包发布流程

## 一、环境要求

### 必需（所有平台）
| 工具 | 版本 | 安装 |
|------|------|------|
| Rust | stable (1.77+) | `rustup update stable` |
| Node.js | 20+ | `winget install OpenJS.NodeJS.LTS` |
| Tauri CLI | 2.x | `cargo install tauri-cli --version "^2"` |

### Windows 构建
- Visual Studio Build Tools 2022（含 C++ 桌面开发）
- WebView2（Windows 10/11 已预装）

### Linux 构建
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev \
  librsvg2-dev patchelf libgtk-3-dev libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

### macOS 构建
- Xcode Command Line Tools: `xcode-select --install`
- 可选：Apple Developer 证书（用于公证签名）

### Android APK 构建
| 工具 | 安装 |
|------|------|
| JDK 17 | `winget install Oracle.JDK.17` |
| Android Studio | `winget install Google.AndroidStudio` |
| Android SDK | API 34+（通过 Android Studio SDK Manager） |
| Android NDK | 27.x（通过 SDK Manager → SDK Tools → NDK） |

环境变量（Windows）：
```
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
NDK_HOME=%ANDROID_HOME%\ndk\<版本号>
```

---

## 二、版本号管理

发布新版本前，**必须同步更新以下 3 处版本号**：

| 文件 | 字段 | 示例 |
|------|------|------|
| `package.json` | `"version"` | `"1.1.0"` |
| `src-tauri/Cargo.toml` | `version` | `"1.1.0"` |
| `src-tauri/tauri.conf.json` | `"version"` | `"1.1.0"` |

同时更新 `CHANGELOG.md` 添加新版本的变更记录。

---

## 三、签名密钥

自动更新功能需要 Ed25519 签名密钥对。

### 首次生成
```bash
cargo tauri signer generate -w ~/.tauri/todotool.key
```

输出示例：
```
Please enter a password to protect the secret key:
Password:
Deriving a key from the password and target...

Your keypair was generated successfully
Private: /home/user/.tauri/todotool.key
Public: dW50cnVzdGVkIGNvbW...（一行 Base64）

IMPORTANT: your private key password is used to encrypt the private key
and must be stored in a secure location (not in the clear on your machine).
```

### 配置
1. **公钥** → 写入 `src-tauri/tauri.conf.json`:
   ```json
   "plugins": {
     "updater": {
       "pubkey": "<粘贴上面输出的 Public 行>"
     }
   }
   ```
2. **私钥** → 配置为 GitHub Secret:
   - `TAURI_SIGNING_PRIVATE_KEY`：私钥文件内容（`cat ~/.tauri/todotool.key`）
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：生成时设置的密码

---

## 四、本地构建

### Windows（当前平台）
```bash
cargo tauri build
```
产物：
- `src-tauri/target/release/bundle/nsis/TodoTool_x.x.x_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/TodoTool_x.x.x_x64_en-US.msi`

### Linux
```bash
cargo tauri build
```
产物：
- `src-tauri/target/release/bundle/deb/todotool_x.x.x_amd64.deb`
- `src-tauri/target/release/bundle/appimage/todotool_x.x.x_amd64.AppImage`
- `src-tauri/target/release/bundle/rpm/todotool-x.x.x-1.x86_64.rpm`

### Android APK
```bash
# 首次需要初始化（仅一次）
cargo tauri android init

# 构建 APK
cargo tauri android build --apk
```
产物：
- `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`

### 带签名的构建（用于自动更新）
```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/todotool.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="你的密码"
cargo tauri build
```
会额外生成 `.sig` 签名文件。

---

## 五、CI 自动构建（GitHub Actions）

### 触发方式
推送 `v*` 格式的 tag 自动触发，或在 GitHub Actions 页面手动触发。

### 构建矩阵

| 平台 | Runner | 产物 |
|------|--------|------|
| Windows x64 | `windows-latest` | `.exe` (NSIS) + `.msi` |
| Linux x64 | `ubuntu-22.04` | `.deb` + `.AppImage` + `.rpm` |
| macOS arm64 | `macos-latest` | `.dmg` |
| macOS x64 | `macos-latest` | `.dmg` |
| Android | `ubuntu-latest` | `.apk` |

### 前置条件
1. GitHub 仓库中配置 Secrets（见第三节）
2. 代码已推送到 main 分支

---

## 六、发布步骤（完整 Checklist）

### 1. 准备版本
```bash
# 更新 3 处版本号（如 1.0.0 → 1.1.0）
# 编辑 package.json、src-tauri/Cargo.toml、src-tauri/tauri.conf.json

# 更新 CHANGELOG.md
```

### 2. 验证本地构建
```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo tauri build
```

### 3. 提交
```bash
git add -A
git commit -m "release: vX.Y.Z"
git push
```

### 4. 打 Tag 触发 CI
```bash
git tag vX.Y.Z
git push --tags
```

### 5. 等待 CI 完成
在 GitHub → Actions 页面查看构建进度。全部 job 完成后，会自动创建一个 **Draft Release**。

### 6. 发布 Release
1. 进入 GitHub → Releases 页面
2. 找到 Draft 状态的 Release
3. 编辑发布说明（可从 CHANGELOG.md 复制）
4. 检查附件中的安装包是否齐全
5. 点击 **Publish release**

### 7. 更新服务器（可选）
如果配置了自动更新服务器，将安装包 + `.sig` 签名文件上传到更新服务器。

---

## 七、目录结构

构建产物路径一览：
```
src-tauri/target/release/
├── todotool.exe                              # Windows 可执行文件
├── bundle/
│   ├── nsis/TodoTool_1.0.0_x64-setup.exe     # NSIS 安装包
│   ├── nsis/TodoTool_1.0.0_x64-setup.exe.sig # 签名文件
│   ├── msi/TodoTool_1.0.0_x64_en-US.msi      # MSI 安装包
│   ├── deb/todotool_1.0.0_amd64.deb          # Debian/Ubuntu
│   ├── appimage/todotool_1.0.0_amd64.AppImage # AppImage
│   └── rpm/todotool-1.0.0-1.x86_64.rpm       # Fedora/RHEL
└── ...

src-tauri/gen/android/app/build/outputs/apk/  # Android APK
```

---

## 八、常见问题

### Q: Linux 构建报错找不到 webkit2gtk
安装系统依赖：`sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev`

### Q: Android 构建报错 NDK not found
确认 `NDK_HOME` 环境变量指向正确的 NDK 目录。

### Q: macOS DMG 无法打开（Gatekeeper 警告）
未签名的 DMG 会被 Gatekeeper 阻止。用户需右键 → 打开，或配置 Apple Developer 证书进行公证。

### Q: CI 构建时 updater 签名失败
确认 GitHub Secrets 中 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 已正确配置。如果不需要签名，CI 会跳过，构建仍会成功。

### Q: 版本号不一致导致构建失败
检查 `package.json`、`Cargo.toml`、`tauri.conf.json` 三处版本号是否一致。
