package com.A2B.dashboardbackend.clientapidata;

import java.util.Map;

/**
 * Zamplia's LanguageCode (e.g. "En-US", "English-AU") is the only country/language signal its
 * survey feeds return - there is no server-side country parameter on the feed endpoints, and its
 * qualification endpoints take a numeric LanguageId that doesn't correspond to any local id.
 * These lookups translate between Zamplia's own codes and the locally seeded Country/Language
 * names, so nothing here depends on local rows keeping any particular position/order.
 */
final class ZampliaLanguageMapper {

    private ZampliaLanguageMapper() {
    }

    // Zamplia LanguageCode ISO-3166-1 alpha-2 suffix -> local country name
    private static final Map<String, String> ISO2_TO_COUNTRY_NAME = Map.ofEntries(
            Map.entry("US", "United States"), Map.entry("CA", "Canada"), Map.entry("GB", "United Kingdom"),
            Map.entry("UK", "United Kingdom"), Map.entry("DE", "Germany"), Map.entry("IN", "India"),
            Map.entry("AU", "Australia"), Map.entry("NZ", "New Zealand"), Map.entry("FR", "France"),
            Map.entry("ES", "Spain"), Map.entry("IT", "Italy"), Map.entry("NL", "Netherlands"),
            Map.entry("BE", "Belgium"), Map.entry("CH", "Switzerland"), Map.entry("AT", "Austria"),
            Map.entry("SE", "Sweden"), Map.entry("NO", "Norway"), Map.entry("DK", "Denmark"),
            Map.entry("FI", "Finland"), Map.entry("IE", "Ireland"), Map.entry("PT", "Portugal"),
            Map.entry("GR", "Greece"), Map.entry("PL", "Poland"), Map.entry("CZ", "Czech Republic"),
            Map.entry("HU", "Hungary"), Map.entry("RO", "Romania"), Map.entry("BG", "Bulgaria"),
            Map.entry("HR", "Croatia"), Map.entry("SK", "Slovakia"), Map.entry("SI", "Slovenia"),
            Map.entry("LT", "Lithuania"), Map.entry("LV", "Latvia"), Map.entry("EE", "Estonia"),
            Map.entry("MX", "Mexico"), Map.entry("BR", "Brazil"), Map.entry("AR", "Argentina"),
            Map.entry("CL", "Chile"), Map.entry("CO", "Colombia"), Map.entry("PE", "Peru"),
            Map.entry("CN", "China"), Map.entry("JP", "Japan"), Map.entry("KR", "South Korea"),
            Map.entry("HK", "Hong Kong"), Map.entry("TW", "Taiwan"), Map.entry("SG", "Singapore"),
            Map.entry("MY", "Malaysia"), Map.entry("TH", "Thailand"), Map.entry("ID", "Indonesia"),
            Map.entry("PH", "Philippines"), Map.entry("VN", "Vietnam"), Map.entry("ZA", "South Africa"),
            Map.entry("AE", "United Arab Emirates"), Map.entry("SA", "Saudi Arabia"), Map.entry("IL", "Israel"),
            Map.entry("TR", "Turkey"), Map.entry("RU", "Russia"), Map.entry("UA", "Ukraine")
    );

    // Zamplia LanguageCode ISO-639-1 prefix -> local language name
    private static final Map<String, String> PREFIX_TO_LANGUAGE_NAME = Map.of(
            "EN", "English", "ES", "Spanish", "FR", "French", "DE", "German", "JA", "Japanese"
    );

    // Local language name -> Zamplia's own numeric LanguageId (used by its qualification endpoints)
    private static final Map<String, Integer> LANGUAGE_NAME_TO_ZAMPLIA_ID = Map.of(
            "English", 4, "Spanish", 9, "French", 18, "German", 8, "Japanese", 21
    );

    private static final int DEFAULT_ZAMPLIA_LANGUAGE_ID = 4; // English (US)

    static String countryNameFor(String languageCode) {
        String suffix = suffixOf(languageCode);
        return suffix != null ? ISO2_TO_COUNTRY_NAME.get(suffix) : null;
    }

    static String languageNameFor(String languageCode) {
        String prefix = prefixOf(languageCode);
        return prefix != null ? PREFIX_TO_LANGUAGE_NAME.getOrDefault(prefix, "English") : "English";
    }

    static int zampliaLanguageIdFor(String localLanguageName) {
        if (localLanguageName == null) {
            return DEFAULT_ZAMPLIA_LANGUAGE_ID;
        }
        return LANGUAGE_NAME_TO_ZAMPLIA_ID.getOrDefault(localLanguageName, DEFAULT_ZAMPLIA_LANGUAGE_ID);
    }

    private static String suffixOf(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return null;
        }
        String[] parts = languageCode.split("-");
        return parts[parts.length - 1].toUpperCase();
    }

    private static String prefixOf(String languageCode) {
        if (languageCode == null || languageCode.isBlank()) {
            return null;
        }
        return languageCode.split("-")[0].toUpperCase();
    }
}
