import Foundation

enum APIError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case serverMessage(String)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Backend URL ayarlanmadı."
        case .invalidResponse:
            return "Sunucudan beklenmeyen cevap geldi."
        case .serverMessage(let message):
            return message
        }
    }
}

struct ErrorResponse: Codable {
    let message: String
}

final class APIClient {
    static let shared = APIClient()

    // TODO: Serverless deploy sonrası API Gateway URL'ini buraya yaz.
    // Örnek: https://abc123.execute-api.eu-central-1.amazonaws.com
    private let baseURL = URL(string: "https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com")
    private let decoder = JSONDecoder()

    private init() {}

    func get<T: Decodable>(_ path: String) async throws -> T {
        try validateConfiguredBaseURL()
        return try await request(path, method: "GET", body: Optional<String>.none)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        try validateConfiguredBaseURL()
        return try await request(path, method: "POST", body: Optional<String>.none)
    }

    func post<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        try validateConfiguredBaseURL()
        return try await request(path, method: "POST", body: body)
    }

    func put<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        try validateConfiguredBaseURL()
        return try await request(path, method: "PUT", body: body)
    }

    private func validateConfiguredBaseURL() throws {
        if baseURL?.host == "YOUR_API_ID.execute-api.eu-central-1.amazonaws.com" {
            throw APIError.invalidBaseURL
        }
    }

    private func request<T: Decodable, Body: Encodable>(
        _ path: String,
        method: String,
        body: Body? = Optional<String>.none
    ) async throws -> T {
        guard let baseURL else {
            throw APIError.invalidBaseURL
        }

        let normalizedPath = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        var request = URLRequest(url: baseURL.appendingPathComponent(normalizedPath))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if (200..<300).contains(httpResponse.statusCode) {
            return try decoder.decode(T.self, from: data)
        }

        if let error = try? decoder.decode(ErrorResponse.self, from: data) {
            throw APIError.serverMessage(error.message)
        }

        throw APIError.invalidResponse
    }
}
