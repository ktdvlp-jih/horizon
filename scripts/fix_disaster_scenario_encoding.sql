-- 깨진 disaster_scenario 한글 제목·설명 복구 (UTF-8)
SET client_encoding TO 'UTF8';

UPDATE disaster_scenario SET title = '태풍 매미 (2003)', description = '강풍·호우로 침수 피해가 컸던 사례입니다. 방조제·배수·대피소를 배치해 보세요.' WHERE id = 'typhoon-maemi-2003';
UPDATE disaster_scenario SET title = '수도권 집중호우·태풍 (교육용)', description = '서울·수도권 저지대 침수와 강풍을 동시에 대비하는 시나리오입니다.' WHERE id = 'typhoon-seoul-capital-2024';
UPDATE disaster_scenario SET title = '태풍 힌남노 (2022)', description = '남해안을 강타한 대형 태풍 시나리오입니다.' WHERE id = 'typhoon-hinnamnor-2022';
UPDATE disaster_scenario SET title = '포항 지진 M5.4 (2017)', description = '연약 지반에서 건물·도로 피해가 발생했습니다. 대피 동선을 설계하세요.' WHERE id = 'eq-pohang-2017';
UPDATE disaster_scenario SET title = '경주 지진 M5.8 (2016)', description = '역사적 지진 활동 지역의 강진 시나리오입니다.' WHERE id = 'eq-gyeongju-2016';
UPDATE disaster_scenario SET title = '동일본 대지진 해일 (2011)', description = '원거리 원발 해일이 해안 도시에 도달하는 교육용 시나리오입니다.' WHERE id = 'tsunami-tohoku-2011';
UPDATE disaster_scenario SET title = '동해안 해일 대피 훈련', description = '지진해일 경보 후 고지·방조제·대피소 활용 시나리오입니다.' WHERE id = 'tsunami-east-sea-drill';
