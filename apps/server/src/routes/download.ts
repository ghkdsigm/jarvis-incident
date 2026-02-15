import { FastifyInstance } from "fastify";

const DOWNLOAD_EXE_URL = "http://54.66.155.158:9000/DW-BRAIN-Setup.exe";

function renderDownloadPageHtml() {
  // NOTE: Hardcoded per requirement (version / date)
  const version = "v0.1.1";
  const updatedAt = "2026-02-16";

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DW-BRAIN Windows 다운로드</title>
    <meta name="robots" content="noindex" />
    <style>
      :root {
        --bg: #0b1020;
        --card: rgba(255, 255, 255, 0.06);
        --cardBorder: rgba(255, 255, 255, 0.12);
        --text: rgba(255, 255, 255, 0.92);
        --muted: rgba(255, 255, 255, 0.72);
        --faint: rgba(255, 255, 255, 0.58);
        --accent: #5eead4;
        --accent2: #60a5fa;
        --btn: #2563eb;
        --btnHover: #1d4ed8;
      }
      * { box-sizing: border-box; }
      html, body { height: 100%; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
        color: var(--text);
        background:
          radial-gradient(900px 500px at 20% 10%, rgba(96, 165, 250, 0.25), transparent 60%),
          radial-gradient(800px 600px at 80% 20%, rgba(94, 234, 212, 0.20), transparent 55%),
          radial-gradient(900px 700px at 50% 100%, rgba(37, 99, 235, 0.18), transparent 60%),
          var(--bg);
      }
      a { color: inherit; }
      .wrap {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px 56px;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .logo {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(96,165,250,0.95), rgba(94,234,212,0.85));
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        position: relative;
        flex: 0 0 auto;
      }
      .logo:after{
        content:"";
        position:absolute;
        inset: 10px 12px;
        border-radius: 10px;
        background: rgba(11,16,32,0.55);
        border: 1px solid rgba(255,255,255,0.18);
      }
      .titleWrap { min-width: 0; }
      .title {
        font-size: 22px;
        font-weight: 750;
        letter-spacing: -0.02em;
        margin: 0;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .subtitle {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 14px;
      }
      .meta {
        color: var(--faint);
        font-size: 12px;
        text-align: right;
        white-space: nowrap;
      }

      .card {
        margin-top: 18px;
        padding: 22px;
        background: var(--card);
        border: 1px solid var(--cardBorder);
        border-radius: 18px;
        box-shadow: 0 18px 45px rgba(0,0,0,0.30);
        backdrop-filter: blur(10px);
      }
      .ctaRow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        margin: 14px 0 6px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        height: 48px;
        padding: 0 16px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: linear-gradient(180deg, rgba(37,99,235,0.95), rgba(29,78,216,0.95));
        color: white;
        text-decoration: none;
        font-weight: 700;
        letter-spacing: -0.01em;
        box-shadow: 0 12px 30px rgba(37,99,235,0.22);
        transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
      }
      .btn:hover { transform: translateY(-1px); filter: brightness(1.03); box-shadow: 0 16px 34px rgba(37,99,235,0.28); }
      .btn:active { transform: translateY(0px); }
      .hint {
        color: var(--muted);
        font-size: 13px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      @media (min-width: 760px) {
        .grid { grid-template-columns: 1fr 1fr; }
      }
      .box {
        padding: 16px 16px 14px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
      }
      .box h3 {
        margin: 0 0 8px;
        font-size: 14px;
        letter-spacing: -0.01em;
      }
      .box ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.55;
      }
      .box p {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.55;
      }
      .footer {
        margin-top: 14px;
        color: var(--faint);
        font-size: 12px;
        line-height: 1.55;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.95em;
        color: rgba(255,255,255,0.86);
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <header class="top">
        <div class="brand">
          <div class="logo" aria-hidden="true"></div>
          <div class="titleWrap">
            <h1 class="title">DW-BRAIN</h1>
            <p class="subtitle">Windows 다운로드</p>
          </div>
        </div>
        <div class="meta">
          <div>${version}</div>
          <div>${updatedAt}</div>
        </div>
      </header>

      <section class="card" aria-label="다운로드">
        <div class="ctaRow">
          <a class="btn" href="/download/windows">DW-BRAIN 다운로드 (Windows)</a>
          <div class="hint">버튼 클릭 시 최신 설치 파일을 내려받습니다.</div>
        </div>
        <div class="footer">
          고정 다운로드 URL: <code>${DOWNLOAD_EXE_URL}</code>
        </div>

        <div class="grid">
          <div class="box">
            <h3>설치 방법</h3>
            <ul>
              <li>다운로드한 <code>DW-BRAIN-Setup.exe</code>를 실행합니다.</li>
              <li>Windows 보안 경고가 표시되면 안내를 확인하고 계속 진행합니다.</li>
              <li>설치 후 바탕화면/시작 메뉴에서 DW-BRAIN을 실행합니다.</li>
            </ul>
          </div>
          <div class="box">
            <h3>시스템 요구사항</h3>
            <p>Windows 10/11 (x64)</p>
          </div>
          <div class="box">
            <h3>보안 경고 안내</h3>
            <p>
              현재 설치 파일은 코드 서명이 없어 Windows SmartScreen 경고가 나타날 수 있습니다.
              신뢰할 수 있는 배포 경로에서 받은 파일인지 확인한 뒤 실행하세요.
            </p>
          </div>
          <div class="box">
            <h3>업데이트</h3>
            <p>
              새 버전 배포 시 동일한 파일명으로 덮어쓰며,
              이 페이지의 버튼은 항상 최신 파일을 가리킵니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export async function downloadRoutes(app: FastifyInstance) {
  // Static download page
  app.get("/download", async (_req, reply) => {
    return reply
      .type("text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .send(renderDownloadPageHtml());
  });

  // Optional: stable redirect endpoint for Windows installer
  app.get("/download/windows", async (_req, reply) => {
    return reply.redirect(DOWNLOAD_EXE_URL, 302);
  });
}


