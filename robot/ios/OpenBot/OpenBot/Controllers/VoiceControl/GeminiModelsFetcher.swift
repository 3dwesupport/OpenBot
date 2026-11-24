//
// Voice Control (Gemini Live)
//

import Foundation

/// Lists the Gemini models an API key can use with the Live API (those supporting bidiGenerateContent).
enum GeminiModelsFetcher {

    struct ModelInfo {
        /// For example "models/gemini-3.1-flash-live-preview".
        let name: String
        let displayName: String
    }

    private static let listModelsUrl = "https://generativelanguage.googleapis.com/v1beta/models"
    private static let liveMethod = "bidiGenerateContent"
    private static let maxPages = 10

    /// Calls completion on the main queue.
    static func fetchLiveModels(apiKey: String, completion: @escaping (Result<[ModelInfo], Error>) -> Void) {
        fetchPage(apiKey: apiKey, pageToken: nil, page: 0, found: []) { result in
            DispatchQueue.main.async {
                completion(result)
            }
        }
    }

    private static func fetchPage(apiKey: String, pageToken: String?, page: Int, found: [ModelInfo], completion: @escaping (Result<[ModelInfo], Error>) -> Void) {
        guard var components = URLComponents(string: listModelsUrl) else {
            completion(.success(found))
            return
        }
        var query = [URLQueryItem(name: "key", value: apiKey), URLQueryItem(name: "pageSize", value: "1000")]
        if let token = pageToken {
            query.append(URLQueryItem(name: "pageToken", value: token))
        }
        components.queryItems = query
        guard let url = components.url else {
            completion(.success(found))
            return
        }
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            guard status == 200, let data = data, let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                completion(.failure(NSError(domain: "GeminiModelsFetcher", code: status, userInfo: [NSLocalizedDescriptionKey: "\(status): \(body)"])))
                return
            }
            var models = found
            for model in root["models"] as? [[String: Any]] ?? [] {
                let methods = model["supportedGenerationMethods"] as? [String] ?? []
                if methods.contains(liveMethod), let name = model["name"] as? String, !name.isEmpty {
                    models.append(ModelInfo(name: name, displayName: model["displayName"] as? String ?? name))
                }
            }
            if let next = root["nextPageToken"] as? String, !next.isEmpty, page + 1 < maxPages {
                fetchPage(apiKey: apiKey, pageToken: next, page: page + 1, found: models, completion: completion)
            } else {
                completion(.success(models))
            }
        }.resume()
    }
}
