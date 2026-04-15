const API_URL = 'https://emaildigest-kappa.vercel.app'

async function checkAndRedirect() {
  document.getElementById('emoji').textContent = '⏳'
  document.getElementById('msg').textContent = 'Checking login status...'
  document.getElementById('msg').className = ''
  document.getElementById('tryAgain').style.display = 'none'

  try {
    const res = await fetch(`${API_URL}/api/emails`, {
      credentials: 'include',
    })

    if (res.status === 401) {
      chrome.tabs.create({ url: API_URL })
      window.close()
      return
    }

    chrome.tabs.create({ url: `${API_URL}/dashboard` })
    window.close()

  } catch (err) {
    document.getElementById('emoji').textContent = '❌'
    document.getElementById('msg').textContent = 'Could not connect. Make sure your app is running at localhost:3000'
    document.getElementById('msg').className = 'error'
    document.getElementById('tryAgain').style.display = 'inline-block'
  }
}

document.getElementById('tryAgain').addEventListener('click', checkAndRedirect)

checkAndRedirect()