# 🏛️ AI Jury Agent - Hackathon PPT Screening System

An AI-powered automated jury system for hackathon first-round screening. It evaluates PPT submissions using Google Gemini AI, ranks teams, and sends email notifications to shortlisted participants.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat&logo=google&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat&logo=n8n&logoColor=white)

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 📊 **AI Evaluation** | Analyzes PPT content using Google Gemini AI |
| 🏆 **Smart Scoring** | Scores on 5 criteria: Idea, Solution Relevance, Novelty, Feasibility, Innovation |
| 📋 **Google Sheets Integration** | Automatically reads submissions from Google Forms |
| 📁 **Drive Link Support** | Handles Google Drive PPT links |
| 🏅 **Auto-Ranking** | Ranks all teams by score, pick Top N |
| 📧 **Email Notifications** | Sends beautiful HTML emails to shortlisted/rejected teams |
| 🔄 **n8n Workflow** | Full n8n workflow for end-to-end automation |
| 💎 **Premium Dashboard** | Beautiful dark-themed web dashboard |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Google Forms    │────>│ Google Sheets │────>│  AI Jury Agent  │
│  (Submissions)   │     │  (Data Store)  │     │  (Node.js API)  │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │                  │
                                    ┌─────────▼──────┐  ┌───────▼────────┐
                                    │  Gemini AI      │  │  Web Dashboard  │
                                    │  (PPT Analysis)  │  │  (Management)   │
                                    └─────────┬──────┘  └───────┬────────┘
                                              │                  │
                                    ┌─────────▼──────────────────▼────────┐
                                    │       Scoring & Ranking Engine       │
                                    └─────────────────┬───────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Email Service   │
                                              │  (Gmail SMTP)    │
                                              └─────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │                    n8n Orchestration                      │
    │  Webhook → Sheets → Extract → AI Eval → Rank → Email    │
    └──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ installed
- **Google Gemini API Key** ([Get it here](https://aistudio.google.com/apikey))
- **Gmail Account** with App Password enabled
- **Google Cloud Service Account** (for Sheets API)
- **n8n** (optional, for workflow automation)

### Step 1: Install Dependencies

```bash
cd "ai jur agent"
npm install
```

### Step 2: Configure Environment

```bash
# Copy the example env file
copy .env.example .env

# Edit .env with your credentials
notepad .env
```

Fill in these required values in `.env`:

| Variable | Description | How to Get |
|----------|-------------|------------|
| `GEMINI_API_KEY` | Google Gemini API key | [AI Studio](https://aistudio.google.com/apikey) |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from Google Form responses | From the Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to service account JSON | [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) |
| `EMAIL_USER` | Gmail address for sending emails | Your Gmail |
| `EMAIL_APP_PASSWORD` | Gmail App Password | [App Passwords](https://myaccount.google.com/apppasswords) |
| `HACKATHON_NAME` | Name of your hackathon | e.g., "TechHack 2026" |
| `HACKATHON_THEME` | Theme for evaluation context | e.g., "AI for Social Good" |

### Step 3: Set Up Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API** and **Google Drive API**
4. Go to **IAM & Admin > Service Accounts**
5. Create a service account and download the JSON key
6. Save as `credentials.json` in the project root
7. **Share your Google Sheet** with the service account email

### Step 4: Set Up Google Form

Create a Google Form with these fields (names can vary):
- Team Name
- Email
- Team Members
- Project Title
- PPT Link (Google Drive link)
- Project Description / Abstract

The form responses will automatically go to a Google Sheet.

### Step 5: Run the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📖 Usage Guide

### Using the Web Dashboard

1. **Dashboard Tab** - View overall statistics and system status
2. **Submissions Tab** - Load submissions from Google Sheets or add manually
3. **Evaluate Tab** - Run AI evaluation on all submissions
4. **Results Tab** - View ranked results, export to CSV
5. **Shortlist Tab** - Select top N teams and send emails

### Quick Demo (Without Google Sheets)

1. Open the dashboard at `http://localhost:3000`
2. Go to **Submissions** tab
3. Click **"Load Sample Data"** to load 12 sample submissions
4. Go to **Evaluate** tab
5. Click **"Evaluate All Submissions"**
6. Watch the AI analyze each submission in real-time!
7. Go to **Results** to see rankings
8. Go to **Shortlist** to select top teams

### Using n8n Workflow

1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Open n8n at `http://localhost:5678`
4. Import the workflow: **Menu > Import from File > Select `n8n-workflow.json`**
5. Configure credentials (Google Sheets, Gmail)
6. Set environment variables in n8n
7. Activate the workflow

---

## 📊 Evaluation Criteria

Each submission is scored on 5 criteria (1-10 each):

| Criteria | Weight | Description |
|----------|--------|-------------|
| 💡 **Idea** | 20% | Novelty and creativity of the concept |
| 🎯 **Solution Relevance** | 20% | How well it addresses the theme |
| ✨ **Novelty** | 20% | Uniqueness compared to existing solutions |
| ⚙️ **Feasibility** | 20% | How practical and implementable it is |
| 🚀 **Innovation** | 20% | Innovation in technical approach |

**Total Score:** Sum of all criteria (out of 50)
**Normalized Score:** Total / 5 (out of 10)

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/config` | Get system configuration |
| `GET` | `/api/submissions` | Fetch from Google Sheets |
| `POST` | `/api/submissions/manual` | Add manual submissions |
| `POST` | `/api/analyze` | Analyze single submission |
| `POST` | `/api/analyze/batch` | Batch analyze submissions |
| `GET` | `/api/evaluations` | Get all evaluations |
| `GET` | `/api/evaluations/top/:n` | Get top N teams |
| `POST` | `/api/email/shortlist` | Send shortlist emails |
| `POST` | `/api/email/rejection` | Send rejection emails |
| `DELETE` | `/api/evaluations` | Clear all evaluations |
| `POST` | `/api/webhook/n8n` | n8n webhook endpoint |

---

## 📁 Project Structure

```
ai-jury-agent/
├── server.js              # Main Express server with all API routes
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variables template
├── .env                   # Your actual configuration (create this)
├── credentials.json       # Google service account key (add this)
├── n8n-workflow.json      # n8n workflow for import
├── README.md              # This file
└── public/
    ├── index.html         # Dashboard HTML
    ├── styles.css         # Premium dark theme CSS
    └── app.js             # Frontend application logic
```

---

## 🛡️ Security Notes

- Never commit `.env` or `credentials.json` to version control
- Use Gmail App Passwords instead of your actual password
- The service account should have minimal necessary permissions
- Consider rate limiting in production

---

## 🎨 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | Backend API server |
| **Google Gemini AI** | PPT content analysis and scoring |
| **Google Sheets API** | Reading form responses |
| **Nodemailer + Gmail** | Sending email notifications |
| **Vanilla JS + CSS** | Premium dark-themed dashboard |
| **n8n** | Workflow automation orchestration |

---

## 📝 License

MIT License - Feel free to use and modify for your hackathons!

---

Built with ❤️ for hackathon organizers everywhere.
