package com.goreecloud.goreecloud_vault

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Base64
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * One-shot Android Storage Access Framework export. The bytes entering this
 * channel are an already-encrypted authenticated vault envelope, never secrets.
 * No broad storage permission or internet permission is required.
 */
class MainActivity : FlutterActivity() {
    companion object {
        private const val CHANNEL = "goreecloud.vault/backup"
        private const val CREATE_ENCRYPTED_DOCUMENT = 9401
        private const val MAX_ENCRYPTED_BYTES = 5_000_000
    }

    private var pendingSave: MethodChannel.Result? = null
    private var pendingEncryptedBytes: ByteArray? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method != "saveEncryptedBackup") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            if (pendingSave != null) {
                result.error("BUSY", "Another document operation is in progress", null)
                return@setMethodCallHandler
            }
            val encoded = call.argument<String>("base64")
            // The fixed name avoids user-supplied paths and path traversal.
            if (encoded == null || encoded.length > 6_700_000) {
                result.error("INVALID_SIZE", "Encrypted payload is invalid", null)
                return@setMethodCallHandler
            }
            val bytes = try {
                Base64.decode(encoded, Base64.DEFAULT)
            } catch (_: IllegalArgumentException) {
                result.error("INVALID_ENCODING", "Encrypted payload encoding is invalid", null)
                return@setMethodCallHandler
            }
            if (bytes.isEmpty() || bytes.size > MAX_ENCRYPTED_BYTES) {
                bytes.fill(0)
                result.error("INVALID_SIZE", "Encrypted backup exceeds size limits", null)
                return@setMethodCallHandler
            }
            pendingSave = result
            pendingEncryptedBytes = bytes
            try {
                val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "application/json"
                    putExtra(Intent.EXTRA_TITLE, "goreecloud-vault-encrypted.json")
                }
                startActivityForResult(intent, CREATE_ENCRYPTED_DOCUMENT)
            } catch (_: Exception) {
                clearPending()
                result.error("FILE_PICKER", "Android document picker could not start", null)
            }
        }
    }

    @Deprecated("Android Activity result callback for the platform document picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == CREATE_ENCRYPTED_DOCUMENT) {
            val pending = pendingSave
            try {
                if (pending != null) {
                    if (resultCode != Activity.RESULT_OK || data?.data == null) {
                        pending.success(false)
                    } else {
                        val bytes = pendingEncryptedBytes
                            ?: throw IllegalStateException("Missing encrypted payload")
                        contentResolver.openOutputStream(data.data!!, "rwt")?.use { stream ->
                            stream.write(bytes)
                            stream.flush()
                        } ?: throw IllegalStateException("Could not write encrypted document")
                        pending.success(true)
                    }
                }
            } catch (_: Exception) {
                pending?.error("FILE_WRITE", "Encrypted document could not be saved", null)
            } finally {
                clearPending()
            }
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onDestroy() {
        val pending = pendingSave
        clearPending()
        pending?.error("CANCELLED", "Android activity was closed during export", null)
        super.onDestroy()
    }

    private fun clearPending() {
        pendingEncryptedBytes?.fill(0)
        pendingEncryptedBytes = null
        pendingSave = null
    }
}
