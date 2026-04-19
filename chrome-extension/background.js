// Listen for messages from extension-auth page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'save-token') {
    chrome.storage.local.set({ ed_token: message.token }, () => {
      sendResponse({ success: true })
    })
    return true
  }
})