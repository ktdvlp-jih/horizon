package com.horizon.weather.dto;

/**
 * One typhoon season entry from KMA {@code typ_lst.php}.
 */
public record LiveTyphoon(
        int year,
        int seq,
        String nameKo,
        String nameEn,
        String startUtc,
        String endUtc
) {
}
