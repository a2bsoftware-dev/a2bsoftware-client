package com.A2B.dashboardbackend.clientapidata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ZampliaDemographicDto(
        @JsonProperty("QuestionID") String questionId,
        @JsonProperty("QuestionText") String questionText,
        @JsonProperty("DemographicName") String demographicName,
        @JsonProperty("QuestionType") String questionType,
        @JsonProperty("AnswerCodes") List<AnswerOption> answerCodes
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnswerOption(
            @JsonProperty("AnswerCode") String answerCode,
            @JsonProperty("AnswerText") String answerText
    ) {
    }
}
