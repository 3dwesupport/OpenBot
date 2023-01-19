package org.openbot.convertJStoJAVA;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.fragment.app.Fragment;

import org.openbot.databinding.ConvertJsToJavaBinding;

public class ConvertJStoJAVA extends Fragment {

    private ConvertJsToJavaBinding binding;

    @Override
    public View onCreateView(
            LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        binding = ConvertJsToJavaBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }
}
