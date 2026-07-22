package com.A2B.dashboardbackend.currencies;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CurrencyRepository extends JpaRepository<Currency, UUID> {

    Optional<Currency> findByCurrencyNameIgnoreCase(String currencyName);
}
