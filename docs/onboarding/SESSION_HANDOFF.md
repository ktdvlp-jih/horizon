# PC 전환 · 맥락 동기화

> **처음 설정:** [SETUP.md](SETUP.md) · **문서 목록:** [README.md](README.md)

---

## 아키텍처 (확정)

| 역할 | 방식 |
|------|------|
| **DB** | 집 PC Docker Postgres (`55432`) — 클라oud DB 없음 |
| **밖에서 개발** | Tailscale + `ssh-db-tunnel-tailscale.bat` |
| **배포** | `master` push → GitHub Actions + Tailscale SSH |
| **데모** | `start_trycloudflare.bat` → `:9080` |
| **Git push** | SSH (`setup-github-ssh.ps1`) — PC마다 1회 |

---

## 새 PC 빠른 시작

### 개발 PC로 전환

```text
1. git clone / git pull
2. SETUP.md §4 — JDK/Node/Python/Tailscale
3. copy .env.dev.remote.example → .env.dev  (.env는 git 제외 → 수동 복사)
4. scripts\ssh-db-tunnel-tailscale.bat — IP/USER 수정
5. setup-github-ssh.ps1 — GitHub SSH key 등록
6. 매일: 터널 → bootRun → npm run dev
```

### 집 PC로 전환

```text
1. git pull
2. copy .env.example → .env (최초)
3. docker compose up -d
4. SETUP.md §2 — sshd, deploy-ssh, deploy-task (1회)
5. SETUP.md §3 — GitHub Secrets (1회)
```

---

## 환경 값 기록 (팀/본인용 — 아래 수정 후 commit)

> **민감 정보(비밀번호·키)는 적지 마세요.** IP·사용자명만.

| 항목 | 값 |
|------|-----|
| GitHub repo | `ktdvlp-jih/horizon` |
| 집 PC Tailscale IP | `100.x.x.x` (`tailscale ip -4`) |
| 집 PC Windows 사용자 | `<HOME_USER>` |
| 집 PC LAN IP (참고) | `192.168.x.x` |
| SSH 터널 DB | `localhost:55432` → 집 Docker Postgres |

### 포트

| | 개발 PC | 집 PC Docker |
|--|---------|--------------|
| App | 5173 | **9080** |
| Spring | 8080 | (내부 8080) |
| AI | 8000 | **9800** |
| DB | 55432 (터널) | **55432** |
| Admin | 5174 | `/admin` on 9080 |

---

## Cursor 대화 동기화

### SpecStory + Git (확정 — PC 간 채팅 이력)

1. 양쪽 PC에 **SpecStory** 확장 설치
2. 채팅은 `.specstory/history/*.md`에 **자동 저장**
3. PC 바꾸기 전:

```powershell
git add .specstory
git commit -m "SpecStory 채팅 이력 동기화"
git push
```

4. 다른 PC: `git pull`
5. SpecStory 패널 또는 `@.specstory/history/...` 로 이전 대화 참조

> `.specstory/statistics.json`만 `.gitignore`. **history는 commit 대상.**

### Export Transcript (보조)

1. Cursor → Export Transcript
2. `docs/chat-exports/YYYY-MM-DD-주제.md`
3. `git commit` + `push`

### 이 문서 (SESSION_HANDOFF)

IP·체크리스트만 짧게 유지. 변경 시 commit.

---

## 체크리스트 (파이프라인 전체)

**집 PC**

- [ ] Docker + `.env` + health 9080
- [ ] Tailscale + IP 기록
- [ ] `setup-deploy-ssh.ps1` (관리자)
- [ ] `setup-deploy-task.ps1` (관리자)
- [ ] GitHub Secrets ×4
- [ ] Actions 성공 1회

**개발 PC**

- [ ] `.env.dev` + npm/pip
- [ ] `ssh-db-tunnel-tailscale.bat` 설정
- [ ] `setup-github-ssh.ps1`
- [ ] 터널 + bootRun + dev 동작

**배포**

- [ ] `master` push → Actions green

---

## 관련 문서

- [SETUP.md](SETUP.md)
- [DEV_SETUP.md](DEV_SETUP.md)
- [DEPLOY.md](DEPLOY.md)
- [CLOUDFLARE_TUNNEL.md](CLOUDFLARE_TUNNEL.md)
