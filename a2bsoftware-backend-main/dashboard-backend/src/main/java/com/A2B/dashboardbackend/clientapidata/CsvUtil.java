package com.A2B.dashboardbackend.clientapidata;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Minimal quoted-field CSV reader/writer helper - no external dependency needed for this. */
final class CsvUtil {

    private CsvUtil() {
    }

    static List<List<String>> parse(BufferedReader reader) throws IOException {
        StringBuilder all = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            all.append(line).append('\n');
        }
        return parse(all.toString());
    }

    static List<List<String>> parse(String text) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            char next = i + 1 < text.length() ? text.charAt(i + 1) : '\0';

            if (inQuotes) {
                if (c == '"' && next == '"') {
                    field.append('"');
                    i++;
                } else if (c == '"') {
                    inQuotes = false;
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                row.add(field.toString());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && next == '\n') continue;
                row.add(field.toString());
                rows.add(row);
                row = new ArrayList<>();
                field.setLength(0);
            } else {
                field.append(c);
            }
        }

        if (field.length() > 0 || !row.isEmpty()) {
            row.add(field.toString());
            rows.add(row);
        }

        return rows.stream().filter(r -> r.stream().anyMatch(f -> !f.trim().isEmpty())).toList();
    }
}
