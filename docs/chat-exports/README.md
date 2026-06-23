# chat-exports

Cursor Agent 대화 export를 Git으로 동기화하는 폴더입니다.

## 사용법

1. Cursor 채팅 → **Export Transcript** (마크다운)
2. `docs/chat-exports/YYYY-MM-DD-주제.md` 로 저장
3. `git commit` → `push`
4. 다른 PC: `git pull` → `@docs/chat-exports/파일.md` + 「이 대화 이어서 작업해줘」

짧은 맥락만 필요하면 [SESSION_HANDOFF.md](../SESSION_HANDOFF.md) 만 갱신해도 됩니다.

전체 환경 설정: [SETUP.md](../SETUP.md)
