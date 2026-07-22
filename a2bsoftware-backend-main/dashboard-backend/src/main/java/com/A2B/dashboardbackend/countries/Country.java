package com.A2B.dashboardbackend.countries;

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
@Table(name = "countries")
public class Country {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    private String name;

    /**
     * External panel/client country code (e.g. Zamplia's own numbering), not a foreign key to
     * another table's UUID primary key - stays a plain integer lookup value.
     */
    @Column(name = "`countryID`")
    private Integer countryId;
}
