package com.A2B.dashboardbackend.countries;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CountryRepository extends JpaRepository<Country, UUID> {

    Optional<Country> findByCountryId(Integer countryId);

    Optional<Country> findByNameIgnoreCase(String name);
}
