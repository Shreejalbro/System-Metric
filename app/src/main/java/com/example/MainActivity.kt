package com.example

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // Register ActivityResultLauncher for the file chooser
    private val fileChooserLauncher: ActivityResultLauncher<Intent> =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (filePathCallback != null) {
                val results: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK && result.data != null) {
                    val data = result.data
                    val clipData = data?.clipData
                    if (clipData != null && clipData.itemCount > 0) {
                        Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                    } else {
                        val uri = data?.data
                        if (uri != null) arrayOf(uri) else null
                    }
                } else {
                    null
                }
                filePathCallback?.onReceiveValue(results)
                filePathCallback = null
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        // Handle edge-to-edge window insets
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.rootContainer)) { view, windowInsets ->
            val insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom)
            WindowInsetsCompat.CONSUMED
        }

        webView = findViewById(R.id.webView)
        setupWebView()

        // Handle Back button / Back gesture for WebView history
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // Load the local HTML file from assets
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun setupWebView() {
        val settings = webView.settings

        // 1. JavaScript & Storage Configurations
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true       // Enables localStorage and sessionStorage
        settings.databaseEnabled = true         // Enables IndexedDB / Web SQL storage
        
        // 2. Local File & Content Access
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        @Suppress("DEPRECATION")
        settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        settings.allowUniversalAccessFromFileURLs = true

        // 3. Audio & Media Playback
        settings.mediaPlaybackRequiresUserGesture = false

        // 4. Viewport & Rendering Settings
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // 5. Custom WebViewClient to stay inside WebView for assets
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("file://") || url.startsWith("data:") || url.startsWith("blob:")) {
                    return false // Let WebView load local assets
                }
                return try {
                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(browserIntent)
                    true
                } catch (e: Exception) {
                    Log.e("SystemMetricWebView", "Failed to launch external browser for URL: $url", e)
                    false
                }
            }
        }

        // 6. Custom WebChromeClient with onShowFileChooser support
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Cancel any pending callback
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)

                    // Check accepted MIME types from input element
                    val acceptTypes = fileChooserParams?.acceptTypes?.filter { it.isNotBlank() }
                    if (!acceptTypes.isNullOrEmpty()) {
                        val mimeTypes = mutableListOf<String>()
                        var primaryType = "*/*"
                        for (rawType in acceptTypes) {
                            val cleanType = rawType.trim()
                            when {
                                cleanType.equals(".mp3", ignoreCase = true) || cleanType.equals("audio/mpeg", ignoreCase = true) -> {
                                    mimeTypes.add("audio/mpeg")
                                    primaryType = "audio/*"
                                }
                                cleanType.startsWith("audio/", ignoreCase = true) -> {
                                    mimeTypes.add(cleanType)
                                    primaryType = "audio/*"
                                }
                                cleanType.startsWith(".") -> {
                                    // Extension fallback
                                    mimeTypes.add("*/*")
                                }
                                else -> {
                                    mimeTypes.add(cleanType)
                                }
                            }
                        }

                        type = primaryType
                        if (mimeTypes.isNotEmpty()) {
                            putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.distinct().toTypedArray())
                        }
                    } else {
                        type = "*/*"
                    }

                    // Check for multiple selection
                    if (fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                }

                try {
                    val chooserIntent = Intent.createChooser(intent, "Select Audio File")
                    fileChooserLauncher.launch(chooserIntent)
                } catch (e: Exception) {
                    Log.e("SystemMetricWebView", "Cannot launch file chooser intent", e)
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                // Grant requested permissions (e.g., audio capture or resources if needed)
                request?.grant(request.resources)
            }

            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d(
                    "SystemMetricWebConsole",
                    "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}"
                )
                return true
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        // Cancel pending file chooser callback if activity is destroyed
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        webView.destroy()
        super.onDestroy()
    }
}
