const SITE_URL = 'https://emaildigest-kappa.vercel.app'

let panelOpen = false
let isMaximized = false

function createPanel() {
  const toggleBtn = document.createElement('div')
  toggleBtn.id = 'emaildigest-toggle'
  toggleBtn.title = 'EmailDigest AI'
  toggleBtn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 90px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    border-radius: 10px 0 0 10px;
    box-shadow: -2px 0 12px rgba(99,102,241,0.3);
  `

  toggleBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="96" height="66" rx="8" fill="white" opacity="0.9"/>
      <polygon points="2,2 50,38 98,2" fill="rgba(99,102,241,0.8)"/>
      <line x1="2" y1="68" x2="34" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
      <line x1="98" y1="68" x2="66" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
      <circle cx="30" cy="52" r="4" fill="white" opacity="0.7"/>
      <circle cx="50" cy="57" r="4" fill="white" opacity="0.7"/>
      <circle cx="70" cy="52" r="4" fill="white" opacity="0.7"/>
    </svg>
  `

  const panel = document.createElement('div')
  panel.id = 'emaildigest-panel'
  panel.style.cssText = `
    position: fixed;
    right: -420px;
    top: 0;
    width: 400px;
    height: 100vh;
    background: #f8fafc;
    z-index: 9998;
    box-shadow: -4px 0 20px rgba(0,0,0,0.15);
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    font-family: Georgia, serif;
    border-left: 1px solid #e2e8f0;
  `

  const header = document.createElement('div')
  header.style.cssText = `
    padding: 0.75rem 1rem;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  `
  header.innerHTML = `
    <svg width="130" height="30" viewBox="0 0 680 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
        <linearGradient id="pkg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
      </defs>
      <rect x="10" y="15" width="80" height="55" rx="8" fill="url(#pg)"/>
      <polygon points="10,15 50,48 90,15" fill="#4f46e5"/>
      <line x1="10" y1="70" x2="38" y2="44" stroke="white" stroke-width="1.5" opacity="0.4"/>
      <line x1="90" y1="70" x2="62" y2="44" stroke="white" stroke-width="1.5" opacity="0.4"/>
      <circle cx="30" cy="56" r="3" fill="white" opacity="0.6"/>
      <circle cx="50" cy="60" r="3" fill="white" opacity="0.6"/>
      <circle cx="70" cy="56" r="3" fill="white" opacity="0.6"/>
      <rect x="72" y="5" width="26" height="14" rx="7" fill="url(#pkg)"/>
      <text x="85" y="15.5" text-anchor="middle" font-family="Georgia, serif" font-size="8" font-weight="700" fill="white">AI</text>
      <text x="105" y="48" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#1e293b">Email</text>
      <text x="105" y="80" font-family="Georgia, serif" font-size="28" font-weight="700" fill="url(#pg)">Digest</text>
    </svg>
    <div style="display:flex;gap:0.5rem;align-items:center">
      <button id="ed-maximize" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem;color:#475569">⛶ Full</button>
      <button id="ed-close" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#94a3b8">✕</button>
    </div>
  `

  const iframe = document.createElement('iframe')
  iframe.src = SITE_URL
  iframe.style.cssText = `
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
  `

  panel.appendChild(header)
  panel.appendChild(iframe)
  document.body.appendChild(toggleBtn)
  document.body.appendChild(panel)

  toggleBtn.addEventListener('click', () => {
    panelOpen = !panelOpen
    if (panelOpen) {
      panel.style.right = '0'
      toggleBtn.style.right = '400px'
      toggleBtn.innerHTML = `<span style="color:white;font-size:1.2rem">✕</span>`
    } else {
      panel.style.right = '-420px'
      toggleBtn.style.right = '0'
      toggleBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="96" height="66" rx="8" fill="white" opacity="0.9"/>
          <polygon points="2,2 50,38 98,2" fill="rgba(99,102,241,0.8)"/>
          <line x1="2" y1="68" x2="34" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
          <line x1="98" y1="68" x2="66" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
          <circle cx="30" cy="52" r="4" fill="white" opacity="0.7"/>
          <circle cx="50" cy="57" r="4" fill="white" opacity="0.7"/>
          <circle cx="70" cy="52" r="4" fill="white" opacity="0.7"/>
        </svg>
      `
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
    toggleBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="96" height="66" rx="8" fill="white" opacity="0.9"/>
        <polygon points="2,2 50,38 98,2" fill="rgba(99,102,241,0.8)"/>
        <line x1="2" y1="68" x2="34" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
        <line x1="98" y1="68" x2="66" y2="36" stroke="white" stroke-width="2" opacity="0.5"/>
        <circle cx="30" cy="52" r="4" fill="white" opacity="0.7"/>
        <circle cx="50" cy="57" r="4" fill="white" opacity="0.7"/>
        <circle cx="70" cy="52" r="4" fill="white" opacity="0.7"/>
      </svg>
    `
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