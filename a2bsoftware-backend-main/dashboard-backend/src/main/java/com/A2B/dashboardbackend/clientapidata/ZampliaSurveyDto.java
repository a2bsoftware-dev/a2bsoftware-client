package com.A2B.dashboardbackend.clientapidata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ZampliaSurveyDto(
        @JsonProperty("SurveyId") String surveyId,
        @JsonProperty("Name") String name,
        @JsonProperty("TotalCompleteRequired") Integer totalCompleteRequired,
        @JsonProperty("LOI") Integer loi,
        @JsonProperty("IR") Integer ir,
        @JsonProperty("CPI") Double cpi,
        @JsonProperty("LanguageCode") String languageCode
) {
}
