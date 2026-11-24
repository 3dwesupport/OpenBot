//
// Voice Control (Gemini Live)
//

import UIKit

/// Gemini API key and Live model for Voice Control. Opened from the Voice Control gear and from Settings.
final class VoiceControlSettingsViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UITextFieldDelegate {

    private let preferences = SharedPreferencesManager()
    private let keyField = UITextField()
    private let modelStatus = UILabel()
    private let modelTable = UITableView(frame: .zero, style: .insetGrouped)
    private var models: [GeminiModelsFetcher.ModelInfo] = []
    private var fetchGeneration = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupNavigationBarItem()

        let keyTitle = sectionLabel(Strings.voiceSetupApiKeyHint)
        keyField.text = preferences.getGeminiApiKey()
        keyField.placeholder = Strings.voiceSetupApiKeyHint
        keyField.borderStyle = .roundedRect
        // Shown as plain text so a wrong character can be spotted.
        keyField.configureForApiKey()
        keyField.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .regular)
        keyField.returnKeyType = .done
        keyField.delegate = self
        keyField.clearButtonMode = .whileEditing

        let link = UIButton(type: .system)
        link.setTitle(Strings.voiceSetupGetKeyLink, for: .normal)
        link.contentHorizontalAlignment = .leading
        link.addTarget(self, action: #selector(openKeyPage), for: .touchUpInside)

        let modelTitle = sectionLabel(Strings.voiceModelTitle)
        modelStatus.font = UIFont.systemFont(ofSize: 13)
        modelStatus.textColor = .secondaryLabel
        modelStatus.numberOfLines = 0

        modelTable.dataSource = self
        modelTable.delegate = self
        modelTable.register(UITableViewCell.self, forCellReuseIdentifier: "model")

        let header = UIStackView(arrangedSubviews: [keyTitle, keyField, link, modelTitle, modelStatus])
        header.axis = .vertical
        header.spacing = 8
        header.setCustomSpacing(20, after: link)
        header.translatesAutoresizingMaskIntoConstraints = false
        modelTable.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(header)
        view.addSubview(modelTable)
        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: guide.topAnchor, constant: 16),
            header.leadingAnchor.constraint(equalTo: guide.leadingAnchor, constant: 20),
            header.trailingAnchor.constraint(equalTo: guide.trailingAnchor, constant: -20),
            keyField.heightAnchor.constraint(equalToConstant: 40),
            modelTable.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 4),
            modelTable.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            modelTable.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            modelTable.bottomAnchor.constraint(equalTo: guide.bottomAnchor),
        ])
        loadModels()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        saveKey()
    }

    private func sectionLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = UIFont.boldSystemFont(ofSize: 17)
        return label
    }

    private func saveKey() {
        preferences.setGeminiApiKey(value: (keyField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines))
    }

    @objc private func openKeyPage() {
        if let url = URL(string: VoiceControlFragment.aiStudioApiKeyUrl) {
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Models

    private func loadModels() {
        fetchGeneration += 1
        let generation = fetchGeneration
        let key = (keyField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        models = []
        modelTable.reloadData()
        modelStatus.isHidden = false
        guard !key.isEmpty else {
            modelStatus.text = Strings.voiceModelNeedsApiKey
            return
        }
        modelStatus.text = Strings.voiceModelLoading
        GeminiModelsFetcher.fetchLiveModels(apiKey: key) { [weak self] result in
            guard let self = self, generation == self.fetchGeneration else {
                return
            }
            switch result {
            case .success(let found):
                self.models = found
                self.modelStatus.text = found.isEmpty ? Strings.voiceModelNoneFound : nil
                self.modelStatus.isHidden = !found.isEmpty
            case .failure(let error):
                self.modelStatus.text = String(format: Strings.voiceModelLoadError, error.localizedDescription)
                self.modelStatus.isHidden = false
            }
            self.modelTable.reloadData()
        }
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        models.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "model", for: indexPath)
        let model = models[indexPath.row]
        var content = cell.defaultContentConfiguration()
        content.text = model.displayName
        content.secondaryText = model.name
        cell.contentConfiguration = content
        cell.accessoryType = model.name == preferences.getGeminiModel() ? .checkmark : .none
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        preferences.setGeminiModel(value: models[indexPath.row].name)
        tableView.reloadData()
    }

    // MARK: - Key field

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    func textFieldDidEndEditing(_ textField: UITextField) {
        saveKey()
        loadModels()
    }

    private func setupNavigationBarItem() {
        if let backImage = UIImage(named: "back")?.withRenderingMode(.alwaysOriginal) {
            navigationItem.leftBarButtonItem = UIBarButtonItem(image: backImage, title: Strings.voiceSettingsTitle, target: self, action: #selector(back), titleColor: Colors.navigationColor ?? .white)
        }
    }

    @objc private func back() {
        navigationController?.popViewController(animated: true)
    }
}
