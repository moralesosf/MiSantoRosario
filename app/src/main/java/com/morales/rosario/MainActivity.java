package com.morales.rosario;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;

/** Offline app. Remote documents never enter this WebView or its native channel. */
public final class MainActivity extends ComponentActivity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String START_URL = ORIGIN + "/assets/rosario/index.html";
    private static final int PARCHMENT = Color.rgb(237, 220, 198);
    private WebView webView;
    private LinearLayout loading;
    private TextView loadingText;
    private Button retry;
    private ValueCallback<Uri[]> fileCallback;
    private ActivityResultLauncher<Intent> importLauncher;
    private ActivityResultLauncher<Intent> exportLauncher;
    private ReminderUi reminderUi;
    private boolean backPending;
    private boolean exportPending;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(true);

        ActivityResultLauncher<String> notifications = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> {
                    if (reminderUi != null) reminderUi.permissionResult(granted);
                });
        reminderUi = new ReminderUi(this, notifications, this::publishReminderState);
        importLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(), result -> {
            if (fileCallback == null) return;
            Uri uri = result.getResultCode() == RESULT_OK && result.getData() != null
                    ? result.getData().getData() : null;
            fileCallback.onReceiveValue(uri == null ? null : new Uri[]{uri});
            fileCallback = null;
        });
        exportLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(), result -> {
            exportPending = false;
            File pending = exportFile();
            try {
                if (result.getResultCode() == RESULT_OK && result.getData() != null
                        && result.getData().getData() != null && pending.isFile()) {
                    try (OutputStream output = getContentResolver()
                            .openOutputStream(result.getData().getData(), "wt")) {
                        if (output == null) throw new IOException("Missing output stream");
                        Files.copy(pending.toPath(), output);
                    }
                    toast("Oraciones exportadas.");
                }
            } catch (IOException | SecurityException error) {
                toast("No se pudo guardar el archivo. Inténtalo de nuevo.");
            } finally { pending.delete(); }
        });

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(PARCHMENT);
        webView = new WebView(this);
        webView.setBackgroundColor(PARCHMENT);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        loading = new LinearLayout(this);
        loading.setGravity(Gravity.CENTER);
        loading.setOrientation(LinearLayout.VERTICAL);
        loading.setBackgroundColor(PARCHMENT);
        loading.addView(new ProgressBar(this));
        loadingText = new TextView(this);
        loadingText.setText(R.string.preparing);
        loadingText.setTextColor(Color.rgb(36, 38, 52));
        loadingText.setTextSize(18);
        loadingText.setPadding(24, 24, 24, 24);
        loading.addView(loadingText);
        retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setVisibility(View.GONE);
        retry.setOnClickListener(v -> { retry.setVisibility(View.GONE); webView.reload(); });
        loading.addView(retry);
        root.addView(loading, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Document picker URIs, never filesystem paths.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,
                    WebResourceRequest request) {
                if (!isLocal(request.getUrl())) return blocked();
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                if (response == null) return blocked();
                // URLConnection does not consistently recognize ECMAScript modules/fonts.
                String path = request.getUrl().getPath();
                if (path != null && path.endsWith(".mjs")) response.setMimeType("text/javascript");
                if (path != null && path.endsWith(".woff2")) response.setMimeType("font/woff2");
                if (path != null && path.endsWith(".ttf")) response.setMimeType("font/ttf");
                return response;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,
                    WebResourceRequest request) {
                // Keep all navigation in the bundled document. Links are external intents.
                if (request.isForMainFrame() && request.hasGesture()) openExternal(request.getUrl());
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request,
                    WebResourceError error) {
                if (request.isForMainFrame()) showLoadError();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,
                        new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { importLauncher.launch(intent); }
                catch (ActivityNotFoundException error) { callback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            new AlertDialog.Builder(this).setTitle("Actualiza Android System WebView")
                    .setMessage("Actualiza el componente WebView para abrir tu rosario.")
                    .setPositiveButton("Actualizar", (dialog, which) -> openExternal(Uri.parse(
                            "https://play.google.com/store/apps/details?id=com.google.android.webview")))
                    .setNegativeButton("Cerrar", (dialog, which) -> finish()).setCancelable(false).show();
            return;
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) WebViewCompat.addWebMessageListener(webView, "RosarioAndroid", Collections.singleton(ORIGIN),
                (view, message, sourceOrigin, isMainFrame, reply) -> {
                    if (!isMainFrame || !ORIGIN.equals(sourceOrigin.toString())) return;
                    try {
                        JSONObject request = new JSONObject(message.getData());
                        switch (request.optString("type")) {
                            case "ready": loading.setVisibility(View.GONE); publishReminderState(); reminderUi.resumeOffer(); break;
                            case "error": showLoadError(); break;
                            case "vibrate": vibrate(request.optString("kind")); break;
                            case "export": exportJson(request.optString("text")); break;
                            case "external": openExternal(Uri.parse(request.optString("url"))); break;
                            case "sync-prayer-days": Reminders.syncDays(this, request.optJSONArray("days")); break;
                            case "prayer-completed":
                                Reminders.syncDays(this, request.optJSONArray("days"));
                                Reminders.schedule(this); reminderUi.firstCompletion(); break;
                            case "reminder-time": reminderUi.timePicker(false); break;
                            case "reminder-enabled": reminderUi.setEnabled(request.optBoolean("enabled")); break;
                            case "reminder-end-day": reminderUi.setEvening(request.optBoolean("enabled")); break;
                            case "reminder-permission": reminderUi.requestPermission(); break;
                            default: break;
                        }
                    } catch (Exception error) { toast("No se pudo completar la acción."); }
                });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (backPending) return;
                backPending = true;
                webView.evaluateJavascript("Boolean(window.rosarioAndroidBack?.())", result -> {
                    backPending = false;
                    if (!"true".equals(result)) {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                });
            }
        });
        webView.loadUrl(START_URL);
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getPath() != null && uri.getPath().startsWith("/assets/rosario/");
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void openExternal(Uri uri) {
        if ("mailto".equals(uri.getScheme())
                && "andresmorales.vc@gmail.com".equals(uri.getSchemeSpecificPart())) {
            try { startActivity(new Intent(Intent.ACTION_SENDTO, uri)); }
            catch (ActivityNotFoundException error) { toast("No hay una app de correo instalada."); }
            return;
        }
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                || isLocal(uri)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException error) { toast("No hay una app para abrir este enlace."); }
    }
    private void vibrate(String kind) {
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if ("complete".equals(kind)) vibrator.vibrate(VibrationEffect.createWaveform(
                new long[]{0, 30, 50, 30}, -1));
        else vibrator.vibrate(VibrationEffect.createOneShot("bead".equals(kind) ? 18 : 12,
                VibrationEffect.DEFAULT_AMPLITUDE));
    }
    private File exportFile() { return new File(getFilesDir(), "pending-export.json"); }
    private void exportJson(String text) throws Exception {
        if (exportPending) return;
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 || bytes.length > 2_000_000) throw new IOException("Invalid size");
        new JSONObject(text); // Do not export malformed data even if the UI is compromised.
        try (FileOutputStream output = new FileOutputStream(exportFile())) { output.write(bytes); }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, "rosario.json");
        try { exportPending = true; exportLauncher.launch(intent); }
        catch (ActivityNotFoundException error) { exportPending = false; exportFile().delete(); throw error; }
    }
    private void publishReminderState() {
        if (webView != null) webView.evaluateJavascript(
                "window.rosarioReminderState?.(" + Reminders.state(this).toString() + ")", null);
    }
    private void showLoadError() {
        loading.setVisibility(View.VISIBLE);
        loadingText.setText(R.string.load_error);
        retry.setVisibility(View.VISIBLE);
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }
    @Override protected void onPause() { webView.onPause(); super.onPause(); }
    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume(); Reminders.schedule(this); publishReminderState();
            if (reminderUi != null && loading.getVisibility() == View.GONE) reminderUi.resumeOffer();
        }
    }
    @Override protected void onDestroy() {
        if (reminderUi != null) reminderUi.close();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        super.onDestroy();
    }
}
