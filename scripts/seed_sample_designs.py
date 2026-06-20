#!/usr/bin/env python3
"""
Horizon — 기후 테마 예시 설계 시드

10×10 격자에 **도시 계획형** 레이아웃을 만들고, 코치 점수 십 단위 구간에 맞춰 저장합니다.
수변·도로 등은 **구역(zone) 규칙**으로 보호해 하천 위 도로 같은 모순을 방지합니다.

사용: py -3 scripts/seed_sample_designs.py
"""

from __future__ import annotations

import argparse
import copy
import json
import random
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable

GRID_SIZE = 10

# zone: morph·복원 규칙
ZONE_URBAN = "urban"          # 건물·녹지·보도 등 morph 가능
ZONE_ROAD = "road"            # 도로·보도만
ZONE_WATER = "water"          # 수변·습지·둔치 녹지만 (도로/건물 금지)
ZONE_IMMUTABLE = "immutable"  # blueprint 타일 고정


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def score_decade(score: int) -> int:
    if score >= 100:
        return 90
    return (score // 10) * 10


def rule_score(metrics: dict[str, Any]) -> int:
    green = float(metrics["greenRatio"])
    water = float(metrics["waterRatio"])
    impervious = float(metrics["imperviousRatio"])
    delta_t = float(metrics["deltaT"])

    score = 50.0
    score += clamp(green * 60.0, 0, 28)
    score += clamp(water * 50.0, 0, 12)
    score += clamp(-delta_t * 4.0, 0, 22)
    score -= clamp(impervious * 25.0, 0, 18)
    return int(round(clamp(score, 0, 100)))


@dataclass
class GridPlan:
    tiles: list[list[str]]
    zones: list[list[str]]


def empty_grid(fill: str = "BUILDING") -> list[list[str]]:
    return [[fill for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]


def empty_zones(default: str = ZONE_URBAN) -> list[list[str]]:
    return [[default for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]


def rect(
    plan: GridPlan,
    r: int,
    c: int,
    h: int,
    w: int,
    tile: str,
    zone: str | None = None,
) -> None:
    z = zone if zone is not None else plan.zones[r][c]
    for ri in range(r, min(r + h, GRID_SIZE)):
        for ci in range(c, min(c + w, GRID_SIZE)):
            plan.tiles[ri][ci] = tile
            plan.zones[ri][ci] = z


def block_roads(
    plan: GridPlan,
    row_start: int,
    row_end: int,
    col_step: int = 4,
    row_step: int = 99,
) -> None:
    """특정 행 구간에만 격자 도로 (하천 등과 분리)."""
    for r in range(row_start, row_end + 1):
        for c in range(GRID_SIZE):
            if c % col_step == 0 or (row_step < 99 and r % row_step == 0):
                plan.tiles[r][c] = "ROAD"
                plan.zones[r][c] = ZONE_ROAD


def fill_block(
    plan: GridPlan,
    row_start: int,
    row_end: int,
    tile: str = "BUILDING",
) -> None:
    for r in range(row_start, row_end + 1):
        for c in range(GRID_SIZE):
            if plan.zones[r][c] == ZONE_URBAN or plan.tiles[r][c] == tile:
                if plan.zones[r][c] not in (ZONE_ROAD, ZONE_IMMUTABLE, ZONE_WATER):
                    plan.tiles[r][c] = tile
                    plan.zones[r][c] = ZONE_URBAN


def sidewalk_along_roads(plan: GridPlan) -> None:
    g, z = plan.tiles, plan.zones
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if g[r][c] != "ROAD" or z[r][c] != ZONE_ROAD:
                continue
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and z[nr][nc] == ZONE_URBAN:
                    if g[nr][nc] == "BUILDING":
                        g[nr][nc] = "SIDEWALK"


def tree_along_roads(plan: GridPlan) -> None:
    g, z = plan.tiles, plan.zones
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            if g[r][c] != "ROAD" or z[r][c] != ZONE_ROAD:
                continue
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < GRID_SIZE and 0 <= nc < GRID_SIZE and z[nr][nc] == ZONE_URBAN:
                    if g[nr][nc] in ("BUILDING", "SIDEWALK"):
                        g[nr][nc] = "TREE"


def enforce_zones(grid: list[list[str]], blueprint: GridPlan) -> None:
    """morph 후 구역 규칙 위반 타일 복원."""
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            zone = blueprint.zones[r][c]
            ref = blueprint.tiles[r][c]
            cur = grid[r][c]

            if zone == ZONE_IMMUTABLE:
                grid[r][c] = ref
                continue

            if zone == ZONE_ROAD:
                if cur not in ("ROAD", "SIDEWALK"):
                    grid[r][c] = ref if ref in ("ROAD", "SIDEWALK") else "ROAD"
                continue

            if zone == ZONE_WATER:
                allowed = {"WATER", "WETLAND", "PARK", "TREE"}
                if cur not in allowed:
                    grid[r][c] = ref
                continue

            # urban: 도로/수변 타일이 urban 칸에 침범하면 복원
            if cur in ("ROAD", "WATER", "WETLAND") and ref not in ("ROAD", "WATER", "WETLAND"):
                grid[r][c] = ref


def morph_to_greener(
    grid: list[list[str]],
    blueprint: GridPlan,
    intensity: float,
    rng: random.Random,
    *,
    prefer_water: float = 0.0,
) -> None:
    intensity = clamp(intensity, 0.0, 1.0)
    candidates: list[tuple[int, int]] = []
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            zone = blueprint.zones[r][c]
            if zone == ZONE_URBAN and grid[r][c] in ("BUILDING", "BARE", "PLAZA", "SIDEWALK"):
                candidates.append((r, c))
            elif zone == ZONE_WATER and grid[r][c] in ("WETLAND", "PARK"):
                candidates.append((r, c))

    rng.shuffle(candidates)
    count = int(len(candidates) * intensity)
    for r, c in candidates[:count]:
        zone = blueprint.zones[r][c]
        roll = rng.random()
        if zone == ZONE_WATER or roll < prefer_water:
            grid[r][c] = rng.choice(["WATER", "WETLAND"] if zone != ZONE_URBAN else ["PARK", "TREE"])
        elif roll < prefer_water + 0.4:
            grid[r][c] = "PARK"
        else:
            grid[r][c] = "TREE"
    enforce_zones(grid, blueprint)


def morph_to_hotter(
    grid: list[list[str]],
    blueprint: GridPlan,
    intensity: float,
    rng: random.Random,
) -> None:
    intensity = clamp(intensity, 0.0, 1.0)
    candidates = [
        (r, c)
        for r in range(GRID_SIZE)
        for c in range(GRID_SIZE)
        if blueprint.zones[r][c] == ZONE_URBAN
        and grid[r][c] in ("PARK", "TREE", "SIDEWALK", "PLAZA")
    ]
    rng.shuffle(candidates)
    count = int(len(candidates) * intensity)
    for r, c in candidates[:count]:
        grid[r][c] = rng.choices(["BUILDING", "BARE", "PLAZA"], weights=[50, 30, 20], k=1)[0]
    enforce_zones(grid, blueprint)


# ---------------------------------------------------------------------------
# 테마 레이아웃
# ---------------------------------------------------------------------------

def layout_india_heat() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=2, row_step=2)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    rect(p, 4, 4, 2, 2, "BARE", ZONE_URBAN)
    return p


def layout_china_industrial() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=3, row_step=3)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    rect(p, 1, 1, 2, 3, "BARE", ZONE_URBAN)
    rect(p, 6, 5, 2, 3, "BARE", ZONE_URBAN)
    return p


def layout_vietnam_paved_river() -> GridPlan:
    """베트남 — 하천매립: 강 자리 전체가 도로·맨땅 (의도적)."""
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, 2, col_step=4)
    block_roads(p, 7, 9, col_step=4)
    fill_block(p, 0, 2, "BUILDING")
    fill_block(p, 7, 9, "BUILDING")
    rect(p, 3, 0, 4, GRID_SIZE, "ROAD", ZONE_IMMUTABLE)
    rect(p, 3, 0, 1, GRID_SIZE, "BARE", ZONE_IMMUTABLE)
    return p


def layout_washington_grid() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=3, row_step=3)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    rect(p, 3, 3, 4, 4, "PLAZA", ZONE_URBAN)
    sidewalk_along_roads(p)
    return p


def layout_seoul_old() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=4, row_step=3)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    rect(p, 1, 5, 2, 2, "PARK", ZONE_URBAN)
    rect(p, 6, 1, 2, 2, "SIDEWALK", ZONE_URBAN)
    return p


def layout_china_transition() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=4, row_step=3)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    rect(p, 1, 1, 2, 2, "PARK", ZONE_URBAN)
    rect(p, 7, 7, 2, 2, "PARK", ZONE_URBAN)
    sidewalk_along_roads(p)
    tree_along_roads(p)
    return p


def layout_japan_avenue() -> GridPlan:
    p = GridPlan(empty_grid("BUILDING"), empty_zones())
    block_roads(p, 0, GRID_SIZE - 1, col_step=3, row_step=4)
    fill_block(p, 0, GRID_SIZE - 1, "BUILDING")
    tree_along_roads(p)
    rect(p, 2, 6, 3, 3, "PARK", ZONE_URBAN)
    rect(p, 6, 2, 2, 2, "PLAZA", ZONE_URBAN)
    sidewalk_along_roads(p)
    return p


def layout_vietnam_green_river() -> GridPlan:
    """베트남 — 하천 복원: 북·남 도시 블록 + 중앙 수변(도로 침범 없음)."""
    p = GridPlan(empty_grid("BUILDING"), empty_zones())

    # 북쪽 주거·상업 (0~2행)
    block_roads(p, 0, 2, col_step=4)
    fill_block(p, 0, 2, "BUILDING")
    rect(p, 0, 7, 2, 2, "PARK", ZONE_URBAN)

    # 남쪽 블록 (7~9행)
    block_roads(p, 7, 9, col_step=4)
    fill_block(p, 7, 9, "BUILDING")
    rect(p, 8, 1, 2, 2, "PARK", ZONE_URBAN)

    # 하천 본류 (4~5행) — 절대 변경 불가
    rect(p, 4, 0, 2, GRID_SIZE, "WATER", ZONE_IMMUTABLE)
    # 둔치 습지 (3, 6행) — 녹화만 가능
    rect(p, 3, 0, 1, GRID_SIZE, "WETLAND", ZONE_WATER)
    rect(p, 6, 0, 1, GRID_SIZE, "WETLAND", ZONE_WATER)
    # 둔치 가로수 (2, 7행)
    for c in range(GRID_SIZE):
        p.tiles[2][c] = "TREE"
        p.zones[2][c] = ZONE_WATER
        p.tiles[7][c] = "TREE"
        p.zones[7][c] = ZONE_WATER

    return p


def layout_maldives_shore() -> GridPlan:
    p = GridPlan(empty_grid("PARK"), empty_zones(ZONE_URBAN))
    rect(p, 0, 0, GRID_SIZE, 1, "WATER", ZONE_IMMUTABLE)
    rect(p, GRID_SIZE - 1, 0, GRID_SIZE, 1, "WATER", ZONE_IMMUTABLE)
    rect(p, 0, 0, 1, GRID_SIZE, "WATER", ZONE_IMMUTABLE)
    rect(p, 0, GRID_SIZE - 1, GRID_SIZE, 1, "WATER", ZONE_IMMUTABLE)
    rect(p, 1, 1, 1, GRID_SIZE - 2, "WETLAND", ZONE_WATER)
    rect(p, GRID_SIZE - 2, 1, 1, GRID_SIZE - 2, "WETLAND", ZONE_WATER)
    rect(p, 1, 1, GRID_SIZE - 2, 1, "WETLAND", ZONE_WATER)
    rect(p, 1, GRID_SIZE - 2, GRID_SIZE - 2, 1, "WETLAND", ZONE_WATER)
    for c in range(3, 7):
        p.tiles[5][c] = "ROAD"
        p.zones[5][c] = ZONE_ROAD
    for r in (4, 6):
        p.tiles[r][3] = "SIDEWALK"
        p.zones[r][3] = ZONE_ROAD
        p.tiles[r][6] = "SIDEWALK"
        p.zones[r][6] = ZONE_ROAD
    rect(p, 4, 4, 2, 2, "BUILDING", ZONE_URBAN)
    rect(p, 3, 4, 1, 2, "TREE", ZONE_URBAN)
    return p


def layout_maldives_vision() -> GridPlan:
    p = GridPlan(empty_grid("WETLAND"), empty_zones(ZONE_WATER))
    rect(p, 3, 3, 4, 4, "PARK", ZONE_WATER)
    rect(p, 4, 4, 2, 2, "WATER", ZONE_IMMUTABLE)
    rect(p, 0, 4, 1, 2, "WATER", ZONE_IMMUTABLE)
    rect(p, GRID_SIZE - 1, 4, 1, 2, "WATER", ZONE_IMMUTABLE)
    rect(p, 4, 0, 2, 1, "WATER", ZONE_IMMUTABLE)
    rect(p, 4, GRID_SIZE - 1, 2, 1, "WATER", ZONE_IMMUTABLE)
    rect(p, 5, 5, 1, 1, "BUILDING", ZONE_URBAN)
    p.zones[2][2] = ZONE_URBAN
    p.tiles[2][2] = "TREE"
    p.zones[7][7] = ZONE_URBAN
    p.tiles[7][7] = "TREE"
    return p


@dataclass(frozen=True)
class ClimateSample:
    decade: int
    title: str
    region_code: str
    region_label: str
    builder: Callable[[], GridPlan]
    green_bias: float
    water_bias: float


CLIMATE_SAMPLES: list[ClimateSample] = [
    ClimateSample(0, "인도 델리 · 극심한 열섬", "daegu", "인도(대구 기상)", layout_india_heat, -0.8, 0.0),
    ClimateSample(10, "중국 산업단지 · 공장 밀집", "daegu", "중국(대구 기상)", layout_china_industrial, -0.6, 0.0),
    ClimateSample(20, "베트남 · 하천매립 도로", "gwangju", "베트남(광주 기상)", layout_vietnam_paved_river, -0.4, 0.0),
    ClimateSample(30, "미국 워싱턴 · 도심 격자", "seoul", "워싱턴(서울 기상)", layout_washington_grid, -0.2, 0.05),
    ClimateSample(40, "서울 · 재개발 이전", "seoul", "한국 서울", layout_seoul_old, 0.0, 0.05),
    ClimateSample(50, "중국 · 녹색 전환 스마트시티", "incheon", "중국(인천 기상)", layout_china_transition, 0.2, 0.08),
    ClimateSample(60, "일본 · 가로수·정원 거리", "seoul", "일본(서울 기상)", layout_japan_avenue, 0.35, 0.05),
    ClimateSample(70, "베트남 · 하천 복원 녹지", "gwangju", "베트남(광주 기상)", layout_vietnam_green_river, 0.5, 0.15),
    ClimateSample(80, "몰디브 · 산호섬 마을", "jeju", "몰디브(제주 기상)", layout_maldives_shore, 0.72, 0.35),
    ClimateSample(90, "몰디브 · 기후적응 비전", "jeju", "몰디브(제주 기상)", layout_maldives_vision, 0.85, 0.45),
]


@dataclass
class ApiClient:
    base_url: str
    token: str | None = None

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        auth: bool = True,
    ) -> Any:
        url = f"{self.base_url.rstrip('/')}{path}"
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {exc.code} {path}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"연결 실패 ({url}). Spring 백엔드가 켜져 있는지 확인하세요.") from exc
        if not payload.get("success"):
            err = payload.get("error") or {}
            raise RuntimeError(err.get("message") or f"API error on {path}")
        return payload.get("data")

    def login(self, login_id: str, password: str) -> None:
        data = self._request(
            "POST", "/api/auth/login",
            {"loginId": login_id, "password": password},
            auth=False,
        )
        self.token = data["accessToken"]

    def simulate(self, region_code: str, grid: list[list[str]]) -> dict[str, Any]:
        result = self._request(
            "POST", "/api/designs/simulate",
            {"regionCode": region_code, "grid": grid},
        )
        return result["metrics"]

    def save(self, name: str, region_code: str, grid: list[list[str]]) -> dict[str, Any]:
        return self._request(
            "POST", "/api/designs",
            {"name": name, "regionCode": region_code, "grid": grid},
        )


def validate_plan(grid: list[list[str]], blueprint: GridPlan) -> list[str]:
    """구역 위반 목록 (디버그용)."""
    issues: list[str] = []
    for r in range(GRID_SIZE):
        for c in range(GRID_SIZE):
            zone = blueprint.zones[r][c]
            cur = grid[r][c]
            if zone == ZONE_IMMUTABLE and cur != blueprint.tiles[r][c]:
                issues.append(f"({r},{c}) immutable {blueprint.tiles[r][c]}→{cur}")
            if zone == ZONE_ROAD and cur not in ("ROAD", "SIDEWALK"):
                issues.append(f"({r},{c}) road zone has {cur}")
            if zone == ZONE_WATER and cur in ("ROAD", "BUILDING", "BARE"):
                issues.append(f"({r},{c}) water zone has {cur}")
    return issues


def tune_for_decade(
    client: ApiClient,
    sample: ClimateSample,
    target_score: int,
    rng: random.Random,
    steps: int = 101,
) -> tuple[list[list[str]], int, dict[str, Any], bool]:
    target_decade = score_decade(target_score)
    blueprint = sample.builder()
    best_grid: list[list[str]] | None = None
    best_score = -1
    best_metrics: dict[str, Any] = {}
    best_diff = 10_000
    bucket_hit = False

    def consider(grid: list[list[str]]) -> None:
        nonlocal best_grid, best_score, best_metrics, best_diff, bucket_hit
        enforce_zones(grid, blueprint)
        metrics = client.simulate(sample.region_code, grid)
        score = rule_score(metrics)
        diff = abs(score - target_score)
        in_bucket = score_decade(score) == target_decade

        if in_bucket and diff < best_diff:
            bucket_hit = True
            best_diff = diff
            best_grid = copy.deepcopy(grid)
            best_score = score
            best_metrics = metrics
        elif not bucket_hit and diff < best_diff:
            best_diff = diff
            best_grid = copy.deepcopy(grid)
            best_score = score
            best_metrics = metrics

    for i in range(steps):
        morph = clamp(i / (steps - 1) * 2.0 - 1.0 + sample.green_bias * 0.35, -1.0, 1.0) if steps > 1 else 0.0
        grid = copy.deepcopy(blueprint.tiles)
        if morph >= 0:
            morph_to_greener(grid, blueprint, morph, rng, prefer_water=sample.water_bias)
        else:
            morph_to_hotter(grid, blueprint, -morph, rng)
        consider(grid)
        if bucket_hit and best_diff <= 1:
            break

    if not bucket_hit or best_diff > 2:
        base = copy.deepcopy(best_grid) if best_grid else blueprint.tiles
        for _ in range(50):
            grid = copy.deepcopy(base)
            morph_to_greener(
                grid, blueprint, rng.uniform(0.0, 0.85), rng,
                prefer_water=sample.water_bias,
            )
            if target_decade <= 30:
                morph_to_hotter(grid, blueprint, rng.uniform(0.0, 0.4), rng)
            consider(grid)
            if bucket_hit and best_diff <= 1:
                break

    assert best_grid is not None
    return best_grid, best_score, best_metrics, bucket_hit


def summarize_tiles(metrics: dict[str, Any]) -> str:
    counts = metrics.get("tileCounts") or {}
    top = sorted(counts.items(), key=lambda x: -x[1])[:4]
    return ", ".join(f"{k}:{v}" for k, v in top)


def main() -> int:
    parser = argparse.ArgumentParser(description="Horizon 기후 테마 예시 설계 시드")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--login-id", default="admin")
    parser.add_argument("--password", default="admin1234")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--steps", type=int, default=101)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--prefix", default="예시")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    client = ApiClient(args.base_url)

    print(f"로그인: {args.login_id} @ {args.base_url}")
    client.login(args.login_id, args.password)
    print(f"기후 테마 예시 {len(CLIMATE_SAMPLES)}개 · 격자 {GRID_SIZE}×{GRID_SIZE}")
    print("※ 수변·도로 구역은 morph 후에도 규칙 위반 타일을 자동 복원합니다.")
    print("-" * 72)

    saved = 0
    for idx, sample in enumerate(CLIMATE_SAMPLES, start=1):
        target_score = sample.decade + rng.randint(0, 9)
        grid, score, metrics, bucket_hit = tune_for_decade(
            client, sample, target_score, rng, args.steps
        )
        blueprint = sample.builder()
        issues = validate_plan(grid, blueprint)
        status = "OK" if bucket_hit else "근접"
        name = f"{args.prefix} · {sample.title} · [{sample.decade}~{sample.decade + 9}점] · 실제{score}점"

        print(
            f"[{idx:02d}/10] {status} {name}\n"
            f"       목표 {target_score}점 → 실제 {score}점 · "
            f"{sample.region_label} · ΔT {metrics['deltaT']:+.1f}°C · "
            f"녹지 {metrics['greenRatio']*100:.0f}%\n"
            f"       {summarize_tiles(metrics)}"
        )
        if issues:
            print(f"       ! 구역 위반 {len(issues)}건")
        else:
            print("       OK 구역 규칙 일치")

        if args.dry_run:
            continue

        result = client.save(name, sample.region_code, grid)
        saved += 1
        print(f"       → 저장 id={result['id']}")

    print("-" * 72)
    print("dry-run 완료 (DB 저장 없음)" if args.dry_run else f"완료: {saved}개 저장")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\n중단됨.", file=sys.stderr)
        raise SystemExit(130)
    except RuntimeError as exc:
        print(f"오류: {exc}", file=sys.stderr)
        raise SystemExit(1)
