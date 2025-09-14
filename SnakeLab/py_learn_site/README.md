# PyStart – Learn Python (Flask + Socket.IO)

Features
- Beginner-friendly lesson about `print()` and variables.
- Live Python runner in the browser via Pyodide (no server code execution).
- Minimal, one-time local account: username + display name. Multiple accounts can be added; data stored in localStorage.
- Global chat via Socket.IO.
- i18n with English, Russian, Spanish preloaded (easily extensible).

## Run locally

1. Create and activate a virtual environment (optional).
2. Install deps:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the app:
   ```bash
   python app.py
   ```
4. Open http://localhost:5000

## Add more languages
Edit `/static/app.js` resources object. Duplicate `en` and translate keys. Add the language code to `supportedLangs`.
