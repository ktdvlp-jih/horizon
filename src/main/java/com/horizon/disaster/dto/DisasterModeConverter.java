package com.horizon.disaster.dto;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/** Allows ?mode=typhoon on query params (Jackson @JsonCreator does not apply to MVC params). */
@Component
public class DisasterModeConverter implements Converter<String, DisasterMode> {

    @Override
    public DisasterMode convert(String source) {
        return DisasterMode.fromString(source);
    }
}
