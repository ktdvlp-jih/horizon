#!/usr/bin/env python3
"""Generate hackathon development plan (양식2) as HWPX with Nanum Gothic (OFL, commercial OK)."""

from __future__ import annotations

import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "docs" / "기상·기후+AI+해커톤+경진대회_공고문.hwpx"
OUTPUT = ROOT / "docs" / "개발계획서_도시기후설계자.hwpx"

# 나눔고딕 — 네이버, SIL Open Font License, 상업적 이용 무료
FONT_HANGUL = "나눔고딕"
FONT_LATIN = "NanumGothic"

# Template style refs (from 공고문 hwpx)
PARA_NORMAL = "34"
PARA_TITLE = "34"
CHAR_NORMAL = "18"
CHAR_BOLD = "19"  # fallback; template may differ


def _para(text: str, *, bold: bool = False, para_id: int = 0) -> str:
    cid = CHAR_BOLD if bold else CHAR_NORMAL
    pid = PARA_TITLE if bold else PARA_NORMAL
    t = escape(text)
    return (
        f'<hp:p id="{para_id}" paraPrIDRef="{pid}" styleIDRef="0" '
        f'pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="{cid}"><hp:t>{t}</hp:t></hp:run></hp:p>'
    )


def _blank(para_id: int) -> str:
    return _para("", para_id=para_id)


def build_section_body() -> list[tuple[str, bool]]:
    """(text, bold) paragraphs — kept within ~5 pages at 12pt."""
    lines: list[tuple[str, bool]] = [
        ("개발계획서 (양식2)", True),
        ("", False),
        ("프로젝트명", True),
        ("도시 기후 설계자 — 도시 기후 회복탄력성 시뮬레이터", False),
        ("", False),
        ("1. 개발 목적 및 필요성 ※주제 적합성 (20점)", True),
        (
            "기후·기상·대기·기후적응(농어업)을 ‘설명’이 아닌 ‘직접 설계 실험’으로 체득하는 "
            "AI 활용 체험·참여형 웹 시뮬레이터를 개발한다. 사용자는 도시 격자에 건물·녹지·수변·"
            "방재·산업 시설 등을 배치하고, 동일 설계를 열섬·미세먼지·재난·농어업 4축으로 동시에 "
            "평가하여 ‘회복탄력성’ 관점의 균형 잡힌 도시 설계를 학습한다.",
            False,
        ),
        (
            "기존 기상 교육은 영상·문서 중심의 단방향 전달에 머무는 경우가 많아, "
            "변수 조작→결과 확인→재설계의 양방향 루프가 부족하다. 본 프로젝트는 "
            "기상청 실측·관측 데이터를 baseline으로 활용하고, AI 코치가 다축 평가 결과를 "
            "해석·피드백하여 데이터·AI 융합 기상·기후 교육 역량을 강화한다.",
            False,
        ),
        ("", False),
        ("2. 사용자", True),
        ("주 사용자: 중·고등학생, 기후·재난 안전·환경 교육 수강 일반인.", False),
        ("부 사용자: 기상·기후 교육 담당 교사(수업·시연용).", False),
        ("", False),
        ("3. 개발 형태", True),
        (
            "웹 기반 인터랙티브 시뮬레이터. 심사·발표 시 심사위원 기기에서 URL 접속 즉시 "
            "기능 확인 가능(Docker 배포 + 공개 URL). 영상·PPT·정적 자료만으로 대체하지 않음.",
            False,
        ),
        ("", False),
        ("4. 활용 데이터 ※기상자료개방포털(data.kma.go.kr) 1종 이상", True),
        ("(1) 종관기상관측(ASOS) 기온·일사 — 지역 baseline, 열섬 시뮬레이션 입력.", False),
        ("(2) 강수·기후평년값 — 농어업 광역 레이어·장기 기후 시나리오.", False),
        ("(3) 황사 PM10 — 미세먼지 렌즈 baseline(기상청 데이터로 4축 일관 인용).", False),
        ("(4) 태풍·지진 정보(API허브, 포털 API 메뉴 연계) — 재난 시나리오·스트레스 테스트.", False),
        (
            "※ API허브(apihub.kma.go.kr)는 기상자료개방포털 API 메뉴와 연계된 동일 기상청 계열.",
            False,
        ),
        ("", False),
        ("5. 과학 개념", True),
        (
            "도시열섬(알베도·녹지·수면 증발냉각), 미세먼지 배출·확산·흡착, "
            "태풍·침수·지진·해일 위험과 방재시설, 기후변화에 따른 작황·어획 영향, "
            "다목표 상충(개발·경제 vs 환경·안전) 및 회복탄력성(균형) 평가.",
            False,
        ),
        ("", False),
        ("6. 적용 기술 및 실현 구체성 ※실현 가능성 (30점)", True),
        (
            "프론트 React 19/Vite, 백엔드 Spring Boot 3.5, AI FastAPI(Python), "
            "PostgreSQL, Docker Compose. 프로토타입(격자 설계·4축 렌즈·레벨·스트레스 테스트·"
            "통합 AI 코치·3D 뷰) 이미 구현·배포 가능 상태.",
            False,
        ),
        ("[현재 구현 / 개발 계획 — 공고 위조 방지 정직 표기]", False),
        ("· ASOS 기온·일사: 라이브 연동(키 설정 시) + 샘플 폴백 — 운영 중.", False),
        ("· 황사 PM10: baseline 폴백 → 본선 전 라이브 연동 완료 예정.", False),
        ("· 재난: 대표 사례값 시드 프리셋 → API허브 태풍·지진 연동 예정.", False),
        ("· 시뮬레이션: 교육용 근사 모델(UI·문서에 명시, 정밀 수치모델 아님).", False),
        (
            "AI 활용: LLM 기반 통합 코치(4축 metrics·상충 분석 프롬프트), "
            "키 미설정 시 규칙 기반 폴백. 개발 도구(Cursor 등) 사용 사실을 제출 서류에 정직 기재.",
            False,
        ),
        (
            "일정: 예선(~7.3) 계획서 제출 → 본선 사전개발(7.23~8.7) PM10·재난 API 연동·"
            "URL 안정화 → 해커톤(8.21~22) 시연·발표.",
            False,
        ),
        ("", False),
        ("7. 체험 요소 및 학습 효과 ※체험·참여형(25) + 학습효과(10)", True),
        ("[체험 흐름: 시작 → 진행 → 완료]", False),
        ("시작: 지역·시나리오(해안도시 등) 선택 → 기본 콘크리트 도시.", False),
        (
            "진행: 타일 설계 → 렌즈(열·미세먼지·재난·농어업) 전환·히트맵 → "
            "레벨별 이전 설계 이어받기 → 스트레스 테스트(폭염→태풍→미세먼지→수확기).",
            False,
        ),
        ("완료: 종합 회복탄력성 점수·균형 패널티 확인 → AI 코치 피드백 → 재설계.", False),
        ("[학습 성과]", False),
        (
            "① 녹지·수면의 열섬 완화 원리 설명 ② 방재시설 우선순위 판단 "
            "③ 미세먼지-개발 상충 설명 ④ 다축 균형(회복탄력성) 관점 평가.",
            False,
        ),
        ("", False),
        ("8. 창의성 및 차별성 ※아이디어 독창성 (15점)", True),
        (
            "‘하나의 도시 설계’를 열섬·미세먼지·재난·농어업 4축으로 동시 검증하는 "
            "‘다중 렌즈 회복탄력성’ 컨cept. 시나리오별 고정 가중치·균형 패널티로 "
            "한 축만 잘하는 ‘만능 도시’ 착시를 방지. 레벨 누적 학습으로 "
            "시스템 사고(상충·트레이드오프)를 체득.",
            False,
        ),
        (
            "기존 조회형 기상 서비스·단일 축 시뮬레이터와 달리, "
            "설계-평가-코치-재설계 루프가 하나의 URL에서 완결.",
            False,
        ),
        ("", False),
        ("9. 시연·배포·라이선스", True),
        (
            "발표 시 공개 URL(:9080 Docker + 안정 터널/호스팅)로 즉시 시연. "
            "본문 폰트: 나눔고딕(SIL OFL, 상업적 이용 무료). "
            "오픈소스·에셋 출처·라이선스 README에 명시.",
            False,
        ),
        ("", False),
        ("— 끝 —", False),
    ]
    return lines


def extract_secpr(section_xml: str) -> str:
    """Extract hp:secPr block and wrap in a clean first paragraph (no template tables)."""
    m = re.search(r"(<hp:secPr\b.*?</hp:secPr>)", section_xml, re.DOTALL)
    if not m:
        raise RuntimeError("hp:secPr not found in template")
    secpr = m.group(1)
    return (
        f'<hp:p id="0" paraPrIDRef="{PARA_NORMAL}" styleIDRef="0" '
        f'pageBreak="0" columnBreak="0" merged="0">'
        f'<hp:run charPrIDRef="{CHAR_NORMAL}">{secpr}</hp:run></hp:p>'
    )


def patch_fonts(header_xml: str) -> str:
    """Replace Hangul/Latin primary font with Nanum Gothic."""
    header_xml = re.sub(
        r'(<hh:fontface lang="HANGUL"[^>]*>.*?<hh:font id="0" face=")[^"]*(")',
        rf"\1{FONT_HANGUL}\2",
        header_xml,
        count=1,
        flags=re.DOTALL,
    )
    header_xml = re.sub(
        r'(<hh:fontface lang="LATIN"[^>]*>.*?<hh:font id="0" face=")[^"]*(")',
        rf"\1{FONT_LATIN}\2",
        header_xml,
        count=1,
        flags=re.DOTALL,
    )
    return header_xml


def build_section0(template_section: str, paragraphs: list[tuple[str, bool]]) -> str:
    secpr = extract_secpr(template_section)
    ns = template_section.split("<hp:p")[0]
    parts = [ns, secpr]
    for i, (text, bold) in enumerate(paragraphs, start=1):
        parts.append(_para(text, bold=bold, para_id=i))
    parts.append("</hs:sec>")
    return "".join(parts)


def generate() -> Path:
    if not TEMPLATE.exists():
        raise FileNotFoundError(TEMPLATE)

    paragraphs = build_section_body()
    preview = "\n".join(t for t, _ in paragraphs if t.strip())[:2000]

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        with zipfile.ZipFile(TEMPLATE, "r") as zin:
            zin.extractall(tmp_path)

        section_path = tmp_path / "Contents" / "section0.xml"
        template_section = section_path.read_text(encoding="utf-8")
        section_path.write_text(
            build_section0(template_section, paragraphs), encoding="utf-8"
        )

        header_path = tmp_path / "Contents" / "header.xml"
        header_path.write_text(
            patch_fonts(header_path.read_text(encoding="utf-8")), encoding="utf-8"
        )

        prv = tmp_path / "Preview" / "PrvText.txt"
        if prv.exists():
            prv.write_text(preview, encoding="utf-8")

        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        if OUTPUT.exists():
            OUTPUT.unlink()

        with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as zout:
            # mimetype must be first, stored uncompressed per ODF convention
            mimetype = tmp_path / "mimetype"
            if mimetype.exists():
                zout.write(mimetype, "mimetype", compress_type=zipfile.ZIP_STORED)
            for f in sorted(tmp_path.rglob("*")):
                if f.is_file() and f.name != "mimetype":
                    arc = f.relative_to(tmp_path).as_posix()
                    zout.write(f, arc)

    return OUTPUT


if __name__ == "__main__":
    out = generate()
    print(f"Generated: {out} ({out.stat().st_size:,} bytes)")
