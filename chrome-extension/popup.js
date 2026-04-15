const SITE_URL = 'https://emaildigest-kappa.vercel.app'

// Simply open the website — it handles login automatically
// If logged in → shows dashboard
// If not logged in → shows login page
chrome.tabs.create({ url: SITE_URL })
window.close()