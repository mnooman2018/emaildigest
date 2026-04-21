// background.js — listens for token from the web app and saves to chrome.storage

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When the extension-auth page finishes loading, grab the token from it
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('emaildigest-kappa.vercel.app/extension-auth')
  ) {
    // Execute script in that tab to read localStorage
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const token = localStorage.getItem('ed_pending_token')
        const ts = localStorage.getItem('ed_pending_token_ts')
        return { token, ts }
      }
    }, (results) => {
      if (results && results[0] && results[0].result && results[0].result.token) {
        const { token } = results[0].result
        // Save to chrome.storage so content.js can read it
        chrome.storage.local.set({ ed_token: token }, () => {
          console.log('EmailDigest: token saved to chrome.storage ✅')
        })
      }
    })
  }
})