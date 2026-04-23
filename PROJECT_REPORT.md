# Synapse Studio - Detailed Project Report

**Project Name:** Synapse Studio  
**Version:** 1.0.0  
**License:** MIT  
**Date:** March 27, 2026

---

## 📋 Executive Summary

**Synapse Studio** is a next-generation, AI-driven website builder designed for rapid frontend development. It leverages Google's Gemini 1.5 Pro AI model to generate production-ready React code from natural language descriptions. The platform provides an interactive workspace with real-time AI chat, live preview, code editor, and a visual design canvas, enabling developers to build sophisticated UIs in minutes rather than hours.

### Key Differentiators
- **Gemini 1.5 Pro Integration**: Advanced AI code generation with architectural guidance
- **Production-Ready Code**: Clean, modular React components with TailwindCSS styling
- **Integrated Development Environment**: Chat, code editor, live preview, and visual design all-in-one
- **Enterprise-Grade SaaS UI**: Dark/light mode with smooth animations
- **Zero-Config Deployment**: File-based storage for simplified deployment

---

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                     │
│         (Vite + TailwindCSS + Framer Motion)               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Pages: Home, Auth, Dashboard, Workspace, Design      │ │
│  │ Components: UI, Workspace, Design Editor             │ │
│  │ Hooks: useToast, useMobile                           │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
                    (API + WebSocket)
                             │
┌────────────────────────────▼────────────────────────────────┐
│            Backend (Express.js + Node.js)                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Routes: Auth, Chat, Dashboard, Projects, Admin      │ │
│  │ Services: Gemini AI, Terminal, Storage, Supabase    │ │
│  │ Middleware: Authentication, Logging, Validation     │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      ┌──────▼───┐   ┌──────▼────┐  ┌────▼─────┐
      │ JSON     │   │ Gemini    │  │ Supabase │
      │ Storage  │   │ API       │  │ (Opt.)   │
      └──────────┘   └───────────┘  └──────────┘
```

---

## 📂 Project Structure

### Root Directory Files
- **package.json**: Project dependencies, scripts, and metadata
- **tsconfig.json**: TypeScript configuration with path aliases
- **vite.config.ts**: Vite build configuration with React support
- **vitest.config.ts**: Unit testing configuration
- **drizzle.config.ts**: Database ORM configuration (PostgreSQL)
- **postcss.config.js**: CSS post-processing configuration
- **.env**: Environment variables (API keys, secrets)

### Key Directories

#### `/client` - Frontend Application
```
client/
├── public/              # Static assets and favicon
├── src/
│   ├── main.tsx        # React 19 entry point
│   ├── App.tsx         # Root component with routing
│   ├── index.css       # Global styles
│   ├── components/
│   │   ├── design/     # Visual design editor components
│   │   │   └── DesignEditor.tsx
│   │   ├── home/       # Landing page components
│   │   │   ├── Features.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── Pricing.tsx
│   │   │   └── Workspace.tsx
│   │   ├── layout/     # Shared layout components
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/         # shadcn/ui component library (30+ components)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── [24+ more components]
│   │   └── workspace/  # Core building interface
│   │       ├── AIChatPanel.tsx
│   │       ├── EditorPanel.tsx
│   │       ├── FileExplorer.tsx
│   │       ├── TerminalPanel.tsx
│   │       ├── PanelErrorBoundary.tsx
│   │       └── [other workspace components]
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── queryClient.ts    # TanStack Query configuration
│   │   └── utils.ts          # Utility functions
│   └── pages/
│       ├── home.tsx
│       ├── auth.tsx
│       ├── dashboard.tsx
│       ├── design.tsx
│       ├── workspace.tsx
│       ├── admin.tsx
│       ├── welcome.tsx
│       └── not-found.tsx
└── index.html           # HTML entry point
```

#### `/server` - Backend API Server
```
server/
├── index.ts            # Express app initialization
├── routes.ts           # API route definitions
├── routes.test.ts      # Route tests
├── adminRoutes.ts      # Admin-only routes
├── adminAuth.ts        # Admin authentication logic
├── gemini.ts           # Gemini AI integration
├── aiGateway.ts        # AI provider failover logic
├── storage.ts          # JSON-based data persistence
├── terminal.ts         # WebSocket terminal sessions
├── supabase.ts         # Supabase integration (optional)
├── fileSessionStore.ts # Session management
├── vite.ts             # Vite development server
├── static.ts           # Static file serving
└── sql/
    └── credit_purchases.sql
```

#### `/shared` - Shared Code
```
shared/
└── schema.ts           # Zod schemas, database types, TS types
```

#### `/data` - Data Storage
```
data/
├── users.json          # User accounts and credentials
└── sessions.json       # Active session data
```

#### `/script` - Build Scripts
```
script/
└── build.ts            # Custom build script
```

#### `/attached_assets` - Media Files
```
attached_assets/        # Project images, logos, and media
```

---

## 🛠️ Technology Stack

### Frontend Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 19.2.0 | UI component framework |
| **Build Tool** | Vite | Latest | Fast module bundler |
| **Styling** | Tailwind CSS v4 | 4.1.14 | Utility-first CSS framework |
| **Animations** | Framer Motion | 12.23.24 | Motion library for fluid animations |
| **Code Editor** | Monaco Editor | 4.7.0 | Embedded code editor from VS Code |
| **UI Components** | Radix UI | Latest | Unstyled, accessible components |
| **UI Library** | shadcn/ui | Custom | Pre-built Radix + Tailwind components |
| **Routing** | Wouter | 3.3.5 | Lightweight client-side router |
| **Data Fetching** | TanStack Query | 5.60.5 | Server state management |
| **Form Management** | React Hook Form | 7.66.0 | Efficient form handling |
| **Form Validation** | Zod | 3.25.76 | TypeScript-first schema validation |
| **Markdown Rendering** | React Markdown | 10.1.0 | Convert markdown to React components |
| **Terminal** | xterm.js | 6.0.0 | Terminal emulation in the browser |
| **Charts** | Recharts | 2.15.4 | React charts for data visualization |
| **Date Handling** | date-fns | 3.6.0 | Modern date utility library |
| **Theme Management** | next-themes | 0.4.6 | Dark/light mode switching |
| **Icons** | lucide-react | 0.545.0 | Icon library |
| **Notification** | sonner | 2.0.7 | Toast notification library |
| **Local Storage** | Localforage | 1.10.0 | Offline storage solution |
| **UI Patterns** | Embla Carousel | 8.6.0 | Carousel/slider component |
| **Command Palette** | cmdk | 1.1.1 | Command menu library |

### Backend Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Server** | Express.js | 5.0.1 | HTTP server framework |
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Language** | TypeScript | Latest | Type-safe JavaScript |
| **Process Runner** | tsx | Latest | Run TypeScript directly |
| **AI Integration** | Gemini API | 1.5 Pro | Code generation AI model |
| **Database** | PostgreSQL | Via Drizzle | Relational database |
| **ORM** | Drizzle ORM | 0.39.3 | Type-safe database queries |
| **Database Tools** | drizzle-kit | Latest | Schema management and migrations |
| **Terminal** | node-pty | 1.1.0 | Terminal multiplexing |
| **WebSocket** | ws | 8.18.0 | Real-time communication |
| **Authentication** | Passport.js | 0.7.0 | Authentication middleware |
| **Auth Strategy** | Passport Local | 1.0.0 | Username/password strategy |
| **Session Management** | express-session | 1.18.1 | Server-side sessions |
| **Session Store** | connect-pg-simple | 10.0.0 | PostgreSQL session store |
| **Memory Store** | memorystore | 1.6.7 | In-memory session store |
| **Database Driver** | pg | 8.16.3 | PostgreSQL client |
| **SQLite** | better-sqlite3 | 11.8.1 | Embedded SQL database |
| **Schema Validation** | Zod | 3.25.76 | Runtime type validation |
| **Validation Errors** | zod-validation-error | 3.4.0 | Error formatting |
| **Environment** | dotenv | 17.3.1 | Environment variable management |
| **Supabase** | @supabase/supabase-js | 2.100.1 | Optional backend-as-a-service |

### Testing Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Test Framework** | Vitest | Latest | Fast unit testing |
| **React Testing** | @testing-library/react | 16.3.0 | React component testing |
| **DOM Testing** | @testing-library/jest-dom | 6.8.0 | DOM matchers |
| **User Interaction** | @testing-library/user-event | 14.6.1 | User simulation |

### Development Tools

| Tool | Purpose |
|------|---------|
| **TypeScript** | Type checking and compilation |
| **ESLint** | Code linting (config available) |
| **Prettier** | Code formatting |
| **cross-env** | Cross-platform environment variables |
| **Builtin Vite Plugins** | React Fast Refresh, TailwindCSS, Error Modal |

### Optional Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Managed PostgreSQL and authentication |
| **Google Gemini** | Primary AI code generation |
| **Anthropic Claude** | Failover AI provider |
| **OpenAI GPT** | Failover AI provider |
| **Groq** | Failover AI provider |
| **Perplexity** | Failover AI provider |

---

## ✨ Core Features

### 1. **AI-Powered Code Generation**
- **Integration**: Google Gemini 1.5 Pro for intelligent code generation
- **Capability**: Generate React components from natural language descriptions
- **Output**: Production-ready code with TailwindCSS styling
- **Failover**: Automatic provider switching (Claude, GPT, Groq, Perplexity)
- **Module**: `server/gemini.ts`, `server/aiGateway.ts`

### 2. **Interactive Workspace**
- **AI Chat Panel**: Real-time conversation with AI for code generation and improvements
- **Monaco Code Editor**: Full-featured code editing with syntax highlighting
- **Live Preview**: Instant visual feedback of components
- **File Explorer**: Project file management
- **Terminal Panel**: Integrated terminal with WebSocket support
- **Error Boundary**: Graceful error handling and recovery
- **Modules**: `client/src/components/workspace/*.tsx`

### 3. **Visual Design Editor**
- **Canvas Environment**: Figma-like interface for visual UI creation
- **Layers Panel**: Component hierarchy management
- **Properties Panel**: Design attribute editing
- **Toolbars**: Quick access to design tools
- **Module**: `client/src/components/design/DesignEditor.tsx`

### 4. **Project Management Dashboard**
- **Project History**: Track all generated projects
- **Generation Statistics**: AI usage analytics
- **Profile Management**: User account settings
- **Module**: `client/src/pages/dashboard.tsx`

### 5. **Authentication & Authorization**
- **Local Auth**: Username/password authentication
- **Admin Routes**: Administrative panel
- **Session Management**: Secure session handling with PostgreSQL or in-memory stores
- **Bearer Token**: API authentication
- **Modules**: `server/adminAuth.ts`, `server/adminRoutes.ts`, `server/routes.ts`

### 6. **Theme Management**
- **Dark Mode**: Toggle between light and dark themes
- **Persistent**: Theme preference saved locally
- **System Detection**: Respects OS color scheme preference
- **Component**: `client/src/components/ui/ThemeToggle.tsx`

### 7. **Terminal Integration**
- **WebSocket Terminal**: Real-time terminal sessions via node-pty
- **Authentication**: Secure terminal access
- **xterm.js**: Browser-based terminal emulation
- **Modules**: `server/terminal.ts`

### 8. **Data Persistence**
- **File-Based Storage**: JSON files for zero-config deployment
- **PostgreSQL**: Optional relational database support
- **Session Store**: Express-session integration
- **Modules**: `server/storage.ts`, `server/fileSessionStore.ts`

---

## 🚀 Development & Deployment

### Development Scripts
```bash
npm run dev:client      # Start Vite dev server (port 5000)
npm run dev            # Start Express backend (auto-reloads with tsx)
npm run build          # Custom build script
npm run start          # Start production server
npm run check          # TypeScript type checking
npm run test           # Run Vitest tests once
npm run test:watch    # Watch mode testing
npm run db:push       # Push Drizzle schema changes
```

### Build Process
- **Frontend**: Vite bundles React code → `dist/public/`
- **TypeScript**: Compiled to CommonJS → `dist/index.cjs`
- **Custom Build**: `script/build.ts` orchestrates the entire process

### Environment Configuration
```env
SESSION_SECRET           # Express session encryption key
GEMINI_API_KEY          # Google Gemini API key (primary)
ANTHROPIC_API_KEY       # Claude API key (fallback)
OPENAI_API_KEY          # GPT API key (fallback)
GROQ_API_KEY            # Groq API key (fallback)
PERPLEXITY_API_KEY      # Perplexity API key (fallback)
DATABASE_URL            # PostgreSQL connection string (optional)
NODE_ENV                # development | production
```

### Deployment Strategy
1. **Zero-Config**: Uses file-based storage for immediate deployment
2. **Optional Database**: Upgrade to PostgreSQL via `DATABASE_URL` ENV
3. **Static Serving**: Frontend built into `/dist/public/`
4. **Production Ready**: Minified bundles, optimized assets

---

## 🎯 Key Pages & Routes

### Public Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `pages/home.tsx` | Landing page with features and pricing |
| `/auth` | `pages/auth.tsx` | Login/register authentication |
| `/welcome` | `pages/welcome.tsx` | Onboarding flow |

### Protected Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/dashboard` | `pages/dashboard.tsx` | Project history and analytics |
| `/workspace` | `pages/workspace.tsx` | Main AI development environment |
| `/design` | `pages/design.tsx` | Visual design editor |
| `/admin` | `pages/admin.tsx` | Admin dashboard |

### API Routes
```
GET/POST /api/auth/*         # Authentication endpoints
GET/POST /api/chat/*         # AI chat sessions
GET/POST /api/projects/*     # Project management
GET/POST /api/dashboard/*    # Dashboard data
WS /api/terminal             # WebSocket terminal
POST /api/admin/*            # Admin operations
GET /api/static/*            # Static file serving
```

---

## 🔒 Security Features

### Authentication
- **Passport.js Integration**: Standardized authentication
- **Password Hashing**: Secure password storage
- **Session Tokens**: HTTP-only session cookies
- **Bearer Tokens**: API endpoint protection

### Validation
- **Zod Schemas**: Runtime validation for all inputs
- **Type Safety**: TypeScript compile-time checks
- **Error Handling**: Graceful error messages

### Network Security
- **HTTPS Ready**: Express configured for production TLS
- **CORS**: Configured for cross-origin requests
- **WebSocket Security**: Token-based terminal access

---

## 📊 UI Component Library

The project includes **30+ shadcn/ui components** built on Radix UI and TailwindCSS:

**Form Components**: Input, Textarea, Checkbox, Radio, Select, Toggle, Slider, Calendar, OTP
**Layout Components**: Card, Separator, Scroll Area, Resizable, Sidebar, Sheet, Drawer
**Navigation**: Tabs, Breadcrumb, Pagination, Command, Navigation Menu, Menubar
**Feedback**: Alert, Badge, Progress, Skeleton, Spinner, Toast/Sonner
**Interactive**: Button, Dialog, Dropdown Menu, Popover, Context Menu, Alert Dialog, Hover Card
**Data Display**: Table, Accordion, Collapsible, Item, Empty State, Chart, Carousel

---

## 🧪 Testing Infrastructure

### Test Configuration
- **Framework**: Vitest (lightning-fast unit testing)
- **Integration**: React Testing Library
- **Coverage**: Configuration ready

### Test Files
- `server/routes.test.ts`: API route testing
- `client/src/components/workspace/AIChatPanel.test.tsx`: Component testing

---

## 📈 Scalability & Performance

### Frontend Optimization
- **Vite Code Splitting**: Automatic chunk splitting for faster loads
- **React 19**: Latest optimizations and concurrent rendering
- **CSS Bundling**: TailwindCSS with PurgeCSS for minimal bundle
- **Lazy Loading**: Route-based code splitting
- **Caching**: TanStack Query caching layer

### Backend Optimization
- **Express Middleware**: Efficient request processing
- **Session Caching**: Configurable session stores (memory/database)
- **API Responses**: JSON compression ready
- **WebSocket Scalability**: node-pty for multiple terminals

### Database
- **Drizzle ORM**: Type-safe, efficient queries
- **Connection Pooling**: PostgreSQL connection optimization
- **Migrations**: Version-controlled schema changes

---

## 🎓 Learning Resources

### Frontend Learning
- React 19 fundamentals and hooks
- TailwindCSS utility-first styling
- Framer Motion animation patterns
- Shadcn/ui component patterns
- Monaco Editor integration

### Backend Learning
- Express.js middleware pattern
- Zod schema validation
- Passport authentication strategies
- WebSocket implementations
- Database design with Drizzle

### AI Integration Learning
- Gemini API prompt engineering
- Multi-provider failover patterns
- Streaming response handling
- Token management

---

## 📋 Code Quality Standards

### TypeScript Configuration
- **Target**: ES2020 with strict mode enabled
- **Modules**: ESNext with bundler resolution
- **Paths**: Configured aliases (`@`, `@shared`, `@assets`)
- **Incremental**: Enabled for faster rebuilds

### Development Tooling
- **Type Checking**: `npm run check` validates all code
- **Testing**: Vitest for unit and integration tests
- **Format**: PostCSS/Prettier ready

---

## 🔄 Development Workflow

### Local Development
```bash
# Terminal 1: Start frontend
npm run dev:client    # http://localhost:5000

# Terminal 2: Start backend
npm run dev           # http://localhost:3000 (backend)
```

### Code Organization
- **Modular Components**: Each feature in separate files
- **Shared Schemas**: Centralized type definitions
- **Utility Functions**: Reusable helpers in `/lib`
- **Custom Hooks**: React hooks in `/hooks`

### Git Workflow
- Feature branches for new functionality
- Tests required before merge
- Type checking passes
- Builds without errors

---

## 🚢 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `SESSION_SECRET`
- [ ] Add API keys for Gemini (and failover providers)
- [ ] Set up PostgreSQL database (optional)
- [ ] Configure environment variables
- [ ] Run `npm run build` for production bundles
- [ ] Enable HTTPS/TLS on server
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Review security settings

---

## 📞 Support & Maintenance

### Monitoring Points
- API response times
- AI generation success rates
- Database query performance
- WebSocket connection stability
- User authentication flow
- Storage capacity

### Regular Maintenance
- Update dependencies (`npm update`)
- Security patches (CVE monitoring)
- Database cleanup and optimization
- Log rotation and archival
- Session store cleanup

---

## 📄 License & Attribution

- **License**: MIT
- **React**: BSD License
- **Radix UI**: MIT License
- **shadcn/ui**: MIT License
- **Tailwind CSS**: MIT License
- **Express.js**: MIT License

---

## 🎉 Conclusion

Synapse Studio is a sophisticated, production-ready AI-powered web development platform that combines modern frontend architecture with intelligent code generation. Its modular design, comprehensive UI component library, and robust backend make it suitable for deployment at scale. The project demonstrates best practices in TypeScript, React, and Express.js development while maintaining security, performance, and user experience standards.

---

**Report Generated**: March 27, 2026  
**Project Status**: Active Development
