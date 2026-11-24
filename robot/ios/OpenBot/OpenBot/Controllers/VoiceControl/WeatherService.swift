//
// Voice Control (Gemini Live)
//

import Foundation
import CoreLocation

/// Current weather at the phone's location from Open-Meteo (free, no API key). Asks for location permission on first use.
final class WeatherService: NSObject, CLLocationManagerDelegate {

    typealias Completion = (Result<[String: Any], Error>) -> Void

    private static let forecastUrl = "https://api.open-meteo.com/v1/forecast"
    private static let locationTimeout: TimeInterval = 10

    private let locationManager = CLLocationManager()
    private var pending: [Completion] = []
    private var timeoutWork: DispatchWorkItem?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    /// Main queue only; completion runs on the main queue.
    func fetchCurrentWeather(completion: @escaping Completion) {
        pending.append(completion)
        guard pending.count == 1 else {
            return
        }
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            finish(.failure(WeatherService.error("Location permission was not granted.")))
        default:
            requestLocation()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard !pending.isEmpty else {
            return
        }
        switch manager.authorizationStatus {
        case .notDetermined:
            break
        case .denied, .restricted:
            finish(.failure(WeatherService.error("Location permission was not granted.")))
        default:
            requestLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !pending.isEmpty, let location = locations.last else {
            return
        }
        timeoutWork?.cancel()
        requestForecast(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !pending.isEmpty else {
            return
        }
        // A recent cached fix is good enough for the weather.
        if let location = manager.location {
            timeoutWork?.cancel()
            requestForecast(location)
        } else {
            finish(.failure(WeatherService.error("Could not determine the robot's location.")))
        }
    }

    // MARK: - Private

    private func requestLocation() {
        if let location = locationManager.location, -location.timestamp.timeIntervalSinceNow < 30 * 60 {
            requestForecast(location)
            return
        }
        locationManager.requestLocation()
        let work = DispatchWorkItem { [weak self] in
            self?.finish(.failure(WeatherService.error("Could not determine the robot's location.")))
        }
        timeoutWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + WeatherService.locationTimeout, execute: work)
    }

    private func requestForecast(_ location: CLLocation) {
        var components = URLComponents(string: WeatherService.forecastUrl)!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(location.coordinate.latitude)),
            URLQueryItem(name: "longitude", value: String(location.coordinate.longitude)),
            URLQueryItem(name: "current_weather", value: "true"),
            URLQueryItem(name: "temperature_unit", value: "celsius"),
            URLQueryItem(name: "windspeed_unit", value: "kmh"),
        ]
        var request = URLRequest(url: components.url!)
        request.timeoutInterval = 10
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let result: Result<[String: Any], Error>
            if let error = error {
                result = .failure(error)
            } else if let status = (response as? HTTPURLResponse)?.statusCode, status != 200 {
                result = .failure(WeatherService.error("Weather service error: \(status)"))
            } else if let data = data, let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let current = root["current_weather"] as? [String: Any] {
                result = .success([
                    "temperature_celsius": current["temperature"] ?? NSNull(),
                    "windspeed_kmh": current["windspeed"] ?? NSNull(),
                    "condition": WeatherService.describe(code: current["weathercode"] as? Int ?? -1),
                ])
            } else {
                result = .failure(WeatherService.error("Weather data was unavailable."))
            }
            DispatchQueue.main.async {
                self?.finish(result)
            }
        }.resume()
    }

    private func finish(_ result: Result<[String: Any], Error>) {
        timeoutWork?.cancel()
        timeoutWork = nil
        let completions = pending
        pending.removeAll()
        completions.forEach { $0(result) }
    }

    private static func error(_ message: String) -> Error {
        NSError(domain: "WeatherService", code: 0, userInfo: [NSLocalizedDescriptionKey: message])
    }

    /// WMO weather codes, as documented by Open-Meteo.
    static func describe(code: Int) -> String {
        switch code {
        case 0: return "clear sky"
        case 1, 2, 3: return "partly cloudy"
        case 45, 48: return "fog"
        case 51, 53, 55: return "drizzle"
        case 56, 57: return "freezing drizzle"
        case 61, 63, 65: return "rain"
        case 66, 67: return "freezing rain"
        case 71, 73, 75: return "snow"
        case 77: return "snow grains"
        case 80, 81, 82: return "rain showers"
        case 85, 86: return "snow showers"
        case 95: return "thunderstorm"
        case 96, 99: return "thunderstorm with hail"
        default: return "unknown"
        }
    }
}
