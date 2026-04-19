window.addEventListener('message', (e) => {
  if (e.data?.type === 'ed-save-token' && e.data.token) {
    chrome.storage.local.set({ ed_token: e.data.token }, () => {
      console.log('EmailDigest: Token saved!')
    })
  }
})

// Also check URL params directly
const params = new URLSearchParams(window.location.search)
const token = params.get('token')
if (token) {
  chrome.storage.local.set({ ed_token: token }, () => {
    console.log('EmailDigest: Token saved from URL!')
  })
}