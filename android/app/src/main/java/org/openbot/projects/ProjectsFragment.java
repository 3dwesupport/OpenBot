package org.openbot.projects;

import android.content.Intent;
import android.os.Bundle;
import android.util.SparseArray;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.tasks.Task;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.api.services.drive.model.File;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import java.io.IOException;
import java.util.List;
import org.openbot.R;
import org.openbot.databinding.FragmentProjectsBinding;
import org.openbot.googleServices.GoogleServices;
import org.openbot.main.CommonRecyclerViewAdapter;
import org.openbot.utils.BotFunctionUtils;

public class ProjectsFragment extends Fragment {
  private FragmentProjectsBinding binding;
  private GoogleServices googleServices;
  private DriveProjectsAdapter adapter;
  private BarCodeScannerFragment barCodeScannerFragment;
  private BottomSheetBehavior projectsBottomSheetBehavior;
  private SwipeRefreshLayout swipeRefreshLayout;
  private SparseArray<int[]> driveRes = new SparseArray<>();

  @Override
  public View onCreateView(
      LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
    // Inflate the layout for this fragment
    binding = FragmentProjectsBinding.inflate(inflater, container, false);
    googleServices = new GoogleServices(requireActivity(), requireContext(), newGoogleServices);
    projectsBottomSheetBehavior = BottomSheetBehavior.from(binding.projectsBottomSheet);
    projectsBottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN);
    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @NonNull Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    barCodeScannerFragment = new BarCodeScannerFragment();
    binding.signInButton.setOnClickListener(v -> signIn());
    swipeRefreshLayout = requireView().findViewById(R.id.refreshLayout);
    projectsBottomSheetBehavior.addBottomSheetCallback(dpBottomSheetCallback);
    requireView()
        .findViewById(R.id.dp_start_btn)
        .setOnClickListener(
            v ->
                Navigation.findNavController(requireView())
                    .navigate(R.id.action_projectsFragment_to_blocklyExecutingFragment));
    requireView()
        .findViewById(R.id.dp_cancel_btn)
        .setOnClickListener(
            v -> projectsBottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN));

    if (FirebaseAuth.getInstance().getCurrentUser() != null) {
      showProjectsRv();
    }

    swipeRefreshLayout.setOnRefreshListener(
        () -> {
          showProjectsRv();
          swipeRefreshLayout.setRefreshing(false);
        });
  }

  private void signIn() {
    Intent signInIntent = googleServices.mGoogleSignInClient.getSignInIntent();
    googleLogInActivityResultLauncher.launch(signInIntent);
  }

  ActivityResultLauncher<Intent> googleLogInActivityResultLauncher =
      registerForActivityResult(
          new ActivityResultContracts.StartActivityForResult(),
          result -> {
            Intent data = result.getData();
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            googleServices.handleSignInResult(task);
            binding.signOutLayout.setVisibility(View.GONE);
            showProjectsRv();
          });

  private GoogleSignInCallback newGoogleServices =
      new GoogleSignInCallback() {
        @Override
        public void onSignInSuccess(FirebaseUser account) {
          binding.signOutLayout.setVisibility(View.GONE);
        }

        @Override
        public void onSignInFailed(Exception exception) {
          binding.signOutLayout.setVisibility(View.VISIBLE);
        }

        @Override
        public void onSignOutSuccess() {
          binding.signOutLayout.setVisibility(View.VISIBLE);
        }

        @Override
        public void onSignOutFailed(Exception exception) {}
      };

  private void showProjectsRv() {
    binding.noProjectsLayout.setVisibility(View.GONE);
    binding.projectsLoader.setVisibility(View.VISIBLE);
    binding.refreshLayout.setVisibility(View.VISIBLE);
    // Set Grid layout according to screen width dimension.
    int screenWidth = getResources().getDisplayMetrics().widthPixels;
    int itemWidth = getResources().getDimensionPixelSize(R.dimen.project_card_view);
    int numColumns = screenWidth / itemWidth;
    binding.projectsRv.setLayoutManager(new GridLayoutManager(requireActivity(), numColumns));
    driveRes.put(R.layout.projects_list_view, new int[] {R.id.project_name, R.id.project_date});
    setScanDeviceAdapter(
        new DriveProjectsAdapter(requireActivity(), googleServices.getDriveFiles(), driveRes),
        (itemView, position) ->
            readFileFromDrive(googleServices.getDriveFiles().get(position).getId()));
    googleServices.accessDriveFiles(adapter, binding);
    binding.projectsRv.setAdapter(adapter);
  }

  private void setScanDeviceAdapter(
      DriveProjectsAdapter adapter,
      @NonNull CommonRecyclerViewAdapter.OnItemClickListener onItemClickListener) {
    this.adapter = adapter;
    adapter.setOnItemClickListener(onItemClickListener);
  }

  /** update projects screen when there is 0 projects on google drive account. */
  public void updateMessage(List<File> driveFiles, FragmentProjectsBinding binding) {
    binding.projectsLoader.setVisibility(View.GONE);
    if (driveFiles.size() <= 0) {
      binding.noProjectsLayout.setVisibility(View.VISIBLE);
    }
  }

  private void readFileFromDrive(String fileId) {
    binding.projectsLoader.setVisibility(View.VISIBLE);
    binding.overlayView.setVisibility(View.VISIBLE);
    new ReadFileTask(
            fileId,
            new ReadFileCallback() {
              @Override
              public void onFileReadSuccess(String fileContents) {
                String code = fileContents;
                for (String fun : BotFunctionUtils.botFunctionArray) {
                  if (code.contains(fun)) {
                    code = code.replace(fun, "Android." + fun);
                  }
                }
                barCodeScannerFragment.finalCode = code;
                projectsBottomSheetBehavior.setState(BottomSheetBehavior.STATE_EXPANDED);
              }

              @Override
              public void onFileReadFailed(IOException e) {
                requireActivity()
                    .runOnUiThread(
                        () -> {
                          AlertDialog.Builder builder = new AlertDialog.Builder(requireActivity());
                          builder.setTitle("Error");
                          builder.setMessage(
                              "Something error with this file! pull down to refresh and try again.");
                          builder.setCancelable(false);
                          builder.setNegativeButton(
                              "Ok",
                              (dialog, which) -> {
                                dialog.cancel();
                                binding.projectsLoader.setVisibility(View.GONE);
                                binding.overlayView.setVisibility(View.GONE);
                              });
                          AlertDialog alertDialog = builder.create();
                          alertDialog.show();
                        });
              }
            })
        .execute();
  }

  private BottomSheetBehavior.BottomSheetCallback dpBottomSheetCallback =
      new BottomSheetBehavior.BottomSheetCallback() {
        @Override
        public void onStateChanged(@NonNull View bottomSheet, int newState) {
          // Handle state changes here
          if (newState == BottomSheetBehavior.STATE_EXPANDED
              || newState == BottomSheetBehavior.STATE_HALF_EXPANDED) {
            binding.projectsLoader.setVisibility(View.GONE);
            binding.overlayView.setVisibility(View.VISIBLE);
          } else if (newState == BottomSheetBehavior.STATE_HIDDEN) {
            binding.overlayView.setVisibility(View.GONE);
          }
        }

        @Override
        public void onSlide(@NonNull View bottomSheet, float slideOffset) {
          // Handle sliding events here
        }
      };

  @Override
  public void onResume() {
    super.onResume();
    projectsBottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN);
  }
}