//
// Created by Nitish Yadav on 27/03/23.
//

import Foundation
import GoogleSignIn
import FirebaseCore
import GoogleAPIClientForREST
import GTMSessionFetcher
import FirebaseAuth

class Authentication {
    private let service: GTLRDriveService = GTLRDriveService()
    var googleSignIn = GIDSignIn.sharedInstance
    private var userToken: String = ""
    static var googleAuthentication: Authentication = Authentication()

    init() {
        googleAuthLogin();
    }

    func googleAuthLogin() {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            return
        }
        googleSignInFunc(clientId: clientID);
    }

    static func returnFileId(fileLink: String) -> String {
        print(fileLink)
        if let startRange = fileLink.range(of: "/d/")?.upperBound,
           let endRange = fileLink.range(of: "/edit")?.lowerBound {
            let fileId = String(fileLink[startRange..<endRange])
            return fileId
        }
        return ""
    }

    private func googleSignInFunc(clientId: String) {
// Create Google Sign In configuration object.
        if GIDSignIn.sharedInstance.hasPreviousSignIn() {
            let user = GIDSignIn.sharedInstance.currentUser;
            print("inside previous signin ", user)
            NotificationCenter.default.post(name: .googleSignIn, object: nil);
            return
        }
        let config = GIDConfiguration(clientID: clientId)
        GIDSignIn.sharedInstance.configuration = config
        let scenes = UIApplication.shared.connectedScenes
        let windowScenes = scenes.first as? UIWindowScene
        let window = windowScenes?.windows.first
        guard let rootViewController = window?.rootViewController else {
            return
        }
        GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController) { signInResult, error in
            guard error == nil else {
                return
            }
            NotificationCenter.default.post(name: .googleSignIn, object: nil);
            self.signIn(signIn: self.googleSignIn, didSignInForUser: self.googleSignIn.currentUser, withError: error as NSError?)
            let user = signInResult?.user
//             If sign in succeeded, display the app's main content View.
            let userId = user?.userID ?? ""
            let idToken = user?.idToken?.tokenString
            let credential = GoogleAuthProvider.credential(withIDToken: idToken!,
                    accessToken: user?.accessToken.tokenString ?? "")
            Auth.auth().signIn(with: credential) { result, error in
                print("hello result",result?.user.email)
            }

            print("credential ",credential);
            print("Google User ID: \(userId)")
            let userIdToken = user?.accessToken
            print("Google ID Token: \(userIdToken?.tokenString)")
            self.userToken = userIdToken?.tokenString ?? ""
            let userFirstName = user?.profile?.givenName ?? ""
            print("Google User First Name: \(userFirstName)")

            let userLastName = user?.profile?.familyName ?? ""
            print("Google User Last Name: \(userLastName)")
            let userEmail = user?.profile?.email ?? ""
            print("Google User Email: \(userEmail)")

            let googleProfilePicURL = user?.profile?.imageURL(withDimension: 150)?.absoluteString ?? ""
            print("Google Profile Avatar URL: \(googleProfilePicURL)")
            let driveScope = "https://www.googleapis.com/auth/drive.readonly"
            let grantedScopes = user?.grantedScopes
            print("grantedScopes ", grantedScopes);
            if grantedScopes == nil || !grantedScopes!.contains(driveScope) {
                // Request additional Drive scope.
                user?.addScopes([driveScope], presenting: rootViewController)
               
            }
            self.service.authorizer = GIDSignIn.sharedInstance.currentUser?.fetcherAuthorizer
            self.getAllFoldersInDrive(accessToken: userIdToken?.tokenString ?? "") { files, error in
                if let files = files {
                    print("all folders are : ", files);
                    let folderId = files[0].identifier;
                    self.getFilesInFolder(folderId: folderId ?? "") { files, error in
                        if let files = files {
                            print("files are ", files);
                            for file in files {
                                if let fileId = file.identifier {
                                    self.downloadFile(withId: fileId, accessToken: user?.accessToken.tokenString ?? "") { data, error in
                                        if let data = data {
                                            print("data is ", String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\n", with: ""))
                                            return
                                        }
                                        if let error = error {
                                            print("error is ->", error)
                                        }
                                    }
                                }

                            }
                        }
                        if let error = error {
                            print("error in getting files", error)
                        }
                    }
                }
                if let error = error {
                    print(error);
                }
            }

        }
    }

    func signIn(signIn: GIDSignIn!, didSignInForUser user: GIDGoogleUser!,
                withError error: NSError!) {
        if error == nil {
            // Show the sign-out button and hide the GIDSignInButton
        }
    }

    static func download(file: String, completion: @escaping (_ data: Data?, _ error: Error?) -> Void) {
        let fileId = returnFileId(fileLink: file);
        let url = "https://drive.google.com/uc?export=download&id=\(fileId)&confirm=200"
        let service: GTLRDriveService = GTLRDriveService()
        let fetcher = service.fetcherService.fetcher(withURLString: url)
        fetcher.beginFetch(completionHandler: { data, error in
            if let error = error {
                print("error is ", error.localizedDescription)
                completion(nil, error)
                return;
            }
            if let data = data {
                completion(data, nil)
            }
        })
    }

    func getAllFolders() {
        guard let accessToken = googleSignIn.currentUser?.accessToken.tokenString else {
            print("Access token is nil")
            return
        }

        self.getAllFoldersInDrive(accessToken: accessToken) { files, error in
            if let files = files{
                print("files are ", files);
            }
            if let error = error {
                print("error is ", error);
            }
        }
    }


    private func getAllFoldersInDrive(accessToken: String, completion: @escaping ([GTLRDrive_File]?, Error?) -> Void) {
        let query = GTLRDriveQuery_FilesList.query()
        query.q = "mimeType='application/vnd.google-apps.folder' and trashed=false or name='Results'"
        query.fields = "nextPageToken, files(id, name, createdTime)"
        query.spaces = "drive"


        service.executeQuery(query) { (ticket, result, error) in

            if let error = error {
                print("error in getting folder")
                completion(nil, error)
                return
            }

            if let files = (result as? GTLRDrive_FileList)?.files {
                completion(files, nil)
            } else {
                completion(nil, nil)
            }
        }
    }
    func getFilesInFolder(folderId: String, completion: @escaping ([GTLRDrive_File]?, Error?) -> Void) {
        let query = GTLRDriveQuery_FilesList.query()
        query.q = "'\(folderId)' in parents"
        query.fields = "nextPageToken, files(id, name, createdTime, modifiedTime, mimeType, size)"

        service.executeQuery(query) { (ticket, result, error) in
            if let error = error {
                completion(nil, error)
                print("error in getting files")
                return
            }
            guard let files = (result as? GTLRDrive_FileList)?.files else {
                completion([], nil)
                return
            }
            completion(files, nil)
        }
    }

    func downloadFile(withId fileId: String, accessToken: String, completion: @escaping (_ data: Data?, _ error: Error?) -> Void) {
        let query = GTLRDriveQuery_FilesGet.queryForMedia(withFileId: fileId)
        service.executeQuery(query) { (ticket, result, error) in
            if let error = error {
                completion(nil, error)
                return
            }
            if let data = (result as? GTLRDataObject)?.data {
                completion(data, nil)
            } else {
                completion(nil, nil)
            }
        }
    }

}