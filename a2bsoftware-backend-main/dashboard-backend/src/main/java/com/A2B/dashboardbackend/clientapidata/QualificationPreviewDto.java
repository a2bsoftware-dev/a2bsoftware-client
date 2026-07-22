package com.A2B.dashboardbackend.clientapidata;

import java.util.List;

public record QualificationPreviewDto(
        String questionId,
        String questionName,
        String questionText,
        String questionType,
        boolean resolved,
        List<QualificationOptionDto> options
) {
}
