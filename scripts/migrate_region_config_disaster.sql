-- region_config 재난 시뮬 필드 (구버전 DB 마이그레이션)
ALTER TABLE region_config ADD COLUMN IF NOT EXISTS coastal_exposure DOUBLE PRECISION NOT NULL DEFAULT 0.35;
ALTER TABLE region_config ADD COLUMN IF NOT EXISTS seismic_zone INTEGER NOT NULL DEFAULT 2;

UPDATE region_config SET coastal_exposure = 0.25, seismic_zone = 2 WHERE code = 'seoul';
UPDATE region_config SET coastal_exposure = 0.75, seismic_zone = 3 WHERE code = 'busan';
UPDATE region_config SET coastal_exposure = 0.15, seismic_zone = 3 WHERE code = 'daegu';
UPDATE region_config SET coastal_exposure = 0.65, seismic_zone = 2 WHERE code = 'incheon';
UPDATE region_config SET coastal_exposure = 0.20, seismic_zone = 2 WHERE code = 'gwangju';
UPDATE region_config SET coastal_exposure = 0.10, seismic_zone = 2 WHERE code = 'daejeon';
UPDATE region_config SET coastal_exposure = 0.85, seismic_zone = 2 WHERE code = 'jeju';
UPDATE region_config SET coastal_exposure = 0.70, seismic_zone = 3 WHERE code = 'ulsan';

UPDATE region_config SET elevation_profile_json = '[12,8,5,3,1]' WHERE code = 'busan' AND elevation_profile_json IS NULL;
UPDATE region_config SET elevation_profile_json = '[6,5,4,3,2]' WHERE code = 'daegu' AND elevation_profile_json IS NULL;
UPDATE region_config SET elevation_profile_json = '[10,7,4,2,1]' WHERE code = 'incheon' AND elevation_profile_json IS NULL;
UPDATE region_config SET elevation_profile_json = '[5,4,3,2,1]' WHERE code IN ('gwangju', 'daejeon') AND elevation_profile_json IS NULL;
UPDATE region_config SET elevation_profile_json = '[14,10,6,3,1]' WHERE code = 'jeju' AND elevation_profile_json IS NULL;
UPDATE region_config SET elevation_profile_json = '[11,8,5,3,1]' WHERE code = 'ulsan' AND elevation_profile_json IS NULL;
