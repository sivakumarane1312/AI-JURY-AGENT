// ============================================
// AI JURY AGENT - Frontend Application Logic
// ============================================

const API_BASE = '';
let submissions = [];
let evaluationResults = [];
let shortlistedTeams = [];
let config = {};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    await loadConfig();
    await refreshEvaluations();
    updateDashboard();
});

// ============================================
// Configuration
// ============================================
async function loadConfig() {
    try {
        const res = await fetch(`${API_BASE}/api/config`);
        config = await res.json();

        document.getElementById('hackathonName').textContent = config.hackathonName;
        document.getElementById('detailHackathon').textContent = config.hackathonName;
        document.getElementById('detailTheme').textContent = config.hackathonTheme;
        document.getElementById('detailOrganizer').textContent = config.organizerName;
        document.getElementById('evalTheme').value = config.hackathonTheme;

        document.getElementById('detailGemini').innerHTML = config.geminiConfigured
            ? '<span class="badge badge-success">Configured</span>'
            : '<span class="badge badge-danger">Not Configured</span>';

        document.getElementById('detailEmail').innerHTML = config.emailConfigured
            ? '<span class="badge badge-success">Configured</span>'
            : '<span class="badge badge-danger">Not Configured</span>';

        document.getElementById('statusText').textContent = 'System Ready';
        document.getElementById('statusPill').style.background = 'rgba(16, 185, 129, 0.1)';

        document.title = `AI Jury Agent | ${config.hackathonName}`;
    } catch (error) {
        document.getElementById('statusText').textContent = 'Connection Error';
        document.getElementById('statusPill').style.background = 'rgba(239, 68, 68, 0.1)';
        document.getElementById('statusPill').style.borderColor = 'rgba(239, 68, 68, 0.3)';
        document.querySelector('.status-dot').style.background = '#ef4444';
        showToast('Failed to connect to server', 'error');
    }
}

// ============================================
// Tab Navigation
// ============================================
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`content-${tabId}`).classList.add('active');
        });
    });
}

// ============================================
// Submissions Management
// ============================================
async function fetchFromSheets() {
    const btn = document.getElementById('fetchSheetsBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Fetching...';

    try {
        const res = await fetch(`${API_BASE}/api/submissions`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Helper: find a value by checking multiple possible column names
        const findField = (obj, keys, fallbackIndex) => {
            // First try exact matches
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== '') return obj[key];
            }
            // Then try partial matches (column header contains the keyword)
            const objKeys = Object.keys(obj);
            for (const key of keys) {
                const found = objKeys.find(k => k.toLowerCase().includes(key.toLowerCase()));
                if (found && obj[found] !== undefined && obj[found] !== '') return obj[found];
            }
            return '';
        };

        submissions = data.submissions.map(s => ({
            id: s.id,
            teamName: findField(s, ['team name', 'team_name', 'teamname', 'team'], 1) || 'Unknown Team',
            email: findField(s, ['email', 'primary contact email', 'email address', 'email_address', 'contact email', 'mail'], 2),
            projectTitle: findField(s, ['project title', 'project_title', 'title', 'project name'], 3),
            driveLink: findField(s, ['ppt link', 'drive link', 'ppt_link', 'google drive link', 'ppt link (google drive/shareable link)', 'shareable link', 'file link'], 4),
            description: findField(s, ['description', 'project description', 'abstract', 'project description (summary, goals, and key outcomes)', 'summary'], 5),
            members: findField(s, ['team members', 'members', 'list of team members', 'list of team members (please list full names, one per line)'], 6),
            status: 'pending'
        }));

        renderSubmissions();
        showToast(`Loaded ${submissions.length} submissions from Google Sheets`, 'success');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Fetch from Google Sheets
        `;
    }
}

function showManualInput() {
    document.getElementById('manualInputModal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function addManualSubmission() {
    const teamName = document.getElementById('manualTeamName').value.trim();
    const email = document.getElementById('manualEmail').value.trim();
    const projectTitle = document.getElementById('manualProjectTitle').value.trim();
    const driveLink = document.getElementById('manualDriveLink').value.trim();
    const description = document.getElementById('manualDescription').value.trim();
    const members = document.getElementById('manualMembers').value.trim();

    if (!teamName || !projectTitle) {
        showToast('Team Name and Project Title are required', 'error');
        return;
    }

    submissions.push({
        id: 'manual-' + Date.now(),
        teamName,
        email,
        projectTitle,
        driveLink,
        description,
        members,
        status: 'pending'
    });

    // Clear form
    document.getElementById('manualTeamName').value = '';
    document.getElementById('manualEmail').value = '';
    document.getElementById('manualProjectTitle').value = '';
    document.getElementById('manualDriveLink').value = '';
    document.getElementById('manualDescription').value = '';
    document.getElementById('manualMembers').value = '';

    closeModal('manualInputModal');
    renderSubmissions();
    updateDashboard();
    showToast(`Added submission for "${teamName}"`, 'success');
}

function loadSampleData() {
    submissions = [
        {
            id: 'sample-1',
            teamName: 'Neural Nexus',
            email: 'neuralnexus@example.com',
            projectTitle: 'AI-Powered Mental Health Companion',
            driveLink: 'https://drive.google.com/file/d/sample1',
            description: 'An AI-powered chatbot that provides mental health support using NLP and sentiment analysis. The system detects emotional states through text conversations and provides appropriate coping mechanisms, guided meditation, and connects users with professional help when needed. Built using GPT-4 fine-tuned on mental health conversations, with a React Native mobile app frontend. Features include mood tracking, journaling with AI insights, and emergency crisis detection.',
            members: 'Alice Johnson, Bob Smith, Carol White',
            status: 'pending'
        },
        {
            id: 'sample-2',
            teamName: 'Green Circuits',
            email: 'greencircuits@example.com',
            projectTitle: 'Smart Waste Segregation System',
            driveLink: 'https://drive.google.com/file/d/sample2',
            description: 'An IoT-based smart waste management system using computer vision to automatically segregate waste into biodegradable, recyclable, and hazardous categories. Uses a Raspberry Pi with a camera module and TensorFlow Lite model trained on 50,000+ waste images. The system provides real-time analytics through a web dashboard, optimizes collection routes, and gamifies waste reduction for communities.',
            members: 'David Lee, Emma Wilson, Frank Brown',
            status: 'pending'
        },
        {
            id: 'sample-3',
            teamName: 'EduBridge',
            email: 'edubridge@example.com',
            projectTitle: 'Adaptive Learning Platform for Rural Students',
            driveLink: 'https://drive.google.com/file/d/sample3',
            description: 'A platform that uses AI to create personalized learning paths for rural students with limited internet access. Features offline-first PWA architecture, content compression, and adaptive difficulty adjustment based on student performance. Supports vernacular languages using translation APIs and includes peer-to-peer learning through local mesh networking. Teachers get dashboards with learning analytics and automated progress reports.',
            members: 'Grace Chen, Henry Park, Isabel Martinez',
            status: 'pending'
        },
        {
            id: 'sample-4',
            teamName: 'HealthGuard',
            email: 'healthguard@example.com',
            projectTitle: 'Predictive Disease Outbreak Analyzer',
            driveLink: 'https://drive.google.com/file/d/sample4',
            description: 'A machine learning system that analyzes public health data, social media trends, and environmental factors to predict disease outbreaks before they happen. Uses LSTM neural networks and ensemble methods on WHO data, hospital records, and Google Trends. Provides early warning alerts to health officials through a real-time geographic visualization dashboard with risk heatmaps.',
            members: 'Jack Thompson, Karen Liu, Leo Adams',
            status: 'pending'
        },
        {
            id: 'sample-5',
            teamName: 'AgriSense',
            email: 'agrisense@example.com',
            projectTitle: 'Drone-Based Crop Health Monitoring',
            driveLink: 'https://drive.google.com/file/d/sample5',
            description: 'An autonomous drone system that monitors crop health using multispectral imaging and AI-based disease detection. The system flies over fields capturing NDVI data, detects pest infestations and nutrient deficiencies using convolutional neural networks, and provides actionable recommendations to farmers via a mobile app in local languages. Integrates with weather APIs for optimal spraying schedules.',
            members: 'Maria Garcia, Nathan Scott, Olivia Davis',
            status: 'pending'
        },
        {
            id: 'sample-6',
            teamName: 'SafeRoute',
            email: 'saferoute@example.com',
            projectTitle: 'AI Women Safety Navigation App',
            driveLink: 'https://drive.google.com/file/d/sample6',
            description: 'A navigation app specifically designed for women safety that uses crime data analysis and real-time crowd density to suggest the safest routes. Features include SOS alerts with live location sharing, fake call generator, community safety ratings, and integration with local police APIs. Uses graph neural networks for route optimization and sentiment analysis on area reviews.',
            members: 'Patricia Young, Quinn Roberts, Rachel Green',
            status: 'pending'
        },
        {
            id: 'sample-7',
            teamName: 'CodeMentor',
            email: 'codementor@example.com',
            projectTitle: 'AI Coding Assistant for Beginners',
            driveLink: 'https://drive.google.com/file/d/sample7',
            description: 'An intelligent coding tutorial platform that adapts to beginner programmers learning style. Features AI-powered code review, step-by-step debugging assistance, and gamified challenges. The platform generates personalized projects based on interests and provides real-time collaborative coding sessions with AI mentors. Supports Python, JavaScript, and Java with visual code execution traces.',
            members: 'Sam Wilson, Tina Baker, Uma Patel',
            status: 'pending'
        },
        {
            id: 'sample-8',
            teamName: 'WaterWise',
            email: 'waterwise@example.com',
            projectTitle: 'Smart Water Quality Monitoring Network',
            driveLink: 'https://drive.google.com/file/d/sample8',
            description: 'A network of IoT sensors deployed across water bodies that continuously monitor water quality parameters like pH, dissolved oxygen, turbidity, and heavy metal contamination. Uses edge computing for real-time analysis and blockchain for tamper-proof data logging. Anomaly detection algorithms alert authorities within seconds of contamination events. Community dashboard shows historical trends.',
            members: 'Victor Chang, Wendy Morris, Xavier Ross',
            status: 'pending'
        },
        {
            id: 'sample-9',
            teamName: 'SignSpeak',
            email: 'signspeak@example.com',
            projectTitle: 'Real-Time Sign Language Translator',
            driveLink: 'https://drive.google.com/file/d/sample9',
            description: 'A mobile application that uses computer vision and deep learning to translate sign language to text and speech in real-time. Supports ASL and ISL with 95% accuracy using MediaPipe for hand tracking and a custom LSTM model for gesture sequence recognition. Features two-way communication with text-to-sign avatar, video calling with built-in translation, and an educational mode for learning sign language.',
            members: 'Yuki Tanaka, Zara Ahmed, Andy Cooper',
            status: 'pending'
        },
        {
            id: 'sample-10',
            teamName: 'FoodRescue',
            email: 'foodrescue@example.com',
            projectTitle: 'AI Food Waste Reduction Platform',
            driveLink: 'https://drive.google.com/file/d/sample10',
            description: 'A platform connecting restaurants, grocery stores, and food banks to reduce food waste using predictive analytics. The AI analyzes sales patterns, weather data, and events to predict surplus food and automatically matches it with nearby charities. Features include a consumer app for discounted near-expiry items, carbon footprint tracking, and gamification with sustainability scores for participating businesses.',
            members: 'Beth Turner, Chris Evans, Diana Prince',
            status: 'pending'
        },
        {
            id: 'sample-11',
            teamName: 'MediScan',
            email: 'mediscan@example.com',
            projectTitle: 'Portable Medical Image Diagnostics',
            driveLink: 'https://drive.google.com/file/d/sample11',
            description: 'A portable device attachment for smartphones that captures medical imaging (skin lesions, retinal scans, X-ray films) and uses AI for preliminary diagnosis. The deep learning model is trained on 200K+ medical images across 50 conditions with 92% accuracy. Designed for rural health workers, it works offline and provides confidence scores with suggested next steps. Integrates with telemedicine platforms for specialist consultation.',
            members: 'Eric Foster, Fiona Walsh, George Miller',
            status: 'pending'
        },
        {
            id: 'sample-12',
            teamName: 'TrafficFlow',
            email: 'trafficflow@example.com',
            projectTitle: 'AI Traffic Signal Optimization',
            driveLink: 'https://drive.google.com/file/d/sample12',
            description: 'An intelligent traffic management system using reinforcement learning to optimize traffic signal timings across intersections. Processes real-time feeds from existing CCTV cameras using YOLO for vehicle counting and classification. Simulation shows 35% reduction in average wait times. Prioritizes emergency vehicles and implements green corridors for ambulances. Dashboard for traffic police with congestion predictions.',
            members: 'Hannah Brooks, Ian Foster, Julia Kim',
            status: 'pending'
        }
    ];

    renderSubmissions();
    updateDashboard();
    showToast('Loaded 12 sample submissions', 'success');
}

function renderSubmissions() {
    const tableCard = document.getElementById('submissionsTableCard');
    const emptyState = document.getElementById('submissionsEmpty');
    const tbody = document.getElementById('submissionsBody');

    if (submissions.length === 0) {
        tableCard.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableCard.style.display = 'block';
    emptyState.style.display = 'none';

    tbody.innerHTML = submissions.map((s, i) => {
        const evaluated = evaluationResults.find(e => e.teamName === s.teamName);
        const statusBadge = evaluated
            ? `<span class="badge badge-success">Evaluated (${evaluated.evaluation.normalized_score}/10)</span>`
            : `<span class="badge badge-pending">Pending</span>`;

        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(s.teamName)}</strong></td>
                <td>${escapeHtml(s.projectTitle)}</td>
                <td>${escapeHtml(s.email)}</td>
                <td>${s.driveLink ? `<a href="${escapeHtml(s.driveLink)}" target="_blank" class="drive-link">📁 Open</a>` : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-sm btn-primary" onclick="evaluateSingleFromList(${i})" ${evaluated ? 'disabled' : ''}>
                            ${evaluated ? 'Done' : 'Evaluate'}
                        </button>
                        <button class="btn btn-sm" onclick="deleteSubmission(${i})" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 8px; cursor: pointer; border-radius: 6px;" title="Delete team">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('totalSubmissions').textContent = submissions.length;
}

// Delete a submission
async function deleteSubmission(index) {
    const team = submissions[index];
    if (!confirm(`Are you sure you want to delete "${team.teamName}"?`)) return;

    try {
        // Try to delete from server if it has an ID
        if (team.id && !team.id.startsWith('sample-') && !team.id.startsWith('manual-')) {
            await fetch(`${API_BASE}/api/submissions/${team.id}`, { method: 'DELETE' });
        }

        // Remove from local array
        submissions.splice(index, 1);
        // Remove any evaluation for this team
        evaluationResults = evaluationResults.filter(e => e.teamName !== team.teamName);

        renderSubmissions();
        updateDashboard();
        renderResults();
        showToast(`Deleted "${team.teamName}"`, 'info');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ============================================
// AI Evaluation
// ============================================
async function evaluateSingle() {
    const teamName = document.getElementById('singleTeamName').value.trim();
    const pptContent = document.getElementById('singlePptContent').value.trim();

    if (!teamName || !pptContent) {
        showToast('Please enter team name and PPT content', 'error');
        return;
    }

    const resultDiv = document.getElementById('singleResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="text-align: center; padding: 40px;"><span class="spinner"></span><p style="margin-top: 12px; color: var(--text-muted);">AI is analyzing the submission...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamName,
                pptContent,
                theme: document.getElementById('evalTheme').value || config.hackathonTheme
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        evaluationResults.push(data);
        resultDiv.innerHTML = renderEvaluationResult(data);
        updateDashboard();
        showToast(`Evaluation complete for "${teamName}"`, 'success');
    } catch (error) {
        resultDiv.innerHTML = `<div style="color: var(--danger); padding: 20px;">❌ Error: ${error.message}</div>`;
        showToast(`Error: ${error.message}`, 'error');
    }
}

async function evaluateSingleFromList(index) {
    const submission = submissions[index];
    const content = submission.description || `Team: ${submission.teamName}\nProject: ${submission.projectTitle}\nMembers: ${submission.members}\nDrive Link: ${submission.driveLink}`;

    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamName: submission.teamName,
                pptContent: content,
                driveLink: submission.driveLink,
                theme: document.getElementById('evalTheme').value || config.hackathonTheme
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        data.email = submission.email;
        const existingIdx = evaluationResults.findIndex(e => e.teamName === submission.teamName);
        if (existingIdx >= 0) {
            evaluationResults[existingIdx] = data;
        } else {
            evaluationResults.push(data);
        }

        submissions[index].status = 'evaluated';
        renderSubmissions();
        updateDashboard();
        renderResults();
        showToast(`Evaluated: ${submission.teamName}`, 'success');
    } catch (error) {
        showToast(`Error evaluating ${submission.teamName}: ${error.message}`, 'error');
    }
}

async function evaluateAll() {
    if (submissions.length === 0) {
        showToast('No submissions to evaluate. Load submissions first.', 'error');
        return;
    }

    const evalBtn = document.getElementById('evalAllBtn');
    evalBtn.disabled = true;
    evalBtn.innerHTML = '<span class="spinner"></span> Evaluating...';

    const progressCard = document.getElementById('evalProgressCard');
    progressCard.style.display = 'block';
    const progressBar = document.getElementById('evalProgress');
    const progressText = document.getElementById('evalProgressText');
    const progressLog = document.getElementById('evalLog');

    progressLog.innerHTML = '';
    let completed = 0;
    const total = submissions.length;

    for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        const content = submission.description || `Team: ${submission.teamName}\nProject: ${submission.projectTitle}\nMembers: ${submission.members}\nDrive Link: ${submission.driveLink}`;

        progressLog.innerHTML += `<div class="log-item">⏳ Evaluating "${submission.teamName}"...</div>`;
        progressLog.scrollTop = progressLog.scrollHeight;

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    teamName: submission.teamName,
                    pptContent: content,
                    driveLink: submission.driveLink,
                    theme: document.getElementById('evalTheme').value || config.hackathonTheme
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            data.email = submission.email;
            const existingIdx = evaluationResults.findIndex(e => e.teamName === submission.teamName);
            if (existingIdx >= 0) {
                evaluationResults[existingIdx] = data;
            } else {
                evaluationResults.push(data);
            }

            submissions[i].status = 'evaluated';
            progressLog.innerHTML += `<div class="log-item log-success">✅ ${submission.teamName} → Score: ${data.evaluation.normalized_score}/10</div>`;
        } catch (error) {
            progressLog.innerHTML += `<div class="log-item log-error">❌ ${submission.teamName} → Error: ${error.message}</div>`;
        }

        completed++;
        const percent = Math.round((completed / total) * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${completed} / ${total}`;
        progressLog.scrollTop = progressLog.scrollHeight;

        // Rate limiting delay
        if (i < submissions.length - 1) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    progressLog.innerHTML += `<div class="log-item log-success">🎉 All evaluations complete!</div>`;
    renderSubmissions();
    updateDashboard();
    renderResults();

    evalBtn.disabled = false;
    evalBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Evaluate All Submissions
    `;

    showToast(`Completed ${completed} evaluations!`, 'success');
}

async function clearEvaluations() {
    if (!confirm('Are you sure you want to clear all evaluations?')) return;

    try {
        await fetch(`${API_BASE}/api/evaluations`, { method: 'DELETE' });
        evaluationResults = [];
        shortlistedTeams = [];
        submissions.forEach(s => s.status = 'pending');
        renderSubmissions();
        updateDashboard();
        renderResults();
        renderShortlist();
        showToast('All evaluations cleared', 'info');
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    }
}

// ============================================
// Refresh evaluations from server
// ============================================
async function refreshEvaluations() {
    try {
        const res = await fetch(`${API_BASE}/api/evaluations`);
        const data = await res.json();
        evaluationResults = data.evaluations || [];
    } catch (error) {
        console.error('Failed to refresh evaluations:', error);
    }
}

// ============================================
// Render Evaluation Result
// ============================================
function renderEvaluationResult(data) {
    const eval_ = data.evaluation;
    const scores = eval_.scores;

    const getBarClass = (score) => {
        if (score >= 8) return 'bar-excellent';
        if (score >= 6) return 'bar-good';
        if (score >= 4) return 'bar-average';
        return 'bar-poor';
    };

    const getScoreColor = (score) => {
        if (score >= 7) return 'score-high';
        if (score >= 5) return 'score-mid';
        return 'score-low';
    };

    return `
        <div class="result-header">
            <span class="result-team-name">📋 ${escapeHtml(data.teamName)}</span>
            <span class="result-score ${getScoreColor(eval_.normalized_score)}">${eval_.normalized_score}/10</span>
        </div>

        <div class="scores-grid">
            <div class="score-item">
                <span class="score-item-label">💡 Idea</span>
                <span class="score-item-value">${scores.idea}</span>
                <div class="score-item-bar"><div class="score-item-bar-fill ${getBarClass(scores.idea)}" style="width: ${scores.idea * 10}%"></div></div>
            </div>
            <div class="score-item">
                <span class="score-item-label">🎯 Solution Relevance</span>
                <span class="score-item-value">${scores.solution_relevance}</span>
                <div class="score-item-bar"><div class="score-item-bar-fill ${getBarClass(scores.solution_relevance)}" style="width: ${scores.solution_relevance * 10}%"></div></div>
            </div>
            <div class="score-item">
                <span class="score-item-label">✨ Novelty</span>
                <span class="score-item-value">${scores.novelty}</span>
                <div class="score-item-bar"><div class="score-item-bar-fill ${getBarClass(scores.novelty)}" style="width: ${scores.novelty * 10}%"></div></div>
            </div>
            <div class="score-item">
                <span class="score-item-label">⚙️ Feasibility</span>
                <span class="score-item-value">${scores.feasibility}</span>
                <div class="score-item-bar"><div class="score-item-bar-fill ${getBarClass(scores.feasibility)}" style="width: ${scores.feasibility * 10}%"></div></div>
            </div>
            <div class="score-item">
                <span class="score-item-label">🚀 Innovation</span>
                <span class="score-item-value">${scores.innovation}</span>
                <div class="score-item-bar"><div class="score-item-bar-fill ${getBarClass(scores.innovation)}" style="width: ${scores.innovation * 10}%"></div></div>
            </div>
        </div>

        <div style="margin-bottom: 16px;">
            <span class="badge ${eval_.recommendation === 'SHORTLIST' ? 'badge-success' : eval_.recommendation === 'MAYBE' ? 'badge-warning' : 'badge-danger'}">
                ${eval_.recommendation}
            </span>
            <span style="color: var(--text-muted); font-size: 13px; margin-left: 8px;">Total: ${eval_.total_score}/50</span>
        </div>

        <div class="result-details">
            <h4>💪 Strengths</h4>
            <ul>
                ${(eval_.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ul>
        </div>

        <div class="result-details">
            <h4>⚠️ Weaknesses</h4>
            <ul>
                ${(eval_.weaknesses || []).map(w => `<li>${escapeHtml(w)}</li>`).join('')}
            </ul>
        </div>

        <div class="result-summary">
            <strong>📝 Summary:</strong> ${escapeHtml(eval_.summary || '')}
        </div>
    `;
}

// ============================================
// Results & Rankings
// ============================================
function renderResults() {
    const container = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('resultsEmpty');

    if (evaluationResults.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const sorted = [...evaluationResults].sort((a, b) => {
        return (b.evaluation?.normalized_score || 0) - (a.evaluation?.normalized_score || 0);
    });

    const filterValue = document.getElementById('topNSelect').value;
    const filtered = filterValue === 'all' ? sorted : sorted.slice(0, parseInt(filterValue));

    const getScoreColor = (score) => {
        if (score >= 7) return 'score-high';
        if (score >= 5) return 'score-mid';
        return 'score-low';
    };

    container.innerHTML = filtered.map((item, i) => {
        const eval_ = item.evaluation;
        const scores = eval_.scores;
        const rank = i + 1;

        return `
            <div class="ranking-card ${rank <= 3 ? 'top-3' : ''}">
                <div class="rank-number">#${rank}</div>
                <div class="rank-info">
                    <div class="rank-team-name">${escapeHtml(item.teamName)}</div>
                    <div class="rank-meta">
                        <span>${eval_.recommendation || '-'}</span>
                        <span>•</span>
                        <span>${item.email || 'No email'}</span>
                    </div>
                </div>
                <div class="rank-scores">
                    <span class="rank-score-pill" title="Idea">💡 ${scores.idea}</span>
                    <span class="rank-score-pill" title="Relevance">🎯 ${scores.solution_relevance}</span>
                    <span class="rank-score-pill" title="Novelty">✨ ${scores.novelty}</span>
                    <span class="rank-score-pill" title="Feasibility">⚙️ ${scores.feasibility}</span>
                    <span class="rank-score-pill" title="Innovation">🚀 ${scores.innovation}</span>
                </div>
                <div class="rank-total-score ${getScoreColor(eval_.normalized_score)}">${eval_.normalized_score}</div>
            </div>
        `;
    }).join('');
}

function filterResults() {
    renderResults();
}

function exportResults() {
    if (evaluationResults.length === 0) {
        showToast('No results to export', 'error');
        return;
    }

    const sorted = [...evaluationResults].sort((a, b) =>
        (b.evaluation?.normalized_score || 0) - (a.evaluation?.normalized_score || 0)
    );

    const headers = ['Rank', 'Team Name', 'Email', 'Idea', 'Solution Relevance', 'Novelty', 'Feasibility', 'Innovation', 'Total (50)', 'Score (10)', 'Recommendation', 'Summary'];
    const rows = sorted.map((item, i) => {
        const e = item.evaluation;
        return [
            i + 1,
            `"${item.teamName}"`,
            `"${item.email || ''}"`,
            e.scores.idea,
            e.scores.solution_relevance,
            e.scores.novelty,
            e.scores.feasibility,
            e.scores.innovation,
            e.total_score,
            e.normalized_score,
            `"${e.recommendation}"`,
            `"${(e.summary || '').replace(/"/g, '""')}"`
        ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jury_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Results exported as CSV', 'success');
}

// ============================================
// Shortlist & Email
// ============================================
function autoSelectTop() {
    const count = parseInt(document.getElementById('shortlistCount').value) || 10;

    if (evaluationResults.length === 0) {
        showToast('No evaluations available. Evaluate submissions first.', 'error');
        return;
    }

    const sorted = [...evaluationResults].sort((a, b) =>
        (b.evaluation?.normalized_score || 0) - (a.evaluation?.normalized_score || 0)
    );

    shortlistedTeams = sorted.slice(0, count).map(item => ({
        teamName: item.teamName,
        email: item.email || '',
        score: item.evaluation.normalized_score,
        selected: true
    }));

    renderShortlist();
    showToast(`Auto-selected top ${shortlistedTeams.length} teams`, 'success');
}

function renderShortlist() {
    const container = document.getElementById('shortlistContainer');
    const emptyState = document.getElementById('shortlistEmpty');
    const emailCard = document.getElementById('emailActionsCard');

    if (shortlistedTeams.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        emailCard.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    emailCard.style.display = 'block';

    const getScoreColor = (score) => {
        if (score >= 7) return 'score-high';
        if (score >= 5) return 'score-mid';
        return 'score-low';
    };

    container.innerHTML = `
        <div class="card">
            <h3>🏅 Shortlisted Teams (${shortlistedTeams.length})</h3>
            ${shortlistedTeams.map((team, i) => `
                <div class="shortlist-card ${team.selected ? 'selected' : ''}">
                    <input type="checkbox" class="shortlist-checkbox" ${team.selected ? 'checked' : ''} onchange="toggleShortlist(${i})">
                    <div class="shortlist-info">
                        <div class="shortlist-team">${escapeHtml(team.teamName)}</div>
                        <div class="shortlist-email">${escapeHtml(team.email || 'No email provided')}</div>
                    </div>
                    <div class="shortlist-score ${getScoreColor(team.score)}">${team.score}/10</div>
                </div>
            `).join('')}
        </div>
    `;
}

function toggleShortlist(index) {
    shortlistedTeams[index].selected = !shortlistedTeams[index].selected;
    renderShortlist();
}

async function sendShortlistEmails() {
    const selected = shortlistedTeams.filter(t => t.selected && t.email);

    if (selected.length === 0) {
        showToast('No teams with email selected for shortlist notification', 'error');
        return;
    }

    if (!confirm(`Send shortlist emails to ${selected.length} teams?`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/email/shortlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teams: selected })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast(`✅ Sent ${data.totalSent} shortlist emails! ${data.errors.length ? `(${data.errors.length} failed)` : ''}`, 'success');
    } catch (error) {
        showToast(`Error sending emails: ${error.message}`, 'error');
    }
}

async function sendRejectionEmails() {
    // Get all evaluated teams that are NOT in the shortlist
    const shortlistedNames = new Set(shortlistedTeams.filter(t => t.selected).map(t => t.teamName));
    const rejectedTeams = evaluationResults
        .filter(e => !shortlistedNames.has(e.teamName) && e.email)
        .map(e => ({ teamName: e.teamName, email: e.email }));

    if (rejectedTeams.length === 0) {
        showToast('No rejected teams with emails to notify', 'error');
        return;
    }

    if (!confirm(`Send rejection emails to ${rejectedTeams.length} teams?`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/email/rejection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teams: rejectedTeams })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast(`Sent ${data.totalSent} rejection emails`, 'info');
    } catch (error) {
        showToast(`Error sending emails: ${error.message}`, 'error');
    }
}

// ============================================
// Dashboard Updates
// ============================================
function updateDashboard() {
    document.getElementById('totalSubmissions').textContent = submissions.length;
    document.getElementById('totalEvaluated').textContent = evaluationResults.length;

    if (evaluationResults.length > 0) {
        const avgScore = evaluationResults.reduce((sum, e) =>
            sum + (e.evaluation?.normalized_score || 0), 0) / evaluationResults.length;
        document.getElementById('avgScore').textContent = avgScore.toFixed(1);
    }

    document.getElementById('totalShortlisted').textContent = shortlistedTeams.filter(t => t.selected).length;

    // Update score chart
    updateScoreChart();
}

function updateScoreChart() {
    const container = document.getElementById('scoreChart');

    if (evaluationResults.length === 0) {
        container.innerHTML = '<p class="empty-state">No evaluations yet. Start evaluating to see the score distribution.</p>';
        return;
    }

    const sorted = [...evaluationResults].sort((a, b) =>
        (b.evaluation?.normalized_score || 0) - (a.evaluation?.normalized_score || 0)
    );

    const maxScore = 10;

    container.innerHTML = sorted.slice(0, 15).map(item => {
        const score = item.evaluation?.normalized_score || 0;
        const heightPercent = (score / maxScore) * 100;
        const hue = (score / maxScore) * 120; // 0=red, 120=green

        return `
            <div class="chart-bar-wrapper">
                <div class="chart-bar-score">${score}</div>
                <div class="chart-bar" style="height: ${heightPercent}%; background: linear-gradient(180deg, hsl(${hue}, 70%, 55%), hsl(${hue}, 70%, 35%));"></div>
                <div class="chart-bar-label" title="${item.teamName}">${item.teamName.substring(0, 8)}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
