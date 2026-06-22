package com.horizon.disaster.crawler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Placeholder for 재난안전데이터공유플랫폼 / safemap POI ingest.
 * MVP uses seeded shelter coordinates embedded in simulation logic.
 */
@Slf4j
@Component
public class SafetyDataClient {

    public record ShelterPoi(String name, double lat, double lon, String type) {
    }

    public List<ShelterPoi> fetchEarthquakeShelters(String regionCode) {
        log.debug("SafetyDataClient: using built-in shelter logic for region {}", regionCode);
        return Collections.emptyList();
    }

    public List<ShelterPoi> fetchTsunamiShelters(String regionCode) {
        return Collections.emptyList();
    }
}
