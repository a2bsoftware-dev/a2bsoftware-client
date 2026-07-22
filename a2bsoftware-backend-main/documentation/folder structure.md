# Folder Structure Guidelines - A2B Dashboard

## Purpose

This document defines the folder and package structure conventions for the A2B Dashboard backend. All contributors should follow these guidelines to keep the codebase consistent, discoverable, and easy to navigate as the project grows.

## Guiding Principle: Feature-Based Packaging

Code is organized **by feature**, not by technical layer. Each feature owns a single package containing everything needed to implement it (controller, service, data records, enums, etc.). This keeps related code together, makes features easier to locate, extend, or remove, and limits the blast radius of changes to a single feature.

Avoid grouping classes into top-level `controllers/`, `services/`, or `models/` packages that span multiple, unrelated features — this scatters a single feature's logic across the codebase and makes it harder to reason about.

## Package Layout

```
src/main/java/com/a2bsoftware/dashboard/
└── login/
    ├── LoginController.java
    ├── LoginService.java
    ├── LoginRequest.java        (record)
    ├── LoginResponse.java       (record)
    └── LoginStatus.java         (enum)
```

## Naming Conventions

| Component | Suffix       | Type    | Example              |
|-----------|--------------|---------|-----------------------|
| Controller | `Controller` | Class   | `LoginController`     |
| Service    | `Service`    | Class   | `LoginService`        |
| Data model | —            | Record  | `LoginRequest`        |
| Constants  | —            | Enum    | `LoginStatus`         |

## Adding a New Feature

1. Create a new package under the base package, named after the feature (lowercase, singular where possible, e.g. `login`, `invoice`, `notification`).
2. Place the feature's controller, service, records, and enums directly inside that package.
3. If the feature grows large enough to need further separation (e.g. multiple services, sub-workflows), introduce sub-packages within the feature package rather than pulling files out into shared top-level packages.
4. Only promote a class to a shared/common package (e.g. `common/`, `config/`) when it is genuinely reused by more than one feature.
