# 🛶 포근한 글쓰기

> 포근나루(POGNARU STUDIO)의 글쓰기 도구.

**→ [pognaru.github.io/pognaru-writing](https://pognaru.github.io/pognaru-writing/)**

`main` 브랜치에 푸시하면 GitHub Actions가 빌드해 GitHub Pages로 자동 배포합니다.

- **초고 모드** — 백스페이스 없이 앞으로만 쓰기
- **퇴고 모드** — 자유롭게 수정
- **몽롱쓰기 타이머** — 집중 글쓰기 타이머
- **문장 보기** — 문장별 형광펜 표시
- **단어 분석** — 반복 단어 체크
- **버전 스냅샷 / 마크다운 내보내기**

모든 글은 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.

## 개발

```bash
npm install
npm run dev    # 개발 서버
npm run build  # dist/ 빌드
```

포근나루 × Claude

## 파비콘

브라우저 탭 아이콘으로 포근나루 심볼(나룻배)을 쓴다. 2026-07-22 적용.

```
public/favicon-32.png     탭 아이콘
public/favicon-180.png    애플 터치 아이콘
```

Vite 앱이므로 정적 자산은 `public/`에 둔다. 빌드하면 `dist/` 루트로 복사된다.
`index.html`에서는 `/favicon-32.png`로 참조하는데, Vite가 `base`(`/pognaru-writing/`)를 앞에 붙여 실제로는 `/pognaru-writing/favicon-32.png`로 나간다. 그래서 여기서는 루트 절대경로가 맞다.

원본은 볼트 `클로드 에이전트/브랜드/로고/`에 있다.
