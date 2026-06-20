# Routine App Demo Notes

This project is a Serverless Routine Tracker backend with a SwiftUI iOS MVP.
The current scope is a demo-ready MVP, not a production app with auth and push notifications.

## Current Assumptions

- Backend owner id is still `temporary-user-id` for development speed.
- Backend runs on AWS Lambda, API Gateway HTTP API, and DynamoDB.
- iOS reads the API URL from local Xcode config:
  `ios/RoutineApp/Config/Local.xcconfig`.
- Auth, real mobile notifications, and App Store release setup are intentionally not included yet.

## Main User Flow

1. User creates routines manually or applies a routine template.
2. Backend assigns each routine a `startDate`.
   - If today is already finalized, the routine starts tomorrow.
   - If the routine time has already passed, it starts tomorrow.
   - Otherwise it can appear today.
3. `GET /today` returns today's active routines, completion state, daily summary, streak, freeze, and motivation message.
4. User can complete or skip routines.
   - Complete is blocked until the routine's scheduled time arrives.
   - Complete/skip is blocked after the day is finalized.
5. At night, `finalizeYesterdaySummary` runs around 00:10 Istanbul time and finalizes yesterday.
6. Finalized summaries are immutable for badge, points, streak, and freeze calculations.
7. iOS can show a next-day badge celebration when yesterday finalized as `gold`, `silver`, or `bronze`.

## Gamification Rules

- Routine categories carry point values.
- Daily badge is based on point completion rate.
- Streak is updated only through finalized daily summaries.
- A missed day can consume a freeze and protect the streak.
- Weekly gold momentum can earn one freeze, capped by backend rules.

## Duplicate Protection

Routine duplicate identity is based on:

- `title`
- `category`
- `frequencyType`
- `scheduledTime`
- `daysOfWeek`

Duplicate protection exists in two layers:

- Application precheck catches existing active routines, including legacy routines without a marker.
- DynamoDB transaction marker catches concurrent duplicate create/apply requests.

Manual `POST /routines` now returns `409 Routine already exists` for duplicates.
Template apply returns duplicates in the `skipped` list.
Archiving a routine releases its duplicate marker, so the same routine can be created again later.

## Important Endpoints

- `GET /today`
- `POST /routines`
- `GET /routines`
- `PUT /routines/{id}`
- `POST /routines/{id}/archive`
- `POST /routines/{id}/complete`
- `POST /routines/{id}/skip`
- `GET /routine-templates`
- `POST /routine-templates/{id}/apply`
- `GET /dashboard`
- `GET /insights`
- `GET /summaries`
- `POST /summaries/{date}/finalize`

## Verification Commands

Run local backend checks:

```bash
npm test
```

Deploy backend:

```bash
npx serverless deploy
```

Run live smoke test:

```bash
API_BASE_URL=https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com node scripts/live-smoke.cjs
```

The live smoke test checks:

- `GET /dashboard`
- `GET /today`
- `GET /routine-templates`
- `POST /routines`
- duplicate `POST /routines` returns `409`
- `POST /routines/{id}/archive`

## Last Verified State

- Local backend tests: `19/19` passing.
- Latest backend deploy: successful.
- Live smoke test: passing.

## Good Next Steps

- Add a short architecture diagram to the README.
- Add an auth-ready `resolveOwnerId(event)` helper while keeping `temporary-user-id` in dev.
- Add a small admin/dev endpoint or script to inspect and clean demo data.
- Later: add real reminders with a notification service and iOS push integration.
