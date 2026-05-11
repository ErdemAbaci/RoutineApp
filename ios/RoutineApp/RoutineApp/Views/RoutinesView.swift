import SwiftUI

@MainActor
final class RoutinesViewModel: ObservableObject {
    @Published var routines: [Routine] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    var activeRoutines: [Routine] {
        routines.filter { $0.status == .active }
    }

    var archivedRoutines: [Routine] {
        routines.filter { $0.status == .archived }
    }

    func loadRoutines() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: RoutineListResponse = try await apiClient.get("routines")
            routines = response.items.sorted { $0.scheduledTime < $1.scheduledTime }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func createRoutine(_ draft: RoutineDraft) async -> Bool {
        await save {
            let _: Routine = try await apiClient.post("routines", body: draft)
        }
    }

    func updateRoutine(_ routine: Routine, draft: RoutineDraft) async -> Bool {
        await save {
            let _: Routine = try await apiClient.put("routines/\(routine.id)", body: draft)
        }
    }

    func archiveRoutine(_ routine: Routine) async {
        _ = await save {
            let _: ArchiveRoutineResponse = try await apiClient.post("routines/\(routine.id)/archive")
        }
    }

    private func save(_ operation: () async throws -> Void) async -> Bool {
        errorMessage = nil

        do {
            try await operation()
            await loadRoutines()
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}

struct RoutinesView: View {
    @StateObject private var viewModel = RoutinesViewModel()
    @State private var draft = RoutineDraft()
    @State private var editingRoutine: Routine?
    @State private var isShowingEditor = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.routines.isEmpty {
                    ProgressView("Rutinler yükleniyor")
                } else if viewModel.routines.isEmpty {
                    ContentUnavailableView(
                        "Henüz rutin yok",
                        systemImage: "list.bullet",
                        description: Text("Yeni rutin ekleyerek Today ekranını doldurabilirsin.")
                    )
                } else {
                    List {
                        Section("Aktif") {
                            ForEach(viewModel.activeRoutines) { routine in
                                RoutineListRow(routine: routine)
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        beginEditing(routine)
                                    }
                                    .swipeActions(edge: .trailing) {
                                        Button("Archive", role: .destructive) {
                                            Task { await viewModel.archiveRoutine(routine) }
                                        }
                                    }
                            }
                        }

                        if !viewModel.archivedRoutines.isEmpty {
                            Section("Arşiv") {
                                ForEach(viewModel.archivedRoutines) { routine in
                                    RoutineListRow(routine: routine)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Routines")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await viewModel.loadRoutines() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        beginCreating()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadRoutines()
            }
            .sheet(isPresented: $isShowingEditor) {
                RoutineEditorView(
                    title: editingRoutine == nil ? "Yeni Rutin" : "Rutini Düzenle",
                    draft: $draft,
                    onCancel: {
                        isShowingEditor = false
                    },
                    onSave: {
                        Task {
                            let didSave: Bool

                            if let editingRoutine {
                                didSave = await viewModel.updateRoutine(editingRoutine, draft: draft)
                            } else {
                                didSave = await viewModel.createRoutine(draft)
                            }

                            if didSave {
                                isShowingEditor = false
                            }
                        }
                    }
                )
            }
            .alert("Hata", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("Tamam", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }

    private func beginCreating() {
        editingRoutine = nil
        draft = RoutineDraft()
        isShowingEditor = true
    }

    private func beginEditing(_ routine: Routine) {
        editingRoutine = routine
        draft = RoutineDraft(routine: routine)
        isShowingEditor = true
    }
}

private struct RoutineListRow: View {
    let routine: Routine

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(routine.title)
                    .font(.headline)

                Spacer()

                Text(routine.scheduledTime)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text("\(routine.category.rawValue) • \(routine.frequencyType.rawValue)")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let description = routine.description, !description.isEmpty {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct RoutineEditorView: View {
    let title: String
    @Binding var draft: RoutineDraft
    let onCancel: () -> Void
    let onSave: () -> Void

    private let weekDays = [
        (0, "Paz"),
        (1, "Pzt"),
        (2, "Sal"),
        (3, "Çar"),
        (4, "Per"),
        (5, "Cum"),
        (6, "Cmt"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section("Temel") {
                    TextField("Başlık", text: $draft.title)

                    Picker("Kategori", selection: $draft.category) {
                        ForEach(RoutineCategory.allCases) { category in
                            Text(category.rawValue).tag(category)
                        }
                    }

                    TextField(
                        "Açıklama",
                        text: Binding(
                            get: { draft.description ?? "" },
                            set: { draft.description = $0.isEmpty ? nil : $0 }
                        ),
                        axis: .vertical
                    )
                }

                Section("Zaman") {
                    TextField("Saat", text: $draft.scheduledTime)
                        .keyboardType(.numbersAndPunctuation)

                    Picker("Sıklık", selection: $draft.frequencyType) {
                        ForEach(RoutineFrequencyType.allCases) { frequency in
                            Text(frequency.rawValue).tag(frequency)
                        }
                    }

                    if draft.frequencyType == .selectedDays {
                        ForEach(weekDays, id: \.0) { day in
                            Toggle(day.1, isOn: dayBinding(day.0))
                        }
                    }

                    Toggle("Hatırlatıcı", isOn: $draft.reminderEnabled)
                }
            }
            .navigationTitle(title)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Vazgeç", action: onCancel)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet", action: onSave)
                        .disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onChange(of: draft.frequencyType) { _, newValue in
                if newValue != .selectedDays {
                    draft.daysOfWeek = nil
                } else if draft.daysOfWeek == nil {
                    draft.daysOfWeek = [1]
                }
            }
        }
    }

    private func dayBinding(_ day: Int) -> Binding<Bool> {
        Binding(
            get: { draft.daysOfWeek?.contains(day) ?? false },
            set: { isSelected in
                var days = draft.daysOfWeek ?? []

                if isSelected {
                    if !days.contains(day) {
                        days.append(day)
                    }
                } else {
                    days.removeAll { $0 == day }
                }

                draft.daysOfWeek = days.sorted()
            }
        )
    }
}
