package org.openbot.app.robot.modelManagement;

import android.app.Dialog;
import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.ArrayAdapter;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.openbot.app.robot.R;
import org.openbot.app.robot.databinding.DialogEditModelBinding;
import org.openbot.app.robot.main.OnItemClickListener;
import org.openbot.app.robot.tflite.Model;
import org.openbot.app.robot.tflite.ModelFileCheck;
import org.openbot.app.robot.utils.FileUtils;

public class EditModelDialogFragment extends DialogFragment {

  private DialogEditModelBinding binding;
  private final Model model;
  private final ModelFileCheck.Settings settings;
  private final OnItemClickListener<Model> itemClickListener;

  /**
   * @param settings What the model file can run as. Type and input size are locked to it and only
   *     its classes are offered. Null when the file isn't available, then only the name can change.
   */
  public EditModelDialogFragment(
      Model model,
      @Nullable ModelFileCheck.Settings settings,
      OnItemClickListener<Model> itemClickListener) {
    this.model = model;
    this.settings = settings;
    this.itemClickListener = itemClickListener;
  }

  @Override
  public void onCreate(@Nullable @org.jetbrains.annotations.Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setStyle(DialogFragment.STYLE_NORMAL, R.style.FullScreenDialog);
  }

  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {

    binding = DialogEditModelBinding.inflate(inflater, container, false);

    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);

    Model.TYPE type = settings != null ? settings.type : model.type;
    List<Model.CLASS> classes =
        settings != null ? settings.classes : Collections.singletonList(model.classType);
    int width = settings != null ? settings.width : model.getInputSize().getWidth();
    int height = settings != null ? settings.height : model.getInputSize().getHeight();

    binding.typeSpinner.setAdapter(
        new ArrayAdapter<>(
            requireContext(),
            android.R.layout.simple_dropdown_item_1line,
            Collections.singletonList(type.toString())));
    List<String> classNames = new ArrayList<>();
    for (Model.CLASS modelClass : classes) classNames.add(modelClass.toString());
    binding.classSpinner.setAdapter(
        new ArrayAdapter<>(
            requireContext(), android.R.layout.simple_dropdown_item_1line, classNames));
    binding.classSpinner.setSelection(Math.max(0, classes.indexOf(model.classType)));

    // The model file decides the type and input size, so only the name and a fitting class change.
    binding.typeSpinner.setEnabled(false);
    binding.classSpinner.setEnabled(classNames.size() > 1);
    binding.inputWidth.setEnabled(false);
    binding.inputHeight.setEnabled(false);

    binding.edit.setOnClickListener(
        v -> {
          binding.name.requestFocus();
          InputMethodManager imm =
              (InputMethodManager) requireActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
          imm.showSoftInput(binding.name, InputMethodManager.SHOW_IMPLICIT);
        });
    binding.name.setText(FileUtils.nameWithoutExtension(model.getName()));
    binding.inputWidth.setText(String.valueOf(width));
    binding.inputHeight.setText(String.valueOf(height));

    binding.btnSubmit.setOnClickListener(
        v -> {
          model.setName(binding.name.getText().toString() + ".tflite");
          model.setType(type);
          model.setClassType(classes.get(binding.classSpinner.getSelectedItemPosition()));
          model.setInputSize(width + "x" + height);
          itemClickListener.onItemClick(model);
          dismiss();
        });
    binding.dismiss.setOnClickListener(v -> dismiss());
  }

  @Override
  public Dialog onCreateDialog(Bundle savedInstanceState) {
    return super.onCreateDialog(savedInstanceState);
  }
}
