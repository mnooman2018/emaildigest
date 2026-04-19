// This runs on the extension-auth page and captures the token
window.addEventListener('message', (e) => {
  if (e.data?.type === 'ed-save-token' && e.data.token) {
    chrome.storage.local.set({ ed_token: e.data.token }, () => {
      console.log('EmailDigest: Token saved successfully')
    })
  }
})