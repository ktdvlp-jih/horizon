package com.horizon.weather;

import java.util.Map;
import java.util.Optional;

/** 행정구역코드(10자리) — 생활기상지수 API {@code areaNo}. */
public final class KmaAreaCodes {

    private static final Map<String, String> BY_REGION = Map.of(
            "seoul", "1100000000",
            "busan", "2600000000",
            "daegu", "2700000000",
            "incheon", "2800000000",
            "gwangju", "2900000000",
            "daejeon", "3000000000",
            "jeju", "5000000000",
            "ulsan", "3100000000"
    );

    private KmaAreaCodes() {
    }

    public static Optional<String> forRegion(String regionCode) {
        if (regionCode == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_REGION.get(regionCode.toLowerCase()));
    }
}
