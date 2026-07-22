package com.A2B.dashboardbackend;

import com.A2B.dashboardbackend.clientapidata.ZampliaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(ZampliaProperties.class)
public class DashboardBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DashboardBackendApplication.class, args);
    }

}
