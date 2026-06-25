package com.horizon.disaster.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Regional shelter reference data for earthquake evacuation modelling.
 * Not a live API — curated education-grade POI counts per region (재난안전 참고).
 */
@Slf4j
@Component
public class SafetyDataClient {

    public record ShelterPoi(String name, double lat, double lon, String type) {
    }

    private static final Map<String, List<ShelterPoi>> REFERENCE_SHELTERS = Map.of(
            "seoul", List.of(
                    new ShelterPoi("서울광장 대피소", 37.565, 126.979, "earthquake"),
                    new ShelterPoi("종로구민회관", 37.573, 126.979, "earthquake"),
                    new ShelterPoi("여의도공원", 37.526, 126.924, "earthquake")
            ),
            "busan", List.of(
                    new ShelterPoi("부산시민공원", 35.153, 129.063, "earthquake"),
                    new ShelterPoi("해운대구민체육센터", 35.163, 129.175, "tsunami")
            ),
            "incheon", List.of(
                    new ShelterPoi("인천대공원", 37.448, 126.752, "earthquake"),
                    new ShelterPoi("월미공원", 37.473, 126.598, "tsunami")
            ),
            "daegu", List.of(
                    new ShelterPoi("두류공원", 35.855, 128.558, "earthquake")
            ),
            "daejeon", List.of(
                    new ShelterPoi("한밭수목원", 36.369, 127.388, "earthquake")
            ),
            "jeju", List.of(
                    new ShelterPoi("제주시민체육관", 33.499, 126.531, "earthquake"),
                    new ShelterPoi("함덕해수욕장 고지", 33.543, 126.669, "tsunami")
            )
    );

    public List<ShelterPoi> fetchEarthquakeShelters(String regionCode) {
        List<ShelterPoi> list = REFERENCE_SHELTERS.getOrDefault(normalize(regionCode), List.of());
        log.debug("SafetyDataClient: {} earthquake/tsunami reference shelters for {}", list.size(), regionCode);
        return list.stream().filter(p -> "earthquake".equals(p.type()) || "tsunami".equals(p.type())).toList();
    }

    public List<ShelterPoi> fetchTsunamiShelters(String regionCode) {
        return fetchEarthquakeShelters(regionCode).stream()
                .filter(p -> "tsunami".equals(p.type()))
                .toList();
    }

    /** Small evac coverage bonus from regional shelter capacity (0..0.12). */
    public double evacCapacityBonus(String regionCode) {
        int count = fetchEarthquakeShelters(regionCode).size();
        return Math.min(0.12, count * 0.028);
    }

    private static String normalize(String code) {
        return code == null ? "" : code.toLowerCase(Locale.ROOT).trim();
    }
}
