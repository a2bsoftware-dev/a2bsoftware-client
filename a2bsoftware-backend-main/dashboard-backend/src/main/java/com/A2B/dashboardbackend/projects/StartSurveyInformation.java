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
@Table(name = "start_survey_informations")
public class StartSurveyInformation {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private UUID pid;

    private UUID gid;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "ref_id")
    private String refId;

    @Column(name = "start_ip_address")
    private String startIpAddress;

    @Column(name = "end_ip_address")
    private String endIpAddress;

    private Integer status;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;
}
