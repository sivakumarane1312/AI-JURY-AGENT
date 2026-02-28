# 🏛️ AI Jury Agent

> An AI-powered automated jury system that eliminates bias and inefficiency in hackathon first-round screening by using **LLaMA 3.3 70B** (via NVIDIA NIM) to evaluate, score, and rank PPT submissions — fully automated, from submission to email notification.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![LLaMA 3.3](https://img.shields.io/badge/LLaMA_3.3-76B900?style=flat&logo=nvidia&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat&logo=n8n&logoColor=white)

---

## ❓ Problem Statement

Hackathon organizers face a **massive bottleneck** during the first round of screening:

- **Manual PPT reviews** are time-consuming — reviewing 100+ submissions takes hours or even days
- **Human bias** leads to inconsistent scoring across different jury members
- **No standardized criteria** — every judge evaluates differently
- **Communication delays** — shortlisted teams aren't notified promptly
- **Scalability issues** — the process breaks down as submission count grows

Traditional jury systems rely entirely on human effort, making them **slow, inconsistent, and unscalable**.

---

## 💡 Our Solution

AI Jury Agent automates the **entire first-round screening pipeline**:

```
Google Form Submission → Google Sheets → AI Evaluation → Ranking → Email Notification
```

A single click triggers the AI to read every submission, analyze the PPT content against hackathon-specific criteria, generate detailed feedback with scores, rank all teams, and send personalized emails to both shortlisted and rejected participants.

---

## 🚀 Innovation & Key Features

| Innovation | Description |
|---|---|
| 🤖 **AI-Powered Evaluation** | Uses LLaMA 3.3 70B (via NVIDIA NIM) to deeply analyze PPT content — not just keywords, but understanding ideas, feasibility, and innovation |
| 📊 **Multi-Criteria Scoring** | Evaluates on 5 weighted criteria: Idea Originality, Solution Relevance, Novelty, Feasibility, and Innovation |
| 🔄 **End-to-End Automation** | From Google Form submission to email notification — zero manual intervention using n8n workflow orchestration |
| 📧 **Smart Email System** | Auto-generates personalized HTML emails for shortlisted and rejected teams with detailed feedback |
| 🎯 **Theme-Aware Analysis** | The AI evaluates submissions in the context of the hackathon theme, ensuring relevance-based scoring |
| 💎 **Real-Time Dashboard** | Premium dark-themed web dashboard to monitor evaluations, view rankings, and manage the entire process |
| ⚡ **Dual AI Fallback** | Primary: LLaMA 3.3 70B via NVIDIA NIM (free) — Fallback: Google Gemini for high availability |
| 📋 **Google Sheets Integration** | Seamlessly reads submissions from Google Forms responses without any manual data handling |

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
                                    │  LLaMA 3.3 70B  │  │  Web Dashboard  │
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

## 🎨 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js + Express** | Backend API server |
| **LLaMA 3.3 70B (NVIDIA NIM)** | Primary AI engine for PPT analysis and intelligent scoring |
| **Google Gemini AI** | Fallback AI engine for high availability |
| **Google Sheets API** | Reading form responses as structured data |
| **Google Drive API** | Accessing PPT files from shared Drive links |
| **Nodemailer + Gmail SMTP** | Sending personalized HTML email notifications |
| **Vanilla JS + CSS** | Premium dark-themed interactive dashboard |
| **n8n** | Workflow automation and orchestration |

---

## 📊 Evaluation Criteria

Each submission is scored on **5 criteria** (1–10 each, total out of 50):

| Criteria | What It Measures |
|---|---|
| 💡 **Idea** | Novelty and creativity of the concept |
| 🎯 **Solution Relevance** | Alignment with the hackathon theme |
| ✨ **Novelty** | Uniqueness compared to existing solutions |
| ⚙️ **Feasibility** | Practicality and implementability |
| 🚀 **Innovation** | Technical innovation in the approach |

---

## 🌟 Impact

- ⏱️ **Reduces screening time** from hours/days to minutes
- ⚖️ **Eliminates human bias** with consistent AI-driven evaluation
- 📈 **Scales effortlessly** — handles 10 or 1000 submissions equally
- 📬 **Instant communication** — teams get notified immediately after evaluation
- 🎯 **Better quality filtering** — AI catches nuances that tired human judges might miss

---

*Built with ❤️ for hackathon organizers everywhere.*
