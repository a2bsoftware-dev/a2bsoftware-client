package com.A2B.dashboardbackend.projects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "projects")
public class Project {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "parent_project_id")
    private UUID parentProjectId;

    @Column(name = "study_type")
    private Integer studyType;

    @Column(name = "`surveyId`")
    private String surveyId;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "req_complete")
    private Integer reqComplete = 0;

    private Integer loi = 0;

    private Integer ir = 0;

    private Double cpc = 0d;

    @Column(name = "vendor_cpi")
    private Double vendorCpi = 0d;

    @Column(name = "survey_link")
    private String surveyLink;

    @Column(name = "survey_test_link")
    private String surveyTestLink;

    @Column(name = "country_id")
    private UUID countryId;

    @Column(name = "language_id")
    private UUID languageId;

    @Column(name = "currency_id")
    private UUID currencyId;

    @Column(name = "client_id")
    private UUID clientId;

    @Column(name = "project_manager_id")
    private UUID projectManagerId;

    @Column(name = "sales_manager_id")
    private UUID salesManagerId;

    private Integer status = 1;

    private String device;

    @Column(name = "security_check_list")
    private String securityCheckList;

    private Integer approved = 0;

    @Column(name = "top_survey")
    private Integer topSurvey = 0;

    @Column(name = "client_api_data")
    private Integer clientApiData = 0;

    @Column(name = "copy_for_client")
    private Integer copyForClient = 0;

    private String notes;

    @Column(name = "project_brief")
    private String projectBrief;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
