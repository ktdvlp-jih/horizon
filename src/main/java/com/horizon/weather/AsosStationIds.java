package com.horizon.weather;

import java.util.Map;

/**
 * ASOS 지점번호( stnIds ) — {@link com.horizon.settings.entity.RegionConfig#getKmaStation()} 과 동일.
 * DB 시드와 일치하는 참조용 상수.
 */
public final class AsosStationIds {

    public static final String SEOUL = "108";
    public static final String BUSAN = "159";
    public static final String DAEGU = "143";
    public static final String INCHEON = "112";
    public static final String GWANGJU = "156";
    public static final String DAEJEON = "133";
    public static final String JEJU = "184";
    public static final String ULSAN = "152";

    private static final Map<String, String> BY_REGION_CODE = Map.of(
            "seoul", SEOUL,
            "busan", BUSAN,
            "daegu", DAEGU,
            "incheon", INCHEON,
            "gwangju", GWANGJU,
            "daejeon", DAEJEON,
            "jeju", JEJU,
            "ulsan", ULSAN
    );

    private AsosStationIds() {
    }

    /** Returns the ASOS station id for a region code, or empty when unknown. */
    public static java.util.Optional<String> forRegion(String regionCode) {
        if (regionCode == null) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.ofNullable(BY_REGION_CODE.get(regionCode.toLowerCase()));
    }
}
