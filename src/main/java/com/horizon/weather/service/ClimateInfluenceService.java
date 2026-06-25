package com.horizon.weather.service;

import com.horizon.disaster.dto.EarthquakeScenarioParams;
import com.horizon.disaster.dto.TsunamiScenarioParams;
import com.horizon.disaster.dto.TyphoonScenarioParams;
import com.horizon.weather.dto.ClimateContext;
import com.horizon.weather.dto.LiveEarthquakeAlert;
import com.horizon.weather.dto.RegionWeather;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Blends live KMA climate/disaster feeds into education-grade simulation inputs.
 * Seed scenarios remain the base; live data nudges intensity when {@code source=kma}.
 */
@Service
public class ClimateInfluenceService {

    public TyphoonScenarioParams blendTyphoon(TyphoonScenarioParams seed, ClimateContext climate) {
        if (climate == null || !hasLiveTyphoonOrRain(climate)) {
            return seed;
        }
        double windScale = 1.0;
        double rainScale = 1.0;
        if (climate.typhoons() != null && !climate.typhoons().isEmpty()) {
            windScale += Math.min(0.22, climate.typhoons().size() * 0.045);
        }
        if (isKma(climate.rainfallSource()) && climate.rainfallMm() != null) {
            rainScale += Math.min(0.4, climate.rainfallMm() / 70.0);
        }
        double maxWind = Math.min(65.0, seed.maxWindMs() * windScale);
        double rainfall = Math.min(480.0, seed.rainfallMm() * rainScale);
        final double windScaleFinal = windScale;
        List<TyphoonScenarioParams.TrackPoint> track = seed.track() == null ? List.of()
                : seed.track().stream()
                .map(p -> new TyphoonScenarioParams.TrackPoint(
                        p.hour(), p.latOffset(), p.lonOffset(),
                        Math.min(65.0, p.windMs() * windScaleFinal)))
                .toList();
        return new TyphoonScenarioParams(maxWind, seed.windRadiusKm(), rainfall, track);
    }

    public EarthquakeScenarioParams blendEarthquake(EarthquakeScenarioParams seed, ClimateContext climate) {
        if (climate == null || climate.earthquakeAlerts() == null || climate.earthquakeAlerts().isEmpty()) {
            return seed;
        }
        double liveMag = climate.earthquakeAlerts().stream()
                .mapToDouble(LiveEarthquakeAlert::magnitude)
                .max()
                .orElse(seed.magnitude());
        double blended = Math.max(seed.magnitude(), Math.min(7.8, liveMag));
        return new EarthquakeScenarioParams(
                blended, seed.depthKm(), seed.epicenterLatOffset(), seed.epicenterLonOffset(), seed.soilType());
    }

    public TsunamiScenarioParams blendTsunami(TsunamiScenarioParams seed, ClimateContext climate) {
        if (climate == null || climate.earthquakeAlerts() == null) {
            return seed;
        }
        boolean tsunami = climate.earthquakeAlerts().stream().anyMatch(LiveEarthquakeAlert::tsunami);
        if (!tsunami) {
            return seed;
        }
        double liveMag = climate.earthquakeAlerts().stream()
                .filter(LiveEarthquakeAlert::tsunami)
                .mapToDouble(LiveEarthquakeAlert::magnitude)
                .max()
                .orElse(seed.sourceMagnitude());
        return new TsunamiScenarioParams(
                Math.max(seed.sourceMagnitude(), liveMag),
                Math.min(9.0, seed.waveHeightM() * 1.18),
                seed.approachBearingDeg(),
                Math.max(5, seed.etaMinutes() - 3),
                seed.runupFactor()
        );
    }

    public RegionWeather applyHeatInfluence(RegionWeather region) {
        ClimateContext climate = region.climate();
        if (climate == null) {
            return region;
        }
        double base = region.baseAirTemp();
        double solar = region.solarLoad();
        boolean changed = false;
        if (isKma(climate.sensibleTempSource()) && climate.sensibleTempC() != null) {
            base = Math.max(base, climate.sensibleTempC());
            changed = true;
        }
        if (isKma(climate.uvSource()) && climate.uvIndex() != null) {
            solar *= 1.0 + Math.min(0.18, climate.uvIndex() / 35.0);
            changed = true;
        }
        if (!changed) {
            return region;
        }
        return new RegionWeather(
                region.code(),
                region.name(),
                round1(base),
                round1(solar),
                region.source(),
                climate
        );
    }

    /** Lower diffusion when air is stagnant (KMA 대기정체지수). */
    public double airDiffusionFactor(ClimateContext climate) {
        if (climate == null || !isKma(climate.airStagnationSource()) || climate.airStagnationIndex() == null) {
            return 1.0;
        }
        int idx = climate.airStagnationIndex();
        return Math.max(0.35, 1.0 - idx / 14.0);
    }

    /** Extra water/crop boost from observed hourly rainfall (mm). */
    public double rainfallAgriBonus(ClimateContext climate) {
        if (climate == null || !isKma(climate.rainfallSource()) || climate.rainfallMm() == null) {
            return 0.0;
        }
        return Math.min(18.0, climate.rainfallMm() * 2.5);
    }

    /** Evaporative cooling from observed hourly rainfall (°C). */
    public double rainfallCoolingC(ClimateContext climate) {
        if (climate == null || !isKma(climate.rainfallSource()) || climate.rainfallMm() == null) {
            return 0.0;
        }
        return Math.min(2.8, climate.rainfallMm() * 0.09);
    }

    /** Reference baseline for heat delta: 평년값 when live, else observed air temp. */
    public double heatReferenceTempC(RegionWeather region) {
        ClimateContext climate = region.climate();
        if (climate != null && isKma(climate.normalSource()) && climate.normalTempC() != null) {
            return climate.normalTempC();
        }
        return region.baseAirTemp();
    }

    /** PM10 stagnation penalty when live air stagnation is high (µg/m³). */
    public double pmStagnationBonus(ClimateContext climate) {
        if (climate == null || !isKma(climate.airStagnationSource()) || climate.airStagnationIndex() == null) {
            return 0.0;
        }
        return Math.min(22.0, climate.airStagnationIndex() * 2.2);
    }

    public boolean hasLiveTyphoonBlend(ClimateContext climate) {
        return climate != null && hasLiveTyphoonOrRain(climate);
    }

    public boolean hasLiveEarthquakeBlend(ClimateContext climate) {
        return climate != null && climate.earthquakeAlerts() != null && !climate.earthquakeAlerts().isEmpty();
    }

    public boolean hasLiveTsunamiBlend(ClimateContext climate) {
        return climate != null && climate.earthquakeAlerts() != null
                && climate.earthquakeAlerts().stream().anyMatch(LiveEarthquakeAlert::tsunami);
    }

    private boolean hasLiveTyphoonOrRain(ClimateContext climate) {
        return (climate.typhoons() != null && !climate.typhoons().isEmpty())
                || (isKma(climate.rainfallSource()) && climate.rainfallMm() != null && climate.rainfallMm() > 0);
    }

    private static boolean isKma(String source) {
        return "kma".equals(source);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
