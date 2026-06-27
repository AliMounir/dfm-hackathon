# Task 3: Real data + consolidation

**Status**: Not Started
**Last Updated**: 26-06-28

## Goal
Replace sample data with real project exports and unify data access.

## Checklist
- [ ] Parse `data/projects/<id>/*.xlsx` (REDCap/DHIS2/Excel) into the structured shape
- [ ] Point the dashboard tools at the real data source (or the data_quality /
      health_gaps / insights domain services) instead of `sample_data.py`
- [ ] Make `compute_data_signals` run on real numbers (missing %, plausibility, trends)
- [ ] Cache the plan per project (avoid an LLM call on every open)
- [ ] Add a "Refresh" affordance to recompose on demand
- [ ] Tests: signals + fallback ordering + endpoint (no key / mocked agent)

## Acceptance
- [ ] Dashboard reflects the actual uploaded data, not the demo fixture
- [ ] One source of truth shared by frontend + backend
