# 🤖 Airi - AI Desktop Agent

**Airi** is an advanced AI Desktop Agent that seamlessly automates your PC to handle repetitive tasks, office work, and complex workflows. Control your computer through intuitive voice and text commands with a highly customizable and personalized AI agent optimized for fast performance on decent laptops.

## ✨ Features

- **Voice & Text Commands**: Control your PC using natural language via voice or text input
- **Task Automation**: Automate repetitive office tasks and workflows automatically
- **AI-Powered Agent**: Advanced AI agent with computer use capabilities
- **Customizable & Personalized**: Tailor the agent to your specific workflow and preferences
- **Desktop Integration**: Built with Electron for seamless desktop application experience
- **Fast Performance**: Optimized to run efficiently on standard laptops
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Real-time Streaming**: Leverages AI SDK for real-time response streaming

## 📋 Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Usually comes with Node.js
- **Git** - [Download](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/varshney-ansh/airi.git
cd airi
```

### 2. Install Dependencies

```bash
npm install
```

```bash
winget install llama.cpp
llama-server -hf LiquidAI/LFM2.5-1.2B-Instruct-GGUF:Q4_K_M
```

#### create virtual environment for python
```bash 
python -m venv .venv
.venv/Scripts/activate.bat
pip install -r requirements.txt
playwright install chromium
```

### 3. Run Development Server

```bash
.venv/Scripts/activate.bat
npm run dev
```

This will start both the Next.js dev server and Electron application concurrently. The application will open automatically on `http://localhost:3000`.

### 4. Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
airi/
├── electron/                 # Electron main process configuration
│   ├── main.js              # Electron main entry point
│   └── preload.js           # Preload scripts for IPC
├── agent-server/            # Includes agent backend server files
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── globals.css      # Global styles
│   │   ├── layout.js        # Root layout component
│   │   └── page.jsx         # Home page
│   ├── components/          # React components
│   │   ├── ai-elements/     # AI-specific UI components
│   │   ├── ui/              # Reusable UI components
│   │   └── nav-*.jsx        # Navigation components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions
├── public/                  # Static assets
├── package.json             # Project dependencies
├── next.config.mjs          # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── jsconfig.json            # JavaScript configuration
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Electron |
| `npm run dev:next` | Start only Next.js dev server |
| `npm run dev:electron` | Start only Electron app |
| `npm run build` | Build Next.js for production |
| `npm start` | Start production Next.js server |

## 🤝 Contributing

We welcome contributions! Here's how to contribute to Airi:

### Fork the Repository

1. Go to [Airi GitHub Repository](https://github.com/varshney-ansh/airi)
2. Click the **Fork** button in the top-right corner
3. This creates a copy of the repository under your GitHub account

```bash
# Fork is done via GitHub UI, then clone your fork:
git clone https://github.com/YOUR-USERNAME/airi.git
cd airi
```

### Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or use the shorthand
git switch -c feature/your-feature-name
```

**Branch naming convention:**
- `feature/description` - for new features
- `bugfix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring

### Make Your Changes

1. Edit the relevant files in the project
2. Test your changes locally:
   ```bash
   npm run dev
   ```
3. Ensure your code follows the project style guidelines

### Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history:

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add new AI component for task automation"

# Or stage and commit specific files
git add src/components/my-component.jsx
git commit -m "feat(components): add speech input handler"
```

**Conventional Commits Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring without adding features or fixing bugs
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Build process, dependencies, or tooling changes
- `ci:` - CI/CD configuration changes

**Examples:**
```bash
# Simple commit
git commit -m "feat: add voice command support"

# With scope
git commit -m "fix(ui): resolve button alignment issue"

# With body and footer
git commit -m "feat(agent): implement task automation

- Add task scheduling
- Implement retry logic
- Add error handling

Closes #123"
```

### Push to Your Fork

```bash
# Push your branch to your fork
git push origin feature/your-feature-name

# For first push with a new branch:
git push -u origin feature/your-feature-name
```

### Create a Pull Request

1. Go to [Airi Repository](https://github.com/varshney-ansh/airi)
2. Click the **Compare & pull request** button (appears after you push)
3. Or go to **Pull Requests** tab → **New Pull Request**
4. Select your branch and click **Create Pull Request**
5. Fill in the PR template with:
   - **Title**: Brief description of changes
   - **Description**: Detailed explanation of what changed and why
   - **Related Issues**: Link any related issues (e.g., `Fixes #123`)
   - **Testing**: Explain how you tested the changes

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Code refactoring

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing Done
Explain what you tested and how.

## Screenshots/Videos (if applicable)
Add any relevant screenshots or videos.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have tested my changes locally
- [ ] My changes don't break existing functionality
```

### Review Process

1. A maintainer will review your PR
2. You may receive feedback or change requests
3. Make requested changes and push them to the same branch
4. Once approved, your PR will be merged!

## 🔄 Keep Your Fork Updated

As the main repository receives updates, keep your fork in sync:

```bash
# Add the original repository as upstream
git remote add upstream https://github.com/varshney-ansh/airi.git

# Fetch updates from upstream
git fetch upstream

# Merge upstream changes into your main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

## 📚 Technology Stack

- **Frontend**: React 19, Next.js 16
- **Desktop**: Electron
- **Styling**: Tailwind CSS, CSS Modules
- **AI Integration**: Vercel AI SDK
- **UI Components**: Radix UI, Lucide Icons, ShadCn UI
- **Code Highlighting**: Shiki
- **Node Graph**: XYFlow
- **Animations**: Framer Motion

## 🐛 Reporting Issues

Found a bug? Want to suggest a feature? Please open an issue:

1. Go to **Issues** tab
2. Click **New Issue**
3. Choose a template (Bug Report or Feature Request)
4. Fill in the details
5. Submit!

## 📝 Code Style Guidelines

- Follow existing code style and patterns in the project
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and reusable
- Write tests for new features when applicable

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Desktop app powered by [Electron](https://www.electronjs.org)
- AI capabilities from [Vercel AI SDK](https://sdk.vercel.ai)
- UI components from [Radix UI, ShadCn](https://www.radix-ui.com, https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev)

## ❓ Need Help?

- 📖 Check existing [Issues](https://github.com/varshney-ansh/airi/issues)
- 💬 Start a [Discussion](https://github.com/varshney-ansh/airi/discussions)
- 📧 Contact the maintainers

---

**Happy contributing! Together, we're building the future of desktop automation.** 🚀
