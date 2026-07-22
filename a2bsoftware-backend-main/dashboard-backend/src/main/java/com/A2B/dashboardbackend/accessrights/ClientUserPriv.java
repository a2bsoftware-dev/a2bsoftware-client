package com.A2B.dashboardbackend.accessrights;

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
@Table(name = "client_user_priv")
public class ClientUserPriv {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "user_type_id")
    private UUID userTypeId;

    /** Comma-separated list of privilege module ids (e.g. "1,6,10,14"). */
    @Column(name = "access_right_id")
    private String accessRightId;
}
