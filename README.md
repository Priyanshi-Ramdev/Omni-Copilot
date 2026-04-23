# 🚀 OMNI Copilot

**OMNI Copilot** is a high-performance, AI-driven task automation ecosystem. It serves as an intelligent bridge between various platforms (Google, Slack, Notion, Zoom, etc.), leveraging state-of-the-art Large Language Models (LLMs) to orchestrate complex workflows and outreach strategies autonomously.

---

## ✨ Key Features

- **🤖 AI Orchestrator**: Powered by Gemini and Groq, managing complex task sequences with intelligent decision-making.
- **🔗 Universal Integrations**: Seamlessly connects with:
  - **Google Workspace**: Drive, Docs, Gmail, Calendar, Forms, Meet.
  - **Productivity**: Notion, Slack, Discord.
  - **Communication**: Zoom, Microsoft Teams.
- **⚡ Real-time Updates**: Socket.io integration for instant status updates and interactive drafting.
- **📊 Interactive Dashboard**: Visualized insights and data tracking using Recharts.
- **🛠️ Extensible Agent Framework**: Modular toolset for web searching (Tavily), email dispatching, and cross-platform automation.

---

## 🏗️ Technical Architecture

The project is divided into two primary modules:

### 1. Backend (`/backend`)
A robust Node.js server handling the heavy lifting of AI processing, tool orchestration, and authentication.
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3`) & MongoDB
- **Communication**: Socket.io for real-time events
- **AI Providers**: Anthropic, Groq, Google Gemini

### 2. Frontend (`/frontend`)
A modern, responsive React application providing a premium user experience for managing automations.
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS with modern aesthetics
- **Routing**: React Router 7
- **Visualization**: Recharts

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd omni-copilot
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory and configure the environment variables (see [Environment Configuration](#environment-configuration)).

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## ⚙️ Environment Configuration

The backend requires several environment variables to function correctly. Create a `backend/.env` file with the following structure:

```env
# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_session_secret

# Database
MONGODB_URI=your_mongodb_uri

# AI API Keys
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key

# OAuth Configurations
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

NOTION_CLIENT_ID=your_notion_id
NOTION_CLIENT_SECRET=your_notion_secret
NOTION_REDIRECT_URI=http://localhost:3001/auth/notion/callback

SLACK_CLIENT_ID=your_slack_id
SLACK_CLIENT_SECRET=your_slack_secret
SLACK_BOT_TOKEN=your_slack_bot_token

ZOOM_CLIENT_ID=your_zoom_id
ZOOM_CLIENT_SECRET=your_zoom_secret
# ... and other third-party services
```

---

## 📦 Project Structure

```text
OMNI-COPILOT/
├── backend/            # Express server & AI logic
│   ├── auth/           # OAuth implementations
│   ├── db/             # Database connection & models
│   ├── tools/          # Integration tools (Slack, Google, etc.)
│   └── server.js       # Main entry point
├── frontend/           # React application
│   ├── src/            # Components, hooks, and views
│   └── public/         # Static assets
└── README.md           # This file
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Built with ❤️ for the future of task automation.*
