package com.horizon;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.horizon.auth.config.JwtProperties;

import java.util.TimeZone;

@EnableScheduling
@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class HorizonApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
        SpringApplication.run(HorizonApplication.class, args);
    }
}
