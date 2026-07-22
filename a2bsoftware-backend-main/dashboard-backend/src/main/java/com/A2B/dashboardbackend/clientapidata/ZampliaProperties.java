package com.A2B.dashboardbackend.clientapidata;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zamplia")
public record ZampliaProperties(String baseUrl, String apiKey) {
}
