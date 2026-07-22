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
@Table(name = "options")
public class Option {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "question_id")
    private UUID questionId;

    /** External provider's own answer code (e.g. Zamplia's AnswerCode) - not a local FK. */
    @Column(name = "`answerId`")
    private String answerId;

    @Column(name = "`answerTitle`")
    private String answerTitle;

    /** 1 = qualifying answer, 0 = disqualifying. */
    private Integer answer;
}
