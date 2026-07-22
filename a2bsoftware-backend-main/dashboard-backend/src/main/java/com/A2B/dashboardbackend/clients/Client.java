package com.A2B.dashboardbackend.clients;

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
@Table(name = "clients")
public class Client {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "`clientName`")
    private String clientName;

    @Column(name = "`contactPerson`")
    private String contactPerson;

    private String contact;

    private String email;

    @Column(name = "`paymentTerms`")
    private String paymentTerms;
}
