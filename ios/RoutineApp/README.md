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

Set the API Gateway URL in:

```text
RoutineApp/Networking/APIClient.swift
```

Replace:

```swift
https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com
```

with the Serverless deploy URL.

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
