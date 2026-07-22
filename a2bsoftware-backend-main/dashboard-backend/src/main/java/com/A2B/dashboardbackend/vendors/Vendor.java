package com.A2B.dashboardbackend.vendors;

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
@Table(name = "vendors")
public class Vendor {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "`vendorName`")
    private String vendorName;

    @Column(name = "`apiToken`")
    private String apiToken;

    @Column(name = "`contactPerson`")
    private String contactPerson;

    private String contact;

    private String email;

    @Column(name = "`paymentTerms`")
    private String paymentTerms;

    @Column(name = "`completeLink`")
    private String completeLink;

    @Column(name = "`disqualifyLink`")
    private String disqualifyLink;

    @Column(name = "`qoutafullLink`")
    private String qoutafullLink;

    @Column(name = "`securityTermlink`")
    private String securityTermlink;

    @Column(name = "internal_panel")
    private Integer internalPanel = 0;
}
