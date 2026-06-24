package com.horizon.disaster.dto;

import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.LiveTyphoon;

import java.util.List;

/** Live KMA disaster feed (태풍 목록 + 지진·해일 통보). */
public record DisasterLiveFeed(
        int typhoonYear,
        List<LiveTyphoon> typhoons,
        List<LiveEarthquakeAlert> earthquakeAlerts,
        String source
) {
}
