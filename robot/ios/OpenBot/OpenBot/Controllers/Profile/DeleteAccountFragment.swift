//
// Delete account page, reached from the Profile tab.
//

import Foundation
import UIKit
import GoogleSignIn
import FirebaseAuth
import FirebaseFirestore
import FirebaseStorage

/// Deletes the signed-in user's data and Firebase account. Same steps as the web Playground.
enum AccountDeletion {
    private static let userOwnedCollections = ["projects", "models", "userUsage"]

    static func deleteCurrentUser() async throws {
        guard let googleUser = GIDSignIn.sharedInstance.currentUser else {
            throw AccountDeletionError.notSignedIn
        }
        // Firebase only deletes an account after a recent sign-in, so sign in again first.
        try await googleUser.refreshTokensIfNeeded()
        guard let idToken = googleUser.idToken?.tokenString else {
            throw AccountDeletionError.notSignedIn
        }
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: googleUser.accessToken.tokenString)
        let user = try await Auth.auth().signIn(with: credential).user
        let uid = user.uid

        // Data first: the security rules need the signed-in user, which is gone after the delete.
        let db = Firestore.firestore()
        for collection in userOwnedCollections {
            let snapshot = try await db.collection(collection).whereField("uid", isEqualTo: uid).getDocuments()
            guard !snapshot.documents.isEmpty else { continue }
            let batch = db.batch()
            snapshot.documents.forEach { batch.deleteDocument($0.reference) }
            try await batch.commit()
        }
        try await db.collection("users").document(uid).delete()

        do {
            try await Storage.storage().reference().child("profile_pictures/\(uid).jpg").delete()
        } catch {
            // Most users never upload a picture.
            if (error as NSError).code != StorageErrorCode.objectNotFound.rawValue {
                throw error
            }
        }

        try await user.delete()

        // The account is already gone, so a failed revoke must not report an error.
        try? await GIDSignIn.sharedInstance.disconnect()
        UserDefaults.deleteAllProjectsFromUserDefaults()
    }
}

enum AccountDeletionError: Error {
    case notSignedIn
}

class DeleteAccountFragment: UIViewController {
    private let deleteButton = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .medium)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = traitCollection.userInterfaceStyle == .dark ? .black : .white
        setupNavigationBarItem()
        setupContent()
    }

    private func setupNavigationBarItem() {
        if let icon = UIImage(named: "back")?.withRenderingMode(.alwaysOriginal) {
            navigationItem.leftBarButtonItem = UIBarButtonItem(image: icon, title: Strings.deleteAccountTitle, target: self, action: #selector(back), titleColor: Colors.navigationColor ?? .white)
        }
    }

    private func setupContent() {
        let titleLabel = makeLabel(text: Strings.deleteAccountTitle, font: HelveticaNeue.bold(size: 20))
        let messageLabel = makeLabel(text: Strings.deleteAccountMessage, font: HelveticaNeue.regular(size: 15))

        var configuration = UIButton.Configuration.filled()
        configuration.title = Strings.deleteAccountButton
        configuration.baseBackgroundColor = .systemRed
        configuration.baseForegroundColor = .white
        deleteButton.configuration = configuration
        deleteButton.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)

        spinner.hidesWhenStopped = true

        let stack = UIStackView(arrangedSubviews: [titleLabel, messageLabel, deleteButton, spinner])
        stack.axis = .vertical
        stack.alignment = .fill
        stack.spacing = 20
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        let guide = view.safeAreaLayoutGuide
        // Capped width keeps the text readable on iPad and in landscape.
        let width = stack.widthAnchor.constraint(equalToConstant: 520)
        width.priority = .defaultHigh
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: guide.topAnchor, constant: 40),
            stack.centerXAnchor.constraint(equalTo: guide.centerXAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: guide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: guide.trailingAnchor, constant: -24),
            width,
            deleteButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }

    private func makeLabel(text: String, font: UIFont) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = font
        label.textColor = Colors.textColor ?? .label
        label.numberOfLines = 0
        label.textAlignment = .center
        return label
    }

    @objc private func back() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func deleteTapped() {
        let alert = UIAlertController(title: Strings.deleteAccountConfirmTitle, message: Strings.deleteAccountConfirmMessage, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Strings.canceled, style: .cancel))
        alert.addAction(UIAlertAction(title: Strings.deleteAccountButton, style: .destructive) { [weak self] _ in
            self?.startDeleting()
        })
        present(alert, animated: true)
    }

    private func startDeleting() {
        setBusy(true)
        Task { [weak self] in
            do {
                try await AccountDeletion.deleteCurrentUser()
                await MainActor.run { self?.finishDeleting() }
            } catch {
                await MainActor.run { self?.failDeleting() }
            }
        }
    }

    private func finishDeleting() {
        NotificationCenter.default.post(name: .googleSignIn, object: nil)
        let profile = navigationController?.viewControllers.first
        navigationController?.popToRootViewController(animated: true)
        if let icon = UIImage(named: "check") {
            profile?.showToast(Strings.deleteAccountSuccessToast, icon: icon)
        }
    }

    private func failDeleting() {
        setBusy(false)
        let alert = UIAlertController(title: Strings.errorHeading, message: Strings.deleteAccountErrorMessage, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: Strings.okAction, style: .default))
        present(alert, animated: true)
    }

    private func setBusy(_ busy: Bool) {
        deleteButton.isEnabled = !busy
        navigationItem.leftBarButtonItem?.isEnabled = !busy
        busy ? spinner.startAnimating() : spinner.stopAnimating()
    }
}
