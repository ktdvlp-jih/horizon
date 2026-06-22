package com.horizon.disaster.service;

import com.horizon.ai.dto.CoachResponse;
import com.horizon.disaster.dto.DisasterCoachRequest;
import com.horizon.disaster.dto.DisasterMetrics;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DisasterCoachRuleService {

    public CoachResponse coach(DisasterCoachRequest request) {
        DisasterMetrics m = request.metrics();
        String mode = request.mode().toLowerCase();
        int affectedPct = (int) Math.round(m.affectedRatio() * 100);
        int protectedPct = (int) Math.round(m.protectedRatio() * 100);
        int avgPct = (int) Math.round(m.avgRisk() * 100);
        int maxPct = (int) Math.round(m.maxRisk() * 100);

        int score = Math.max(0, Math.min(100,
                100 - (int) (m.affectedRatio() * 70) - (int) (m.maxRisk() * 20) + (int) (m.protectedRatio() * 15)));
        String grade = score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 45 ? "C" : "D";

        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        if (m.protectedRatio() >= 0.2) {
            strengths.add("대응 시설·완충 타일로 보호율 " + protectedPct + "%를 확보했습니다.");
        }
        if (m.affectedRatio() <= 0.25) {
            strengths.add("위험 영역이 " + affectedPct + "%로 낮게 유지됩니다.");
        }

        String learning;
        if ("typhoon".equals(mode)) {
            learning = "태풍 대응은 강풍·호우·침수를 동시에 줄이는 배수로, 녹지 완충, 방조제, 대피소 배치가 핵심입니다.";
            double flood = m.floodCells() != null ? m.floodCells() : 0;
            double wind = m.windHighCells() != null ? m.windHighCells() : 0;
            if (flood > m.totalCells() * 0.3) {
                weaknesses.add("저지대 침수 위험 셀이 많습니다.");
                suggestions.add("침수 위험 구역에 배수(DRAIN)와 녹지 완충(GREEN_BUFFER)을 추가하세요.");
            }
            if (wind > m.totalCells() * 0.25) {
                weaknesses.add("강풍 노출 구역이 넓습니다.");
                suggestions.add("방조제(SEAWALL)와 가로수·공원으로 풍속 영향을 줄이세요.");
            }
            suggestions.add("대피소(SHELTER)를 도시 중심과 해안 사이에 배치하세요.");
        } else if ("earthquake".equals(mode)) {
            learning = "지진 대응은 내진·옥외 대피 공간·취약 건물 밀집 완화, 30초 내 대피 동선 확보가 중요합니다.";
            double collapse = m.collapseRiskCells() != null ? m.collapseRiskCells() : 0;
            if (collapse > m.totalCells() * 0.2) {
                weaknesses.add("붕괴 위험 셀이 많습니다.");
                suggestions.add("건물 밀집 구역에 옹벽(RETAINING)과 대피소(SHELTER)를 배치하세요.");
            }
            double evac = m.evacWithin3MinRatio() != null ? m.evacWithin3MinRatio() : 0;
            if (evac < 0.7) {
                weaknesses.add("대피 가능 비율이 " + (int) (evac * 100) + "%로 낮습니다.");
                suggestions.add("공원·대피소·고지(HIGH_GROUND)를 연결해 대피 동선을 확보하세요.");
            } else {
                strengths.add("대피 동선 커버리지 " + (int) (evac * 100) + "%");
            }
        } else {
            learning = "해일 대응은 방조제·고지대·해안 녹지로 침수 깊이를 줄이고, ETA 전 고지 대피가 핵심입니다.";
            double inundated = m.inundatedCells() != null ? m.inundatedCells() : 0;
            if (inundated > m.totalCells() * 0.3) {
                weaknesses.add("침수 예상 셀이 많습니다.");
                suggestions.add("해안가에 방조제(SEAWALL)와 습지·녹지 완충을 배치하세요.");
            }
            double highGround = m.highGroundCoverage() != null ? m.highGroundCoverage() : 0;
            if (highGround < 0.1) {
                weaknesses.add("고지·대피 공간이 부족합니다.");
                suggestions.add("HIGH_GROUND와 SHELTER 타일을 내륙 고지에 배치하세요.");
            }
        }

        if (strengths.isEmpty()) {
            strengths.add(request.scenarioTitle() + " 시나리오 기준 평균 위험 " + avgPct + "% — 개선 여지가 있습니다.");
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("최대 위험 " + maxPct + "% — 극한 구역을 추가로 완화할 수 있습니다.");
        }
        if (suggestions.isEmpty()) {
            suggestions.add("위험 히트맵에서 붉은 구역 주변에 대응 타일을 배치해 보세요.");
        }

        return new CoachResponse(
                score,
                grade,
                strengths.subList(0, Math.min(3, strengths.size())),
                weaknesses.subList(0, Math.min(3, weaknesses.size())),
                suggestions.subList(0, Math.min(3, suggestions.size())),
                learning,
                "rule"
        );
    }
}
