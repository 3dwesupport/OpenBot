package org.openbot.app.robot.modelManagement;

import android.animation.ObjectAnimator;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import com.google.firebase.auth.FirebaseUser;
import com.nononsenseapps.filepicker.Utils;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.openbot.app.robot.R;
import org.openbot.app.robot.databinding.FragmentModelManagementBinding;
import org.openbot.app.robot.googleServices.GoogleServices;
import org.openbot.app.robot.main.OnItemClickListener;
import org.openbot.app.robot.projects.GoogleSignInCallback;
import org.openbot.app.robot.tflite.Model;
import org.openbot.app.robot.tflite.ModelFileCheck;
import org.openbot.app.robot.utils.Constants;
import org.openbot.app.robot.utils.FileUtils;
import org.openbot.app.robot.utils.PermissionUtils;

public class ModelManagementFragment extends Fragment
    implements OnItemClickListener<Model>, ModelAdapter.OnItemClickListener<Model> {

  private FragmentModelManagementBinding binding;
  public static final String ALL = "ALL";
  private ModelAdapter adapter;
  private List<Model> masterList;
  private ActivityResultLauncher<Intent> mStartForResult;
  private OnBackPressedCallback onBackPressedCallback;
  private boolean isDownloading = false;

  private GoogleServices googleServices;

  @Override
  public void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    googleServices =
        new GoogleServices(
            requireActivity(),
            requireContext(),
            new GoogleSignInCallback() {
              @Override
              public void onSignInSuccess(FirebaseUser account) {}

              @Override
              public void onSignInFailed(Exception exception) {}

              @Override
              public void onSignOutSuccess() {}

              @Override
              public void onSignOutFailed(Exception exception) {}
            });
    mStartForResult =
        registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
              if (result.getResultCode() == Activity.RESULT_OK) {

                Intent intent = result.getData();
                // Handle the Intent
                assert intent != null;
                List<Uri> files = Utils.getSelectedFilesFromResult(intent);

                String fileName = getFileNameFromUri(files.get(0));
                if (FileUtils.checkFileExistence(requireActivity(), fileName)) {
                  AlertDialog.Builder builder = new AlertDialog.Builder(requireActivity());
                  builder.setTitle(R.string.file_available_title);
                  builder.setMessage(R.string.file_available_body);
                  builder.setPositiveButton(
                      "Yes", (dialog, id) -> processModelFromStorage(files, fileName));
                  builder.setNegativeButton(
                      "Cancel",
                      (dialog, id) -> {
                        // User cancelled the dialog
                      });
                  AlertDialog dialog = builder.create();
                  dialog.show();
                } else {
                  processModelFromStorage(files, fileName);
                }
              }
            });

    onBackPressedCallback =
        new OnBackPressedCallback(true) {
          @Override
          public void handleOnBackPressed() {
            if (isDownloading) {
              AlertDialog.Builder builder = new AlertDialog.Builder(requireActivity());
              builder.setTitle(R.string.model_download_title);
              builder.setMessage(R.string.model_download_body);
              builder.setPositiveButton(
                  "Yes",
                  (dialog, id) -> {
                    onBackPressedCallback.setEnabled(false);
                    requireActivity().onBackPressed();
                  });
              builder.setNegativeButton("Cancel", (dialog, id) -> {});
              AlertDialog dialog = builder.create();
              dialog.show();
            } else {
              onBackPressedCallback.setEnabled(false);
              requireActivity().onBackPressed();
            }
          }
        };
    requireActivity().getOnBackPressedDispatcher().addCallback(onBackPressedCallback);
  }

  /**
   * Extracts the file name from a given Uri.
   *
   * @param uri The Uri from which to extract the file name.
   * @return The extracted file name, or null if not found.
   */
  private String getFileNameFromUri(Uri uri) {
    String fileName = null;
    if (uri.getScheme().equals("content")) {
      // If the Uri uses the content:// scheme, use a ContentResolver to get the file name
      ContentResolver contentResolver = requireActivity().getContentResolver();
      Cursor cursor = contentResolver.query(uri, null, null, null, null);
      if (cursor != null) {
        try {
          if (cursor.moveToFirst()) {
            int displayNameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            if (displayNameIndex != -1) {
              fileName = cursor.getString(displayNameIndex);
            }
          }
        } finally {
          cursor.close();
        }
      }
    } else if (uri.getScheme().equals("file")) {
      // If the Uri uses the file:// scheme, directly extract the file name
      fileName = new File(uri.getPath()).getName();
    }
    return fileName;
  }

  /** Copies the picked file to a temporary file and adds it only if the app can run it. */
  private void processModelFromStorage(List<Uri> files, String fileName) {
    File checkFile = new File(requireActivity().getCacheDir(), "model_check.tflite");
    new Thread(
            () -> {
              ModelFileCheck.Settings settings = copyAndCheck(files.get(0), checkFile);
              if (!isAdded()) return;
              requireActivity()
                  .runOnUiThread(
                      () -> {
                        if (settings == null) {
                          checkFile.delete();
                          Toast.makeText(
                                  requireContext(), R.string.model_not_supported, Toast.LENGTH_LONG)
                              .show();
                        } else {
                          showAddModelDialog(checkFile, fileName, settings);
                        }
                      });
            })
        .start();
  }

  private ModelFileCheck.Settings copyAndCheck(Uri uri, File checkFile) {
    try (InputStream inputStream = requireActivity().getContentResolver().openInputStream(uri)) {
      FileUtils.copyFile(inputStream, checkFile.getName(), checkFile.getParent());
      return ModelFileCheck.check(checkFile);
    } catch (IOException e) {
      e.printStackTrace();
      return null;
    }
  }

  private void showAddModelDialog(
      File checkFile, String fileName, ModelFileCheck.Settings settings) {
    Model item =
        new Model(
            masterList.size() + 1,
            settings.classes.get(0),
            settings.type,
            fileName,
            Model.PATH_TYPE.FILE,
            requireActivity().getFilesDir() + File.separator + fileName,
            settings.getInputSize());

    EditModelDialogFragment edMbS =
        new EditModelDialogFragment(
            item,
            settings,
            item1 -> {
              try (InputStream inputStream = new FileInputStream(checkFile)) {
                FileUtils.copyFile(
                    inputStream, fileName, requireActivity().getFilesDir().getAbsolutePath());
              } catch (IOException e) {
                e.printStackTrace();
              }
              checkFile.delete();
              masterList.add(item1);
              showModels(loadModelList(binding.modelSpinner.getSelectedItem().toString()));
              FileUtils.updateModelConfig(requireActivity(), requireContext(), masterList, false);
              googleServices.uploadModelChange(item1, false);
              Toast.makeText(
                      requireContext().getApplicationContext(),
                      "Model added: " + fileName,
                      Toast.LENGTH_SHORT)
                  .show();
            });
    edMbS.show(getChildFragmentManager(), edMbS.getTag());
  }

  private void openPicker() {
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.setType("application/octet-stream"); // Specify the MIME type for TFLite files
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    mStartForResult.launch(intent);
  }

  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {
    binding = FragmentModelManagementBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    masterList = FileUtils.loadConfigJSONFromAsset(requireActivity());

    // load all model first
    GoogleServices googleServices =
        new GoogleServices(
            requireActivity(),
            requireContext(),
            new GoogleSignInCallback() {
              @Override
              public void onSignInSuccess(FirebaseUser account) {}

              @Override
              public void onSignInFailed(Exception exception) {}

              @Override
              public void onSignOutSuccess() {}

              @Override
              public void onSignOutFailed(Exception exception) {}
            });
    List<String> modelTypes =
        Arrays.stream(Model.TYPE.values()).map(Enum::toString).collect(Collectors.toList());
    modelTypes.add(0, ALL);
    ObjectAnimator rotation = ObjectAnimator.ofFloat(binding.autoSync, "rotation", 360f, 0f);
    rotation.setDuration(1000);
    rotation.setRepeatCount(ObjectAnimator.INFINITE);
    rotation.setInterpolator(new LinearInterpolator());

    ArrayAdapter<String> modelAdapter =
        new ArrayAdapter<>(
            requireContext(), android.R.layout.simple_dropdown_item_1line, modelTypes);

    binding.modelSpinner.setAdapter(modelAdapter);
    binding.autoSync.setOnClickListener(
        v -> {
          rotation.start();
          googleServices.getConfigFileContent(rotation, binding.autoSync, adapter);
        });
    adapter = new ModelAdapter(loadModelList(ALL), requireContext(), this);

    binding.modelListContainer.setLayoutManager(new LinearLayoutManager(requireContext()));
    binding.modelListContainer.setAdapter(adapter);
    binding.modelListContainer.addItemDecoration(
        new DividerItemDecoration(requireContext(), DividerItemDecoration.VERTICAL));
    binding.modelSpinner.setOnItemSelectedListener(
        new AdapterView.OnItemSelectedListener() {
          @Override
          public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
            showModels(loadModelList(parent.getItemAtPosition(position).toString()));
          }

          @Override
          public void onNothingSelected(AdapterView<?> parent) {}
        });

    binding.addModel.setOnClickListener(
        v -> {
          if (!PermissionUtils.hasStoragePermission(requireActivity()))
            requestPermissionLauncher.launch(Constants.PERMISSION_STORAGE);
          else if (PermissionUtils.shouldShowRational(
              requireActivity(), Constants.PERMISSION_STORAGE)) {
            PermissionUtils.showStoragePermissionModelManagementToast(requireActivity());
          } else openPicker();
        });
  }

  // locally data saved in masterList
  // and individual data is called modelList

  private void showModels(List<Model> modelList) {
    adapter.setItems(modelList);
  }

  private List<Model> loadModelList(String filter) {

    if (masterList == null) masterList = new ArrayList<>();

    List<Model> modelInfoList = new ArrayList<>();
    if (filter.equals(Model.TYPE.CMDNAV.toString()) || filter.equals(ALL)) {
      modelInfoList.addAll(
          masterList.stream()
              .filter(f -> Model.TYPE.CMDNAV.equals(f.type))
              .collect(Collectors.toList()));
    }

    if (filter.equals(Model.TYPE.GOALNAV.toString()) || filter.equals(ALL)) {
      modelInfoList.addAll(
          masterList.stream()
              .filter(f -> Model.TYPE.GOALNAV.equals(f.type))
              .collect(Collectors.toList()));
    }

    if (filter.equals(Model.TYPE.DETECTOR.toString()) || filter.equals(ALL)) {
      modelInfoList.addAll(
          masterList.stream()
              .filter(f -> Model.TYPE.DETECTOR.equals(f.type))
              .collect(Collectors.toList()));
    }

    return modelInfoList;
  }

  @Override
  public void onItemClick(Model item) {

    // Only a model file on this phone can be read, other models keep their type and size.
    File modelFile = new File(item.path);
    if (!modelFile.isFile()) modelFile = new File(requireActivity().getFilesDir(), item.name);
    ModelFileCheck.Settings settings =
        item.pathType == Model.PATH_TYPE.FILE && modelFile.isFile()
            ? ModelFileCheck.check(modelFile)
            : null;

    @SuppressLint("NotifyDataSetChanged")
    EditModelDialogFragment edMbS =
        new EditModelDialogFragment(
            item,
            settings,
            item1 -> {
              adapter.notifyDataSetChanged();
              FileUtils.updateModelConfig(requireActivity(), requireContext(), masterList, false);
            });
    edMbS.show(getChildFragmentManager(), edMbS.getTag());
  }

  @Override
  public boolean onModelDownloadClicked() {
    System.out.println("Download button clicked");
    ConnectivityManager cm =
        (ConnectivityManager) requireActivity().getSystemService(Context.CONNECTIVITY_SERVICE);
    NetworkInfo nInfo = cm.getActiveNetworkInfo();
    isDownloading = nInfo != null && nInfo.isAvailable() && nInfo.isConnected();
    if (!isDownloading)
      Toast.makeText(
              requireContext().getApplicationContext(),
              "Please connect to the internet to download models....",
              Toast.LENGTH_SHORT)
          .show();
    return isDownloading;
  }

  @Override
  public void onModelDownloaded(boolean status, Model mItem) {
    masterList = FileUtils.loadConfigJSONFromAsset(requireActivity());
    if (status && isAdded()) {
      isDownloading = false;
      for (Model model : masterList) {
        if (model.id.equals(mItem.id)) {
          // Only a file the app can run is kept; its type, class and size come from the file.
          File modelFile = new File(requireActivity().getFilesDir(), model.name);
          ModelFileCheck.Settings settings = ModelFileCheck.check(modelFile);
          if (settings == null) {
            modelFile.delete();
            Toast.makeText(requireContext(), R.string.model_not_supported, Toast.LENGTH_LONG)
                .show();
            showModels(loadModelList(binding.modelSpinner.getSelectedItem().toString()));
            break;
          }
          model.setType(settings.type);
          if (!settings.classes.contains(model.classType))
            model.setClassType(settings.classes.get(0));
          model.setInputSize(settings.getInputSize());
          model.setPath(modelFile.getPath());
          model.setPathType(Model.PATH_TYPE.FILE);
          FileUtils.updateModelConfig(requireActivity(), requireContext(), masterList, false);
          // adapter.notifyDataSetChanged();
          googleServices.uploadModelChange(model, false);
          break;
        }
      }
    }
  }

  @Override
  public void onModelDelete(Model mItem) {
    AlertDialog.Builder builder = new AlertDialog.Builder(requireActivity());
    builder.setTitle(R.string.model_delete_title);
    builder.setMessage(R.string.model_delete_body);
    builder.setPositiveButton(
        "Yes",
        (dialog, id) -> {
          new File(mItem.path).delete();
          int index = masterList.indexOf(mItem);

          Model originalModelConfig =
              FileUtils.getOriginalModelFromConfig(requireActivity(), mItem);
          boolean removed = false;
          if (originalModelConfig == null) {
            if (mItem.pathType == Model.PATH_TYPE.FILE) {
              masterList.remove(mItem);
              adapter.notifyItemRemoved(index);
              removed = true;
            }
          } else {
            mItem.setPath(originalModelConfig.path);
            mItem.setPathType(originalModelConfig.pathType);
            adapter.notifyItemChanged(index);
          }
          FileUtils.updateModelConfig(requireActivity(), requireContext(), masterList, false);
          requireActivity()
              .runOnUiThread(
                  () ->
                      adapter.setItems(
                          loadModelList(binding.modelSpinner.getSelectedItem().toString())));
          googleServices.uploadModelChange(mItem, removed);
        });
    builder.setNegativeButton("Cancel", (dialog, id) -> {});
    AlertDialog dialog = builder.create();
    dialog.show();
  }

  private final ActivityResultLauncher<String> requestPermissionLauncher =
      registerForActivityResult(
          new ActivityResultContracts.RequestPermission(),
          isGranted -> {
            if (isGranted) {
              openPicker();
            } else {
              PermissionUtils.showStoragePermissionModelManagementToast(requireActivity());
            }
          });
}
