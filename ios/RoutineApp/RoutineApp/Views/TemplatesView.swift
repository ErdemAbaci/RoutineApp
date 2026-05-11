import SwiftUI

struct TemplatesView: View {
    @StateObject private var viewModel = TemplatesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.templates.isEmpty {
                    ProgressView("Şablonlar yükleniyor")
                } else {
                    List(viewModel.templates) { template in
                        TemplateCard(
                            template: template,
                            onCreate: {
                                Task { await viewModel.createRoutines(from: template) }
                            }
                        )
                    }
                    .listStyle(.insetGrouped)
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
    let onCreate: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(template.title)
                .font(.headline)

            Text(template.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            ForEach(template.items) { item in
                HStack {
                    Text(item.title)
                    Spacer()
                    Text(item.scheduledTime)
                        .foregroundStyle(.secondary)
                }
                .font(.caption)
            }

            Button("Bu paketi rutinlere ekle", action: onCreate)
                .buttonStyle(.borderedProminent)
                .padding(.top, 4)
        }
        .padding(.vertical, 8)
    }
}
