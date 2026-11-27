package org.openbot.app.robot.googleServices;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.widget.ImageView;
import androidx.fragment.app.Fragment;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential;
import com.google.api.client.http.ByteArrayContent;
import com.google.api.client.http.FileContent;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.common.reflect.TypeToken;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;
import org.openbot.app.robot.databinding.FragmentProjectsBinding;
import org.openbot.app.robot.env.SharedPreferencesManager;
import org.openbot.app.robot.modelManagement.ModelAdapter;
import org.openbot.app.robot.projects.DriveProjectsAdapter;
import org.openbot.app.robot.projects.GoogleSignInCallback;
import org.openbot.app.robot.projects.ProjectsDataInObject;
import org.openbot.app.robot.projects.ProjectsFragment;
import org.openbot.app.robot.tflite.Model;
import org.openbot.app.robot.utils.FileUtils;
import timber.log.Timber;

/** google signIn and google drive files management service class */
public class GoogleServices extends Fragment {

  // Set up logging tag for debugging purposes
  private ModelAdapter adapter;
  private static final String TAG = "GoogleServices";
  private final Activity mActivity;
  private final Context mContext;
  private final GoogleSignInCallback mCallback;
  public final GoogleSignInClient mGoogleSignInClient;
  private final ProjectsFragment projectsFragment;
  private final FirebaseAuth firebaseAuth;
  public ArrayList<ProjectsDataInObject> projectsList = new ArrayList<>();
  private final SharedPreferencesManager sharedPreferencesManager;

  public static GoogleServices getInstance() {
    return null;
  }
  /**
   * Constructor for the GoogleServices class
   *
   * @param activity
   * @param context
   * @param callback
   */
  public GoogleServices(Activity activity, Context context, GoogleSignInCallback callback) {
    // Set instance variables
    mActivity = activity;
    mContext = context;
    mCallback = callback;
    projectsFragment = new ProjectsFragment();
    firebaseAuth = FirebaseAuth.getInstance();
    // Set up Google Sign-In options
    GoogleSignInOptions gso =
        new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestIdToken(
                "955078484078-kbadvp54dljcpk0g0j5bnf5c17q63ir2.apps.googleusercontent.com")
            .requestProfile()
            .build();
    // Set up Shared Preferences
    // Set up Google Sign-In client
    mGoogleSignInClient = GoogleSignIn.getClient(mActivity, gso);
    // Check if there is a signed-in account already and notify the callback accordingly
    FirebaseUser user = firebaseAuth.getCurrentUser();
    if (user != null) {
      mCallback.onSignInSuccess(user);
    } else {
      mCallback.onSignInFailed(null);
    }
    sharedPreferencesManager = new SharedPreferencesManager(mContext);
  }

  /**
   * login with firebase using google signIn credential.
   *
   * @param credential use for firebase login.
   */
  private void firebaseAuthWithGoogle(AuthCredential credential) {
    firebaseAuth
        .signInWithCredential(credential)
        .addOnCompleteListener(
            mActivity,
            task -> {
              Timber.tag(TAG).d("signInWithCredential:onComplete:%s", task.isSuccessful());
              if (task.isSuccessful()) {
                Timber.tag(TAG).d("onComplete: successful");
                // Get the signed-in account and Notify callback of successful sign-in.
                mCallback.onSignInSuccess(task.getResult().getUser());
              } else {
                Timber.tag(TAG).w("signInWithCredential%s", task.getException().getMessage());
                task.getException().printStackTrace();
                // The ApiException status code indicates the detailed failure reason and Notify
                // callback of
                // sign-in failure.
                Timber.tag(TAG).e(task.getException(), "handleSignInResult:failed");
                mCallback.onSignInFailed(task.getException());
              }
            });
  }

  /** Method to sign out of the current Google account. */
  public void signOut() {
    mGoogleSignInClient
        .signOut()
        .addOnCompleteListener(
            mActivity,
            task -> {
              // Handle sign-out result.
              if (task.isSuccessful()) {
                // firebase user sign-out.
                firebaseAuth.signOut();
                // Notify callback of successful sign-out.
                mCallback.onSignOutSuccess();
                Timber.tag(TAG).d("signOut:success");
              } else {
                // Notify callback of sign-out failure
                mCallback.onSignOutFailed(task.getException());
                Timber.tag(TAG).e(task.getException(), "signOut:failed");
              }
            });
  }

  /**
   * Method to handle the result of a Google Sign-In attempt
   *
   * @param completedTask
   */
  public void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
    try {
      // Get the signed-in account and Notify callback of successful sign-in.
      GoogleSignInAccount account = completedTask.getResult(ApiException.class);
      AuthCredential credential = GoogleAuthProvider.getCredential(account.getIdToken(), null);
      // Set credential for firebase authentication.
      firebaseAuthWithGoogle(credential);
      Timber.tag(TAG).d("handleSignInResult:success - %s", account.getEmail());
    } catch (ApiException e) {
      // The ApiException status code indicates the detailed failure reason and Notify callback of
      // sign-in failure.
      Timber.tag(TAG).e(e, "handleSignInResult:failed");
      mCallback.onSignInFailed(e);
    }
  }

  /**
   * Helper method to get the Drive API service
   *
   * @return
   */
  private Drive getDriveService() {
    GoogleSignInAccount googleAccount = GoogleSignIn.getLastSignedInAccount(mContext);
    if (googleAccount != null) {
      // Set up Google Account Credential.
      GoogleAccountCredential credential =
          GoogleAccountCredential.usingOAuth2(
              mContext, Collections.singletonList(DriveScopes.DRIVE_FILE));
      credential.setSelectedAccount(googleAccount.getAccount());
      // Build and return the Drive API service.
      return new Drive.Builder(
              new NetHttpTransport(), JacksonFactory.getDefaultInstance(), credential)
          .setApplicationName("OpenBot")
          .build();
    }
    return null;
  }

  /**
   * Retrieves a list of Google Drive files that are not trashed and have the file extension ".js".
   *
   * @param binding
   * @param adapter
   * @param binding
   */
  public void accessDriveFiles(DriveProjectsAdapter adapter, FragmentProjectsBinding binding) {
    // get a Google Drive service instance.
    Drive googleDriveService = getDriveService();
    if (googleDriveService != null) {
      // create a new thread to perform the network call in the background.
      new Thread(
              () -> {
                String pageToken = null;
                do {
                  try {
                    // query for files on Google Drive that are not in the trash folder and have a
                    // ".js" extension.
                    FileList result =
                        googleDriveService
                            .files()
                            .list()
                            .setSpaces("drive")
                            .setFields("nextPageToken, files(id, name, createdTime, modifiedTime)")
                            .setPageToken(pageToken)
                            .setQ("trashed = false")
                            .execute();
                    List<File> driveProjectFiles = result.getFiles();
                    // Create a HashSet to store the drive project IDs.
                    Set<String> driveProjectId = new HashSet<>();
                    // Create a HashSet to store the local project IDs.
                    Set<String> localProjectId = new HashSet<>();
                    // Create a HashSet to store the local project filename.
                    Set<String> localProjectName = new HashSet<>();

                    for (ProjectsDataInObject obj : projectsList) {
                      localProjectId.add(obj.getProjectId());
                    }
                    // Iterate through the files
                    for (File file : driveProjectFiles) {
                      if (file.getName().endsWith(".js")) {
                        driveProjectId.add(file.getId());
                        String projectName = file.getName();
                        //
                        // System.out.println("name"+projectName);
                        String projectId = file.getId();
                        DateTime projectDate = file.getModifiedTime();

                        // Read the content of the file
                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        googleDriveService
                            .files()
                            .get(file.getId())
                            .executeMediaAndDownloadTo(outputStream);
                        String projectCommands = outputStream.toString();

                        if (!localProjectId.contains(file.getId())) {
                          // Create a Project object and add it to the ArrayList
                          // System.out.printf("UpdatedFileName",projectName);

                          projectsList.add(
                              new ProjectsDataInObject(
                                  projectId, projectName, projectDate, projectCommands));
                        } else if (localProjectId.contains(file.getId())) {
                          int projectIndex = -1;
                          for (int i = 0; i < projectsList.size(); i++) {
                            if (projectsList.get(i).getProjectId().equals(projectId)) {
                              // Project with the same ID exists, store its index
                              projectIndex = i;
                              break; // No need to continue iterating
                            }
                          }
                          projectsList.remove(projectIndex);
                          projectsList.add(
                              new ProjectsDataInObject(
                                  projectId, projectName, projectDate, projectCommands));

                          //                                          projectsList.add(new
                          // ProjectsDataInObject(projectId,projectName,projectDate,projectCommands));
                        }
                      }
                    }

                    // Iterate over the local projects and remove any that are not present in the
                    // driveProjectId set
                    // MyProject
                    Iterator<ProjectsDataInObject> iterator = projectsList.iterator();
                    while (iterator.hasNext()) {
                      ProjectsDataInObject project = iterator.next();
                      if (!driveProjectId.contains(project.getProjectId())) {
                        iterator.remove();
                      }
                      sharedPreferencesManager.setProjectLIst(projectsList);
                    }

                    // update the UI on the main thread to reflect the changes in the list of drive
                    // files.
                    mActivity.runOnUiThread(
                        () -> {
                          adapter.notifyDataSetChanged();
                          projectsFragment.updateMessage(projectsList, binding);
                        });
                    // update page token to get the next set of files if available.
                    pageToken = result.getNextPageToken();
                  } catch (IOException e) {
                    // log any errors that occur and set page token to null to exit the loop.
                    e.printStackTrace();
                    pageToken = null;
                    mActivity.runOnUiThread(
                        () -> {
                          adapter.notifyDataSetChanged();
                          projectsFragment.updateMessage(projectsList, binding);
                        });
                  }
                  // continue querying for files while there is a valid page token.
                } while (pageToken != null);
              })
          .start();
    }
  }

  /**
   * Downloads a file from Google Drive with the given file ID.
   *
   * @param fileId the ID of the file to download
   */
  private void downloadFileFromGDrive(String fileId) {
    Drive googleDriveService = getDriveService();
    if (googleDriveService != null) {
      new Thread(
              () -> {
                try {
                  // Get the Google Drive file with the given ID
                  File gDriveFile = googleDriveService.files().get(fileId).execute();

                  Timber.tag("Google Drive").i(String.valueOf(gDriveFile));
                } catch (IOException e) {
                  e.printStackTrace();
                }
              })
          .start();
    } else {
      Timber.tag("Google Drive").e("SignIn error - not logged in");
    }
  }

  /**
   * Renames a file with the given ID to the given new title.
   *
   * @param fileId the ID of the file to rename
   * @param newTitle the new title to give the file
   */
  public void renameFile(String fileId, String newTitle) {
    Drive googleDriveService = getDriveService();
    if (googleDriveService != null) {
      try {
        // Create a new File object with the given new title.
        File file = new File();
        file.setName(newTitle);
        // Update the file with the new title.
        googleDriveService.files().update(fileId, file).execute();
        Timber.tag("Google Drive File").d("File renamed successfully");
      } catch (IOException e) {
        // log any errors that occur when renaming the file.
        e.printStackTrace();
        Timber.tag("Google Drive File").e("Error renaming file");
      }
    }
  }

  /**
   * Deletes a file with the given ID from Google Drive.
   *
   * @param fileId fileId the ID of the file to delete.
   */
  public void deleteFile(
      String fileId,
      String projectName,
      DriveProjectsAdapter adapter,
      FragmentProjectsBinding binding) {
    // Create an ExecutorService with a single thread
    ExecutorService executor = Executors.newSingleThreadExecutor();
    executor.execute(
        () -> {
          Drive googleDriveService = getDriveService();
          if (googleDriveService != null) {
            try {
              // Get the XML file ID associated with the project name
              String xmlFileId = getXmlFileId(projectName, googleDriveService);
              // Delete the file with the given ID
              googleDriveService.files().delete(fileId).execute();
              // If XML file ID exists, delete the XML file as well
              if (xmlFileId != null) {
                googleDriveService.files().delete(xmlFileId).execute();
              }
              // Access Drive files again to update the adapter and binding
              accessDriveFiles(adapter, binding);
              Timber.tag("Google Drive File").d("File deleted successfully");
            } catch (IOException error) {
              // log any errors that occur when deleting the file.
              error.printStackTrace();
              Timber.tag("Google Drive File").e(error);
            }
          }
        });
  }

  /**
   * This method queries Google Drive for files that are not in the trash folder and have a .js
   * extension. It iterates through the files to find the one whose name matches the provided
   * projectName with the .xml extension. The corresponding XML file ID is returned if found.
   *
   * @param projectName
   * @param googleDriveService
   * @return
   */
  private String getXmlFileId(String projectName, Drive googleDriveService) {
    String pageToken = null;
    String xmlProjectId = null;
    do {
      try {
        // query for files on Google Drive that are not in the trash folder and have a
        // ".js" extension.
        FileList result =
            googleDriveService
                .files()
                .list()
                .setSpaces("drive")
                .setFields("nextPageToken, files(id, name, createdTime, modifiedTime)")
                .setPageToken(pageToken)
                .setQ("trashed = false")
                .execute();
        List<File> driveProjectFiles = result.getFiles();
        // Iterate through the files and check for the XML file associated with the project name
        for (File file : driveProjectFiles) {
          if ((projectName.replace(".js", ".xml")).equals(file.getName())) {
            xmlProjectId = file.getId();
          }
        }
        // update page token to get the next set of files if available.
        pageToken = result.getNextPageToken();
      } catch (IOException e) {
        // log any errors that occur and set page token to null to exit the loop.
        e.printStackTrace();
        pageToken = null;
      }
      // continue querying for files while there is a valid page token.
    } while (pageToken != null);
    return xmlProjectId;
  }

  private String checkPlaygroundFolder() {
    Drive getDriveService = getDriveService();
    if (getDriveService == null) return null;
    try {
      return findPlaygroundFolderId(getDriveService);
    } catch (IOException e) {
      e.printStackTrace();
      return null;
    }
  }

  /** Returns the oldest Playground folder, so all apps use the same one. */
  private static String findPlaygroundFolderId(Drive driveService) throws IOException {
    return findFirstFileId(
        driveService,
        "name = 'openBot-Playground' and mimeType = 'application/vnd.google-apps.folder'"
            + " and trashed = false",
        "createdTime");
  }

  /** Returns the newest config.json inside the Playground folder. */
  private static String findConfigFileId(Drive driveService, String folderId) throws IOException {
    return findFirstFileId(
        driveService,
        "name = 'config.json' and '" + folderId + "' in parents and trashed = false",
        "modifiedTime desc");
  }

  private static String findFirstFileId(Drive driveService, String query, String orderBy)
      throws IOException {
    List<File> files =
        driveService
            .files()
            .list()
            .setSpaces("drive")
            .setQ(query)
            .setOrderBy(orderBy)
            .setPageSize(1)
            .setFields("files(id)")
            .execute()
            .getFiles();
    return files == null || files.isEmpty() ? null : files.get(0).getId();
  }

  private static String readFile(Drive driveService, String fileId) throws IOException {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    driveService.files().get(fileId).executeMediaAndDownloadTo(outputStream);
    return outputStream.toString();
  }

  /** Parses the Drive model list; unreadable or invalid entries are dropped. */
  private static List<Model> parseModelList(Gson gson, String json) {
    try {
      return FileUtils.removeInvalidModels(
          gson.fromJson(json, new TypeToken<List<Model>>() {}.getType()));
    } catch (JsonParseException e) {
      Log.w(TAG, "Drive config.json is unreadable, keeping the local list", e);
      return new ArrayList<>();
    }
  }

  /**
   * Updates one model in the shared config.json on Google Drive and keeps all other models.
   *
   * @param model The model that was downloaded, added or deleted.
   * @param removed True if the model was removed from the list.
   */
  public void uploadModelChange(Model model, boolean removed) {
    Drive getDriveService = getDriveService();
    if (getDriveService == null || model == null) return;
    Gson gson = new GsonBuilder().create();

    // Start a new thread to perform the Drive API operations.
    new Thread(
            () -> {
              try {
                String folderId = findPlaygroundFolderId(getDriveService);
                String configFileId =
                    folderId != null ? findConfigFileId(getDriveService, folderId) : null;
                List<Model> modelList =
                    configFileId != null
                        ? parseModelList(gson, readFile(getDriveService, configFileId))
                        : new ArrayList<>();
                // Drive has no list yet, so start from the local one.
                if (modelList.isEmpty()) {
                  List<Model> localModels = FileUtils.loadConfigJSONFromAsset(mActivity);
                  if (localModels != null) modelList.addAll(localModels);
                }
                FileUtils.restoreDownloadLinks(mActivity, modelList, false);
                applyModelChange(gson, modelList, model, removed);
                String modelListContent = gson.toJson(FileUtils.removeInvalidModels(modelList));

                if (configFileId != null) updateModelListFile(modelListContent, configFileId);
                else if (folderId != null) createModelListFile(modelListContent, folderId);
                else createOpenBotFolder(modelListContent, null);
              } catch (IOException e) {
                e.printStackTrace();
              }
            })
        .start();
  }

  /** True when a Google account is signed in, so Drive can be used. */
  public boolean isSignedIn() {
    return getDriveService() != null;
  }

  /**
   * Deletes a model for good from Drive: its entry in the shared config.json, then its file, which
   * goes to the Drive trash.
   *
   * @param callback Called on the main thread with true when Drive is done, false when it couldn't
   *     be changed.
   */
  public void deleteModelEverywhere(Model model, Consumer<Boolean> callback) {
    Drive driveService = getDriveService();
    if (driveService == null || model == null) {
      callback.accept(false);
      return;
    }
    Gson gson = new GsonBuilder().create();
    new Thread(
            () -> {
              boolean isDone = false;
              try {
                String folderId = findPlaygroundFolderId(driveService);
                String configFileId =
                    folderId != null ? findConfigFileId(driveService, folderId) : null;
                // With no shared list yet, there is nothing to delete in Drive.
                if (configFileId == null) {
                  isDone = true;
                } else {
                  List<Model> modelList =
                      parseModelList(gson, readFile(driveService, configFileId));
                  // Never write a list that couldn't be read.
                  if (modelList.isEmpty()) throw new IOException("Shared model list is empty");
                  String driveFileId = null;
                  for (Iterator<Model> iterator = modelList.iterator(); iterator.hasNext(); ) {
                    Model entry = iterator.next();
                    if (!entry.name.equals(model.name)) continue;
                    if (driveFileId == null)
                      driveFileId = FileUtils.driveFileIdFromLink(entry.path);
                    iterator.remove();
                  }
                  if (driveFileId == null) driveFileId = FileUtils.driveFileIdFromLink(model.path);
                  ByteArrayContent content =
                      ByteArrayContent.fromString("application/json", gson.toJson(modelList));
                  driveService.files().update(configFileId, null, content).execute();
                  isDone = true;
                  // The list is saved, so the model file can go to the Drive trash.
                  if (driveFileId != null) trashFile(driveService, driveFileId);
                }
              } catch (IOException e) {
                Log.w(TAG, "Couldn't delete the model from Drive", e);
              }
              boolean result = isDone;
              mActivity.runOnUiThread(() -> callback.accept(result));
            })
        .start();
  }

  private static void trashFile(Drive driveService, String fileId) {
    try {
      driveService.files().update(fileId, new File().setTrashed(true)).execute();
    } catch (IOException e) {
      Log.w(TAG, "Couldn't move the model file to the Drive trash", e);
    }
  }

  /** Replaces, adds or removes the model with the same name in the list. */
  private static void applyModelChange(
      Gson gson, List<Model> modelList, Model model, boolean removed) {
    Model newModel = gson.fromJson(gson.toJson(model), Model.class);
    int maxId = 0;
    for (int i = 0; i < modelList.size(); i++) {
      Model oldModel = modelList.get(i);
      if (!oldModel.name.equals(newModel.name)) {
        maxId = Math.max(maxId, oldModel.id);
        continue;
      }
      if (removed) {
        // A model with a download link stays in the list, so other devices can still get it.
        if (FileUtils.isWebLink(oldModel.path)) oldModel.setPathType(Model.PATH_TYPE.URL);
        else modelList.remove(i);
        return;
      }
      newModel.id = oldModel.id;
      // Keep the download link, a local file path is no use on other devices.
      if (!FileUtils.isWebLink(newModel.path) && FileUtils.isWebLink(oldModel.path))
        newModel.setPath(oldModel.path);
      modelList.set(i, newModel);
      return;
    }
    if (removed) return;
    newModel.id = maxId + 1;
    modelList.add(newModel);
  }

  /**
   * Creates an 'openBot' folder on Google Drive and adds a model list JSON file or log data.
   *
   * @param modelListContent JSON content of the model list (null if not applicable).
   * @param zipFile Zip file containing log data (null if not applicable).
   */
  public void createOpenBotFolder(String modelListContent, java.io.File zipFile) {
    Drive driveService = getDriveService();
    File fileMetadata = new File();
    fileMetadata.setName("openBot-Playground");
    fileMetadata.setMimeType("application/vnd.google-apps.folder");

    if (driveService != null) {
      try {
        File file = driveService.files().create(fileMetadata).setFields("id").execute();
        if (modelListContent != null) createModelListFile(modelListContent, file.getId());
        else uploadLogData(zipFile);
      } catch (IOException e) {
        e.printStackTrace();
      }
    }
  }

  /**
   * Creates a 'config.json' file containing the model list content within the specified folder on
   * Google Drive.
   *
   * @param modelListContent JSON content of the model list.
   * @param playGroundFolderId ID of the parent folder where the file should be created.
   */
  private void createModelListFile(String modelListContent, String playGroundFolderId) {
    Drive getDriveService = getDriveService();
    // Create metadata for the 'config.json' file within the specified folder and
    // convert the JSON content to a byte array content.
    File fileMetadata = new File();
    fileMetadata.setName("config.json").setParents(Collections.singletonList(playGroundFolderId));
    ByteArrayContent content = ByteArrayContent.fromString("application/json", modelListContent);

    new Thread(
            () -> {
              try {
                if (getDriveService != null) {
                  File file =
                      getDriveService
                          .files()
                          .create(fileMetadata, content)
                          .setFields("id")
                          .execute();
                }
              } catch (IOException e) {
                e.printStackTrace();
              }
            })
        .start();
  }

  /**
   * Updates the content of an existing file with the new model list content on Google Drive.
   *
   * @param modelListContent New JSON content of the model list.
   * @param fileId ID of the file to be updated.
   */
  public void updateModelListFile(String modelListContent, String fileId) {
    Drive driveService = getDriveService();
    new Thread(
            () -> {
              if (driveService != null) {
                try {
                  // Convert the JSON content to a byte array content and update the file's content.
                  ByteArrayContent content =
                      ByteArrayContent.fromString("application/json", modelListContent);
                  File updatedFile = driveService.files().update(fileId, null, content).execute();
                } catch (IOException e) {
                  // Handle error: Update operation failed.
                  e.printStackTrace();
                }
              }
            })
        .start();
  }

  /**
   * Uploads a log data zip file to Google Drive, creating a new file or using an existing folder.
   *
   * @param zipFile The log data zip file to be uploaded.
   */
  public void uploadLogData(java.io.File zipFile) {
    Drive getDriveService = getDriveService();
    String playGroundFolderId = checkPlaygroundFolder();

    // Check if the 'openBot' folder exists, upload the zip file to it.
    if (playGroundFolderId != null) {
      File fileMetadata = new File();
      String fileName =
          new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
      fileMetadata.setName(fileName).setParents(Collections.singletonList(playGroundFolderId));
      FileContent fileContent = new FileContent("application/zip", zipFile);
      new Thread(
              () -> {
                try {
                  if (getDriveService != null) {
                    File file =
                        getDriveService
                            .files()
                            .create(fileMetadata, fileContent)
                            .setFields("id")
                            .execute();
                  }
                } catch (IOException e) {
                  e.printStackTrace();
                }
              })
          .start();
    } else {
      // If the folder doesn't exist, create it and upload the zip file
      createOpenBotFolder(null, zipFile);
    }
  }

  /**
   * Gets the content of the 'config.json' file from Google Drive and update model list.
   *
   * @param rotation The ObjectAnimator used for rotation animation (to be paused upon completion).
   * @param icon The ImageView icon (to be reset upon completion).
   */
  public void getConfigFileContent(
      ObjectAnimator rotation, ImageView icon, ModelAdapter updateModelListAdapter) {
    Drive driveService = getDriveService();
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    new Thread(
            () -> {
              try {
                String folderId =
                    driveService != null ? findPlaygroundFolderId(driveService) : null;
                String configFileId =
                    folderId != null ? findConfigFileId(driveService, folderId) : null;
                if (configFileId != null) {
                  List<Model> modelList =
                      parseModelList(gson, readFile(driveService, configFileId));
                  // Keep the local list when the Drive copy has no usable model.
                  if (!modelList.isEmpty()) {
                    for (int i = 0; i < modelList.size(); i++) {
                      if (modelList.get(i).pathType == Model.PATH_TYPE.FILE
                          && !FileUtils.checkFileExistence(mActivity, modelList.get(i).name)) {
                        modelList.get(i).setPathType(Model.PATH_TYPE.URL);
                      }
                    }
                    FileUtils.restoreDownloadLinks(mActivity, modelList, true);
                    FileUtils.updateModelConfig(mActivity, mContext, modelList, false);
                    mActivity.runOnUiThread(
                        () -> {
                          updateModelListAdapter.setItems(modelList);
                          updateModelListAdapter.notifyDataSetChanged();
                        });
                  }
                }
              } catch (IOException e) {
                e.printStackTrace();
              }
              // Pause rotation animation and reset icon.
              rotation.pause();
              icon.setRotation(0f);
            })
        .start();
  }
}
