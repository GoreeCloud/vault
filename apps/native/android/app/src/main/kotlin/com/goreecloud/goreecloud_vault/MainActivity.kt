package com.goreecloud.goreecloud_vault

import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity

/** Prevent Android screenshots and recent-app previews from exposing unlocked secrets. */
class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }
}
