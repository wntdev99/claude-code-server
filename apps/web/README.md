# Web Application

## Overview

The web application is the frontend interface for the Claude Code Server, built with Next.js 14 using the App Router.

## Responsibilities

- **User Interface**: Provide intuitive UI for task management and monitoring
- **Real-time Updates**: Display live agent logs and status via SSE
- **User Interaction**: Handle user inputs for reviews, dependencies, and questions
- **Settings Management**: Allow users to configure platform settings

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS, shadcn/ui
- **State**: Zustand
- **Styling**: Tailwind CSS

## Key Features

- Task creation and management interface
- Real-time log viewer with SSE streaming
- Phase progress visualization
- Review gate UI for approvals/rejections
- Dependency provision interface
- User question response interface
- Settings configuration page

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Structure

```
apps/web/
├── app/
│   ├── (routes)/          # Page routes
│   └── api/               # API routes (proxied to server)
├── components/            # UI components
├── lib/                   # Client utilities
└── public/                # Static assets
```

## Related Components

- **Server**: `/packages/claude-code-server` - Backend API and agent management
- **Agent Manager**: `/packages/agent-manager` - Agent orchestration
- **Sub-Agent**: `/packages/sub-agent` - Task execution

## Documentation

See `/packages/claude-code-server/CLAUDE.md` for detailed development guide.
