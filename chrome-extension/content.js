// EmailDigest Gmail Panel
const SITE_URL = 'https://emaildigest-kappa.vercel.app'

let panelOpen = false
let isMaximized = false

function createPanel() {
  // Create toggle button
  const toggleBtn = document.createElement('div')
  toggleBtn.id = 'emaildigest-toggle'
  toggleBtn.innerHTML = '✉️'
  toggleBtn.title = 'EmailDigest AI'
  toggleBtn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 80px;
    background: #6366f1;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    border-radius: 8px 0 0 8px;
    font-size: 1.2rem;
    box-shadow: -2px 0 10px rgba(0,0,0,0.15);
    writing-mode: vertical-rl;
    font-style: normal;
  `

  // Create panel
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

  // Panel header
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
    <div style="display:flex;align-items:center;gap:0.5rem">
      <span style="font-size:1.1rem">✉️</span>
      <span style="font-weight:700;color:#1e293b;font-size:0.95rem">EmailDigest AI</span>
    </div>
    <div style="display:flex;gap:0.5rem;align-items:center">
      <button id="ed-maximize" title="Maximize" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.8rem;color:#475569">⛶ Full</button>
      <button id="ed-close" style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:#94a3b8">✕</button>
    </div>
  `

  // Panel iframe
  const iframe = document.createElement('iframe')
  iframe.src = SITE_URL + '/dashboard'
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

  // Toggle button click
  toggleBtn.addEventListener('click', () => {
    panelOpen = !panelOpen
    if (panelOpen) {
      panel.style.right = '0'
      toggleBtn.style.right = '400px'
      toggleBtn.innerHTML = '✕'
    } else {
      panel.style.right = isMaximized ? '-100vw' : '-420px'
      toggleBtn.style.right = '0'
      toggleBtn.innerHTML = '✉️'
      isMaximized = false
      panel.style.width = '400px'
    }
  })

  // Close button
  document.getElementById('ed-close').addEventListener('click', () => {
    panelOpen = false
    isMaximized = false
    panel.style.right = '-420px'
    panel.style.width = '400px'
    toggleBtn.style.right = '0'
    toggleBtn.innerHTML = '✉️'
  })

  // Maximize button
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

// Wait for Gmail to load then inject
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPanel)
} else {
  createPanel()
}