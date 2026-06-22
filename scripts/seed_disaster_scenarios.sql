-- disaster_scenario 테이블 + 시드 (Docker 앱 재빌드 전 긴급 복구용)
-- Windows: scripts/seed_disaster_scenarios.bat 사용 (UTF-8). 직접 실행 시 한글이 ??? 로 깨질 수 있습니다.
SET client_encoding TO 'UTF8';
CREATE TABLE IF NOT EXISTS disaster_scenario (
    id              VARCHAR(80) PRIMARY KEY,
    mode            VARCHAR(20)  NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    source_event_id VARCHAR(80),
    params_json     TEXT         NOT NULL,
    region_code     VARCHAR(50),
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP
);

INSERT INTO disaster_scenario (id, mode, title, description, source_event_id, params_json, region_code, enabled, sort_order, created_at, updated_at)
VALUES
('typhoon-maemi-2003', 'TYPHOON', '태풍 매미 (2003)', '강풍·호우로 침수 피해가 컸던 사례입니다. 방조제·배수·대피소를 배치해 보세요.', 'MAEMI2003', '{"maxWindMs":55,"windRadiusKm":120,"rainfallMm":350,"track":[{"hour":0,"latOffset":-0.3,"lonOffset":0.2,"windMs":35},{"hour":6,"latOffset":-0.1,"lonOffset":0.1,"windMs":48},{"hour":12,"latOffset":0.0,"lonOffset":0.0,"windMs":55},{"hour":18,"latOffset":0.15,"lonOffset":-0.1,"windMs":42}]}', 'busan', TRUE, 1, NOW(), NOW()),
('typhoon-seoul-capital-2024', 'TYPHOON', '수도권 집중호우·태풍 (교육용)', '서울·수도권 저지대 침수와 강풍을 동시에 대비하는 시나리오입니다.', 'CAPITAL2024', '{"maxWindMs":42,"windRadiusKm":90,"rainfallMm":320,"track":[{"hour":0,"latOffset":0.1,"lonOffset":-0.15,"windMs":28},{"hour":6,"latOffset":0.0,"lonOffset":-0.05,"windMs":38},{"hour":12,"latOffset":-0.05,"lonOffset":0.0,"windMs":42},{"hour":18,"latOffset":0.05,"lonOffset":0.1,"windMs":30}]}', 'seoul', TRUE, 2, NOW(), NOW()),
('typhoon-hinnamnor-2022', 'TYPHOON', '태풍 힌남노 (2022)', '남해안을 강타한 대형 태풍 시나리오입니다.', 'HINNAMNOR2022', '{"maxWindMs":50,"windRadiusKm":100,"rainfallMm":280,"track":[{"hour":0,"latOffset":0.2,"lonOffset":-0.2,"windMs":30},{"hour":8,"latOffset":0.05,"lonOffset":-0.05,"windMs":45},{"hour":16,"latOffset":-0.05,"lonOffset":0.05,"windMs":50},{"hour":24,"latOffset":0.1,"lonOffset":0.15,"windMs":38}]}', 'busan', TRUE, 3, NOW(), NOW()),
('eq-pohang-2017', 'EARTHQUAKE', '포항 지진 M5.4 (2017)', '연약 지반에서 건물·도로 피해가 발생했습니다. 대피 동선을 설계하세요.', 'POHANG2017', '{"magnitude":5.4,"depthKm":9,"epicenterLatOffset":0.15,"epicenterLonOffset":-0.1,"soilType":"soft"}', 'daegu', TRUE, 1, NOW(), NOW()),
('eq-gyeongju-2016', 'EARTHQUAKE', '경주 지진 M5.8 (2016)', '역사적 지진 활동 지역의 강진 시나리오입니다.', 'GYEONGJU2016', '{"magnitude":5.8,"depthKm":12,"epicenterLatOffset":-0.05,"epicenterLonOffset":0.12,"soilType":"soft"}', 'daegu', TRUE, 2, NOW(), NOW()),
('tsunami-tohoku-2011', 'TSUNAMI', '동일본 대지진 해일 (2011)', '원거리 원발 해일이 해안 도시에 도달하는 교육용 시나리오입니다.', 'TOHOKU2011', '{"sourceMagnitude":9.0,"waveHeightM":8.5,"approachBearingDeg":90,"etaMinutes":40,"runupFactor":1.3}', 'busan', TRUE, 1, NOW(), NOW()),
('tsunami-east-sea-drill', 'TSUNAMI', '동해안 해일 대피 훈련', '지진해일 경보 후 고지·방조제·대피소 활용 시나리오입니다.', 'EASTSEA_DRILL', '{"sourceMagnitude":7.5,"waveHeightM":5.0,"approachBearingDeg":85,"etaMinutes":25,"runupFactor":1.1}', 'busan', TRUE, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
