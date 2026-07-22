package com.A2B.dashboardbackend.qualifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "questions")
public class Question {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    /** External provider's own question id (e.g. Zamplia's QuestionID) - not a local FK. */
    @Column(name = "`questionId`")
    private String questionId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "`countryId`")
    private UUID countryId;

    @Column(name = "question_name")
    private String questionName;

    /** 1 = single select, 2 = multi select, 3 = free text. */
    private Integer type;
}
