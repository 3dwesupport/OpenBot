package org.openbot.app.robot.utils;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import com.google.firebase.auth.FirebaseUser;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonParseException;
import com.google.gson.reflect.TypeToken;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Writer;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.openbot.app.robot.googleServices.GoogleServices;
import org.openbot.app.robot.projects.GoogleSignInCallback;
import org.openbot.app.robot.tflite.Model;

public class FileUtils {

  private static final String TAG = "FileUtils";

  public static void copyFile(InputStream inputFile, String name, String outputPath) {

    InputStream in = null;
    OutputStream out = null;
    try {

      // create output directory if it doesn't exist
      File dir = new File(outputPath);
      if (!dir.exists()) {
        dir.mkdirs();
      }

      in = inputFile;
      out = new FileOutputStream(outputPath + '/' + name);

      byte[] buffer = new byte[1024];
      int read;
      while ((read = in.read(buffer)) != -1) {
        out.write(buffer, 0, read);
      }
      in.close();
      in = null;

      // write the output file (You have now copied the file)
      out.flush();
      out.close();
      out = null;

    } catch (FileNotFoundException fnfe1) {
      Log.e("tag", fnfe1.getMessage());
    } catch (Exception e) {
      Log.e("tag", e.getMessage());
    }
  }

  public static boolean checkFileExistence(Activity activity, String name) {
    boolean found = false;
    for (String s : Objects.requireNonNull(activity.getFilesDir().list()))
      if (s.equals(name)) {
        found = true;
        break;
      }
    return found;
  }

  public static List<Model> loadConfigJSONFromAsset(Activity activity) {
    String configFile = "config.json";
    Gson gson = new GsonBuilder().registerTypeAdapterFactory(new PostProcessingEnabler()).create();
    JsonElement jsonElement;
    Type listType = new TypeToken<List<Model>>() {}.getType();
    boolean fileExists = checkFileExistence(activity, configFile);
    System.out.println("fileExist::::" + fileExists);
    if (fileExists) {
      try (FileReader reader =
          new FileReader(activity.getFilesDir() + File.separator + configFile)) {
        JsonElement saved = gson.fromJson(reader, JsonElement.class);
        if (saved != null && saved.isJsonArray()) {
          List<Model> models = removeInvalidModels(gson.fromJson(saved, listType));
          // An unreadable saved list falls back to the bundled one below.
          if (!models.isEmpty()) return models;
        }
        Log.w(TAG, "Saved config.json has no valid models, restoring the bundled list");
      } catch (FileNotFoundException e) {
        e.printStackTrace();
        return null;
      } catch (IOException | JsonParseException e) {
        Log.w(TAG, "Saved config.json is unreadable, restoring the bundled list", e);
      }
    }
    try {
      copyFile(
          activity.getAssets().open(configFile),
          configFile,
          activity.getFilesDir().getAbsolutePath());
      jsonElement =
          gson.fromJson(
                  new InputStreamReader(activity.getAssets().open(configFile)), JsonElement.class)
              .getAsJsonArray();
    } catch (IOException ex) {
      ex.printStackTrace();
      return null;
    }
    return removeInvalidModels(gson.fromJson(jsonElement, listType));
  }

  /** Drops entries with missing or unknown fields, so no screen gets a null type or class. */
  public static List<Model> removeInvalidModels(List<Model> models) {
    List<Model> valid = new ArrayList<>();
    if (models == null) return valid;
    for (Model model : models) {
      if (model != null && model.isValid()) valid.add(model);
      else Log.w(TAG, "Skipping invalid model entry: " + (model != null ? model.name : null));
    }
    return valid;
  }

  public static boolean updateModelConfig(
      Activity activity, Context context, List<Model> modelList, boolean isDrive) {
    String configFile = "config.json";
    GoogleServices googleServices =
        new GoogleServices(
            activity,
            context,
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
    try {
      Gson gson = new GsonBuilder().setPrettyPrinting().create();
      Writer writer = new FileWriter(activity.getFilesDir() + File.separator + configFile);
      gson.toJson(removeInvalidModels(modelList), writer);
      writer.flush();
      writer.close();
      return true;
    } catch (IOException e) {
      e.printStackTrace();
      return false;
    }
  }

  public static Model getOriginalModelFromConfig(Activity activity, Model model) {
    String configFile = "config.json";
    Gson gson = new GsonBuilder().registerTypeAdapterFactory(new PostProcessingEnabler()).create();
    JsonElement jsonElement = null;
    try {
      jsonElement =
          gson.fromJson(
                  new InputStreamReader(activity.getAssets().open(configFile)), JsonElement.class)
              .getAsJsonArray();
    } catch (IOException e) {
      e.printStackTrace();
    }

    Type listType = new TypeToken<List<Model>>() {}.getType();
    List<Model> modelList = gson.fromJson(jsonElement, listType);
    if (modelList != null)
      for (Model modelInfo : modelList)
        if (Objects.equals(model.id, modelInfo.id)) {
          return modelInfo;
        }
    return null;
  }

  public static String nameWithoutExtension(String name) {
    return name.replaceFirst("[.][^.]+$", "");
  }
}
