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
        routines
            .filter { $0.status == .active }
            .sorted(by: isHigherPriority)
    }

    var archivedRoutines: [Routine] {
        routines
            .filter { $0.status == .archived }
            .sorted { $0.scheduledTime < $1.scheduledTime }
    }

    func loadRoutines() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: RoutineListResponse = try await apiClient.get("routines")
            routines = response.items
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func isHigherPriority(_ left: Routine, _ right: Routine) -> Bool {
        let rank: [RoutinePriority: Int] = [.high: 0, .normal: 1, .low: 2]
        let priorityDifference = (rank[left.resolvedPriority] ?? 1) - (rank[right.resolvedPriority] ?? 1)

        if priorityDifference != 0 {
            return priorityDifference < 0
        }

        return left.scheduledTime < right.scheduledTime
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
                    routine: editingRoutine,
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

            Label(routine.resolvedPriority.displayName, systemImage: priorityIcon)
                .font(.caption.weight(.medium))
                .foregroundStyle(priorityColor)

            if let description = routine.description, !description.isEmpty {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var priorityIcon: String {
        switch routine.resolvedPriority {
        case .high: return "exclamationmark.circle.fill"
        case .normal: return "equal.circle.fill"
        case .low: return "arrow.down.circle.fill"
        }
    }

    private var priorityColor: Color {
        switch routine.resolvedPriority {
        case .high: return .red
        case .normal: return .blue
        case .low: return .secondary
        }
    }
}

private struct RoutineEditorView: View {
    let title: String
    let routine: Routine?
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

                    if draft.frequencyType == .weekly {
                        Picker("Gün", selection: weeklyDayBinding) {
                            ForEach(weekDays, id: \.0) { day in
                                Text(day.1).tag(day.0)
                            }
                        }
                    } else if draft.frequencyType == .selectedDays {
                        ForEach(weekDays, id: \.0) { day in
                            Toggle(day.1, isOn: dayBinding(day.0))
                        }
                    }

                    Toggle("Hatırlatıcı", isOn: $draft.reminderEnabled)
                }

                Section("Öncelik") {
                    Picker("Öncelik", selection: $draft.priority) {
                        ForEach(RoutinePriority.allCases) { priority in
                            Text(priority.displayName).tag(priority)
                        }
                    }
                }

                if let routine {
                    Section("Geçmiş") {
                        NavigationLink {
                            RoutineHistoryView(routine: routine)
                        } label: {
                            Label("Son 30 günü görüntüle", systemImage: "chart.xyaxis.line")
                        }
                    }
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
                if newValue == .daily {
                    draft.daysOfWeek = nil
                } else if newValue == .weekly {
                    draft.daysOfWeek = [draft.daysOfWeek?.first ?? 1]
                } else if draft.daysOfWeek == nil {
                    draft.daysOfWeek = [1]
                }
            }
        }
    }

    private var weeklyDayBinding: Binding<Int> {
        Binding(
            get: { draft.daysOfWeek?.first ?? 1 },
            set: { draft.daysOfWeek = [$0] }
        )
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

@MainActor
private final class RoutineHistoryViewModel: ObservableObject {
    @Published var history: RoutineHistoryResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadHistory(for routine: Routine) async {
        isLoading = true
        errorMessage = nil

        do {
            history = try await APIClient.shared.get("routines/\(routine.id)/history")
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

private struct RoutineHistoryView: View {
    let routine: Routine
    @StateObject private var viewModel = RoutineHistoryViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.history == nil {
                ProgressView("Geçmiş yükleniyor")
            } else if let history = viewModel.history {
                List {
                    Section("Son \(history.windowDays) gün") {
                        if history.items.isEmpty {
                            ContentUnavailableView(
                                "Henüz kayıt yok",
                                systemImage: "calendar.badge.clock",
                                description: Text("Bu rutin tamamlandıkça veya atlandıkça geçmişi burada görünür.")
                            )
                        } else {
                            ForEach(history.items, id: \.id) { completion in
                                HStack {
                                    Image(systemName: statusIcon(completion.status))
                                        .foregroundStyle(statusColor(completion.status))
                                    Text(completion.date)
                                    Spacer()
                                    Text(statusTitle(completion.status))
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(statusColor(completion.status))
                                }
                            }
                        }
                    }
                }
            } else {
                ContentUnavailableView(
                    "Geçmiş yüklenemedi",
                    systemImage: "exclamationmark.triangle",
                    description: Text(viewModel.errorMessage ?? "Tekrar deneyebilirsin.")
                )
            }
        }
        .navigationTitle("Rutin Geçmişi")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadHistory(for: routine)
        }
        .toolbar {
            Button {
                Task { await viewModel.loadHistory(for: routine) }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
        }
    }

    private func statusTitle(_ status: CompletionStatus) -> String {
        switch status {
        case .done: return "Tamamlandı"
        case .skipped: return "Atlandı"
        case .missed: return "Kaçırıldı"
        case .pending: return "Bekliyor"
        }
    }

    private func statusIcon(_ status: CompletionStatus) -> String {
        switch status {
        case .done: return "checkmark.circle.fill"
        case .skipped: return "forward.circle.fill"
        case .missed: return "xmark.circle.fill"
        case .pending: return "circle"
        }
    }

    private func statusColor(_ status: CompletionStatus) -> Color {
        switch status {
        case .done: return .green
        case .skipped: return .orange
        case .missed: return .red
        case .pending: return .secondary
        }
    }
}
