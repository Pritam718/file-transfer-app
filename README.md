# File Transfer App

**A secure and fast file transfer application built with Electron and
TypeScript**

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-40.4-47848F.svg)](https://www.electronjs.org/)

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development
npm run dev
```

## 📦 Available Scripts

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development with hot reload        |
| `npm run build`         | Compile TypeScript to JavaScript         |
| `npm start`             | Build and start application              |
| `npm test`              | Run all tests                            |
| `npm run test:coverage` | Run tests with coverage report           |
| `npm run lint`          | Check code quality                       |
| `npm run lint:fix`      | Auto-fix linting issues                  |
| `npm run format`        | Format code with Prettier                |
| `npm run validate`      | Run lint, type-check, and tests          |
| `npm run dist`          | Build distributable for current platform |
| `npm run dist:win`      | Build for Windows                        |
| `npm run dist:mac`      | Build for macOS                          |
| `npm run dist:linux`    | Build for Linux                          |
| `npm run dist:all`      | Build for all platforms                  |

## 🛠️ Tech Stack

- **Electron 40.4** - Cross-platform desktop framework
- **TypeScript 5.3** - Type-safe development
- **Jest** - Testing framework
- **ESLint + Prettier** - Code quality and formatting

## 📁 Project Structure

```
src/
├── main/              # Main process (Electron backend)
│   ├── controllers/   # IPC handlers
│   ├── services/      # Business logic
│   ├── lib/           # Utility functions
│   ├── interfaces/    # TypeScript interfaces
│   ├── router/        # Preload scripts
│   └── main.ts        # Entry point
├── renderer/          # Renderer process (Frontend)
│   ├── pages/         # HTML pages
│   ├── scripts/       # JavaScript
│   └── styles/        # CSS
├── public/            # Static assets
├── utils/             # Shared utilities
└── types/             # TypeScript definitions

tests/                 # Test files
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Coverage thresholds: 70% for branches, functions, lines, and statements.

## 🔧 Configuration

Environment variables are configured in `.env` file:

- `NODE_ENV` - Environment (development/production)
- `APP_NAME` - Application name
- `PORT` - Default port for file transfer
- `API_URL` - API endpoint (if needed)
- `SECRET_KEY` - Encryption key

See `.env.example` for all available options.

## 📝 License

ISC License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Gopinath Bhowmick**

---

For detailed documentation, troubleshooting, and advanced configuration, refer

---

For detailed documentation, troubleshooting, and advanced configuration, refer
to the inline code comments and TypeScript type definitions.
