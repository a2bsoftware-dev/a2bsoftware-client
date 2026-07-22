package com.A2B.dashboardbackend.clientapidata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ZampliaQualificationDto(
        @JsonProperty("QuestionID") String questionId,
        @JsonProperty("AnswerCodes") List<String> answerCodes
) {
}
