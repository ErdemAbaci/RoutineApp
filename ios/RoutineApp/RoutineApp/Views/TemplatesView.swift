import SwiftUI

struct TemplatesView: View {
    @StateObject private var viewModel = TemplatesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.templates.isEmpty {
                    ProgressView("Şablonlar yükleniyor")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Hazır paketler")
                                .font(.title2.bold())

                            ForEach(viewModel.templates) { template in
                                TemplateCard(
                                    template: template,
                                    isApplying: viewModel.isApplyingTemplate,
                                    onCreate: {
                                        Task { await viewModel.createRoutines(from: template) }
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                    .background(Color(.systemGroupedBackground))
                }
            }
            .navigationTitle("Templates")
            .task {
                await viewModel.loadTemplates()
            }
            .alert("Hata", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("Tamam", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .alert("Tamamlandı", isPresented: Binding(
                get: { viewModel.successMessage != nil },
                set: { if !$0 { viewModel.successMessage = nil } }
            )) {
                Button("Tamam", role: .cancel) {}
            } message: {
                Text(viewModel.successMessage ?? "")
            }
        }
    }
}

private struct TemplateCard: View {
    let template: RoutineTemplate
    let isApplying: Bool
    let onCreate: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(template.title)
                        .font(.headline)
                        .lineLimit(2)

                    Text(template.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text("\(template.items.count)")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(.teal)
                    .clipShape(Circle())
            }

            ForEach(template.items) { item in
                HStack {
                    Image(systemName: iconName(for: item.category))
                        .foregroundStyle(.teal)
                        .frame(width: 24)
                    Text(item.title)
                    Spacer()
                    Text(item.scheduledTime)
                        .foregroundStyle(.secondary)
                }
                .font(.caption)
            }

            Button(action: onCreate) {
                Label("Paketi ekle", systemImage: "plus.circle.fill")
                    .frame(maxWidth: .infinity)
            }
                .buttonStyle(.borderedProminent)
                .disabled(isApplying)
                .padding(.top, 4)
        }
        .padding(16)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 6)
    }

    private func iconName(for category: RoutineCategory) -> String {
        switch category {
        case .water:
            return "drop.fill"
        case .medicine:
            return "cross.case.fill"
        case .vitamin, .supplement:
            return "pills.fill"
        case .study:
            return "book.fill"
        case .walking:
            return "figure.walk"
        case .workout:
            return "dumbbell.fill"
        case .habit:
            return "checkmark.seal.fill"
        }
    }
}
