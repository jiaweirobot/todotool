# TodoTool

A beautiful cross-platform todo list application built with Tauri 2 + React + Ant Design.

## Features

- Create, edit, delete todos with urgency levels
- Filter by status (pending / completed) and search
- Multiple themes with custom color schemes
- System tray with show/hide toggle (desktop)
- Window opacity control and always-on-top (desktop)
- Auto-update support (desktop)
- SQLite local storage

## Download

Get the latest release for your platform:

**[Download Latest Release](https://github.com/jiaweirobot/todotool/releases/latest)**

| Platform | Format |
|----------|--------|
| Windows  | [NSIS Installer (.exe)](https://github.com/jiaweirobot/todotool/releases/latest) / [MSI](https://github.com/jiaweirobot/todotool/releases/latest) |
| Linux    | [.deb](https://github.com/jiaweirobot/todotool/releases/latest) / [.AppImage](https://github.com/jiaweirobot/todotool/releases/latest) / [.rpm](https://github.com/jiaweirobot/todotool/releases/latest) |
| macOS    | [.dmg](https://github.com/jiaweirobot/todotool/releases/latest) |

## Tech Stack

- **Frontend:** React 18 + TypeScript + Ant Design 5
- **Backend:** Rust + Tauri 2
- **Database:** SQLite (rusqlite)
- **Build:** Vite 5

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build desktop app
cargo tauri build --features updater
```

## License

MIT
