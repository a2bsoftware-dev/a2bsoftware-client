package com.A2B.dashboardbackend.clientapidata;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.ResolvableType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * All outbound calls to the Zamplia survey-supply API live here - this is the only place in the
 * whole app that talks to Zamplia, so the frontend never needs (or gets) the API key.
 */
@Slf4j
@Component
public class ZampliaClient {

    private final RestClient restClient;

    public ZampliaClient(ZampliaProperties properties) {
        String baseUrl = properties.baseUrl() != null && !properties.baseUrl().isBlank()
                ? properties.baseUrl()
                : "https://surveysupply.zamplia.com";

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("accept", "application/json")
                .defaultHeader("ZAMP-KEY", properties.apiKey() != null ? properties.apiKey() : "")
                .build();
    }

    public List<ZampliaSurveyDto> getTopPickSurveys() {
        return get("/api/v1/Surveys/getTopPickSurveys", "top pick surveys", ZampliaSurveyDto.class);
    }

    public List<ZampliaSurveyDto> getAllocatedSurveys() {
        return get("/api/v1/Surveys/GetAllocatedSurveys", "allocated surveys", ZampliaSurveyDto.class);
    }

    public List<ZampliaQualificationDto> getSurveyQualifications(String surveyId) {
        return get("/api/v1/Surveys/GetSurveyQualifications?SurveyId=" + surveyId,
                "survey qualifications for " + surveyId, ZampliaQualificationDto.class);
    }

    public List<ZampliaDemographicDto> getDemographics(int zampliaLanguageId) {
        return get("/api/v1/Attributes/GetDemoGraphics?LanguageId=" + zampliaLanguageId,
                "demographics dictionary", ZampliaDemographicDto.class);
    }

    /** Pure string templating, no outbound call - Zamplia's link is resolved client-side per respondent. */
    public String buildSurveyLinkTemplate(String surveyId) {
        return "https://surveysupply.zamplia.com/api/v1/Surveys/GenerateLink?SurveyId=" + surveyId
                + "&IpAddress={{ip}}&TransactionId={{txn}}";
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> get(String uri, String description, Class<T> itemType) {
        try {
            ResolvableType bodyType = ResolvableType.forClassWithGenerics(ZampliaResponse.class, itemType);
            ZampliaResponse<T> response = (ZampliaResponse<T>) restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(ParameterizedTypeReference.forType(bodyType.getType()));
            return response != null ? response.dataOrEmpty() : List.of();
        } catch (Exception ex) {
            log.error("Error fetching {} from Zamplia", description, ex);
            return List.of();
        }
    }
}
