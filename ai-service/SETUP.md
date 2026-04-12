# AI Service — Setup & Run Guide

FastAPI + Groq service that powers the Client Interview chat in the Practice Lab.

---

## 1. Install Python

### Windows
1. Go to https://www.python.org/downloads/ and download **Python 3.11** or later
2. Run the installer — **check "Add Python to PATH"** before clicking Install
3. Verify in a new terminal:
   ```
   python --version
   ```

### Ubuntu / Debian (Linux server)
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip -y
python3.11 --version
```

### CentOS / RHEL / Amazon Linux
```bash
sudo yum install python3 python3-pip -y
# or with dnf:
sudo dnf install python3.11 python3.11-pip -y
python3 --version
```

---

## 2. Get a Groq API Key (free)

1. Go to https://console.groq.com and sign up (free, no credit card)
2. Navigate to **API Keys** → **Create API Key**
3. Copy the key — you will need it in step 5

---

## 3. Navigate to the ai-service folder

```bash
cd /path/to/ElearningPlatform/ai-service
```

---

## 4. Create a virtual environment

A virtual environment keeps dependencies isolated.

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

You will see `(venv)` at the start of your prompt when it is active.

---

## 5. Create the .env file

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Open `.env` and fill in your values:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx   # from step 2
INTERNAL_SECRET=internal-secret-token           # must match AI_INTERNAL_SECRET in Next.js .env
PORT=8000
```

> The `INTERNAL_SECRET` must exactly match the value of `AI_INTERNAL_SECRET` in the
> Next.js `.env` file so that requests from Next.js are accepted.

---

## 6. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 7. Run the service

### Development (with auto-reload)
```bash
uvicorn main:app --reload --port 8000
```

### Production (without auto-reload)
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

Test it is running:
```bash
curl http://localhost:8000/health
# expected: {"status":"ok"}
```

---

## 8. Keep it running on a Linux server (PM2 or systemd)

### Option A — PM2 (recommended if you already use PM2 for Next.js)

```bash
# Install PM2 if not already installed
npm install -g pm2

pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2" \
  --name ai-service \
  --cwd /path/to/ElearningPlatform/ai-service \
  --interpreter /path/to/ElearningPlatform/ai-service/venv/bin/python

pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

### Option B — systemd service

Create `/etc/systemd/system/ai-service.service`:

```ini
[Unit]
Description=LedX AI Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/path/to/ElearningPlatform/ai-service
ExecStart=/path/to/ElearningPlatform/ai-service/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
EnvironmentFile=/path/to/ElearningPlatform/ai-service/.env

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-service
sudo systemctl start ai-service
sudo systemctl status ai-service
```

---

## 9. Connect Next.js to the service

In the Next.js `.env` (or `.env.local`), set:

```env
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_SECRET=internal-secret-token   # same as INTERNAL_SECRET in ai-service .env
```

If the service runs on a different machine or port, replace `localhost:8000` accordingly.

---

## API Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/health` | Health check — no auth required | JSON |
| POST | `/chat` | LexAI tutor chat | SSE stream |
| POST | `/interview/chat` | Client interview roleplay | SSE stream |
| POST | `/interview/report` | Interview evaluation report | JSON |
| POST | `/drafting/analyze` | Draft evaluation report | JSON |
| POST | `/drafting/chat` | Draft tutor chat | SSE stream |

All endpoints (except `/health`) require the header:
```
x-internal-key: <INTERNAL_SECRET>
```

Health check response format:
```json
{"status": "ok", "version": "2.0.0"}
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError` | Make sure `(venv)` is active and you ran `pip install -r requirements.txt` |
| `GROQ_API_KEY is not set` | Check your `.env` file exists and is filled in |
| `401 Unauthorized` | `INTERNAL_SECRET` in ai-service `.env` does not match `AI_INTERNAL_SECRET` in Next.js `.env` |
| Port already in use | Change `PORT=8000` to another port and update `AI_SERVICE_URL` in Next.js |
| Next.js gets 502 Bad Gateway | The ai-service is not running — check with `curl http://localhost:8000/health` |
