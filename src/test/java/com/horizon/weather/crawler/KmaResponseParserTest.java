package com.horizon.weather.crawler;

import com.horizon.weather.dto.AsosObservation;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KmaResponseParserTest {

    @Test
    void parseAsosHourlyJson_singleItem() {
        String json = """
                {
                  "response": {
                    "header": { "resultCode": "00", "resultMsg": "NORMAL_SERVICE" },
                    "body": {
                      "items": {
                        "item": {
                          "tm": "202406241200",
                          "ta": "28.3",
                          "icsr": "2.45"
                        }
                      }
                    }
                  }
                }
                """;
        List<AsosObservation> rows = KmaResponseParser.parseAsosHourlyJson(json);
        assertEquals(1, rows.size());
        assertEquals(12, rows.getFirst().hour());
        assertEquals(28.3, rows.getFirst().airTemp(), 0.01);
        assertEquals(2.45, rows.getFirst().insolationMj(), 0.01);
    }

    @Test
    void parseAsosHourlyJson_skipsMissingTa() {
        String json = """
                {
                  "response": {
                    "header": { "resultCode": "00", "resultMsg": "OK" },
                    "body": {
                      "items": {
                        "item": [
                          { "tm": "202406240600", "ta": "-9.0", "icsr": "0.1" },
                          { "tm": "202406240800", "ta": "22.1", "icsr": "1.2" }
                        ]
                      }
                    }
                  }
                }
                """;
        List<AsosObservation> rows = KmaResponseParser.parseAsosHourlyJson(json);
        assertEquals(1, rows.size());
        assertEquals(8, rows.getFirst().hour());
    }

    @Test
    void parseAsosHourlyJson_errorCodeReturnsEmpty() {
        String json = """
                {
                  "response": {
                    "header": { "resultCode": "99", "resultMsg": "ERROR" },
                    "body": { "items": { "item": { "ta": "20", "icsr": "1" } } }
                  }
                }
                """;
        assertTrue(KmaResponseParser.parseAsosHourlyJson(json).isEmpty());
    }

    @Test
    void parseAirTemperature_legacyText() {
        String line = "202406241200 108 0 0 0 0 0 0 0 0 0 28.5 0";
        Optional<Double> ta = KmaResponseParser.parseAirTemperature(line);
        assertTrue(ta.isPresent());
        assertEquals(28.5, ta.get(), 0.01);
    }

    @Test
    void parsePm10Hourly_textRow() {
        String body = """
                # PM10 hourly
                2024.06.24.12:00  SEOUL  108  42.5
                """;
        Optional<Double> pm = KmaResponseParser.parsePm10Hourly(body);
        assertTrue(pm.isPresent());
        assertEquals(42.5, pm.get(), 0.01);
    }

    @Test
    void parseDaySolar_skipsMissingSiHr() {
        String body = """
                202406241200,108,0,-99.9,0.0,0
                202406241400,108,0,1.85,2.1,0
                """;
        var solar = KmaResponseParser.parseDaySolar(body);
        assertEquals(1, solar.hourlySi().size());
        assertEquals(1.85, solar.hourlySi().get(14), 0.01);
    }

    @Test
    void parseTyphoonList_filtersYear() {
        String body = """
                2024 1 0 0 20240701 20240705 마이 마이 MAEMI
                2023 9 0 0 20230901 20230910 꼬마 KKOMA
                """;
        var rows = KmaResponseParser.parseTyphoonList(body, 2024);
        assertEquals(1, rows.size());
        assertEquals("마이", rows.getFirst().nameKo());
    }

    @Test
    void parseEqkNow_earthquakeRows() {
        String body = """
                1 202406241200 0 0 0 0 0
                2 202406241205 0 0 4.2 37.5 127.0 경기도
                3 202406241210 0 0 5.1 35.0 129.0 부산 해역
                """;
        var rows = KmaResponseParser.parseEqkNow(body);
        assertEquals(2, rows.size());
        assertEquals(4.2, rows.getFirst().magnitude(), 0.01);
    }
}
