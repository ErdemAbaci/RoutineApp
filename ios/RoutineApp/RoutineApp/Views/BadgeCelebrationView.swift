import SwiftUI

struct BadgeCelebration: Identifiable {
    let id = UUID()
    let date: String
    let badge: String
    let earnedPoints: Int
    let totalPoints: Int
}

struct BadgeCelebrationView: View {
    let celebration: BadgeCelebration
    let onClose: () -> Void

    @State private var iconScale = 0.35
    @State private var iconRotation = -8.0
    @State private var contentOpacity = 0.0
    @State private var ringScale = 0.7
    @State private var glowOpacity = 0.18

    var body: some View {
        ZStack {
            LinearGradient(
                colors: gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer()

                ZStack {
                    Circle()
                        .fill(.white.opacity(glowOpacity))
                        .frame(width: 220, height: 220)
                        .blur(radius: 24)

                    Circle()
                        .stroke(.white.opacity(0.22), lineWidth: 18)
                        .frame(width: 184, height: 184)
                        .scaleEffect(ringScale)

                    Image(systemName: badgeIcon)
                        .font(.system(size: 86, weight: .bold))
                        .foregroundStyle(.white)
                        .scaleEffect(iconScale)
                        .rotationEffect(.degrees(iconRotation))
                        .shadow(color: .black.opacity(0.18), radius: 18, x: 0, y: 10)
                }

                VStack(spacing: 10) {
                    Text("Dün \(celebration.badge.capitalized) aldın")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Text("\(celebration.earnedPoints)/\(celebration.totalPoints) puan tamamlandı")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.86))

                    Text(celebration.date)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.72))
                }
                .opacity(contentOpacity)

                Spacer()

                Button(action: onClose) {
                    Text("Bugüne başla")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.white)
                        .foregroundStyle(buttonColor)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 28)
                .opacity(contentOpacity)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.75, dampingFraction: 0.62)) {
                iconScale = 1
                iconRotation = 0
                ringScale = 1.08
            }

            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                glowOpacity = 0.34
                ringScale = 1.14
            }

            withAnimation(.easeOut(duration: 0.45).delay(0.18)) {
                contentOpacity = 1
            }
        }
    }

    private var badgeIcon: String {
        switch celebration.badge {
        case "gold":
            return "trophy.fill"
        case "silver":
            return "medal.fill"
        default:
            return "seal.fill"
        }
    }

    private var gradientColors: [Color] {
        switch celebration.badge {
        case "gold":
            return [.yellow, .orange]
        case "silver":
            return [.gray, .teal]
        default:
            return [.orange, .pink]
        }
    }

    private var buttonColor: Color {
        switch celebration.badge {
        case "gold":
            return .orange
        case "silver":
            return .teal
        default:
            return .pink
        }
    }
}
