package com.A2B.dashboardbackend.common;

import java.util.List;

public record PagedResult<T>(List<T> items, long total) {
}
