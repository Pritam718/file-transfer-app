# File Transfer App

**A secure and fast peer-to-peer file transfer application built with Electron
and TypeScript**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-40.4-47848F.svg)](https://www.electronjs.org/)

## ✨ Features

- 🔐 **Secure Authentication** - 6-character connection codes (XXX-XXX format)
  for peer verification
- 🔍 **Auto-Discovery** - Bonjour/mDNS automatic detection of senders on local
  network
- 🚀 **Fast Transfer** - Direct TCP socket connections for high-speed file
  transfer
- 📊 **Real-time Progress** - Live transfer progress with file size and
  percentage
- 📁 **Multi-file Support** - Send multiple files sequentially with
  acknowledgment
- 🔄 **Hot Reload** - Development mode with TypeScript watch and auto-restart
- 💻 **Cross-Platform** - Works on Windows, macOS, and Linux
- 🎨 **Modern UI** - Clean, intuitive interface with drag-and-drop support

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/dev-gopi/file-transfer-app.git
cd file-transfer-app

# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env

# Start development
npm run dev
```

### Development with Multiple Instances

To test sender and receiver on the same machine:

```bash
# Terminal 1 - Sender
INSTANCE_NAME=sender npm run dev

# Terminal 2 - Receiver
INSTANCE_NAME=receiver npm run dev
```

## 📖 How It Works

### Sender Mode

1. Click "Sender Mode"
2. A 6-character connection code is generated (e.g., `ABC-123`)
3. Share the code with the receiver
4. Wait for receiver to connect
5. Select files to send (drag & drop or browse)
6. Click "Send Files"

### Receiver Mode

1. Click "Receiver Mode"
2. App discovers available senders on the network
3. Select a sender from the list
4. Enter the connection code
5. Choose save location
6. Click "Connect"
7. Files are automatically received and saved

## 📦 Available Scripts

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development with hot reload        |
| `npm run build`         | Compile TypeScript to JavaScript         |
| `npm start`             | Build and start application              |
| `npm run clean`         | Remove dist directory                    |
| `npm run type-check`    | Check TypeScript without emitting        |
| `npm test`              | Run all tests                            |
| `npm run test:watch`    | Run tests in watch mode                  |
| `npm run test:coverage` | Run tests with coverage report           |
| `npm run lint`          | Check code quality                       |
| `npm run lint:fix`      | Auto-fix linting issues                  |
| `npm run format`        | Format code with Prettier                |
| `npm run validate`      | Run lint, type-check, and tests          |
| `npm run pack`          | Build unpacked distributable             |
| `npm run dist`          | Build distributable for current platform |
| `npm run dist:win`      | Build for Windows                        |
| `npm run dist:mac`      | Build for macOS                          |
| `npm run dist:linux`    | Build for Linux                          |
| `npm run dist:all`      | Build for all platforms                  |

## 🛠️ Tech Stack

- **Electron 40.4** - Cross-platform desktop framework
- **TypeScript 5.3** - Type-safe development
- **Bonjour-service** - mDNS service discovery
- **TCP Sockets** - Direct peer-to-peer file transfer
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality and formatting
- **electron-builder** - Package and distribute

## 📁 Project Structure

```
src/
├── main/                  # Main process (Electron backend)
│   ├── controllers/       # IPC handlers for renderer communication
│   ├── services/          # Business logic (LocalFileTransferService)
│   ├── lib/               # Utility functions (network, file helpers)
│   ├── interfaces/        # TypeScript type definitions
│   ├── router/            # Preload scripts (secure IPC bridge)
│   ├── types/             # TypeScript type declarations
│   ├── utils/             # Constants, config, logger
│   └── main.ts            # Entry point
├── renderer/              # Renderer process (Frontend)
│   ├── pages/             # HTML pages (index.html)
│   ├── scripts/           # JavaScript (app.js)
│   └── styles/            # CSS stylesheets
└── public/                # Static assets (icons)

tests/                     # Test files
  ├── lib/                 # Library tests
  ├── services/            # Service tests
  └── utils/               # Utility tests
```

## 🔧 Architecture

### Connection Flow

1. **Sender** starts TCP server on random port
2. **Sender** publishes Bonjour service with hostname
3. **Sender** generates secure 6-character connection code
4. **Receiver** discovers services via Bonjour/mDNS
5. **Receiver** connects to sender's IP:Port
6. **Receiver** sends authentication with connection code
7. **Sender** validates code and sends acknowledgment
8. File transfer begins on authenticated channel

### File Transfer Protocol

1. Sender sends `metadata` message (filename, size, file index)
2. Sender streams file data in chunks
3. Sender sends `file-end` delimiter
4. Receiver writes file to disk
5. Receiver sends `file-saved` acknowledgment
6. Sender waits for acknowledgment before sending next file

### Security

- Connection codes not logged or broadcast
- 10-second authentication timeout
- Context isolation enabled in renderer
- No remote code execution

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

Coverage thresholds: 70% for branches, functions, lines, and statements.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
APP_NAME=File Transfer App
PORT=0  # Random port (recommended)
LOG_LEVEL=info
```

### Window Configuration

Default window size: 1200x800 (configurable in `src/main/utils/constants.ts`)

```typescript
export const WINDOW = {
  DEFAULT_WIDTH: 1200,
  DEFAULT_HEIGHT: 800,
  MIN_WIDTH: 900,
  MIN_HEIGHT: 600,
};
```

## 📦 Building Distributables

### All Platforms

```bash
npm run dist:all
```

### Specific Platform

```bash
# Windows (NSIS installer + portable)
npm run dist:win

# macOS (DMG + ZIP)
npm run dist:mac

# Linux (AppImage, deb, rpm, snap)
npm run dist:linux
```

Builds are output to the `release/` directory.

## 🐛 Troubleshooting

### Multiple Reload on File Change

The app now uses `awaitWriteFinish` with 100ms debounce to prevent multiple
reloads during TypeScript compilation.

### Two Instances Conflict

Use `INSTANCE_NAME` environment variable to run multiple instances for testing:

```bash
INSTANCE_NAME=sender npm run dev
INSTANCE_NAME=receiver npm run dev
```

### No Senders Discovered

- Ensure both devices are on the same network
- Check firewall settings allow mDNS/Bonjour
- Verify sender is in "Sender Mode" and waiting

### Authentication Fails

- Verify connection code is entered correctly (format: XXX-XXX)
- Code expires after 10 seconds of inactivity
- Generate a new code if connection fails

## 📝 License

ISC License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Gopinath Bhowmick**

- Email: gopinathbhowmick425@gmail.com
- GitHub: [@dev-gopi](https://github.com/dev-gopi)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

For detailed documentation, refer to inline code comments and TypeScript type

- GitHub: [@dev-gopi](https://github.com/dev-gopi)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

For detailed documentation, refer to inline code comments and TypeScript type
definitions.
