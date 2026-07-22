package com.A2B.dashboardbackend.languages;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {

    Optional<Language> findByLanguageNameIgnoreCase(String languageName);
}
