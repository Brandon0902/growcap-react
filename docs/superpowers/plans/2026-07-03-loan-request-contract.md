# Loan Request Contract Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Send valid loan requests to Render and display field-level validation errors.

**Architecture:** Keep the wizard contract stable. Centralize request-body selection in the loan service and error-shape normalization in `apiUtils`.

**Tech Stack:** React 18, Axios, Vite, node:test.

---

### Task 1: Request body
- [ ] Add failing tests for numeric JSON payload and file multipart payload.
- [ ] Implement request-body selection and numeric normalization.
- [ ] Run focused tests.

### Task 2: Validation details
- [ ] Add a failing test for a 422 response containing `details`.
- [ ] Merge `details` and `errors` in `normalizeApiError`.
- [ ] Run focused tests.

### Task 3: Configuration and verification
- [ ] Point local environment to `https://growcap-serv.onrender.com/api`.
- [ ] Run lint and build.
- [ ] Submit and clean the exact production request.
