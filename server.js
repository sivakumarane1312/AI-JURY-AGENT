// ============================================
// AI JURY AGENT - Main Server
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Configuration
// ============================================
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HACKATHON_NAME = process.env.HACKATHON_NAME || 'TechHack 2026';
const HACKATHON_THEME = process.env.HACKATHON_THEME || 'AI for Social Good';
const ORGANIZER_NAME = process.env.ORGANIZER_NAME || 'Tech Club';

// In-memory store for evaluations
let evaluations = [];
let submissionsCache = [];

// ============================================
// Google Sheets Authentication
// ============================================
async function getGoogleSheetsClient() {
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials.json';
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ],
    });
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
}

// ============================================
// Google Drive - Extract File ID from Link
// ============================================
function extractDriveFileId(url) {
    if (!url) return null;
    // Handle various Google Drive URL formats
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /\/folders\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/,
        /\/open\?id=([a-zA-Z0-9_-]+)/,
        /drive\.google\.com\/(.+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return url; // Return as-is if no pattern matches
}

// ============================================
// AI Analysis - NVIDIA NIM / Gemini
// ============================================
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function buildEvalPrompt(teamName, pptContent, theme) {
    return `You are an expert hackathon judge evaluating a team's presentation/proposal. 
Analyze the following submission and provide scores.

**Hackathon Theme:** ${theme}
**Team Name:** ${teamName}

**Submission Content:**
${pptContent}

**Evaluation Criteria (Score each out of 10):**

1. **Idea (Innovation of the Concept)** - How novel and creative is the idea? Does it bring something new to the table?
2. **Solution Relevance** - How well does the proposed solution address the hackathon theme "${theme}"? Is it directly relevant to the problem statement?
3. **Novelty** - How unique is the approach compared to existing solutions? Does it stand out from conventional approaches?
4. **Feasibility** - How practical and implementable is the solution? Can it realistically be built and deployed?
5. **Innovation** - How innovative are the technical approaches, methodologies, or technologies used?

**IMPORTANT: Respond ONLY in the following JSON format, no other text:**
{
    "scores": {
        "idea": <number 1-10>,
        "solution_relevance": <number 1-10>,
        "novelty": <number 1-10>,
        "feasibility": <number 1-10>,
        "innovation": <number 1-10>
    },
    "total_score": <sum of all scores out of 50>,
    "normalized_score": <total_score / 5, rounded to 1 decimal>,
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "summary": "<2-3 sentence overall evaluation>",
    "recommendation": "<SHORTLIST / MAYBE / REJECT>"
}`;
}

async function analyzePPTWithNVIDIA(teamName, pptContent, theme) {
    const prompt = buildEvalPrompt(teamName, pptContent, theme);

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NVIDIA_API_KEY}`
        },
        body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: [
                { role: 'system', content: 'You are an expert hackathon judge. Always respond with valid JSON only, no markdown or extra text.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`NVIDIA NIM API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    let text = data.choices[0].message.content;

    // Clean up the response - extract JSON
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse NVIDIA NIM response:', text);
        throw new Error('AI response was not valid JSON');
    }
}

async function analyzePPTWithGemini(teamName, pptContent, theme) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = buildEvalPrompt(teamName, pptContent, theme);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('AI response was not valid JSON');
    }
}

async function analyzePPTWithAI(teamName, pptContent, theme) {
    // Prefer NVIDIA NIM, fallback to Gemini
    if (NVIDIA_API_KEY) {
        console.log(`🟢 Using NVIDIA NIM (${NVIDIA_MODEL}) for: ${teamName}`);
        return await analyzePPTWithNVIDIA(teamName, pptContent, theme);
    } else if (GEMINI_API_KEY) {
        console.log(`🔵 Using Gemini for: ${teamName}`);
        return await analyzePPTWithGemini(teamName, pptContent, theme);
    } else {
        throw new Error('No AI API key configured. Set NVIDIA_API_KEY or GEMINI_API_KEY in .env');
    }
}

// ============================================
// Email Configuration
// ============================================
function getEmailTransporter() {
    const appPassword = (process.env.EMAIL_APP_PASSWORD || '').replace(/\s/g, '');
    console.log(`📧 Email config: user=${process.env.EMAIL_USER}, password length=${appPassword.length}`);
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: appPassword,
        },
    });
}

// Test email endpoint
app.post('/api/email/test', async (req, res) => {
    try {
        const transporter = getEmailTransporter();
        await transporter.verify();

        const testEmail = req.body.email || process.env.EMAIL_USER;
        await transporter.sendMail({
            from: `"${HACKATHON_NAME} Jury" <${process.env.EMAIL_USER}>`,
            to: testEmail,
            subject: `✅ AI Jury Agent - Email Test Successful!`,
            html: `<div style="font-family: Arial; padding: 20px; background: #1a1a2e; color: #e2e8f0; border-radius: 12px;">
                <h2 style="color: #a78bfa;">🎉 Email is working!</h2>
                <p>Your AI Jury Agent email configuration is correct.</p>
                <p>Sent at: ${new Date().toLocaleString()}</p>
            </div>`
        });

        res.json({ success: true, message: `Test email sent to ${testEmail}` });
    } catch (error) {
        console.error('📧 Email test error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateShortlistEmail(teamName, hackathonName, organizerName) {
    return {
        subject: `🎉 Congratulations! You've been shortlisted for ${hackathonName}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #0a0a1a; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f0f2e 0%, #1a1a3e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.3); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px; }
        .body { padding: 40px 30px; color: #e2e8f0; }
        .body h2 { color: #a78bfa; margin-top: 0; }
        .highlight { background: rgba(99, 102, 241, 0.15); border-left: 4px solid #6366f1; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .cta { text-align: center; margin: 30px 0; }
        .cta a { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; }
        .footer { text-align: center; padding: 20px 30px; color: #64748b; font-size: 12px; border-top: 1px solid rgba(99, 102, 241, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 ${hackathonName}</h1>
            <p>First Screening Results</p>
        </div>
        <div class="body">
            <h2>Congratulations, Team ${teamName}! 🎉</h2>
            <p>We are thrilled to inform you that your team has been <strong>shortlisted</strong> for the next round of <strong>${hackathonName}</strong>!</p>
            
            <div class="highlight">
                <p><strong>📋 What's Next?</strong></p>
                <p>Our panel was impressed by your innovative idea and presentation. You will receive further details about the next round shortly.</p>
            </div>
            
            <p>Please ensure all team members are available for the upcoming rounds. More details will follow soon.</p>
            
            <p>Best wishes,<br><strong>${organizerName}</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated notification from the ${hackathonName} Jury System.</p>
            <p>© 2026 ${organizerName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    };
}

function generateRejectionEmail(teamName, hackathonName, organizerName) {
    return {
        subject: `Thank you for participating in ${hackathonName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #0a0a1a; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f0f2e 0%, #1a1a3e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.3); }
        .header { background: linear-gradient(135deg, #475569 0%, #64748b 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
        .body { padding: 40px 30px; color: #e2e8f0; }
        .body h2 { color: #94a3b8; margin-top: 0; }
        .footer { text-align: center; padding: 20px 30px; color: #64748b; font-size: 12px; border-top: 1px solid rgba(99, 102, 241, 0.2); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${hackathonName}</h1>
        </div>
        <div class="body">
            <h2>Dear Team ${teamName},</h2>
            <p>Thank you for your participation in <strong>${hackathonName}</strong>. We truly appreciate the effort and creativity you put into your submission.</p>
            <p>After careful evaluation, we regret to inform you that your team has not been shortlisted for the next round. The competition was intense, and the decision was not easy.</p>
            <p>We encourage you to keep innovating and look forward to seeing you in future events!</p>
            <p>Best regards,<br><strong>${organizerName}</strong></p>
        </div>
        <div class="footer">
            <p>© 2026 ${organizerName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `
    };
}

// ============================================
// API Routes
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        hackathon: HACKATHON_NAME,
        theme: HACKATHON_THEME,
        timestamp: new Date().toISOString()
    });
});

// Get configuration
app.get('/api/config', (req, res) => {
    res.json({
        hackathonName: HACKATHON_NAME,
        hackathonTheme: HACKATHON_THEME,
        organizerName: ORGANIZER_NAME,
        geminiConfigured: !!GEMINI_API_KEY,
        sheetsConfigured: !!GOOGLE_SHEET_ID,
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
    });
});

// Fetch submissions from Google Sheets
app.get('/api/submissions', async (req, res) => {
    try {
        const sheets = await getGoogleSheetsClient();

        // First, get spreadsheet metadata to find the correct sheet name
        const meta = await sheets.spreadsheets.get({
            spreadsheetId: GOOGLE_SHEET_ID,
        });

        const sheetsList = meta.data.sheets || [];
        console.log('Available sheets:', sheetsList.map(s => `"${s.properties.title}" (gid: ${s.properties.sheetId})`).join(', '));

        // Use the first sheet by default, or find by gid if provided
        const targetGid = req.query.gid || null;
        let sheetName = sheetsList[0]?.properties?.title || 'Sheet1';

        if (targetGid) {
            const matched = sheetsList.find(s => String(s.properties.sheetId) === String(targetGid));
            if (matched) sheetName = matched.properties.title;
        } else {
            // Try to find "Form Responses" sheet first (common Google Form pattern)
            const formSheet = sheetsList.find(s =>
                s.properties.title.toLowerCase().includes('form responses') ||
                s.properties.title.toLowerCase().includes('responses')
            );
            if (formSheet) sheetName = formSheet.properties.title;
        }

        console.log(`Reading from sheet: "${sheetName}"`);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: sheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.json({ submissions: [], message: 'No submissions found' });
        }

        const headers = rows[0].map(h => h.toLowerCase().trim());
        console.log('Column headers found:', headers);

        const submissions = rows.slice(1).map((row, index) => {
            const submission = { id: uuidv4(), rowIndex: index + 2 };
            headers.forEach((header, i) => {
                submission[header] = row[i] || '';
            });
            return submission;
        });

        submissionsCache = submissions;
        res.json({ submissions, headers, sheetName, totalSheets: sheetsList.length });
    } catch (error) {
        console.error('Error fetching submissions:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Manual submission input (for testing without Google Sheets)
app.post('/api/submissions/manual', (req, res) => {
    const { submissions } = req.body;
    if (!submissions || !Array.isArray(submissions)) {
        return res.status(400).json({ error: 'Invalid submissions data' });
    }
    submissionsCache = submissions.map((s, i) => ({
        id: uuidv4(),
        rowIndex: i + 1,
        ...s
    }));
    res.json({ submissions: submissionsCache, message: 'Submissions loaded successfully' });
});

// Delete a submission by ID
app.delete('/api/submissions/:id', (req, res) => {
    const { id } = req.params;
    const index = submissionsCache.findIndex(s => s.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Submission not found' });
    }
    const removed = submissionsCache.splice(index, 1)[0];
    // Also remove any evaluation for this team
    evaluations = evaluations.filter(e => e.teamName !== removed.teamName && e.teamName !== removed['team name']);
    res.json({ message: `Submission "${removed.teamName || removed['team name'] || 'Unknown'}" deleted`, remaining: submissionsCache.length });
});

// Analyze a single PPT submission
app.post('/api/analyze', async (req, res) => {
    try {
        const { teamName, pptContent, driveLink, theme } = req.body;

        if (!pptContent && !driveLink) {
            return res.status(400).json({ error: 'Either PPT content or Drive link is required' });
        }

        let content = pptContent || '';

        // If drive link provided but no content, create a description from available info
        if (!content && driveLink) {
            content = `[PPT submitted via Google Drive: ${driveLink}]\nTeam: ${teamName}\nNote: The actual PPT content should be extracted from the Drive link. For now, evaluating based on available metadata.`;
        }

        const evaluation = await analyzePPTWithAI(
            teamName,
            content,
            theme || HACKATHON_THEME
        );

        const result = {
            id: uuidv4(),
            teamName,
            driveLink,
            evaluation,
            timestamp: new Date().toISOString()
        };

        // Store evaluation
        const existingIndex = evaluations.findIndex(e => e.teamName === teamName);
        if (existingIndex >= 0) {
            evaluations[existingIndex] = result;
        } else {
            evaluations.push(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Analysis error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Batch analyze multiple submissions
app.post('/api/analyze/batch', async (req, res) => {
    try {
        const { submissions, theme } = req.body;
        const results = [];
        const errors = [];

        for (const submission of submissions) {
            try {
                const evaluation = await analyzePPTWithAI(
                    submission.teamName,
                    submission.pptContent || `Team: ${submission.teamName}\nProject: ${submission.projectTitle || 'N/A'}\nDescription: ${submission.description || 'N/A'}\nDrive Link: ${submission.driveLink || 'N/A'}`,
                    theme || HACKATHON_THEME
                );

                const result = {
                    id: uuidv4(),
                    teamName: submission.teamName,
                    email: submission.email,
                    driveLink: submission.driveLink,
                    evaluation,
                    timestamp: new Date().toISOString()
                };

                evaluations.push(result);
                results.push(result);

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                errors.push({ teamName: submission.teamName, error: error.message });
            }
        }

        res.json({ results, errors, total: results.length });
    } catch (error) {
        console.error('Batch analysis error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get all evaluations
app.get('/api/evaluations', (req, res) => {
    const sorted = [...evaluations].sort((a, b) => {
        const scoreA = a.evaluation?.normalized_score || 0;
        const scoreB = b.evaluation?.normalized_score || 0;
        return scoreB - scoreA;
    });
    res.json({ evaluations: sorted, total: sorted.length });
});

// Get top N teams
app.get('/api/evaluations/top/:n', (req, res) => {
    const n = parseInt(req.params.n) || 10;
    const sorted = [...evaluations].sort((a, b) => {
        const scoreA = a.evaluation?.normalized_score || 0;
        const scoreB = b.evaluation?.normalized_score || 0;
        return scoreB - scoreA;
    });
    const topTeams = sorted.slice(0, n);
    res.json({ topTeams, total: topTeams.length, requestedCount: n });
});

// Send shortlist emails
app.post('/api/email/shortlist', async (req, res) => {
    try {
        const { teams } = req.body; // Array of { teamName, email }
        console.log(`\n📧 ===== SHORTLIST EMAIL REQUEST =====`);
        console.log(`📧 Teams to email:`, JSON.stringify(teams, null, 2));

        const transporter = getEmailTransporter();

        // Verify transporter connection first
        try {
            await transporter.verify();
            console.log('📧 ✅ SMTP connection verified successfully!');
        } catch (verifyErr) {
            console.error('📧 ❌ SMTP verification FAILED:', verifyErr.message);
            console.error('📧 Full error:', JSON.stringify(verifyErr, null, 2));
            return res.status(500).json({
                error: `Email authentication failed: ${verifyErr.message}. Please check your EMAIL_USER and EMAIL_APP_PASSWORD in .env file.`
            });
        }

        const results = [];
        const errors = [];

        for (const team of teams) {
            try {
                console.log(`📧 Sending to: ${team.teamName} <${team.email}>`);

                if (!team.email || !team.email.includes('@')) {
                    throw new Error(`Invalid email address: "${team.email}"`);
                }

                const emailContent = generateShortlistEmail(
                    team.teamName,
                    HACKATHON_NAME,
                    ORGANIZER_NAME
                );

                const info = await transporter.sendMail({
                    from: `"${HACKATHON_NAME} Jury" <${process.env.EMAIL_USER}>`,
                    to: team.email,
                    subject: emailContent.subject,
                    html: emailContent.html,
                });

                console.log(`📧 ✅ Sent to ${team.email} - MessageID: ${info.messageId}`);
                results.push({ teamName: team.teamName, email: team.email, status: 'sent' });
            } catch (error) {
                console.error(`📧 ❌ FAILED for ${team.teamName} <${team.email}>: ${error.message}`);
                errors.push({ teamName: team.teamName, email: team.email, error: error.message });
            }
        }

        console.log(`📧 ===== RESULTS: ${results.length} sent, ${errors.length} failed =====\n`);
        res.json({ results, errors, totalSent: results.length });
    } catch (error) {
        console.error('📧 Email error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Send rejection emails
app.post('/api/email/rejection', async (req, res) => {
    try {
        const { teams } = req.body;
        const transporter = getEmailTransporter();
        const results = [];
        const errors = [];

        for (const team of teams) {
            try {
                const emailContent = generateRejectionEmail(
                    team.teamName,
                    HACKATHON_NAME,
                    ORGANIZER_NAME
                );

                await transporter.sendMail({
                    from: `"${HACKATHON_NAME} Jury" <${process.env.EMAIL_USER}>`,
                    to: team.email,
                    subject: emailContent.subject,
                    html: emailContent.html,
                });

                results.push({ teamName: team.teamName, email: team.email, status: 'sent' });
            } catch (error) {
                errors.push({ teamName: team.teamName, email: team.email, error: error.message });
            }
        }

        res.json({ results, errors, totalSent: results.length });
    } catch (error) {
        console.error('Email error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Clear all evaluations
app.delete('/api/evaluations', (req, res) => {
    evaluations = [];
    res.json({ message: 'All evaluations cleared' });
});

// n8n Webhook endpoint - can be triggered by n8n
app.post('/api/webhook/n8n', async (req, res) => {
    try {
        const { action, data } = req.body;

        switch (action) {
            case 'analyze':
                const evaluation = await analyzePPTWithAI(
                    data.teamName,
                    data.pptContent,
                    data.theme || HACKATHON_THEME
                );
                res.json({ success: true, evaluation });
                break;

            case 'get-top':
                const n = data.count || 10;
                const sorted = [...evaluations].sort((a, b) =>
                    (b.evaluation?.normalized_score || 0) - (a.evaluation?.normalized_score || 0)
                );
                res.json({ success: true, topTeams: sorted.slice(0, n) });
                break;

            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════╗
    ║        🏛️  AI JURY AGENT SERVER              ║
    ║──────────────────────────────────────────────║
    ║  Dashboard:  http://localhost:${PORT}            ║
    ║  API:        http://localhost:${PORT}/api        ║
    ║  Hackathon:  ${HACKATHON_NAME.padEnd(30)}║
    ║  Theme:      ${HACKATHON_THEME.padEnd(30)}║
    ╚══════════════════════════════════════════════╝
    `);
});
