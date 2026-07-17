# RoutineApp iOS

SwiftUI MVP scaffold for the Routine App backend.

## Open in Xcode

Open:

```text
ios/RoutineApp/RoutineApp.xcodeproj
```

If command line Xcode tools point to Command Line Tools, Xcode itself can still open the project. For CLI builds, switch the developer directory if needed:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## Connect Backend

The app reads its backend URL and dev access token from local config, not from
Swift source. From the repository root, generate the ignored access settings:

```bash
npm run setup:dev-access
```

Then create or update this local-only file's API URL:

```text
ios/RoutineApp/Config/Local.xcconfig
```

Use this format:

```text
API_BASE_URL = https:/$()/YOUR_API_ID.execute-api.eu-central-1.amazonaws.com
```

`Local.xcconfig` and the backend `.env` are ignored by git, so real dev URLs,
tokens, and allowed IP values do not get committed. Run the setup command and
deploy the backend again if your public IP changes.

## Current Screens

- `TodayView`: calls `GET /today`, shows summary, streak/freeze, routines, complete/skip buttons.
- `InsightsView`: calls `GET /insights`, shows insight cards and action labels.
- `TemplatesView`: calls `GET /routine-templates`, shows starter routine packs.
- `RoutinesView`: placeholder for CRUD screens.

## Learning Notes

Start by reading these files in order:

1. `RoutineAppApp.swift`: app entry point.
2. `Views/RootTabView.swift`: tab navigation.
3. `Models/TodayModels.swift`: `Codable` models for backend JSON.
4. `Networking/APIClient.swift`: `URLSession`, `async/await`, generic decoding.
5. `ViewModels/TodayViewModel.swift`: MVVM state and API calls.
6. `Views/TodayView.swift`: SwiftUI layout and user actions.
