## Summary
<!-- Brief description of what this PR does -->

## Checklist

- [ ] Backend logic follows the single-source principle: thresholds in risk_engine only, downstream reads labels
- [ ] New backend logic has corresponding tests in `tests/`
- [ ] Frontend text uses i18n keys (`t('key.name')`) — no hardcoded strings
- [ ] Both `en.json` and `zh.json` updated if new keys added
- [ ] `npm run build` succeeds (TypeScript compilation)
- [ ] `python3 -m pytest tests/` passes
- [ ] UI changes reviewed with `python3 scripts/review-ui.py`

## Screenshots
<!-- If UI changes, attach before/after screenshots -->
