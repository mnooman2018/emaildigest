const SITE_URL = 'https://emaildigest-kappa.vercel.app'

let panelOpen = false
let isMaximized = false
let emailsData = []
let activeCategory = 'all'
let savedToken = null
let pinnedEmails = []
let selectedDate = new Date().toISOString().split('T')[0]
let timeFrom = '00:00'
let timeTo = '23:59'
let activeView = 'emails'

const categoryEmoji = { meeting: '📅', task: '✅', promo: '🏷️', personal: '👤', other: '📧' }
const categoryColor = { meeting: '#2563eb', task: '#7c3aed', promo: '#d97706', personal: '#db2777', other: '#475569' }
const priorityColor = { high: '#dc2626', medium: '#d97706', low: '#16a34a' }

chrome.storage.local.get(['ed_token', 'ed_pinned'], (result) => {
  if (result.ed_token) savedToken = result.ed_token
  if (result.ed_pinned) pinnedEmails = result.ed_pinned
})

function envelopeIcon() {
  return `<svg width="22" height="22" viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="96" height="66" rx="8" fill="white" opacity="0.9"/>
    <polygon points="2,2 50,38 98,2" fill="rgba(255,255,255,0.6)"/>
    <line x1="2" y1="68" x2="34" y2="36" stroke="white" stroke-width="2" opacity="0.6"/>
    <line x1="98" y1="68" x2="66" y2="36" stroke="white" stroke-width="2" opacity="0.6"/>
    <circle cx="30" cy="52" r="4" fill="white" opacity="0.8"/>
    <circle cx="50" cy="57" r="4" fill="white" opacity="0.8"/>
    <circle cx="70" cy="52" r="4" fill="white" opacity="0.8"/>
  </svg>`
}

function showLoginScreen() {
  const contentEl = document.getElementById('ed-content')
  if (!contentEl) return
  contentEl.innerHTML = `
    <div style="text-align:center;padding:2.5rem 1.5rem;">
      <div style="width:60px;height:60px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.8rem;">✉️</div>
      <h2 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:0 0 0.5rem;">Welcome to EmailDigest</h2>
      <p style="font-size:0.82rem;color:#64748b;margin:0 0 2rem;line-height:1.6;">AI-powered email summaries right inside Gmail</p>
      <button id="ed-login-btn" style="
        background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:white;border:none;border-radius:12px;
        padding:0.875rem 1.5rem;font-size:0.9rem;
        cursor:pointer;width:100%;font-weight:600;
        box-shadow:0 4px 15px rgba(99,102,241,0.4);
        margin-bottom:0.75rem;
      ">🔗 Connect with Google</button>
      <p style="font-size:0.7rem;color:#94a3b8;margin-bottom:0.5rem;">We only read your emails — never send or delete anything</p>
      <a href="${SITE_URL}/privacy" target="_blank" style="font-size:0.7rem;color:#6366f1;display:block;">📄 Read our Privacy Policy</a>
    </div>
  `

  document.getElementById('ed-login-btn').addEventListener('click', () => {
    document.getElementById('ed-content').innerHTML = `
      <div style="text-align:center;padding:2rem;color:#64748b;">
        <div style="font-size:2.5rem;margin-bottom:1rem;">⏳</div>
        <p style="font-size:0.9rem;font-weight:600;color:#1e293b;margin-bottom:0.5rem;">Opening Google login...</p>
        <p style="font-size:0.75rem;color:#94a3b8;line-height:1.6;margin-bottom:1.5rem;">Complete the login in the new tab.<br>Then click the button below.</p>
        <button id="ed-done-btn" style="
          background:#16a34a;color:white;border:none;border-radius:10px;
          padding:0.75rem 1.5rem;cursor:pointer;font-size:0.9rem;font-weight:600;width:100%;
        ">✅ Done! Load My Emails</button>
      </div>
    `
    window.open(`${SITE_URL}/popup`, '_blank')
    document.getElementById('ed-done-btn').addEventListener('click', async () => {
      chrome.storage.local.get(['ed_token'], async (result) => {
        if (result.ed_token) {
          savedToken = result.ed_token
          emailsData = []
          await fetchEmails()
        } else {
          showLoginScreen()
        }
      })
    })
  })
}

function getFilteredByTime(emails) {
  return emails.filter(email => {
    const emailTime = new Date(email.date)
    const [fromH, fromM] = timeFrom.split(':').map(Number)
    const [toH, toM] = timeTo.split(':').map(Number)
    const emailH = emailTime.getHours()
    const emailMin = emailTime.getMinutes()
    const emailMins = emailH * 60 + emailMin
    const fromMins = fromH * 60 + fromM
    const toMins = toH * 60 + toM
    return emailMins >= fromMins && emailMins <= toMins
  })
}

function togglePin(email) {
  const idx = pinnedEmails.findIndex(p => p.id === email.id)
  if (idx === -1) {
    pinnedEmails.push(email)
  } else {
    pinnedEmails.splice(idx, 1)
  }
  chrome.storage.local.set({ ed_pinned: pinnedEmails })
  renderEmails()
}

function isPinned(emailId) {
  return pinnedEmails.some(p => p.id === emailId)
}

function renderToolbar() {
  return `
    <div style="background:#fff;border-bottom:1px solid #e2e8f0;padding:0.6rem 0.75rem;">
      <div style="display:flex;gap:0.4rem;margin-bottom:0.6rem;">
        <button data-view="emails" style="
          flex:1;padding:0.3rem;border-radius:8px;font-size:0.72rem;cursor:pointer;border:none;
          background:${activeView === 'emails' ? '#6366f1' : '#f1f5f9'};
          color:${activeView === 'emails' ? 'white' : '#64748b'};
          font-weight:${activeView === 'emails' ? '600' : '400'};
        ">📧 Emails</button>
        <button data-view="pinned" style="
          flex:1;padding:0.3rem;border-radius:8px;font-size:0.72rem;cursor:pointer;border:none;
          background:${activeView === 'pinned' ? '#6366f1' : '#f1f5f9'};
          color:${activeView === 'pinned' ? 'white' : '#64748b'};
          font-weight:${activeView === 'pinned' ? '600' : '400'};
        ">📌 Pinned (${pinnedEmails.length})</button>
      </div>
      <div style="display:flex;gap:0.4rem;align-items:center;margin-bottom:0.5rem;">
        <label style="font-size:0.7rem;color:#64748b;white-space:nowrap;">📅 Date:</label>
        <input type="date" id="ed-date-picker" value="${selectedDate}" style="
          flex:1;padding:0.2rem 0.4rem;border:1px solid #e2e8f0;
          border-radius:6px;font-size:0.72rem;color:#1e293b;cursor:pointer;
        "/>
        <button id="ed-date-go" style="
          background:#6366f1;color:white;border:none;
          border-radius:6px;padding:0.25rem 0.5rem;
          cursor:pointer;font-size:0.72rem;font-weight:600;
        ">Go</button>
      </div>
      <div style="display:flex;gap:0.4rem;align-items:center;">
        <label style="font-size:0.7rem;color:#64748b;white-space:nowrap;">⏰ Time:</label>
        <input type="time" id="ed-time-from" value="${timeFrom}" style="
          flex:1;padding:0.2rem 0.3rem;border:1px solid #e2e8f0;
          border-radius:6px;font-size:0.7rem;color:#1e293b;
        "/>
        <span style="font-size:0.7rem;color:#64748b;">to</span>
        <input type="time" id="ed-time-to" value="${timeTo}" style="
          flex:1;padding:0.2rem 0.3rem;border:1px solid #e2e8f0;
          border-radius:6px;font-size:0.7rem;color:#1e293b;
        "/>
        <button id="ed-time-apply" style="
          background:#6366f1;color:white;border:none;
          border-radius:6px;padding:0.25rem 0.5rem;
          cursor:pointer;font-size:0.72rem;font-weight:600;
        ">OK</button>
      </div>
    </div>
  `
}

function renderEmails() {
  const contentEl = document.getElementById('ed-content')
  if (!contentEl) return

  const toolbar = renderToolbar()

  if (activeView === 'pinned') {
    let html = toolbar
    if (pinnedEmails.length === 0) {
      html += `<div style="text-align:center;padding:2rem;color:#64748b;font-size:0.82rem;">No pinned emails yet.<br>Click 🔘 on any email to pin it.</div>`
    } else {
      html += `<div style="padding:0.75rem;">`
      pinnedEmails.forEach(email => { html += renderEmailCard(email) })
      html += `</div>`
    }
    contentEl.innerHTML = html
    attachToolbarEvents()
    attachEmailEvents()
    return
  }

  const timeFiltered = getFilteredByTime(emailsData)
  const categories = ['all', 'meeting', 'task', 'personal', 'other']
  const count = cat => cat === 'all' ? timeFiltered.length : timeFiltered.filter(e => e.category === cat).length
  const filtered = activeCategory === 'all' ? timeFiltered : timeFiltered.filter(e => e.category === activeCategory)
  const urgentEmails = timeFiltered.filter(e => e.action_required || e.importance_score >= 8)

  let html = toolbar

  html += `<div style="display:flex;gap:0.3rem;flex-wrap:wrap;padding:0.5rem 0.75rem;background:#fff;border-bottom:1px solid #e2e8f0;">`
  categories.forEach(cat => {
    html += `<button data-cat="${cat}" style="
      padding:0.2rem 0.5rem;border-radius:12px;font-size:0.65rem;cursor:pointer;
      border:${activeCategory === cat ? 'none' : '1px solid #e2e8f0'};
      background:${activeCategory === cat ? '#6366f1' : '#fff'};
      color:${activeCategory === cat ? 'white' : '#64748b'};
      font-weight:${activeCategory === cat ? 'bold' : 'normal'};
    ">${cat === 'all' ? '📬' : categoryEmoji[cat]} ${cat.charAt(0).toUpperCase()+cat.slice(1)} (${count(cat)})</button>`
  })
  html += `</div>`

  html += `<div style="padding:0.75rem;">`

  if (urgentEmails.length > 0 && activeCategory === 'all') {
    html += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:0.6rem;margin-bottom:0.75rem;">
      <div style="font-size:0.7rem;font-weight:bold;color:#dc2626;margin-bottom:0.4rem;">🚨 URGENT ACTION NEEDED</div>`
    urgentEmails.forEach(e => {
      html += `
        <a href="https://mail.google.com/mail/u/0/#inbox/${e.threadId}" target="_blank" style="
          display:block;
          font-size:0.72rem;color:#b91c1c;
          padding:0.3rem 0.4rem;
          border-bottom:1px solid #fecaca;
          text-decoration:none;
          border-radius:4px;
          cursor:pointer;
        " onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">
          🔴 ${e.subject.slice(0,50)}${e.subject.length>50?'...':''}
        </a>`
    })
    html += `</div>`
  }

  if (filtered.length === 0) {
    html += `<p style="text-align:center;color:#64748b;font-size:0.82rem;padding:2rem;">No emails found for this time range.</p>`
  } else {
    filtered.forEach(email => { html += renderEmailCard(email) })
  }

  html += `</div>`
  contentEl.innerHTML = html
  attachToolbarEvents()
  attachEmailEvents()
}

function renderEmailCard(email) {
  const replyTo = (email.from.match(/<(.+)>/)?.[1] || email.from)
  const pinned = isPinned(email.id)
  return `
    <div style="background:#fff;border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.75rem;
      border:1px solid #e2e8f0;border-left:3px solid ${priorityColor[email.priority]};
      box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.3rem;">
        <div style="font-weight:bold;font-size:0.82rem;color:#1e293b;flex:1;padding-right:0.5rem;">
          ${categoryEmoji[email.category]} ${email.subject}
        </div>
        <button data-pin="${email.id}" style="
          background:${pinned ? '#fef3c7' : '#f1f5f9'};
          border:1px solid ${pinned ? '#f59e0b' : '#e2e8f0'};
          border-radius:6px;padding:0.15rem 0.4rem;
          cursor:pointer;font-size:0.75rem;flex-shrink:0;
        ">${pinned ? '📌' : '🔘'}</button>
      </div>
      <div style="font-size:0.7rem;color:#64748b;margin-bottom:0.4rem;display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;">
        <span>${email.from.replace(/<.*>/,'').trim()}</span>
        <span style="background:${categoryColor[email.category]}15;color:${categoryColor[email.category]};padding:0.1rem 0.35rem;border-radius:3px;font-weight:bold;">${email.category.toUpperCase()}</span>
        <span style="color:#d97706;">⭐ ${email.importance_score}/10</span>
        <span style="color:#94a3b8;">${new Date(email.date).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      <div style="background:#f1f5f9;border-radius:6px;padding:0.5rem 0.6rem;margin-bottom:0.5rem;font-size:0.78rem;color:#475569;line-height:1.6;">
  <div style="color:#6366f1;font-weight:bold;font-size:0.65rem;margin-bottom:0.3rem;">AI SUMMARY</div>
  <div>${email.summary}</div>
</div>
      <div style="display:flex;gap:0.4rem;">
        <a href="https://mail.google.com/mail/u/0/#inbox/${email.threadId}" target="_blank"
          style="padding:0.25rem 0.6rem;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:5px;font-size:0.7rem;text-decoration:none;">👁️ Open</a>
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(replyTo)}&su=${encodeURIComponent('Re: '+email.subject)}" target="_blank"
          style="padding:0.25rem 0.6rem;background:#6366f1;color:white;border:none;border-radius:5px;font-size:0.7rem;text-decoration:none;">↩️ Reply</a>
      </div>
    </div>`
}

function attachToolbarEvents() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = btn.dataset.view
      renderEmails()
    })
  })

  const datePicker = document.getElementById('ed-date-picker')
  const dateGo = document.getElementById('ed-date-go')
  if (dateGo) {
    dateGo.addEventListener('click', () => {
      if (datePicker) selectedDate = datePicker.value
      emailsData = []
      fetchEmails()
    })
  }

  const timeApply = document.getElementById('ed-time-apply')
  if (timeApply) {
    timeApply.addEventListener('click', () => {
      const fromEl = document.getElementById('ed-time-from')
      const toEl = document.getElementById('ed-time-to')
      if (fromEl) timeFrom = fromEl.value
      if (toEl) timeTo = toEl.value
      renderEmails()
    })
  }
}

function attachEmailEvents() {
  document.querySelectorAll('[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat
      renderEmails()
    })
  })

  document.querySelectorAll('[data-pin]').forEach(btn => {
    btn.addEventListener('click', () => {
      const emailId = btn.dataset.pin
      const email = emailsData.find(e => e.id === emailId) || pinnedEmails.find(e => e.id === emailId)
      if (email) togglePin(email)
    })
  })
}

async function fetchEmails() {
  const contentEl = document.getElementById('ed-content')
  if (!contentEl) return

  if (!savedToken) {
    const result = await new Promise(resolve => chrome.storage.local.get(['ed_token'], resolve))
    savedToken = result.ed_token
  }

  if (!savedToken) {
    showLoginScreen()
    return
  }

  contentEl.innerHTML = `
    <div style="text-align:center;padding:2rem;color:#64748b;">
      <div style="font-size:2rem;margin-bottom:0.5rem;">🤖</div>
      <p style="font-size:0.85rem;">AI is reading your emails...</p>
      <p style="font-size:0.72rem;margin-top:0.3rem;color:#94a3b8;">This may take 20-40 seconds</p>
    </div>`

  try {
    const url = `${SITE_URL}/api/emails?date=${selectedDate}`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${savedToken}` }
    })

    if (res.status === 401) {
      savedToken = null
      chrome.storage.local.remove(['ed_token'])
      showLoginScreen()
      return
    }

    const data = await res.json()

    if (!data.emails || data.emails.length === 0) {
      contentEl.innerHTML = `
        <div style="text-align:center;padding:2rem;color:#64748b;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">📭</div>
          <p style="font-size:0.85rem;">No emails found for ${selectedDate}.</p>
        </div>`
      return
    }

    emailsData = data.emails
    renderEmails()

  } catch (err) {
    savedToken = null
    chrome.storage.local.remove(['ed_token'])
    showLoginScreen()
  }
}

function createPanel() {
  const toggleBtn = document.createElement('div')
  toggleBtn.id = 'ed-toggle'
  toggleBtn.style.cssText = `
    position:fixed;right:0;top:50%;transform:translateY(-50%);
    width:40px;height:90px;background:#000000;
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    z-index:9999;border-radius:10px 0 0 10px;
    box-shadow:-2px 0 12px rgba(0,0,0,0.3);
  `
  toggleBtn.innerHTML = envelopeIcon()

  const panel = document.createElement('div')
  panel.id = 'ed-panel'
  panel.style.cssText = `
    position:fixed;right:-420px;top:0;width:400px;height:100vh;
    background:#f8fafc;z-index:9998;box-shadow:-4px 0 20px rgba(0,0,0,0.15);
    transition:right 0.3s ease;display:flex;flex-direction:column;
    font-family:Georgia,serif;border-left:1px solid #e2e8f0;
  `

  const header = document.createElement('div')
  header.style.cssText = `padding:0.75rem 1rem;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;`
  header.innerHTML = `
    <svg width="160" height="38" viewBox="0 0 680 160">
      <defs>
        <linearGradient id="pg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="pkg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
      </defs>
      <rect x="10" y="15" width="80" height="55" rx="8" fill="url(#pg2)"/>
      <polygon points="10,15 50,48 90,15" fill="#4f46e5"/>
      <line x1="10" y1="70" x2="38" y2="44" stroke="white" stroke-width="1.5" opacity="0.4"/>
      <line x1="90" y1="70" x2="62" y2="44" stroke="white" stroke-width="1.5" opacity="0.4"/>
      <circle cx="30" cy="56" r="3" fill="white" opacity="0.6"/>
      <circle cx="50" cy="60" r="3" fill="white" opacity="0.6"/>
      <circle cx="70" cy="56" r="3" fill="white" opacity="0.6"/>
      <rect x="72" y="5" width="26" height="14" rx="7" fill="url(#pkg2)"/>
      <text x="85" y="15.5" text-anchor="middle" font-family="Georgia,serif" font-size="8" font-weight="700" fill="white">AI</text>
      <text x="105" y="48" font-family="Georgia,serif" font-size="28" font-weight="700" fill="#1e293b">Email</text>
      <text x="105" y="80" font-family="Georgia,serif" font-size="28" font-weight="700" fill="url(#pg2)">Digest</text>
    </svg>
    <div style="display:flex;gap:0.5rem;align-items:center;">
      <button id="ed-maximize" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem;color:#475569;">⛶ Full</button>
      <button id="ed-refresh" style="background:#6366f1;border:none;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem;color:white;">🔄</button>
      <button id="ed-logout" style="background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.72rem;color:#dc2626;">Logout</button>
      <button id="ed-close" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#94a3b8;">✕</button>
    </div>
  `

  const contentDiv = document.createElement('div')
  contentDiv.id = 'ed-content'
  contentDiv.style.cssText = `flex:1;overflow-y:auto;`

  panel.appendChild(header)
  panel.appendChild(contentDiv)
  document.body.appendChild(toggleBtn)
  document.body.appendChild(panel)

  toggleBtn.addEventListener('click', () => {
    panelOpen = !panelOpen
    if (panelOpen) {
      panel.style.right = '0'
      toggleBtn.style.right = '400px'
      toggleBtn.innerHTML = `<span style="color:white;font-size:1.2rem;">✕</span>`
      if (emailsData.length === 0) fetchEmails()
    } else {
      panel.style.right = '-420px'
      toggleBtn.style.right = '0'
      toggleBtn.innerHTML = envelopeIcon()
      isMaximized = false
      panel.style.width = '400px'
    }
  })

  document.getElementById('ed-close').addEventListener('click', () => {
    panelOpen = false
    isMaximized = false
    panel.style.right = '-420px'
    panel.style.width = '400px'
    toggleBtn.style.right = '0'
    toggleBtn.innerHTML = envelopeIcon()
  })

  document.getElementById('ed-logout').addEventListener('click', () => {
    savedToken = null
    emailsData = []
    pinnedEmails = []
    chrome.storage.local.remove(['ed_token', 'ed_pinned'])
    showLoginScreen()
  })

  document.getElementById('ed-refresh').addEventListener('click', () => {
    emailsData = []
    fetchEmails()
  })

  document.getElementById('ed-maximize').addEventListener('click', () => {
    isMaximized = !isMaximized
    if (isMaximized) {
      panel.style.width = '100vw'
      panel.style.right = '0'
      document.getElementById('ed-maximize').textContent = '⛶ Restore'
      toggleBtn.style.display = 'none'
    } else {
      panel.style.width = '400px'
      panel.style.right = '0'
      document.getElementById('ed-maximize').textContent = '⛶ Full'
      toggleBtn.style.display = 'flex'
      toggleBtn.style.right = '400px'
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPanel)
} else {
  createPanel()
}